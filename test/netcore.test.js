var sinon = require('sinon'),
    expect = require('chai').expect,
    _ = require('lodash');

var nc = require('../index')('noble'),
    Netcore = require('freebird-base').Netcore,
    Device = require('freebird-base').Device,
    Gadget = require('freebird-base').Gadget;

var RawDev = require('../node_modules/ble-shepherd/lib/model/peripheral'),
    RawGad = require('../node_modules/ble-shepherd/lib/model/characteristic'),
    rawDev = new RawDev({ addr: '0x544a165e1f53', connHdl: 5 }),
    rawGad = new RawGad({ uuid: '0xcc07' }, { name: 'sensor', _peripheral: { _controller: null } });

rawDev.servs = { 
    '0x180a': {
        chars: {
            '1': {
                uuid: '0x2a23',
                val: {"manufacturerID":"0x00005e1f53","organizationallyUID":"0x544a16"}
            },
            '5': {
                uuid: '0x2a24',
                val: {"modelNum":"Model Number"}
            },
            '8': {
                uuid: '0x2a25',
                val: {"serialNum":"Serial Number"}
            },
            '12': {
                uuid: '0x2a26',
                val: {"firmwareRev":"Firmware Revision"}
            },
            '16': {
                uuid: '0x2a27',
                val: {"hardwareRev":"Hardware Revision"}
            },
            '19': {
                uuid: '0x2a28',
                val: {"softwareRev":"Software Revision"}
            },
            '24': {
                uuid: '0x2a29',
                val: {"manufacturerName":"Manufacturer Name"}
            },
            '28': rawGad
        }
    }
};
rawGad.val = {
    flags: 0,
    sensorValue: 25
};

var controller = nc._controller,
    dev = new Device(nc, rawDev),
    gad = new Gadget(dev, '0xcc00.0xcc07', rawGad);

describe('Cook Functional Check', function() {
    it('cookRawDev()', function (done) {
        nc.cookRawDev(dev, rawDev, function (err, cooked) {
            var netInfo = {
                    role: 'peripheral',
                    address: {permanent: '0x544a165e1f53', dynamic: 5}
                },
                attrInfo = {
                    manufacturer: 'Manufacturer Name',
                    model: 'Model Number',
                    serial: 'Serial Number',
                    version: {
                        hw: 'Hardware Revision', 
                        sw: 'Software Revision', 
                        fw: 'Firmware Revision'
                    },
                    power: { 
                        type: undefined, 
                        voltage: undefined 
                    }
                };

            if (err) {
                console.log(err);
            } else {
                if (_.isEqual(cooked._net.address, netInfo.address) &&
                    _.isEqual(cooked._attrs, attrInfo) )
                    done();
            }
        });
    });

    it('cookRawGad()', function (done) {
        nc.cookRawGad(gad, rawGad, function (err, cooked) {
            var panelInfo = {
                    profile: 'sensor',
                    classId: 'temperature'
                },
                attrInfo = {
                    flags: 0,
                    sensorValue: 25
                };

            if (err) {
                console.log(err);
            } else {
                panelInfo.enabled = false;

                if (_.isEqual(cooked._panel, panelInfo) &&
                    _.isEqual(cooked._attrs , attrInfo))
                    done();
            }
        });
    });
});

describe('Netcore Drivers Check', function () {
    it('start()', function (done) {
        var startStub = sinon.stub(controller, 'start', function (app, cfg, callback) {
                controller._enable = true;
                callback(null);
            }),
            args = [ controller.app, controller._spCfg ];

        nc.start(function (err) {
            if (err) {
                console.log(err);
            } else {
                startStub.firstCall.args.pop();

                if (startStub.calledOnce &&
                    _.isEqual(startStub.firstCall.args, args)) {
                    startStub.restore();
                    done();
                }                    
            }
        });
    });

    // it('stop()', function (done) {
    //     var permitJoinStub = sinon.stub(controller, 'permitJoin', function () {});

    //     nc.stop(function (err) {
    //         if (err) {
    //             console.log(err);
    //         } else {
    //             if (permitJoinStub.calledOnce &&
    //                 _.isEqual(permitJoinStub.firstCall.args, [ 0 ])) {
    //                 permitJoinStub.restore();
    //                 done();
    //             }
    //         }
    //     });
    // });

    // it('reset()', function (done) {
    //     var resetStub = sinon.stub(controller, 'reset', function (callback) {
    //             callback(null);
    //         }),
    //         cb = function (err) {
    //             if (err) {
    //                 console.log(err);
    //             } else {
    //                 if (resetStub.calledOnce &&
    //                     resetStub.firstCall.args, [ cb ])
    //                     resetStub.restore();
    //                     done();
    //             }
    //         };
   
    //     nc.reset(cb);
    // });

    it('permitJoin()', function (done) {
        var duration = 50,
            permitJoinStub = sinon.stub(controller, 'permitJoin', function () {});

        nc.permitJoin(duration, function (err, result) {
            if (err) 
                console.log(err);
            else {
                if (result === duration &&
                    permitJoinStub.calledOnce &&
                    _.isEqual(permitJoinStub.firstCall.args, [ duration ])) {
                    permitJoinStub.restore();
                    done();
                }
            }
        });
        controller.emit('IND', { type: 'NWK_PERMITJOIN', data: duration });
    });

    it('remove()', function (done) {
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            periphReadStub = sinon.stub(rawDev, 'remove', function (callback) {
                callback(null);
            });

        nc.remove(rawDev.addr, function (err, result) {
            if (err)
                console.log(err);
            else {
                periphReadStub.firstCall.args.pop();

                if (result === rawDev.addr &&
                    findStub.calledOnce &&
                    _.isEqual(findStub.firstCall.args, rawDev.addr) &&
                    periphReadStub.calledOnce &&
                    _.isEqual(periphReadStub.firstCall.args, [ '0x180a', '0x2a24' ])) {
                    findStub.restore();
                    periphReadStub.restore();
                    done();
                }
            }
        });  
    });

    it('ping()',function (done) {
        var time = 170,
            findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            periphReadStub = sinon.stub(rawDev, 'read', function (uuidServ, uuidChar, cb) {
                cb(null, time);
            });
        
        nc.ping(raw.addr, function (err, result) {
            if (err)
                console.log(err);
            else {
                if (result === time &&
                    findStub.calledOnce &&
                    _.isEqual(findStub.firstCall.args, rawDev.addr) &&
                    periphReadStub.calledOnce) {
                    findStub.restore();
                    periphReadStub.restore();
                    done();
                }
            }
        });
    });
    
    // it('ban()', function (done) {
    //     nc.ban('0x544a165e1f53', function (err) {
    //         if (err) {
    //             console.log(err);
    //         } else if (nc.isBlacklisted('0x544a165e1f53')) {
    //             done();
    //         }
    //     });
    // });

    // it('unban()', function (done) {
    //     nc.unban('0x544a165e1f53', function (err) {
    //         if (err) {
    //             console.log(err);
    //         } else if (!nc.isBlacklisted('0x544a165e1f53')) {
    //             done();
    //         }
    //     });
    // });
});