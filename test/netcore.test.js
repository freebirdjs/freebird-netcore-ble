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
                _service: { uuid: '0x180a' },
                uuid: '0x2a23',
                val: {"manufacturerID":"0x00005e1f53","organizationallyUID":"0x544a16"}
            },
            '5': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a24',
                val: {"modelNum":"Model Number"}
            },
            '8': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a25',
                val: {"serialNum":"Serial Number"}
            },
            '12': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a26',
                val: {"firmwareRev":"Firmware Revision"}
            },
            '16': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a27',
                val: {"hardwareRev":"Hardware Revision"}
            },
            '19': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a28',
                val: {"softwareRev":"Software Revision"}
            },
            '24': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a29',
                val: {"manufacturerName":"Manufacturer Name"}
            }
        }
    },
    '0xcc00': {
        chars: {
            '28': rawGad
        }
    }
};
rawGad._service.uuid = '0xcc00';
rawGad.val = {
    flags: 0,
    sensorValue: 25
};

var controller = nc._controller,
    dev = new Device(nc, rawDev),
    gad = new Gadget(dev, '0xcc00.0xcc07', rawGad);

var invokeCbNextTick = function (cb) {
        process.nextTick(function () {
            cb(null);
        });
};

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
        var startStub = sinon.stub(controller, 'start', function (callback) {
                controller._enable = true;
                invokeCbNextTick(callback);
            });

        nc.start(function (err) {
            if (err) {
                console.log(err);
            } else {
                startStub.firstCall.args.pop();

                if (startStub.calledOnce) {
                    startStub.restore();
                    done();
                }                    
            }
        });
    });

    it('stop()', function (done) {
        var permitJoinStub = sinon.stub(controller, 'permitJoin', function () {});

        nc.stop(function (err) {
            if (err) {
                console.log(err);
            } else {
                if (permitJoinStub.calledOnce &&
                    _.isEqual(permitJoinStub.firstCall.args, [ 0 ])) {
                    permitJoinStub.restore();
                    done();
                }
            }
        });
    });

    it('start() - restart', function (done) {
        var startStub = sinon.stub(controller, 'start', function () {});

        nc.start(function (err) {
            if (err) {
                console.log(err);
            } else {
                if (!startStub.called) {
                    startStub.restore();
                    done();
                }                    
            }
        });
    });

    it('reset()', function (done) {
        var resetStub = sinon.stub(controller, 'reset', function (callback) {
                invokeCbNextTick(callback);
            }),
            cb = function (err) {
                if (err) {
                    console.log(err);
                } else {
                    if (resetStub.calledOnce &&
                        resetStub.firstCall.args, [ cb ])
                        resetStub.restore();
                        done();
                }
            };
   
        nc.reset(cb);
    });

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
        // nc.enable();
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            periphRmvStub = sinon.stub(rawDev, 'remove', function (callback) {
                invokeCbNextTick(callback);
            });

        nc.remove(rawDev.addr, function (err, result) {
            if (err)
                console.log(err);
            else {
                periphRmvStub.firstCall.args.pop();

                if (result === rawDev.addr &&
                    findStub.calledOnce &&
                    _.isEqual(findStub.firstCall.args, [ rawDev.addr ]) &&
                    periphRmvStub.calledOnce) {
                    findStub.restore();
                    periphRmvStub.restore();
                    done();
                }
            }
        });  
    });

    it('ping()',function (done) {
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            devReadStub = sinon.stub(rawDev, 'read', function (uuidServ, uuidChar, cb) {
                cb(null, 170);
            });
        
        nc.ping(rawDev.addr, function (err, result) {
            if (err)
                console.log(err);
            else {
                devReadStub.firstCall.args.pop();

                if (!_.isNil(result) &&
                    findStub.calledOnce &&
                    _.isEqual(findStub.firstCall.args, [ rawDev.addr ]) &&
                    devReadStub.calledOnce && 
                    _.isEqual(devReadStub.firstCall.args, [ '0x180a', '0x2a24' ])) {
                    findStub.restore();
                    devReadStub.restore();
                    done();
                }
            }
        });
    });
    
    it('ban()', function (done) {
        var banStub = sinon.stub(controller, 'ban', function (permAddr, cb) {
                cb(null);
            });

        nc.ban(rawDev.addr, function (err) {
            if (err) {
                console.log(err);
            } else {
                banStub.firstCall.args.pop();
                
                if (nc.isBlacklisted(rawDev.addr) &&
                    banStub.calledOnce &&
                    _.isEqual(banStub.firstCall.args, [ rawDev.addr ])) {
                    banStub.restore();
                    done();
                }
            }
        });
    });

    it('unban()', function (done) {
        var unbanStub = sinon.stub(controller, 'unban', function (permAddr, cb) {
                cb(null);
            });

        nc.unban(rawDev.addr, function (err) {
            if (err) {
                console.log(err);
            } else {
                unbanStub.firstCall.args.pop();
                
                if (!nc.isBlacklisted(rawDev.addr) &&
                    unbanStub.calledOnce &&
                    _.isEqual(unbanStub.firstCall.args, [ rawDev.addr ])) {
                    unbanStub.restore();
                    done();
                }
            }
        });
    });
});

