var _ = require('busyman'),
    fs = require('fs'),
	bipso = require('bipso');

var helper = {};

var uuidDefs = require('./defs/defs.json'),
	nspUuids = {
        public: [],
        bipso: [],
        ti: []
    },
    ipsoDefs = {};

/*************************************************************************************************/
/*** Initialize Definitions                                                                    ***/
/*************************************************************************************************/
_.forEach(bipso.ipsoCharUuid._enumMap, function (uuid, cls) {
    var newUuid = '0x' + uuid.toString(16);

    ipsoDefs[cls] = [ newUuid ];
    nspUuids.bipso.push(newUuid);
});

_.forEach(uuidDefs, function (uuidSet, nsp) {
    _.forEach(uuidSet, function (uuids) {
        nspUuids[nsp] = nspUuids[nsp].concat(uuids);
    });

    _.forEach(ipsoDefs, function (uuids, name) {
        if (uuidSet[name])
            ipsoDefs[name] = ipsoDefs[name].concat(uuidSet[name]);
    });
});

helper.getUuids = function (nsp) {
	return nspUuids[nsp];
};

helper.getIpsoDefs = function () {
	return ipsoDefs;
};

helper.execAsyncFuncs = function (funcs, callback) {
    var count = 0,
        flag = false,
        allResult = [];

    _.forEach(funcs, function (func) {
        func(function (err, result) {
            count += 1;

            if (flag) return;

            if (err) {
                callback(err);
                flag = true;
            } else {
                allResult.push(result);
            }

            if (count === funcs.length) callback(null, allResult);
        });
    });
};

module.exports = helper;