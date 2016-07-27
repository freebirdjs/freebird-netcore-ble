var _ = require('busyman'),
    nc,
    reportCfgTable = {};

function read (permAddr, auxId, attrName, callback) {
    operateGadAttr(this, 'read', permAddr, auxId, attrName, null, callback);
}

function write (permAddr, auxId, attrName, val, callback) {
    operateGadAttr(this, 'write', permAddr, auxId, attrName, val, callback);
}

//option
function exec (permAddr, auxId, attrName, args, callback) {
//not support
    callback(null);
}

function setReportCfg (permAddr, auxId, attrName, cfg, callback) {
    var central = this,
        dev = central.find(permAddr),
        readFunc = read.bind(central),
        uuids = auxId.split('.'),
        char = dev.findChar(uuids[0], uuids[1]),
        enable = cfg.enable,
        rptCfgInfo = _.get(reportCfgTable, [permAddr, auxId, attrName]),
        pmin;

    delete cfg.enable;

    if (!rptCfgInfo)
        rptCfgInfo = {
            enable: false,
            min: null,
            max: null,
            cfg: null
        };

    if (!_.isNumber(char.val[attrName])) {
        if (!_.isNil(cfg.gt) || !_.isNil(cfg.lt) ||!_.isNil(cfg.step))
            return callback(new Error('Report configuration setting error.'));
    }

    if (!_.isEmpty(cfg)) 
        rptCfgInfo.cfg = cfg;

    if (enable === false) {
        dev.setNotify(uuids[0], uuids[1], false);

        if (rptCfgInfo.min) {
            clearTimeout(rptCfgInfo.min);
            rptCfgInfo.min = null;
        }

        if (rptCfgInfo.max) {
            clearInterval(rptCfgInfo.max);
            rptCfgInfo.max = null;
        }
    } else if (enable === true) {
        dev.setNotify(uuids[0], uuids[1], true);

        if (rptCfgInfo.cfg.pmin) {
            pmin = rptCfgInfo.cfg.pmin;
            rptCfgInfo.min = setTimeout(function () {
                readFunc(permAddr, auxId, attrName);
            }, pmin * 1000);
        } else {
            pmin = 0;
        }

        if (rptCfgInfo.cfg.pmax) {
            rptCfgInfo.max = setInterval(function () {
                readFunc(permAddr, auxId, attrName);

                if (!_.isNil(rptCfgInfo.min))
                    clearTimeout(rptCfgInfo.min);

                rptCfgInfo.min = null;

                rptCfgInfo.min = setTimeout(function () {
                    readFunc(permAddr, auxId, attrName);
                }, pmin * 1000);
            }, (rptCfgInfo.cfg.pmax + pmin) * 1000);
        }
    }

    rptCfgInfo.enable = enable;
    rptCfgInfo.cfg.enable = enable;
    _.set(reportCfgTable, [permAddr, auxId, attrName], rptCfgInfo);

    callback(null, true);
}

function getReportCfg (permAddr, auxId, attrName, callback) {
    var reportCfg = _.get(reportCfgTable, [permAddr, auxId, attrName, 'cfg']);

    if (reportCfg) 
        callback(null, reportCfg);
    else 
        callback(new Error('Report configuration is not be set.'));
}

function operateGadAttr (central, type, permAddr, auxId, attrName, val, callback) {
    var dev = central.find(permAddr),
        uuids = auxId.split('.'),
        char = dev.findChar(uuids[0], uuids[1]),
        oldVal = char.val[attrName],
        rpt = false,
        rptCfgInfo = _.get(reportCfgTable, [permAddr, auxId, attrName]),
        cfg = _.get(rptCfgInfo, 'cfg'),
        cb;

    if (!callback) callback = function () {};

    if (char.val[attrName] === undefined) {
        callback(new Error('attrName: ' + attrName + ' not exist.'));
    } else {
        cb = function(err, result) {
            var currVal = char.val[attrName],
                data = {};

            if (err) {
                callback(err);
            } else {
                // if (rptCfgInfo && cfg && cfg.enable && _.isNumber(oldVal)) {
                //     if (_.isNumber(cfg.gt) && _.isNumber(cfg.lt) && cfg.lt > cfg.gt) {
                //         rpt = (oldVal !== currVal) && (currVal > cfg.gt) && (currVal < cfg.lt);
                //     } else {
                //         rpt = _.isNumber(cfg.gt) && (oldVal !== currVal) && (currVal > cfg.gt);
                //         rpt = rpt || (_.isNumber(cfg.lt) && (oldVal !== currVal) && (currVal < cfg.lt));
                //     }

                //     if (_.isNumber(cfg.step)) {
                //         rpt = rpt || (Math.abs(currVal - oldVal) > cfg.step);
                //     }

                //     if (rpt) {
                //         _.set(data, attrName, currVal);
                //         nc.commitGadReporting(permAddr, auxId, data);
                //     }
                // }
                _.set(data, attrName, currVal);
                nc.commitGadReporting(permAddr, auxId, data);
                callback(null, char.val[attrName]);
            }
        };

        if (type === 'read'){
            dev.read(uuids[0], uuids[1], cb);
        } else {
            char.val[attrName] = val;
            dev.write(uuids[0], uuids[1], char.val, cb);
        }
    }
}

module.exports = function (netcore) {
    nc = netcore;

    return {
        read: read,
        write: write,
        exec: exec,
        setReportCfg: setReportCfg,
        getReportCfg: getReportCfg
    };
};