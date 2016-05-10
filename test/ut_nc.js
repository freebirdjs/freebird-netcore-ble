var should = require('should'),
    _ = require('lodash'),
    nc = require('../netcore')('csr8510'),
    Netcore = require('freebird-base').Netcore,
    Device = require('freebird-base').Device,
    Gadget = require('freebird-base').Gadget;

var rawDev = {
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
    rawGad = {
        _ownerServ: {name: 'sensor'},
        uuid: '0xcc07',
        val: {
            flags: 0,
            sensorValue: 25
        }
    };

var dev = new Device(nc, rawDev),
    gad = new Gadget(dev, '0xcc00.0xcc07', rawGad);

describe('Cook Functional Check', function() {
    it('cookRawDev()', function (done) {
        nc.cookRawDev(dev, rawDev, function (err, cooked) {
            var netInfo = {
                    role: 'peripheral',
                    parent: {role: 'central'},
                    address: {permanent: '0x544a165e1f53', dynamic: 0}
                },
                attrInfo = {
                    manufacturer: 'Manufacturer Name',
                    model: 'Model Number',
                    serial: 'Serial Number',
                    version: {hw: 'Hardware Revision', sw: 'Software Revision', fw: 'Firmware Revision'}
                };

            if (err) {
                console.log(err);
            } else {
                if (_.isMatch(cooked._net, netInfo) &&
                    _.isMatch(cooked._attrs, attrInfo) )
                    done();
            }
        });
    });

    it('cookRawGad()', function (done) {
        nc.cookRawGad(gad, rawGad, function (err, cooked) {
            var panelInfo = {
                    profile: 'sensor',
                    class: 'temperature'
                },
                attrInfo = {
                    flags: 0,
                    sensorValue: 25
                };

            if (err) {
                console.log(err);
            } else {
                if (_.isMatch(cooked._panel, panelInfo) &&
                    _.isMatch(cooked._attrs , attrInfo))
                    done();
            }
        });
    });
});

describe('Netcore Drivers Check', function () {
    this.timeout(5000);
    it('start()', function (done) {
        nc.start(function (err) {
            if (err) {
                console.log(err);
            } else {
                done();
            }
        });
    });

    it('stop()', function (done) {
        nc.stop(function (err) {
            if (err) {
                console.log(err);
            } else {
                done();
            }
        });
    });

    it('start again', function (done) {
        nc.start(function (err) {
            if (err) {
                console.log(err);
            } else {
                done();
            }
        });
    });

    it('reset()', function (done) {
        // TODO
        done();
        // nc.reset(function (err) {
        //     if (err) {
        //         console.log(err);
        //     } else {
        //         done();
        //     }
        // });
    });

    it('permitJoin()', function (done) {
        var hdlr = function (msg) {
                if (msg.type === 'NWK_PERMITJOIN') {
                    if (msg.data === 30) {
                        nc._controller.removeListener('IND', hdlr);
                        done();
                    }
                }
            };

        nc._controller.on('IND', hdlr);
        nc.permitJoin(30, function (err) {
            if (err) console.log(err);
        });
    });

    this.timeout(15000);
    it('remove()', function (done) {
        var addr,
            devIncomeHdlr = function (msg) {
                if (msg.type === 'DEV_INCOMING') {
                    addr = msg.data;

                    nc._controller.on('IND', devLeaveHdlr);
                    nc.remove(addr, function (err) {
                        if (err) console.log(err);
                    });
                }
            },
            devLeaveHdlr = function (msg) {
                if (msg.type === 'DEV_LEAVING' && msg.data === addr) {
                    nc._controller.removeListener('IND', devIncomeHdlr);
                    nc._controller.removeListener('IND', devLeaveHdlr);
                    done();
                } 
            };

        nc._controller.on('IND', devIncomeHdlr);    
    });

    it('ping()',function () {
        // TODO
    });
    
    it('ban()', function (done) {
        nc.ban('0x544a165e1f53', function (err) {
            if (err) {
                console.log(err);
            } else if (nc.isBlacklisted('0x544a165e1f53')) {
                done();
            }
        });
    });

    it('unban()', function (done) {
        nc.unban('0x544a165e1f53', function (err) {
            if (err) {
                console.log(err);
            } else if (!nc.isBlacklisted('0x544a165e1f53')) {
                done();
            }
        });
    });
});

describe('Device Drivers Check', function () {
    var permAddr = '0x544a165e1f53';

    this.timeout(5000);
    it('connect to keyfob', function (done) {
        nc._controller.on('IND', function (msg) {
            if (msg.type === 'DEV_INCOMING') {
                if (msg.data === permAddr)
                    done();
            }
        }); 
    });

    it('read()', function () {
        nc.devRead(permAddr, 'manufacturer', function (err, result) {
            if (err) {
                console.log(err);
            } else if (result === 'Manufacturer Name')
                done();
        });
    });

    it('write()', function () {
        nc.devWrite(permAddr, 'manufacturer', 'Texas Instruments', function (err, result) {
            if (err) {
                console.log(err);
            } else {
                nc.devRead(permAddr, 'manufacturer', function (err, result) {
                    if (result === 'Texas Instruments')
                        done();
                });
            }
        });
    });

    it('identify', function (done) {
        //not implement
        done();
    });
});

describe('Gadget Drivers Check', function () {
    it('read()', function () {
        nc.gadRead()
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
