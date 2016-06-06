'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    bShepherd = require('ble-shepherd'),
    fbBase = require('freebird-base'),
    Netcore = fbBase.Netcore,
    bipso = require('bipso');

var uuidDefs = JSON.parse(fs.readFileSync(__dirname + '/defs/defs.json'));
    
var nc,
    central,
    subMod,
    spCfg,
    netDrvs = {},
    devDrvs = {},
    gadDrvs = {};

var nspUuids = {
        public: [],
        bipso: [],
        ti: []
    },
    ipsoDefs = {},
    reportCfgTable = {};

var bleNc = function (subModule, spConfig) {
    if (subModule !== 'cc-bnp' && subModule !== 'noble')
        throw new Error('subModule must equal to cc-bnp or noble');

    if (subModule === 'cc-bnp' && !spConfig)
        throw new Error('spConfig must be given with cc-bnp sub module');

    subMod = subModule;
    spCfg = spConfig;
    central = bShepherd(subMod);
    central.on('IND', shepherdEvtHdlr);
    central.enableBlackOrWhite(true, 'black');

    nc = new Netcore('blecore', central, {phy: 'ble', nwk: 'ble'});
    nc.cookRawDev = cookRawDev;
    nc.cookRawGad = cookRawGad;

    nc.registerNetDrivers(netDrvs);
    nc.registerDevDrivers(devDrvs);
    nc.registerGadDrivers(gadDrvs);

    return nc;
};

/*************************************************************************************************/
/*** Initialize Definitions                                                                    ***/
/*************************************************************************************************/
_.forEach(bipso.ipsoCharUuid._enumMap, function (uuid, cls) {
    ipsoDefs[cls] = [ uuid ];
    nspUuids.bipso.push(uuid);
});

_.forEach(uuidDefs, function (uuidSet, nsp) {
    _.forEach(uuidSet, function (uuids) {
        nspUuids[nsp] = nspUuids[nsp].concat(uuids);
    });

    _.forEach(ipsoDefs, function (uuids, name) {
        if (uuidSet[name])
            ipsoDefs[name] = ipsoDefs[name].concat(uuidSet[name]);
    });
});
/*************************************************************************************************/
/*** Shepherd Event Handlers                                                                   ***/
/*************************************************************************************************/
function shepherdEvtHdlr (msg) {
    var data = msg.data,
        dev,
        manuName,
        chars = {},
        char,
        charId,
        charVal,
        charData = {},
        reportFunc;

    switch (msg.type) {
        case 'DEV_INCOMING':
            dev = central.find(data);

            manuName = dev.findChar('0x180a', '0x2a29').val.manufacturerName;
            nc.commitDevIncoming(data, dev);

            _.forEach(dev.servs, function (serv) {
                chars = _.merge(chars, serv.chars);
            });

            commitGads(data, chars, nspUuids.public);
            commitGads(data, chars, nspUuids.bipso);

            if (manuName === 'Texas Instruments')
                commitGads(data, chars, nspUuids.ti);
            
            break;

        case 'DEV_LEAVING':
            nc.commitDevLeaving(data);
            break;

        case 'ATT_IND':
            dev = central.find(data.addr);
            charId = data.charUuid;
            char = dev.findChar(data.servUuid, charId);
            charVal = _.merge({}, data.value);
            manuName = dev.findChar('0x180a', '0x2a29').val.manufacturerName;

            if (data.servUuid === '0x180a') {
                // device attributes reporting
                if (charId === '0x2a29') {
                    nc.commitDevReporting(data.addr, {manufacturer: charVal});
                } else if (charId === '0x2a24') {
                    nc.commitDevReporting(data.addr, {model: charVal});
                } else if (charId === '0x2a25') {
                    nc.commitDevReporting(data.addr, {serial: charVal});
                } else if (charId === '0x2a26' || charId === '0x2a27' || charId === '0x2a28') {
                    charData.fw = dev.findChar('0x180a', charId).val.firmwareRev;
                    charData.hw = dev.findChar('0x180a', charId).val.hardwareRev;
                    charData.sw = dev.findChar('0x180a', charId).val.softwareRev;
                    nc.commitDevReporting(data.addr, {version: charData});
                }
            } else {
                // nc.dangerouslyCommitGadReporting
                // gadget attributes reporting
                if (_.includes(char.prop, 'read'))
                    reportFunc = nc.commitGadReporting.bind(nc);
                else 
                    reportFunc = nc.dangerouslyCommitGadReporting.bind(nc);

                if (_.includes(nspUuids.public, charId)) {
                    reportFunc(data.addr, data.servUuid + '.' + charId, charVal);
                } else if (_.includes(nspUuids.bipso, charId)) {
                    reportFunc(data.addr, data.servUuid + '.' + charId, charVal);
                } else if (manuName === 'Texas Instruments' && _.includes(nspUuids.ti, charId)) {
                    reportFunc(data.addr, data.servUuid + '.' + charId, charVal);
                }
            }
            break;
    }
}

