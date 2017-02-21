/* jshint node: true */
'use strict';

var BShepherd = require('ble-shepherd'),
    fbBase = require('freebird-base');

var msgHdlrs = require('./handlers/msgHdlrs.js'),
    cookRawDev = require('./components/cookRawDev.js'),
    cookRawGad = require('./components/cookRawGad.js');

var bleNc = function (subModule, spConfig) {
    if (subModule !== 'cc-bnp' && subModule !== 'noble')
        throw new Error('subModule must equal to cc-bnp or noble');

    if (subModule === 'cc-bnp' && !spConfig)
        throw new Error('spConfig must be given with cc-bnp sub module');

    var netcore,
        shepherd,
        drivers;

    var path = null,
        opts = null;

    if (spConfig) {
        path = spConfig.path ? spConfig.path : null;
        opts = spConfig.options ? spConfig.options : null;
    }

    shepherd = new BShepherd(subModule, path, opts);
    shepherd.blocker.enable('black');

    drivers = require('./drivers/drivers.js')(shepherd);
    /***********************************************************************/
    /*** Create Netcore                                                  ***/
    /***********************************************************************/
    netcore = fbBase.createNetcore('freebird-netcore-ble', shepherd, { 
        phy: 'ism2.4', 
        nwk: '',
        apl: 'ble' 
    });

    netcore._cookRawDev = cookRawDev;
    netcore._cookRawGad = cookRawGad;

    netcore.registerNetDrivers(drivers.net);
    netcore.registerDevDrivers(drivers.dev);
    netcore.registerGadDrivers(drivers.gad);

    /***********************************************************************/
    /*** Event Transducer                                                ***/
    /***********************************************************************/
    shepherd.on('ready', function () {
        netcore.commitReady();
    });

    shepherd.on('ind', function (msg) {
        var dev = msg.periph,
            data = msg.data;

        switch (msg.type) {
            case 'devIncoming':
                msgHdlrs.devIncoming(netcore, dev);
                break;

            case 'devLeaving':
                msgHdlrs.devLeaving(netcore, dev);
                break;

            case 'devStatus':
                msgHdlrs.devStatus(netcore, dev, data);
                break;

            case 'attNotify':
                msgHdlrs.devNotify(netcore, dev, data);
                break;

            case 'attChange':
                msgHdlrs.devNotify(netcore, dev, data);
                break;
        }
    });

    return netcore;
};

module.exports = bleNc;