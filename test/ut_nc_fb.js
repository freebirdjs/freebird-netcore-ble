var should = require('should'),
    _ = require('lodash'),
    http = require('http'),
    Freebird = require('freebird');
    WsClient = require('freebird-websocket').Client;

var httpServer = http.createServer();

httpServer.listen(3000);

var fbird = new Freebird(httpServer),
	// bleNc = require('../netcore')('cc-bnp', {path: '/dev/ttyACM0'}),
	bleNc = require('../netcore')('noble'),
	wsClient = new WsClient();
	




wsClient.start('ws://localhost:' + 3000, {});

describe('sybsys: net functional test', function () {

	this.timeout(10000);

	it('register netcore', function (done) {
		fbird.registerNetcore(bleNc, function (err, nc) {
		    if (err)
		        console.log('err');
		    else
		        done();
		});
	});

	it('event: started', function (done) {
		wsClient.on('started', function (msg) {
			console.log(msg);
			done();
		});
		fbird.start(function () {});
	});

	// it('getNetcores()', function (done) {
	// 	wsClient.sendReq('net', 'getNetcores', {});
	// });

	// it('getAllDevIds()', function (done) {

	// });

	// it('getAllGadIds()', function (done) {

	// });

	// it('getDevs()', function (done) {

	// });

	// it('getGads()', function (done) {

	// });

	// it('getBlacklist()', function (done) {

	// });

	// it('permitJoin()', function (done) {

	// });

	// it('maintain()', function (done) {

	// });

	// it('reset()', function (done) {

	// });

	// it('enable()', function (done) {

	// });

	// it('disable()', function (done) {

	// });

	// it('ban()', function (done) {

	// });

	// it('unban()', function (done) {

	// });

	// it('remove()', function (done) {

	// });

	// it('ping()', function (done) {

	// });
});

// describe('sybsys: dev functional test', function () {

// });

// describe('sybsys: gad functional test', function () {

// });

wsClient.stop();