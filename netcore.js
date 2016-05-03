var _ = require('lodash'),
    central = require('ble-shepherd'),
    fbBase = require('freebird-base'),
    Netcore = fbBase.Netcore;

var gadDefs = JSON.parse(fs.readFileSync(__dirname + '/defs.json'));
    
var nc = new Netcore('blecore', central, {phy: null, nwk: null}),
    netDrvs = {},
    devDrvs = {},
    gadDrvs = {};

var publicUuids = [],
    tiUuids = [],
    sivannUuids = [];

gadDefs.public.forEach(function (uuids) {
    publicUuids = publicUuids.concat(uuids.keys());
});

gadDefs.ti.forEach(function (uuids) {
    tiUuids = tiUuids.concat(uuids.keys());
});

gadDefs.sivann.forEach(function (uuid) {
    sivannUuids.push(uuid);
});


/*************************************************************************************************/
/*** Shepherd Event Handlers                                                                   ***/
/*************************************************************************************************/
central.on('IND', function (msg) {
    var dev,
        manuName,
        chars = [];

    switch (msg.type) {
        case 'DEV_INCOMING':
            dev = central.find(msg.data);
            manuName = dev.servs['0x180a'].chars['0x2a29'].val.manufacturerName;
            nc.commitDevIncoming(msg.data, dev);

            dev.servs.forEach(function (serv) {
                chars = chars.concat(serv.chars);
            });

            commitGads(msg.data, chars, publicUuids);

            if (manuName === 'Texas Instruments')
                commitGads(msg.data, chars, tiUuids);

            if (manuName === 'sivann') 
                commitGads(msg.data, chars, sivannUuids);
            break;

        case 'DEV_LEAVING':
            nc.commitDevLeaving(msg.data);
            break;
    }
});

function commitGads (permAddr, chars, uuids) {
    chars.forEach(function (char) {
        var servUuid = char._ownerServ.uuid;

        if (_.includes(uuids, char.uuid)) 
            nc.commitGadIncoming(permAddr, servUuid + '.' + char.uuid, char);
    });
}

/*************************************************************************************************/
/*** Transform Raw Data Object                                                                 ***/
/*************************************************************************************************/
nc.cookRawDev = function (dev, raw, cb) { 
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
};

//TODO
nc.cookRawGad = function (gad, raw, cb) { 
    var cls;

    switch (raw.uuid) {
        case '0x2A72':
        case '0x2A35':
        case '0x2A9C':
        case '0x2AA7':
        case '0x2A5B':
        case '0x2A18':
        case '0x2A37':
        case '0x2A5F':
        case '0x2A5E':
        case '0x2A6D':
        case '0X2A92':
        case '0x2A53':
        case '0x2A98':
        case '0x2A9D':
        case '0x2A9D':
            cls = 'generic';
            break;
        case '0x2A6E':
        case '0x2A1C':
        case '0x2A1E':
            cls = 'temperature';
            break;
        case '0x2A6F':
            cls = 'humidity';
            break;
        case '0x2A19':
        case '0x2A07':
        case '0x2A63':
            cls = 'pwrMea';
            break;
        case '0x2A2C':
        case '0x2AA0':
        case '0x2AA1':
            cls = 'magnetometer';
            break;
    }

    gad.setPanelInfo({
        profile: raw._ownerServ.name, 
        class: cls
    });

    gad.setAttrs(raw.val);

    cb(err, gad);
};

// TODO
/*************************************************************************************************/
/*** Netcore drivers                                                                           ***/
/*************************************************************************************************/
netDrvs.start = function (callback) {
    central.start();
};

netDrvs.stop = function (callback) {

};

netDrvs.reset = function (mode, callback) {

};

netDrvs.permitJoin = function (duration, callback) {
    central.permitJoin(duration);
    callback(null);
};

netDrvs.remove = function (permAddr, callback) {
    var dev = central.find(permAddr);

    dev.remove(function (err) {
        callback(err);
    });
};

netDrvs.ping = function (permAddr, callback) {

};

//option
netDrvs.ban = function (permAddr, callback) {

};

netDrvs.unban = function (permAddr, callback) {

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
};

gadDrvs.setReportCfg = function (permAddr, auxId, attrName, cfg, callback) {
//not support
};

gadDrvs.getReportCfg = function (permAddr, auxId, attrName, callback) {
//not support
};

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
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
        char = dev.servs[uuids[0]].chars[uuids[1]],
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