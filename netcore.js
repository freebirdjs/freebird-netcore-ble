var _ = require('lodash'),
    fs = require('fs'),
    bShepherd = require('ble-shepherd'),
    fbBase = require('freebird-base'),
    Netcore = fbBase.Netcore;

var uuidDefs = JSON.parse(fs.readFileSync(__dirname + '/defs.json'));
    
var nc,
    central,
    netDrvs = {},
    devDrvs = {},
    gadDrvs = {};

var nspUuids = {
        public: [],
        sivann: [],
        ti: []
    },
    ipsoDefs = {
        dIn: [],
        dOut: [],
        aIn: [],
        aOut: [],
        generic: [],
        illuminance: [],
        presence: [],
        temperature: [],
        humidity: [],
        pwrMea: [],
        actuation: [],
        setPoint: [],
        loadCtrl: [],
        lightCtrl: [],
        pwrCtrl: [],
        accelerometer: [],
        magnetometer: [],
        barometer: []
    },
    reportCfgTable = {};

var bleNc = function (chipName) {
    central = bShepherd(chipName);
    central.on('IND', shepherdEvtHdlr);

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
        chars = [],
        charId,
        charData = {};

    switch (msg.type) {
        case 'DEV_INCOMING':
            dev = central.find(data);
            manuName = dev.findChar('0x180a', '0x2a29').val.manufacturerName;
            nc.commitDevIncoming(data, dev);

            dev.servs.forEach(function (serv) {
                chars = chars.concat(serv.chars);
            });

            commitGads(data, chars, nspUuids.public);

            if (manuName === 'sivann') 
                commitGads(data, chars, nspUuids.sivann);

            if (manuName === 'Texas Instruments')
                commitGads(data, chars, nspUuids.ti);
            
            break;

        case 'DEV_LEAVING':
            nc.commitDevLeaving(data);
            break;

        case 'ATT_IND':
            dev = central.find(data.addr);
            charId = data.charUuid;
            manuName = dev.findChar('0x180a', '0x2a29').val.manufacturerName;

            if (data.servUuid === '0x180a') {
                // device attributes reporting
                if (charId === '0x2a29') {
                    commitDevReporting(data.addr, {manufacturer: data.value});
                } else if (charId === '0x2a24') {
                    commitDevReporting(data.addr, {model: data.value});
                } else if (charId === '0x2a25') {
                    commitDevReporting(data.addr, {serial: data.value});
                } else if (charId === '0x2a26' || charId === '0x2a27' || charId === '0x2a28') {
                    charData.fw = dev.findChar('0x180a', charId).val.firmwareRev;
                    charData.hw = dev.findChar('0x180a', charId).val.hardwareRev;
                    charData.sw = dev.findChar('0x180a', charId).val.softwareRev;
                    commitDevReporting(data.addr, {version: charData});
                }
            } else {
                // gadget attributes reporting
                if (_.includes(nspUuids.public, charId)) {
                    commitGadReporting(data.addr, data.servUuid + '.' + charId, data.value);
                } else if (manuName === 'sivann' && _.includes(nspUuids.sivann, charId)) {
                    commitGadReporting(data.addr, data.servUuid + '.' + charId, data.value);
                } else if (manuName === 'Texas Instruments' && _.includes(nspUuids.ti, charId)) {
                    commitGadReporting(data.addr, data.servUuid + '.' + charId, data.value);
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
            parent: raw._ownerDevmgr.bleDevices[0],
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

    dev.setNetInfo(netInfo);
    dev.setAttrs(attrs);

    cb(err, newDev);
}

function cookRawGad (gad, raw, cb) { 
    var cls;

    _.forEach(ipsoDefs, function (uuids, name) {
        if (_.includes(uuids, raw.uuid))
            cls = name;
    });

    gad.setPanelInfo({
        profile: raw._ownerServ.name, 
        class: cls
    });

    gad.setAttrs(raw.val);

    cb(err, gad);
}

/*************************************************************************************************/
/*** Netcore drivers                                                                           ***/
/*************************************************************************************************/
// TODO, need sp path
netDrvs.start = function (callback) {
    central.start(callback);
};

netDrvs.stop = function (callback) {
    central.stop(callback);
};

netDrvs.reset = function (mode, callback) {
    central.reset(callback);
};

netDrvs.permitJoin = function (duration, callback) {
    try {
        central.permitJoin(duration);
        callback(null);
    } catch (e) {
        callback(e);
    }
};

netDrvs.remove = function (permAddr, callback) {
    var dev = central.find(permAddr);

    dev.remove(function (err) {
        callback(err);
    });
};

// TODO, result?
netDrvs.ping = function (permAddr, callback) {

};

//option
netDrvs.ban = function (permAddr, callback) {
    try {
        central.ban();
        callback(null);
    } catch (e) {
        callback(e);
    }
};

netDrvs.unban = function (permAddr, callback) {
        central.ban();
        callback(null);
};

/*************************************************************************************************/
/*** Device drivers                                                                            ***/
/*************************************************************************************************/
devDrvs.read = function (permAddr, attrName, callback) {
    operateDevAttr('read', permAddr, attrName, null, callback);
};

devDrvs.write = function (permAddr, attrName, val, callback) {
    operateDevAttr('read', permAddr, attrName, val, callback);
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

//TODO
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

    if (!_.isNumber(char.val.attrName)) {
        delete cfg.gt;
        delete cfg.lt;
        delete cfg.step;
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
                gadDrvs.read(permAddr, auxId, attrName, function (err, val) {
                    var data = {};
                    _.set(data, attrName, val);
                    commitGadReporting(permAddr, auxId, data);
                });
            }, pmin);
        } else {
            pmin = 0;
        }

        if (rptCfgInfo.cfg.pmax) {
            rptCfgInfo.max = setInterval(function () {
                gadDrvs.read(permAddr, auxId, attrName, function (err, val) {
                    var data = {};
                    _.set(data, attrName, val);
                    commitGadReporting(permAddr, auxId, data);
                });

                if (!_.isNil(rptCfgInfo.min))
                    clearTimeout(rptCfgInfo.min);

                rptCfgInfo.min = null;

                rptCfgInfo.min = setTimeout(function () {
                    gadDrvs.read(permAddr, auxId, attrName, function (err, val) {
                        var data = {};
                        _.set(data, attrName, val);
                        commitGadReporting(permAddr, auxId, data);
                    });
                }, pmin);
            }, (rptCfgInfo.cfg.pmin + pmin));
        }
    }

    rptCfgInfo.enable = enable;
    _.set(reportCfgTable, [permAddr, auxId, attrName], rptCfgInfo);

    callback(null);
};

