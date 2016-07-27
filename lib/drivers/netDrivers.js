var _ = require('busyman'),
    devIncomingHdlr = require('../handlers/devIncomingHdlr');

var nc;

function start (callback) {
    var central = this,
        onlineDevs = [],
        hdlr = function (msg) {
            if (msg.type === 'DEV_INCOMING')
                onlineDevs.push(msg.data);
        },
        cb = function (err, result) {
            central.removeListener('IND', hdlr);
            if (err)
                callback(err);
            else {
                nc.commitReady();
                setTimeout(function () {
                    _.forEach(onlineDevs, function (dev) {
                        devIncomingHdlr(nc, dev);
                    });
                }, 10);
                callback(null);
            }
        };

    if (central._enable === true) {
        cb(null);
    } else {
        central.on('IND', hdlr);
        central.start(central.app, central._spCfg, cb);
    }
}

function stop (callback) {
    var central = this;

    central.permitJoin(0);
    callback(null);
}

function reset (mode, callback) {
    var central = this;

    central.reset(function (err) {
        if (err)
            callback(err);
        else {
            nc.commitReady();
            callback(null);
        } 
    });
}

function permitJoin (duration, callback) {
    var central = this,
        cb = function (msg) {
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
}

function remove (permAddr, callback) {
    var central = this,
        dev = central.find(permAddr);

    dev.remove(function (err) {
        if (err) 
            callback(err);
        else 
            callback(null, permAddr);
    });
}

function ping (permAddr, callback) {
    var central = this,
        dev = central.find(permAddr),
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
}

function ban (permAddr, callback) {
    var central = this;

    central.ban(permAddr, callback);
}

function unban (permAddr, callback) {
    var central = this;

    central.unban(permAddr, callback);
}

module.exports = function (netcore) {
    nc = netcore;

    return {
        start: start,
        stop: stop,
        reset: reset,
        permitJoin: permitJoin,
        remove: remove,
        ping: ping,
        ban: ban,
        unban: unban
    };
};