/*************************************************************************************************/
/*** Transform Raw Data Object                                                                 ***/
/*************************************************************************************************/
function cookRawDev (dev, raw, cb) { 
    var netInfo = {
            role: raw.role,
            parent: null,
            maySleep: false,
            address: { permanent: raw.addr, dynamic: raw.connHdl },
        },
        attrs = {
            manufacturer: raw.servs['0x180a'].chars['0x2a29'].val.manufacturerName,
            model: raw.servs['0x180a'].chars['0x2a24'].val.modelNum,
            serial: raw.servs['0x180a'].chars['0x2a25'].val.serialNum,
            version: {
                fw: raw.servs['0x180a'].chars['0x2a26'].val.firmwareRev,
                hw: raw.servs['0x180a'].chars['0x2a27'].val.hardwareRev,
                sw: raw.servs['0x180a'].chars['0x2a28'].val.softwareRev,
            }
        };

    if (subMod === 'cc-bnp')
        netInfo.parent = central.bleCentral.addr;
    else 
        netInfo.parent = central.bleCentral;

    dev.setNetInfo(netInfo);
    dev.setAttrs(attrs);

    cb(null, dev);
}

function cookRawGad (gad, raw, cb) { 
    var cls,
        profile,
        newVal = {};

    if (raw._ownerServ.name)
        profile = raw._ownerServ.name;
    else 
        profile = raw._ownerServ.uuid;

    _.forEach(ipsoDefs, function (uuids, name) {
        if (_.includes(uuids, raw.uuid))
            cls = name;
    });

    gad.setPanelInfo({
        profile: raw._ownerServ.name, 
        class: cls
    });

    gad.setAttrs(_.merge({}, raw.val));

    cb(null, gad);
}

/*************************************************************************************************/
/*** Netcore drivers                                                                           ***/
/*************************************************************************************************/
netDrvs.start = function (callback) {
    var app = function () {},
        cb = function (err, result) {
            if (err)
                callback(err);
            else {
                nc.commitReady();
                callback(null);
            }
        };

    if (central._enable === true) {
        callback(null);
    } else {
        if (subMod === 'cc-bnp')
            central.start(app, spCfg, callback);
        else if (subMod === 'noble') 
            central.start(app, callback);
    }
};

netDrvs.stop = function (callback) {
    central.permitJoin(0);
    callback(null);
};

netDrvs.reset = function (mode, callback) {
    central.reset(function (err) {
        if (err)
            callback(err);
        else {
            setTimeout(function () {
                nc.commitReady();
            }, 10);
            callback(null);
        } 
    });
};

netDrvs.permitJoin = function (duration, callback) {
    var cb = function (msg) {
            if (msg.type === 'NWK_PERMITJOIN')
                callback(null, msg.data);

            central.removeListener('IND', cb);
        };

    try {
        central.on('IND', cb);
        central.permitJoin(duration);
    } catch (e) {
        central.removeListener('IND', cb);
        callback(e);
    }
};

netDrvs.remove = function (permAddr, callback) {
    var dev = central.find(permAddr);

    dev.remove(function (err) {
        if (err) 
            callback(err);
        else 
            callback(null, permAddr);
    });
};

netDrvs.ping = function (permAddr, callback) {
    var dev = central.find(permAddr),
        oldTime = Date.now();

    dev.read('0x180a', '0x2a24', function (err, val) {
        var time;
        if (err) {
            callback(err);
        } else {
            time = Date.now() - oldTime;
            callback(null, time);
        }

    });
};

