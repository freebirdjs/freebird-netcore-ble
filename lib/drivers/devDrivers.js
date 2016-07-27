var _ = require('busyman'),
    helper = require('../helper'),
    nc;

function read (permAddr, attrName, callback) {
    operateDevAttr(this, 'read', permAddr, attrName, null, callback);
}

function write (permAddr, attrName, val, callback) {
    operateDevAttr(this, 'write', permAddr, attrName, val, callback);
}

//option
function identify (permAddr, callback) {
//not support
    callback(null);
}

function operateDevAttr (central, type, permAddr, attrName, val, callback) {
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
                var char = dev.findChar('0x180a', info.char),
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

        helper.execAsyncFuncs(readFuncs, function (err, result) {
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

module.exports = function (netcore) {
    nc = netcore;

    return {
        read: read,
        write: write,
        identify: identify
    };
};