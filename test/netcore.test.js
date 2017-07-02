var chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = require('chai').expect,
    _ = require('busyman');

chai.use(sinonChai);

var nc = require('../index')('cc-bnp', { path: 'xxx' }),
    fbBase = require('freebird-base');

var RawDev = require('../node_modules/ble-shepherd/lib/model/peripheral'),
    RawGad = require('../node_modules/ble-shepherd/lib/model/characteristic'),
    rawDev = new RawDev({ addr: '0x544a165e1f53', connHandle: 5 }),
    rawGad = new RawGad({ uuid: '0xcc07', handle: 28, prop: ['notif'] }, { name: 'sensor', _peripheral: { _controller: null } });

rawDev.servs = { 
    '0x180a': {
        uuid: '0x180a',
        chars: {
            '1': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a23',
                value: {"manufacturerID":"0x00005e1f53","organizationallyUID":"0x544a16"},
                dump: function () {
                    return { uuid: this.uuid, value: this.value };
                }
            },
            '5': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a24',
                value: {"modelNum":"Model Number"},
                dump: function () {
                    return { uuid: this.uuid, value: this.value };
                }
            },
            '8': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a25',
                value: {"serialNum":"Serial Number"},
                dump: function () {
                    return { uuid: this.uuid, value: this.value };
                }
            },
            '12': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a26',
                value: {"firmwareRev":"Firmware Revision"},
                dump: function () {
                    return { uuid: this.uuid, value: this.value };
                }
            },
            '16': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a27',
                value: {"hardwareRev":"Hardware Revision"},
                dump: function () {
                    return { uuid: this.uuid, value: this.value };
                }
            },
            '19': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a28',
                value: {"softwareRev":"Software Revision"},
                dump: function () {
                    return { uuid: this.uuid, value: this.value };
                }
            },
            '24': {
                _service: { uuid: '0x180a' },
                uuid: '0x2a29',
                value: {"manufacturerName":"Manufacturer Name"},
                dump: function () {
                    return { uuid: this.uuid, value: this.value };
                }
            }
        }
    },
    '0xcc00': {
        uuid: '0xcc00',
        chars: {
            '28': rawGad
        }
    }
};
rawGad._service.uuid = '0xcc00';
rawGad.value = {
    flags: 0,
    sensorValue: 25
};

var controller = nc._controller,
    dev = fbBase.createDevice(nc, rawDev),
    gad = fbBase.createGadget(dev, '0xcc00.0xcc07.28', rawGad);