//option
netDrvs.ban = function (permAddr, callback) {
    var dev = central.find(permAddr);

    dev.remove(function (err) {
        if (err)
            callback(err);
        else {
            try {
                central.toBlack(permAddr);
                callback(null, permAddr);
            } catch (e) {
                callback(e);
            }
        }
    });
};

netDrvs.unban = function (permAddr, callback) {
        central.cancelToBlack(permAddr);
        callback(null, permAddr);
};

/*************************************************************************************************/
/*** Device drivers                                                                            ***/
/*************************************************************************************************/
devDrvs.read = function (permAddr, attrName, callback) {
    operateDevAttr('read', permAddr, attrName, null, callback);
};

devDrvs.write = function (permAddr, attrName, val, callback) {
    operateDevAttr('write', permAddr, attrName, val, callback);
};

//option
devDrvs.identify = function (permAddr, callback) {
//not support
    callback(null);
};

/*************************************************************************************************/
/*** Gadget drivers                                                                            ***/
/*************************************************************************************************/
gadDrvs.read = function (permAddr, auxId, attrName, callback) {
    operateGadAttr('read', permAddr, auxId, attrName, null, callback);
};

gadDrvs.write = function (permAddr, auxId, attrName, val, callback) {
    operateGadAttr('write', permAddr, auxId, attrName, val, callback);
};

//option
gadDrvs.exec = function (permAddr, auxId, attrName, args, callback) {
//not support
    callback(null);
};

gadDrvs.setReportCfg = function (permAddr, auxId, attrName, cfg, callback) {
    var dev = central.find(permAddr),
        uuids = auxId.split('.'),
        char = dev.findChar(uuids[0], uuids[1]),
        enable = cfg.enable,
        rptCfgInfo = _.get(reportCfgTable, [permAddr, auxId, attrName]),
        pmin;

    delete cfg.enable;

    if (!rptCfgInfo)
        rptCfgInfo = {
            enable: false,
            min: null,
            max: null,
            cfg: null
        };

    if (!_.isNumber(char.val[attrName])) {
        if (!_.isNil(cfg.gt) || !_.isNil(cfg.lt) ||!_.isNil(cfg.step))
            return callback(new Error('Report configuration setting error.'));
    }

    if (!_.isEmpty(cfg)) 
        rptCfgInfo.cfg = cfg;

    if (enable === false) {
        dev.setNotify(uuids[0], uuids[1], false);

        if (rptCfgInfo.min) {
            clearTimeout(rptCfgInfo.min);
            rptCfgInfo.min = null;
        }

        if (rptCfgInfo.max) {
            clearInterval(rptCfgInfo.max);
            rptCfgInfo.max = null;
        }
    } else if (enable === true) {
        dev.setNotify(uuids[0], uuids[1], true);

        if (rptCfgInfo.cfg.pmin) {
            pmin = rptCfgInfo.cfg.pmin;
            rptCfgInfo.min = setTimeout(function () {
                gadDrvs.read(permAddr, auxId, attrName);
            }, pmin * 1000);
        } else {
            pmin = 0;
        }

        if (rptCfgInfo.cfg.pmax) {
            rptCfgInfo.max = setInterval(function () {
                gadDrvs.read(permAddr, auxId, attrName);

                if (!_.isNil(rptCfgInfo.min))
                    clearTimeout(rptCfgInfo.min);

                rptCfgInfo.min = null;

                rptCfgInfo.min = setTimeout(function () {
                    gadDrvs.read(permAddr, auxId, attrName);
                }, pmin * 1000);
            }, (rptCfgInfo.cfg.pmax + pmin) * 1000);
        }
    }

    rptCfgInfo.enable = enable;
    rptCfgInfo.cfg.enable = enable;
    _.set(reportCfgTable, [permAddr, auxId, attrName], rptCfgInfo);

    callback(null, true);
};

gadDrvs.getReportCfg = function (permAddr, auxId, attrName, callback) {
    var reportCfg = _.get(reportCfgTable, [permAddr, auxId, attrName, 'cfg']);

    if (reportCfg) 
        callback(null, reportCfg);
    else 
        callback(new Error('Report configuration is not be set.'));
};

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function commitGads (permAddr, chars, uuids) {
    _.forEach(chars, function (char) {
        var servUuid = char._ownerServ.uuid;

        if (_.includes(uuids, char.uuid)) 
            nc.commitGadIncoming(permAddr, servUuid + '.' + char.uuid, char);
    });
}