gadDrvs.getReportCfg = function (permAddr, auxId, attrName, callback) {
    var reportCfg = _.get(reportCfgTable, [permAddr, auxId, attrName, cfg]);

    if (reportCfg) 
        callback(null, reportCfg);
    else 
        callback(new Error('Report configuration is not be set.'));
};

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function commitGads (permAddr, chars, uuids) {
    chars.forEach(function (char) {
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
        infos.forEach(function (info) {
            readFuncs.push(function (cb) {
                execCb = function (err, result) {
                    if (err) {
                        cb(err);
                    } else {
                        if (type === 'read') {
                            cb(null, result[info.resultKey]);
                        } else {
                            cb(null, dev.servs['0x180a'].chars[info.char].val[info.resultKey]);
                        }
                    }
                };

                if (type === 'read') {
                    dev.servs['0x180a'].chars[info.char].read(execCb);
                } else {
                    dev.servs['0x180a'].chars[info.char].write(val, execCb);
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
        cfg = reportCfgTable[permAddr][auxId][attrName],
        cb;

    if (char.val[attrName] === undefined) {
        callback(new Error('attrName: ' + attrName + ' not exist.'));
    } else {
        cb = function(err, result) {
            var currVal = char.val[attrName],
                data = {};

            if (err) {
                callback(err);
            } else {
                if (cfg && _.isNumber(oldVal)) {
                    if (_.isNumber(cfg.gt) && _.isNumber(cfg.lt) && cfg.lt > cfg.gt) {
                        rpt = (oldVal !== currVal) && (currVal > cfg.gt) && (currVal < cfg.lt);
                    } else {
                        rpt = _.isNumber(gt) && (oldVal !== currVal) && (currVal > gt);
                        rpt = rpt || (_.isNumber(lt) && (oldVal !== currVal) && (currVal < lt));
                    }

                    if (_.isNumber(step)) {
                        rpt = rpt || (Math.abs(currVal - oldVal) > step);
                    }

                    if (cfg) {
                        _.set(data, attrName, currVal);
                        commitGadReporting(permAddr, auxId, data);
                    }
                }
                callback(null, char.val[attrName]);
            }
        };

        if (type === 'read'){
            char.read(cb);
        } else {
            char.val[attrName] = val;
            char.write(char.val, cb);
        }
    }
}

function execAsyncFuncs (funcs, callback) {
    var count = 0,
        flag = false,
        allResult = [];

    funcs.forEach(function (func) {
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