describe('Device Drivers Check', function () {
    it('read()', function (done) {
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            devReadStub = sinon.stub(rawDev, 'read', function (uuidServ, uuidChar, cb) {
                cb(null, rawDev.findChar('0x180a', '0x2a25').val.serialNum);
            });
        
        nc.devRead(rawDev.addr, 'serial', function (err, result) {
            if (err)
                console.log(err);
            else {
                devReadStub.firstCall.args.pop();

                if (_.isEqual(result, rawDev.findChar('0x180a', '0x2a25').val.serialNum) &&
                    findStub.calledOnce &&
                    _.isEqual(findStub.firstCall.args, [ rawDev.addr ]) &&
                    devReadStub.calledOnce && 
                    _.isEqual(devReadStub.firstCall.args, [ '0x180a', '0x2a25' ])) {
                    findStub.restore();
                    devReadStub.restore();
                    done();
                }
            }
        });
    });

    it('read() - attr not exist', function (done) {
        nc.devRead(rawDev.addr, 'xxx', function (err, result) {
            if (err) done();
        });
    });

    it('write()', function (done) {
        var writeVal = 'test',
            findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            devWriteStub = sinon.stub(rawDev, 'write', function (uuidServ, uuidChar, val, cb) {
                cb(null, val);
            });
        
        nc.devWrite(rawDev.addr, 'serial', writeVal, function (err, result) {
            if (err)
                console.log(err);
            else {
                devWriteStub.firstCall.args.pop();

                if (_.isEqual(result, writeVal) &&
                    findStub.calledOnce &&
                    _.isEqual(findStub.firstCall.args, [ rawDev.addr ]) &&
                    devWriteStub.calledOnce && 
                    _.isEqual(devWriteStub.firstCall.args, [ '0x180a', '0x2a25', { serialNum: writeVal } ])) {
                    findStub.restore();
                    devWriteStub.restore();
                    done();
                }
            }
        });
    });

    it('write() - attr not exist', function (done) {
        nc.devWrite(rawDev.addr, 'xxx', 'xxxx', function (err, result) {
            if (err) done();
        });
    });

    it('identify', function (done) {
        //not implement
        done();
    });
});