function operateDevAttr (type, permAddr, attrName, val, callback) {
    var dev = central.find(permAddr),
        infos = [],
        readFuncs = [];

    if (attrName === 'manufacturer') {
        infos = [{char: '0x2a29', resultKey: 'manufacturerName'}];
    } else if (attrName === 'model') {
        infos = [{char: '0x2a24', resultKey: 'modelNum'}];
    } else if (attrName === 'serial') {
        infos = [{char: '0x2a25', resultKey: 'serialNum'}];
    } else if (attrName === 'version') {
        infos = [
            {char: '0x2a26', resultKey: 'firmwareRev'},
            {char: '0x2a27', resultKey: 'hardwareRev'},
            {char: '0x2a28', resultKey: 'softwareRev'}
        ];
    }

    if (infos.length === 0) {
        callback(new Error('attrName: ' + attrName + ' not exist.'));
    } else {
        _.forEach(infos, function (info) {
            readFuncs.push(function (cb) {
                var char = dev.servs['0x180a'].chars[info.char],
                    execCb = function (err, result) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, char.val[info.resultKey]);
                        }
                    };

                if (!char.val[info.resultKey]) {
                    execCb(new Error('attrName: ' + attrName + ' not exist.'));
                } else if (type === 'read') {
                    dev.read('0x180a', info.char, execCb);
                } else {
                    char.val[info.resultKey] = val;
                    dev.write('0x180a', info.char, char.val, execCb);
                }
            });
        });

        execAsyncFuncs(readFuncs, function (err, result) {
            if (err) {
                callback(err);
            } else if (attrName === 'version') {
                callback(null, {fw: result[0], hw: result[1], sw: result[2]});
            } else {
                callback(null, result[0]);
            }
        });
    }
}

function operateGadAttr (type, permAddr, auxId, attrName, val, callback) {
    var dev = central.find(permAddr),
        uuids = auxId.split('.'),
        char = dev.findChar(uuids[0], uuids[1]),
        oldVal = char.val[attrName],
        rpt = false,
        rptCfgInfo = _.get(reportCfgTable, [permAddr, auxId, attrName]),
        cfg = _.get(rptCfgInfo, 'cfg'),
        cb;

    if (!callback) callback = function () {};

    if (char.val[attrName] === undefined) {
        callback(new Error('attrName: ' + attrName + ' not exist.'));
    } else {
        cb = function(err, result) {
            var currVal = char.val[attrName],
                data = {};

            if (err) {
                callback(err);
            } else {
                // if (rptCfgInfo && cfg && cfg.enable && _.isNumber(oldVal)) {
                //     if (_.isNumber(cfg.gt) && _.isNumber(cfg.lt) && cfg.lt > cfg.gt) {
                //         rpt = (oldVal !== currVal) && (currVal > cfg.gt) && (currVal < cfg.lt);
                //     } else {
                //         rpt = _.isNumber(cfg.gt) && (oldVal !== currVal) && (currVal > cfg.gt);
                //         rpt = rpt || (_.isNumber(cfg.lt) && (oldVal !== currVal) && (currVal < cfg.lt));
                //     }

                //     if (_.isNumber(cfg.step)) {
                //         rpt = rpt || (Math.abs(currVal - oldVal) > cfg.step);
                //     }

                //     if (rpt) {
                //         _.set(data, attrName, currVal);
                //         nc.commitGadReporting(permAddr, auxId, data);
                //     }
                // }
                _.set(data, attrName, currVal);
                nc.commitGadReporting(permAddr, auxId, data);
                callback(null, char.val[attrName]);
            }
        };

        if (type === 'read'){
            dev.read(uuids[0], uuids[1], cb);
        } else {
            char.val[attrName] = val;
            dev.write(uuids[0], uuids[1], char.val, cb);
        }
    }
}

function execAsyncFuncs (funcs, callback) {
    var count = 0,
        flag = false,
        allResult = [];

    _.forEach(funcs, function (func) {
        func(function (err, result) {
            count += 1;

            if (flag) return;

            if (err) {
                callback(err);
                flag = true;
            } else {
                allResult.push(result);
            }

            if (count === funcs.length) callback(null, allResult);
        });
    });
}

module.exports = bleNc;