var should = require('should'),
    _ = require('lodash'),
    http = require('http'),
    fs = require('fs'),
    Freebird = require('freebird');
    WsClient = require('freebird-websocket').Client;

var dbPath1 = '../node_modules/freebird/lib/database/dev.db';
var dbPath2 = '../node_modules/freebird/lib/database/gad.db';
fs.exists(dbPath1, function (isThere) {
    if (isThere) { fs.unlink(dbPath1); }
});
fs.exists(dbPath2, function (isThere) {
    if (isThere) { fs.unlink(dbPath2); }
});

var httpServer = http.createServer();

httpServer.listen(3000);

var fbird = new Freebird(httpServer),
    // bleNc = require('../netcore')('cc-bnp', { path: '/dev/ttyACM0' }),
    bleNc = require('../netcore')('noble'),
    wsClient = new WsClient();

// devices
var remotrCtrl,
    nineAxix;

// gadgets
var multiSel,
    nineAxixActuation,
    acceler;
    

describe('Sybsys: Net Functional Test - ', function () {

    this.timeout(10000);

    it('fb.registerNetcore()', function (done) {
        fbird.registerNetcore(bleNc, function (err, nc) {
            if (err)
                console.log('err');
            else {

                done();
            }
        });
    });

    it('event: started', function (done) {
        wsClient.start('ws://localhost:' + 3000, {});
        wsClient.once('started', function (msg) {
            if (msg.data.netcore === 'blecore')
                done();
        });
        fbird.start(function (err) {
            console.log(err);
        });
    });

    it('wsClient.getNetcores()', function (done) {
        wsClient.sendReq('net', 'getNetcores', { ncNames: ['blecore'] }, function (err, msg) {
            if (err)
                console.log(err);
            else {
                if(msg.data.netcores[0].name === 'blecore')
                    done();
            }
        });
    });

    it('wsClient.permitJoin(0) & event: permitJoining', function (done) {
        wsClient.once('permitJoining', function (msg) {
            if (msg.data.netcore === 'blecore' && msg.data.timeLeft === 0)
                done();
        });
        wsClient.sendReq('net', 'permitJoin', { ncName: 'blecore', duration: 0 }, function (err, msg) {
            if (err)
                console.log(err);
        });
    });

    it('wsClient.permitJoin(60) & event: permitJoining', function (done) {
        wsClient.once('permitJoining', function (msg) {
            if (msg.data.netcore === 'blecore')
                done();
        });
        wsClient.sendReq('net', 'permitJoin', { ncName: 'blecore', duration: 80 }, function (err, msg) {
            if (err)
                console.log(err);
        });
    });

    this.timeout(60000);
    it('event: devIncoming', function (done) {
        var count = 0,
            cb = function (msg) {
                count += 1;
                if (count === 2) {
                    wsClient.removeListener('devIncoming', cb);
                    done();
                }
            };

        wsClient.on('devIncoming', cb);
    });

    this.timeout(5000);
    var devIds;
    it('getAllDevIds()', function (done) {
        wsClient.sendReq('net', 'getAllDevIds', {}, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.ids.length === 2) {
                devIds = msg.data.ids;
                done();
            }
        });
    });

    var gadIds;
    it('getAllGadIds()', function (done) {
        wsClient.sendReq('net', 'getAllGadIds', {}, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.ids.length !== 0) {
                gadIds = msg.data.ids;
                done();
            }
        });
    }); 

    it('getDevs()', function (done) {
        wsClient.sendReq('net', 'getDevs', { ids: devIds }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.devs.length === devIds.length) {
                _.forEach(msg.data.devs, function (dev) {
                    if (dev.attrs.model === 'RemoteControl')
                        remotrCtrl = dev;
                    // else if (dev.attrs.model === 'NineAxisSensor')
                        nineAxix = dev;
                });
                done();
            }
        });
    });

    it('getGads()', function (done) {
        wsClient.sendReq('net', 'getGads', { ids: gadIds }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.gads.length === gadIds.length) {
                _.forEach(msg.data.gads, function (gad) {
                    var cls = gad.panel.class;

                    if (cls === 'accelerometer')
                        acceler = gad;
                    else if (cls === 'actuation' && gad.attrs.appType === 'NineAxisSensor')
                        nineAxixActuation = gad;
                    else if (cls === 'multistateSelector')
                        multiSel = gad;
                });
                done();
            }
        });
    });

    it('disable() & event: disable', function (done) {
        wsClient.once('disabled', function (msg) {
            if (msg.data.netcore === 'blecore')
                done();
        });
        wsClient.sendReq('net', 'disable', { ncName : 'blecore' }, function (err) {
            if (err)
                console.log(err);
        });
    });

    it('enable()', function (done) {
        wsClient.once('enabled', function (msg) {
            if (msg.data.netcore === 'blecore')
                done();
        });
        wsClient.sendReq('net', 'enable', { ncName : 'blecore' }, function (err) {
            if (err)
                console.log(err);
        });
    });

    this.timeout(10000);
    it('remove() & event: devLeaving, statusChanged, netChanged', function (done) {
        var rspCount = 0;

        wsClient.once('devLeaving', function (msg) {
            if (msg.id === remotrCtrl.id)
                rspCount += 1;

            if (rspCount === 4)
                done();
        });
        wsClient.once('statusChanged', function (msg) {
            if (msg.id === remotrCtrl.id && msg.data.status === 'offline')
                rspCount += 1;

            if (rspCount === 4)
                done();
        });
        wsClient.once('netChanged', function (msg) {
            if (msg.id === remotrCtrl.id && msg.data.status === 'offline')
                rspCount += 1;

            if (rspCount === 4)
                done();
        });

        wsClient.sendReq('net', 'permitJoin', { ncName: 'blecore', duration: 30 }, function (err, msg) {
            if (err)
                console.log(err);
        });
        wsClient.sendReq('net', 'remove', { id : remotrCtrl.id }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.permAddr === remotrCtrl.net.address.permanent) {
                rspCount += 1;

                if (rspCount === 4)
                    done();
            }
        });
    });

    it('ban()', function (done) {
        wsClient.once('devIncoming', function (msg) {
            remotrCtrl = msg.data;

            wsClient.sendReq('net', 'ban', { ncName : 'blecore', permAddr: remotrCtrl.net.address.permanent }, function (err, msg) {
                if (err)
                    console.log(err);
                else {
                    done();
                }
            });
        });
        
    });

    it('getBlacklist()', function (done) {
        wsClient.sendReq('net', 'getBlacklist', { ncName : 'blecore' }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.list[0] === remotrCtrl.net.address.permanent)
                done();
        });
    });

    this.timeout(10000);
    it('unban()', function (done) {
        wsClient.on('statusChanged', function (msg) {
            if (msg.data.status === 'online')
                done();
        });
        wsClient.sendReq('net', 'unban', { ncName : 'blecore', permAddr: remotrCtrl.net.address.permanent }, function (err, msg) {
            if (err)
                console.log(err);
        });
    });

    it('getBlacklist()', function (done) {
        wsClient.sendReq('net', 'getBlacklist', { ncName : 'blecore' }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.list.length === 0)
                done();
        });
    });

    this.timeout(10000);
    it('reset()', function (done) {
        var rspCount = 0;

        wsClient.once('stopped', function (msg) {
            if (msg.data.netcore === 'blecore')
                rspCount += 1;
        });
        wsClient.once('started', function (msg) {
            if (msg.data.netcore === 'blecore' && rspCount === 2)
                done();
        });
        wsClient.sendReq('net', 'reset', { ncName : 'blecore' }, function (err, msg) {
            if (err)
                console.log(err);
            else
                rspCount += 1;
        });
    });

    it('ping()', function (done) {
        wsClient.sendReq('net', 'ping', { id : remotrCtrl.id }, function (err, msg) {
            if (err)
                console.log(err);
            else
                done();
        });
    });

    // it('maintain()', function (done) {
        // [TODO] fb not implement yet
    // });
});