describe('Gadget Drivers Check', function () {
    it('read()', function (done) {
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            gadReadStub = sinon.stub(rawDev, 'read', function (uuidServ, uuidChar, cb) {
                cb(null, rawDev.findChar('0xcc00', '0xcc07').val.sensorValue);
            });

        nc.gadRead(rawDev.addr, '0xcc00.0xcc07', 'sensorValue', function (err, result) {
            if (err) {
                console.log(err);
            } else {
                gadReadStub.firstCall.args.pop();

                if (_.isEqual(result, rawDev.findChar('0xcc00', '0xcc07').val.sensorValue) &&
                    findStub.calledOnce &&
                    _.isEqual(findStub.firstCall.args, [ rawDev.addr ]) &&
                    gadReadStub.calledOnce &&
                    _.isEqual(gadReadStub.firstCall.args, [ '0xcc00', '0xcc07' ])) {
                    findStub.restore();
                    gadReadStub.restore();
                    done();
                }
            }
        });
    });

    it('write()', function (done) {
        var writeVal = 60,
            findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            gadWriteStub = sinon.stub(rawDev, 'write', function (uuidServ, uuidChar, val, cb) {
                cb(null, val);
            });
        
        nc.gadWrite(rawDev.addr, '0xcc00.0xcc07', 'sensorValue', writeVal, function (err, result) {
            if (err)
                console.log(err);
            else {
                gadWriteStub.firstCall.args.pop();

                if (_.isEqual(result, writeVal) &&
                    findStub.calledOnce &&
                    _.isEqual(findStub.firstCall.args, [ rawDev.addr ]) &&
                    gadWriteStub.calledOnce && 
                    _.isEqual(gadWriteStub.firstCall.args, [ '0xcc00', '0xcc07', { flags: 0, sensorValue: writeVal } ])) {
                    findStub.restore();
                    gadWriteStub.restore();
                    done();
                }
            }
        });
    });

    it('exec()', function (done) {
        //not implement
        done();
    });

    var cfg1 = {
            pmin: 5,
            pmax: 60,
            gt: 50,
            enable: false
        },
        cfg2 = {
            pmin: 1,
            pmax: 2,
            gt: 50,
            enable: true
        };

    it('setReportCfg() - close', function (done) {
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            devNotifyStub = sinon.stub(rawDev, 'setNotify', function () {});

        nc.setReportCfg(rawDev.addr, '0xcc00.0xcc07', 'sensorValue', cfg1, function (err, result) {
            if (err)
                console.log(err);
            else {
                if (result === false &&
                    findStub.calledOnce &&
                    findStub.firstCall.args, [ rawDev.addr ] &&
                    devNotifyStub.calledOnce &&
                    _.isEqual(devNotifyStub.firstCall.args, [ '0xcc00', '0xcc07', false ])) {
                    findStub.restore();
                    devNotifyStub.restore();
                    done();
                }
            }
        });
    });

    it('getReportCfg()', function (done) {
        nc.getReportCfg(rawDev.addr, '0xcc00.0xcc07', 'sensorValue', function (err, result) {
            if (_.isEqual(result, cfg1)) done();
        });
    });

    this.timeout(5000);
    it('setReportCfg()', function (done) {
        var enable,
            findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            devNotifyStub = sinon.stub(rawDev, 'setNotify', function () {}),
            devReadStub = sinon.stub(rawDev, 'read', function () {});

        setTimeout(function () {
            devReadStub.firstCall.args.pop();
            devReadStub.secondCall.args.pop();

            if (enable === true &&
                findStub.called &&
                _.isEqual(findStub.firstCall.args, [ rawDev.addr ]) &&
                devNotifyStub.calledOnce &&
                _.isEqual(devNotifyStub.firstCall.args, [ '0xcc00', '0xcc07', true ]) &&
                devReadStub.callCount === 2 && 
                _.isEqual(devReadStub.firstCall.args, [ '0xcc00', '0xcc07' ]) &&
                _.isEqual(devReadStub.secondCall.args, [ '0xcc00', '0xcc07' ])) {
                findStub.restore();
                devNotifyStub.restore();
                devReadStub.restore();
                done();
            }
        }, 3100);


        nc.setReportCfg(rawDev.addr, '0xcc00.0xcc07', 'sensorValue', cfg2, function (err, result) {
            if (err)
                console.log(err);
            else
                enable = result;
        });
    });

    this.timeout(2000);
    it('getReportCfg()', function (done) {
        nc.getReportCfg(rawDev.addr, '0xcc00.0xcc07', 'sensorValue', function (err, result) {
            if (_.isEqual(result, cfg2)) done();
        });
    });
});

