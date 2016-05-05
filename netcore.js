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
        chars = [];

    switch (msg.type) {
        case 'DEV_INCOMING':
            dev = central.find(data);
            manuName = dev.servs['0x180a'].chars['0x2a29'].val.manufacturerName;
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
            if (data.servUuid === '0x180a') {

            }
            //commitDevReporting(permAddr, devAttrs)
            //commitGadReporting(permAddr, auxId, gadAttrs)
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
        rptCfgInfo = {
            min: null,
            max: null,
            cfg: null,
            oldVal: null
        };

    if (!cfg.enable) {

    } else {

    }

    if (!_.includes(char.prop, 'notify') && !_.includes(char.prop, 'indicate')) {
        callback(new Error('Not supported to set report configuration.'));
    } else {
        if (!_.isNumber(char.val.attrName)) {
            delete cfg.gt;
            delete cfg.lt;
            delete cfg.step;
        }

        if (cfg.pmin && cfg.pmax) {
            interval = ((cfg.pmin + cfg.pmax) / 2) * 1000;
        } if (cfg.pmin) {
            interval = (cfg.pmin + 1) * 1000;
        } else if (cfg.pmax) {
            interval = (cfg.pmin - 1) * 1000;
        }

        readTimer = setInterval(function () {
            var rptCfgInfo = _.get(reportCfgTable, [permAddr, auxId, attrName]);

            rptCfgInfo += 1;
            char.read(function (err, val) {
                


            });
        }, interval);

        _.set(reportCfgTable, [permAddr, auxId, attrName], );
    }
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
        cb;

    if (char.val[attrName] === undefined) {
        callback(new Error('attrName: ' + attrName + ' not exist.'));
    } else {
        cb = function(err, result) {
            if (err) {
                callback(err);
            } else {
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