describe('Sybsys: Dev Functional Test - ', function () {

    this.timeout(5000);

    it('disable() & event: netChanged', function (done) {
        var flag = false;

        wsClient.once('netChanged', function (msg) {
            if (msg.data.enabled === false && flag)
                done();
        });
        wsClient.sendReq('dev', 'disable', { id: remotrCtrl.id }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.enabled === false)
                flag = true;
        });
    });

    it('enable() & event: netChanged', function (done) {
        var flag = false;

        wsClient.once('netChanged', function (msg) {
            if (msg.data.enabled === true && flag)
                done();
        });
        wsClient.sendReq('dev', 'enable', { id: remotrCtrl.id }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.enabled === true)
                flag = true;
        });
    });



    it('read()', function (done) {
        wsClient.sendReq('dev', 'read', { id: remotrCtrl.id, attrName: 'manufacturer' }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.value === remotrCtrl.attrs.manufacturer)
                done();
        });
    });

    it('write()', function (done) {
        wsClient.sendReq('dev', 'write', { id: remotrCtrl.id, attrName: 'manufacturer', value: 'xxx' }, function (err, msg) {
            if (err)
                console.log(err);
            else {
                done();
            }
        });
    });

    it('identify()', function (done) {
        wsClient.sendReq('dev', 'identify', { id: remotrCtrl.id }, function (err, msg) {
            if (err)
                console.log(err);
            else {
                done();
            }
        });
    });

    var newProps = { location: 'office', name: 'Remote Control' };
    it('setProps() & event: propsChanged', function (done) {
        wsClient.once('propsChanged', function (msg) {
            if (_.isEqual(msg.data, newProps))
                done();
        });
        wsClient.sendReq('dev', 'setProps', { id: remotrCtrl.id, props: newProps }, function (err, msg) {
            if (err)
                console.log(err);
        });
    });

    it('getProps()', function (done) {
        wsClient.sendReq('dev', 'getProps', { id: remotrCtrl.id, propNames : ['location', 'name'] }, function (err, msg) {
            if (err)
                console.log(err);
            else if (_.isEqual(msg.data.props, newProps))
                done();
        });
    });
});