describe('Controller Handlers Check', function () {
    it('devIncomingHdlr()', function (done) {
        var ncCmtDevInStub = sinon.stub(nc, 'commitDevIncoming', function () {}),
            ncCmtGadInStub = sinon.stub(nc, 'commitGadIncoming', function () {});

        controller.emit('IND', { type: 'DEV_INCOMING', data: rawDev});


        if (ncCmtDevInStub.calledOnce &&
            _.isEqual(ncCmtDevInStub.firstCall.args, [ rawDev.addr, rawDev ]) &&
            ncCmtGadInStub.calledOnce &&
            _.isEqual(ncCmtGadInStub.firstCall.args, [ rawDev.addr, '0xcc00.0xcc07', rawDev.findChar('0xcc00', '0xcc07') ])) {

            ncCmtDevInStub.restore();
            ncCmtGadInStub.restore();
            done();
        }
    });

    it('devLeavingHdlr()', function (done) {
        var ncCmtDevOutStub = sinon.stub(nc, 'commitDevLeaving', function () {});

        controller.emit('IND', { type: 'DEV_LEAVING', data: rawDev.addr});

        if (ncCmtDevOutStub.calledOnce &&
            _.isEqual(ncCmtDevOutStub.firstCall.args, [ rawDev.addr ])) {
            ncCmtDevOutStub.restore();
            done();
        }
    });

    it('devNotifyHdlr() - device attribute', function (done) {
        var attIndMsg = {
                type: 'ATT_IND',
                data: {
                    addr: rawDev.addr,
                    servUuid: '0x180a',
                    charUuid: '0x2a29',
                    value: { manufacturerName: 'sivann' }
                }
            },
            findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            ncCmtDevNotifStub = sinon.stub(nc, 'commitDevReporting', function () {});

        controller.emit('IND', attIndMsg);

        if (findStub.calledOnce &&
            findStub.firstCall.args, [ rawDev.addr ] &&
            ncCmtDevNotifStub.calledOnce &&
            _.isEqual(ncCmtDevNotifStub.firstCall.args, [ rawDev.addr, { manufacturer: 'sivann' } ])) {
            findStub.restore();
            ncCmtDevNotifStub.restore();
            done();
        }
    });

    it('devNotifyHdlr() - gadget attribute(dangerous)', function (done) {
        var attIndMsg = {
                type: 'ATT_IND',
                data: {
                    addr: rawDev.addr,
                    servUuid: '0xcc00',
                    charUuid: '0xcc07',
                    value: {
                        id: 0,
                        flags: 0,
                        sensorValue: 26.5
                    }
                }
            },
            findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            ncCmtGadNotifStub = sinon.stub(nc, 'dangerouslyCommitGadReporting', function () {});

        controller.emit('IND', attIndMsg);

        if (findStub.calledOnce &&
            findStub.firstCall.args, [ rawDev.addr ] &&
            ncCmtGadNotifStub.calledOnce &&
            _.isEqual(ncCmtGadNotifStub.firstCall.args, [ rawDev.addr, '0xcc00.0xcc07', attIndMsg.data.value ])) {
            findStub.restore();
            ncCmtGadNotifStub.restore();
            done();
        }
    });

    it('devNotifyHdlr() - gadget attribute', function (done) {
        var attIndMsg = {
                type: 'ATT_IND',
                data: {
                    addr: rawDev.addr,
                    servUuid: '0xcc00',
                    charUuid: '0xcc07',
                    value: {
                        id: 0,
                        flags: 0,
                        sensorValue: 26.5
                    }
                }
            },
            findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            ncCmtGadNotifStub = sinon.stub(nc, 'commitGadReporting', function () {});

        rawGad.prop = ['read'];
        controller.emit('IND', attIndMsg);

        if (findStub.calledOnce &&
            findStub.firstCall.args, [ rawDev.addr ] &&
            ncCmtGadNotifStub.calledOnce &&
            _.isEqual(ncCmtGadNotifStub.firstCall.args, [ rawDev.addr, '0xcc00.0xcc07', attIndMsg.data.value ])) {
            findStub.restore();
            ncCmtGadNotifStub.restore();
            done();
        }
    });
});