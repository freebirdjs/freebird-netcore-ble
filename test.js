var bleNc = require('./netcore')('cc254x');
	_ = require('lodash');

// console.log(bleNc._controller);

// var obj = { 'a': [{ 'b': { 'c': 3 } }] },
// 	obj2 = {};

// console.log(_.get(obj, 'e[0].c.d'));

// console.log(_.set(obj2, 'a[0].b.c', 4));

setInterval(function() {
	setTimeout(function () {
		console.log('1 second');
	}, 1000);

	console.log('6 second');
}, 6000);

var obj = {
	a: 0,
	b: 1,
	c: 2,
	d: 3
};

obj.forEach(function (val) {
	console.log(val);
});