describe('Sybsys: Gad Functional Test - ', function () {
    it('disable()', function (done) {
        wsClient.sendReq('gad', 'disable', { id: acceler.id }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.enabled === false)
                done();
        });
    });

    it('enable()', function (done) {
        wsClient.sendReq('gad', 'enable', { id: acceler.id }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.enabled === true)
                done();
        });
    });

    it('read()', function (done) {
        wsClient.sendReq('gad', 'read', { id: acceler.id, attrName: 'xValue' }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.value === 0)
                done();
        });
    });

    it('write()', function (done) {
        var flag = false;

        wsClient.on('attrsChanged', function (msg) {
            if (msg.data.onOff === true)
                done();
        });

        wsClient.sendReq('gad', 'write', { id: nineAxixActuation.id, attrName: 'onOff', value: true }, function (err, msg) {
            if (err)
                console.log(err);
            else if (_.isEqual(msg.data, {value: true}))
                flag = true;
        });
    });

    it('exec()', function (done) {
        wsClient.sendReq('gad', 'exec', { id: acceler.id, attrName: 'xValue' }, function (err, msg) {
            if (err)
                console.log(err);
            else 
                done();
        });
    });

    it('setProps()', function (done) {
        wsClient.on('propsChanged', function (msg) {
            if (msg.data.name === 'accelermeter')
                done();
        });

        wsClient.sendReq('gad', 'setProps', { id: acceler.id, props: { name: 'accelermeter' } }, function (err, msg) {
            if (err)
                console.log(err);
        });
    });

    it('getProps()', function (done) {
        wsClient.sendReq('gad', 'getProps', { id: acceler.id, propNames : [ 'name' ] }, function (err, msg) {
            if (err)
                console.log(err);
            else if (msg.data.props.name === 'accelermeter')
                done();
        });
    });

    var reportCfg = {
            enable: true,
            pmin: 3,
            pmax: 6
        };
    it('setReportCfg()', function (done) {
        wsClient.sendReq('gad', 'setReportCfg', { id: acceler.id, attrName: 'xValue', rptCfg: reportCfg }, function (err, msg) {
            if (err)
                console.log(err);
            else 
                done();
        });
    });

    this.timeout(60000);
    it('getReportCfg()', function (done) {
        wsClient.sendReq('gad', 'getReportCfg', { id: acceler.id, attrName: 'xValue' }, function (err, msg) {
            if (_.isEqual(msg.data.cfg, reportCfg))
                done();
        });
    });
});

wsClient.stop();