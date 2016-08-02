/* jshint node: true */
'use strict';

var BShepherd = require('ble-shepherd'),
    fbBase = require('freebird-base');

var msgHdlrs = require('./handlers/msgHdlrs.js'),
    cookRawDev = require('./components/cookRawDev.js'),
    cookRawGad = require('./components/cookRawGad.js');

// [TEST] for app testing
var bWhitelist = require('brocas-whitelist');
    

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
    shepherd.blocker(true, 'black');

    /***********************************************************************/
    /*** Create Netcore                                                  ***/
    /***********************************************************************/
    netcore = fbBase.createNetcore('blecore', shepherd, {phy: 'ble', nwk: 'ble'});
    netcore.cookRawDev = cookRawDev;
    netcore.cookRawGad = cookRawGad;

    drivers = require('./drivers/drivers.js')(netcore, shepherd);

    netcore.registerNetDrivers(drivers.net);
    netcore.registerDevDrivers(drivers.dev);
    netcore.registerGadDrivers(drivers.gad);

    /***********************************************************************/
    /*** Event Transducer                                                ***/
    /***********************************************************************/
    shepherd.on('IND', function (msg) {
        var data = msg.data,
            dev;

        switch (msg.type) {
            case 'DEV_INCOMING':
                msgHdlrs.devIncoming(netcore, data);
                break;

            case 'DEV_LEAVING':
                msgHdlrs.devLeaving(netcore, data);
                break;

            case 'ATT_IND':
                dev = shepherd.find(data.addr);
                msgHdlrs.devNotify(netcore, dev, data);
                break;
        }
    });


    // [TEST] for app testing
    bWhitelist(shepherd);

    return netcore;
};

module.exports = bleNc;