var invokeCbNextTick = function (cb) {
    setImmediate(cb, null);
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
                        type: '', 
                        voltage: '' 
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
                    enabled: false,
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
                expect(startStub).to.be.calledOnce;
                startStub.restore();
                done();                
            }
        });
    });

    it('stop()', function (done) {
        var permitJoinSpy = sinon.spy(controller, 'permitJoin');

        nc.stop(function (err) {
            if (err) {
                console.log(err);
            } else {
                controller._enable = false;
                expect(permitJoinSpy).to.be.calledTwice;
                expect(permitJoinSpy).to.be.calledWith(0);

                permitJoinSpy.restore();
                done();
            }
        });
    });

    it('start() - restart', function (done) {
        var startStub = sinon.stub(controller, 'start', function (callback) {
                controller._enable = true;
                invokeCbNextTick(callback);
            });

        nc.start(function (err) {
            if (err) {
                console.log(err);
            } else {
                expect(startStub).to.be.calledOnce;
                startStub.restore();
                done();                       
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
                    controller.emit('ready');

                    expect(resetStub).to.be.calledOnce;

                    resetStub.restore();
                    done();
                }
            };
   
        nc.reset(cb);
    });

    it('permitJoin()', function (done) {
        var duration = 50,
            permitJoinStub = sinon.stub(controller, 'permitJoin', function () {
                controller.emit('permitJoining', duration);
            });

        nc.permitJoin(duration, function (err, result) {
            if (err) 
                console.log(err);
            else {
                expect(result).to.be.equal(duration);
                expect(permitJoinStub).to.be.calledOnce;
                expect(permitJoinStub).to.be.calledWith(duration);

                permitJoinStub.restore();
                done();
            }
        });
    });

    it('remove()', function (done) {
        // nc.enable();
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            periphRmvStub = sinon.stub(controller, 'remove', function (addr, callback) {
                invokeCbNextTick(callback);
            });

        nc.remove(rawDev.addr, function (err, result) {
            if (err)
                console.log(err);
            else {
                periphRmvStub.firstCall.args.pop();

                expect(result).to.be.equal(rawDev.addr);
                expect(findStub).to.be.calledOnce;
                expect(findStub).to.be.calledWith(rawDev.addr);
                expect(periphRmvStub).to.be.calledOnce;

                findStub.restore();
                periphRmvStub.restore();
                done();
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

                expect(result).to.be.a.number;
                expect(findStub).to.be.calledOnce;
                expect(findStub).to.be.calledWith(rawDev.addr);
                expect(devReadStub).to.be.calledOnce;
                expect(devReadStub).to.be.calledWith('0x180a', '0x2a24');

                findStub.restore();
                devReadStub.restore();
                done();
            }
        });
    });
    
    it('ban()', function (done) {
        var banStub = sinon.stub(controller.blocker, 'block', function (permAddr, cb) {
                cb(null, rawDev.addr);
            });

        nc.ban(rawDev.addr, function (err, result) {
            if (err) {
                console.log(err);
            } else {
                banStub.firstCall.args.pop();

                expect(result).to.be.equal(rawDev.addr);
                expect(nc.isBlacklisted(rawDev.addr)).to.be.true;
                expect(banStub).to.be.calledOnce;
                expect(banStub).to.be.calledWith(rawDev.addr);

                banStub.restore();
                done();
            }
        });
    });

    it('unban()', function (done) {
        var unbanStub = sinon.stub(controller.blocker, 'unblock', function (permAddr, cb) {
                cb(null, rawDev.addr);
            });

        nc.unban(rawDev.addr, function (err, result) {
            if (err) {
                console.log(err);
            } else {
                unbanStub.firstCall.args.pop();

                expect(result).to.be.equal(rawDev.addr);
                expect(nc.isBlacklisted(rawDev.addr)).to.be.false;
                expect(unbanStub).to.be.calledOnce;
                expect(unbanStub).to.be.calledWith(rawDev.addr);

                unbanStub.restore();
                done();
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
                cb(null, rawDev.findChar('0x180a', '0x2a25').value.serialNum);
            });

        dev.enable();
        
        dev.read('serial', function (err, result) {
            if (err)
                console.log(err);
            else {
                devReadStub.firstCall.args.pop();

                expect(result).to.be.equal(rawDev.findChar('0x180a', '0x2a25').value.serialNum);
                expect(findStub).to.be.calledOnce;
                expect(findStub).to.be.calledWith(rawDev.addr);
                expect(devReadStub).to.be.calledOnce;
                expect(devReadStub).to.be.calledWith('0x180a', '0x2a25');

                findStub.restore();
                devReadStub.restore();
                done();
            }
        });
    });

    it('read() - attr not exist', function (done) {
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            });

        dev.read('xxx', function (err, result) {
            if (err && err.message === 'attrName: xxx not exist.') {
                findStub.restore();
                done();
            }
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
        
        dev.write('serial', writeVal, function (err, result) {
            if (err)
                console.log(err);
            else {
                devWriteStub.firstCall.args.pop();

                expect(result).to.be.equal(writeVal);
                expect(findStub).to.be.calledOnce;
                expect(findStub).to.be.calledWith(rawDev.addr);
                expect(devWriteStub).to.be.calledOnce;
                expect(devWriteStub).to.be.calledWith('0x180a', '0x2a25', { serialNum: writeVal });

                findStub.restore();
                devWriteStub.restore();
                done();
            }
        });
    });

    it('write() - attr not exist', function (done) {
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            });

        dev.write('xxx', 'xxxx', function (err, result) {
            if (err && err.message === 'attrName: xxx not exist.') {
                findStub.restore();
                done();
            }
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
                cb(null, rawDev.findChar('0xcc00', '0xcc07').value.sensorValue);
            });

        gad.enable();

        gad.read('sensorValue', function (err, result) {
            if (err) {
                console.log(err);
            } else {
                gadReadStub.firstCall.args.pop();

                expect(result).to.be.equal(rawDev.findChar('0xcc00', '0xcc07').value.sensorValue);
                expect(findStub).to.be.calledOnce;
                expect(findStub).to.be.calledWith(rawDev.addr);
                expect(gadReadStub).to.be.calledOnce;
                expect(gadReadStub).to.be.calledWith('0xcc00', 28);

                findStub.restore();
                gadReadStub.restore();
                done();
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
        
        gad.write('sensorValue', writeVal, function (err, result) {
            if (err)
                console.log(err);
            else {
                gadWriteStub.firstCall.args.pop();

                expect(result).to.be.equal(writeVal);
                expect(findStub).to.be.calledOnce;
                expect(findStub).to.be.calledWith(rawDev.addr);
                expect(gadWriteStub).to.be.calledOnce;
                expect(gadWriteStub).to.be.calledWith('0xcc00', 28, { flags: 0, sensorValue: writeVal });

                findStub.restore();
                gadWriteStub.restore();
                done();
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

    it('writeReportCfg() - close', function (done) {
        var findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            devNotifyStub = sinon.stub(rawDev, 'configNotify', function () {});

        gad.writeReportCfg('sensorValue', cfg1, function (err, result) {
            if (err)
                console.log(err);
            else {
                expect(result).to.be.equal(true);
                expect(findStub).to.be.calledOnce;
                expect(findStub).to.be.calledWith(rawDev.addr);
                expect(devNotifyStub).to.be.calledOnce;
                expect(devNotifyStub).to.be.calledWith('0xcc00', 28, false);

                findStub.restore();
                devNotifyStub.restore();
                done();
            }
        });
    });

    it('readReportCfg()', function (done) {
        gad.readReportCfg('sensorValue', function (err, result) {
            if (_.isEqual(result, cfg1)) 
                done();
        });
    });

    it('writeReportCfg()', function (done) {
        this.timeout(5000);

        var enable,
            findStub = sinon.stub(controller, 'find', function () {
                return rawDev;
            }),
            devNotifyStub = sinon.stub(rawDev, 'configNotify', function () {}),
            devReadStub = sinon.stub(rawDev, 'read', function () {});

        setTimeout(function () {
            devReadStub.firstCall.args.pop();
            devReadStub.secondCall.args.pop();

            expect(enable).to.be.equal(true);
            expect(findStub).to.be.calledThrice;
            expect(findStub).to.be.always.calledWith(rawDev.addr);
            expect(devNotifyStub).to.be.calledOnce;
            expect(devNotifyStub).to.be.calledWith('0xcc00', 28, true);
            expect(devReadStub).to.be.calledTwice;
            expect(devReadStub).to.be.always.calledWith('0xcc00', 28);

            gad.writeReportCfg('sensorValue', { enable: false }, function (err, result) {
                if (err) {
                    console.log(err);
                } else {
                    findStub.restore();
                    devNotifyStub.restore();
                    devReadStub.restore();
                    enable = result;
                    done();
                }
            });
        }, 3100);


        gad.writeReportCfg('sensorValue', cfg2, function (err, result) {
            if (err)
                console.log(err);
            else
                enable = result;
        });
    });

    it('getReportCfg()', function (done) {
        gad.readReportCfg('sensorValue', function (err, result) {
            if (_.isEqual(result, cfg2)) 
                done();
        });
    });
});

describe('Controller Handlers Check', function () {
    it('devIncomingHdlr()', function (done) {
        var ncCmtDevInStub = sinon.stub(nc, 'commitDevIncoming', function () {}),
            ncCmtGadInStub = sinon.stub(nc, 'commitGadIncoming', function () {});

        controller.emit('ind', { type: 'devIncoming', periph: rawDev});

        expect(ncCmtDevInStub).to.be.calledOnce;
        expect(ncCmtDevInStub).to.be.calledWith(rawDev.addr, rawDev);
        expect(ncCmtGadInStub).to.be.calledOnce;
        expect(ncCmtGadInStub).to.be.calledWith(rawDev.addr, '0xcc00.0xcc07.28', rawDev.findChar('0xcc00', '0xcc07'));

        ncCmtDevInStub.restore();
        ncCmtGadInStub.restore();
        done();
    });

    it('devLeavingHdlr()', function (done) {
        var ncCmtDevOutStub = sinon.stub(nc, 'commitDevLeaving', function () {});

        controller.emit('ind', { type: 'devLeaving', periph: rawDev.addr, data: rawDev.addr});

        expect(ncCmtDevOutStub).to.be.calledOnce;
        expect(ncCmtDevOutStub).to.be.calledWith(rawDev.addr);

        ncCmtDevOutStub.restore();
        done();
    });

    it('devNotifyHdlr() - device attribute', function (done) {
        var attIndMsg = {
                type: 'attNotify',
                periph: rawDev,
                data: {
                    sid: {
                        uuid: '0x180a',
                        handle: 6
                    },
                    cid: {
                        uuid: '0x2a29',
                        handle: 24
                    },
                    value: { manufacturerName: 'sivann' }
                }
            },
            ncCmtDevNotifStub = sinon.stub(nc, 'commitDevReporting', function () {});

        controller.emit('ind', attIndMsg);

        expect(ncCmtDevNotifStub).to.be.calledOnce;
        expect(ncCmtDevNotifStub).to.be.calledWith(rawDev.addr, { manufacturer: 'sivann' });

        ncCmtDevNotifStub.restore();
        done();
    });

    it('devNotifyHdlr() - gadget attribute(dangerous)', function (done) {
        var attIndMsg = {
                type: 'attChange',
                periph: rawDev,
                data: {
                    sid: {
                        uuid: '0xcc00',
                        handle: 25
                    },
                    cid: {
                        uuid: '0xcc07',
                        handle: 28
                    },
                    value: {
                        id: 0,
                        flags: 0,
                        sensorValue: 26.5
                    }
                }
            },
            ncCmtGadNotifStub = sinon.stub(nc, 'dangerouslyCommitGadReporting', function () {});

        controller.emit('ind', attIndMsg);

        expect(ncCmtGadNotifStub).to.be.calledOnce;
        expect(ncCmtGadNotifStub).to.be.calledWith(rawDev.addr, '0xcc00.0xcc07.28', attIndMsg.data.value);

        ncCmtGadNotifStub.restore();
        done();
    });

    it('devNotifyHdlr() - gadget attribute', function (done) {
        var attIndMsg = {
                type: 'attNotify',
                periph: rawDev,
                data: {
                    sid: {
                        uuid: '0xcc00',
                        handle: 25
                    },
                    cid: {
                        uuid: '0xcc07',
                        handle: 28
                    },
                    value: {
                        id: 0,
                        flags: 0,
                        sensorValue: 26.5
                    }
                }
            },
            ncCmtGadNotifStub = sinon.stub(nc, 'commitGadReporting', function () {});

        rawGad.prop = ['read'];
        controller.emit('ind', attIndMsg);

        expect(ncCmtGadNotifStub).to.be.calledOnce;
        expect(ncCmtGadNotifStub).to.be.calledWith(rawDev.addr, '0xcc00.0xcc07.28', attIndMsg.data.value);

        ncCmtGadNotifStub.restore();
        done();
    });

    it('devStatusHdlr()', function (done) {
        var devStatusMsg = {
                type: 'devStatus',
                periph: rawDev,
                data: 'idle'
            },
            ncCmtDevStatusStub = sinon.stub(nc, 'commitDevNetChanging', function () {});

        controller.emit('ind', devStatusMsg);

        expect(ncCmtDevStatusStub).to.be.calledOnce;
        expect(ncCmtDevStatusStub).to.be.calledWith(rawDev.addr, { status: 'idle' });

        ncCmtDevStatusStub.restore();
        done();
    });
});