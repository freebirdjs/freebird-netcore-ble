var should = require('should'),
    nc = require('../netcore')('csr8510'),
    Netcore = require('freebird-base').Netcore,
    Device = require('freebird-base').Device,
    Gadget = require('freebird-base').Gadget;

describe('Cook Functional Check', function() {
    it('cookRawDev()', function () {
        var raw = {
                _ownerDevmgr: {
                    bleDevices: [{role: 'central'}]
                },
                role: 'peripheral',
                addr: '0x544a165e1f53',
                connHdl: 0,
                servs: { 
                    '0x180a': {
                        chars: {
                            '0x2a23': {
                                val: {"manufacturerID":"0x00005e1f53","organizationallyUID":"0x544a16"}
                            },
                            '0x2a24': {
                                val: {"modelNum":"Model Number"}
                            },
                            '0x2a25': {
                                val: {"serialNum":"Serial Number"}
                            },
                            '0x2a26': {
                                val: {"firmwareRev":"Firmware Revision"}
                            },
                            '0x2a27': {
                                val: {"hardwareRev":"Hardware Revision"}
                            },
                            '0x2a28': {
                                val: {"softwareRev":"Software Revision"}
                            },
                            '0x2a29': {
                                val: {"manufacturerName":"Manufacturer Name"}
                            }
                        }
                    }
                }
            },
            dev = new Device(nc, raw);

        nc.cookRawDev(dev, raw, function (err, cooked) {
            if (err) {
                console.log(err);
            } else {
                if (cooked._)
            }
        });
    });

    it('cookRawGad()', function () {

    });
});

describe('Netcore Drivers Check', function () {
    it('start()', function () {

    });

    it('stop()', function () {

    });

    it('reset()', function () {

    });

    it('permitJoin()', function () {

    });

    it('remove()', function () {

    });

    it('ping()',function () {

    });
    
    it('ban()', function () {

    });

    it('unban()', function () {

    });
});

describe('Device Drivers Check', function () {
    it('read()', function () {

    });

    it('write()', function () {

    });

    it('identify', function () {

    });
});

describe('Gadget Drivers Check', function () {
    it('read()', function () {

    });

    it('write()', function () {

    });

    it('exec()', function () {

    });

    it('setReportCfg()', function () {

    });

    it('getReportCfg()', function () {

    });
});
