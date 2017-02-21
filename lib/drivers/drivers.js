var netDrivers = require('./netDrivers'),
    devDrivers =  require('./devDrivers'),
    gadDrivers = require('./gadDrivers');

var drivers = {
    net: null,
    dev: null,
    gad: null,
};

module.exports = function (controller) {
    if (!controller)
        throw new Error('Controller should be given when requiring this module.');

    if (drivers.net === null) {
        drivers.net = {};
        // Mandatory
        drivers.net.start = netDrivers.start.bind(controller);
        drivers.net.stop = netDrivers.stop.bind(controller);
        drivers.net.reset = netDrivers.reset.bind(controller);
        drivers.net.permitJoin = netDrivers.permitJoin.bind(controller);
        drivers.net.remove = netDrivers.remove.bind(controller);
        drivers.net.ping = netDrivers.ping.bind(controller);
        // Optional
        drivers.net.ban = typeof netDrivers.ban === 'function' ? netDrivers.ban.bind(controller) : undefined;
        drivers.net.unban = typeof netDrivers.unban === 'function' ? netDrivers.unban.bind(controller) : undefined;
    }

    if (drivers.dev === null) {
        drivers.dev = {};
        // Mandatory
        drivers.dev.read = devDrivers.read.bind(controller);
        drivers.dev.write = devDrivers.write.bind(controller);
        // Optional
        drivers.dev.identify = typeof devDrivers.identify === 'function' ? devDrivers.identify.bind(controller) : undefined;
    }

    if (drivers.gad === null) {
        drivers.gad = {};
        // Mandatory
        drivers.gad.read = gadDrivers.read.bind(controller);
        drivers.gad.write = gadDrivers.write.bind(controller);
        // Optional
        drivers.gad.exec = typeof gadDrivers.exec === 'function' ? gadDrivers.exec.bind(controller) : undefined;
        drivers.gad.readReportCfg = typeof gadDrivers.readReportCfg === 'function' ? gadDrivers.readReportCfg.bind(controller) : undefined;
        drivers.gad.writeReportCfg = typeof gadDrivers.writeReportCfg === 'function' ? gadDrivers.writeReportCfg.bind(controller) : undefined;
    }

    return drivers;
};