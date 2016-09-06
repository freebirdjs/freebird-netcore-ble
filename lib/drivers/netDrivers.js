var _ = require('busyman');

var nc;

function start (callback) {
    var central = this;

    if (central._enable === true) {
        callback(null);
    } else {
        central.start(callback);
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
