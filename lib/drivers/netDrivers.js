var _ = require('busyman'),
    devIncomingHdlr = require('../handlers/devIncomingHdlr');

var nc;

function start (callback) {
    var central = this,
        onlineDevs = [],
        hdlr = function (msg) {
            if (msg.type === 'devIncoming')
                onlineDevs.push(msg.periph);
        },
        cb = function (err, result) {
            central.removeListener('ind', hdlr);
            if (err)
                callback(err);
            else {
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
        central.on('ind', hdlr);
        central.once('ready', function () {
            central.removeListener('ind', hdlr);
        });

        central.start(cb);
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
        else 
            callback(null);
    });
}

function permitJoin (duration, callback) {
    var central = this,
        cb = function (joinTimeLeft) {
            callback(null, joinTimeLeft);
            central.removeListener('permitJoining', cb);
        };

    try {
        central.on('permitJoining', cb);
        central.permitJoin(duration);
    } catch (e) {
        central.removeListener('permitJoining', cb);
        callback(e);
    }
}

function remove (permAddr, callback) {
    var central = this,
        dev = central.find(permAddr);

    central.remove(permAddr, function (err) {
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

    central.blocker.block(permAddr, callback);
}

function unban (permAddr, callback) {
    var central = this;

    central.blocker.unblock(permAddr, callback);
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
