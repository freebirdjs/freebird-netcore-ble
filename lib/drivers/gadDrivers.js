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
        sid = uuids[0],
        cid = _.parseInt(uuids[2]),
        attrVal = dev.dump(sid, cid).value[attrName],
        enable = cfg.enable,
        rptCfgInfo = _.get(reportCfgTable, [permAddr, auxId, attrName]),
        pmin;

    delete cfg.enable;

    if (!rptCfgInfo)
        rptCfgInfo = {
            enable: false,
            min: null,
            max: null,
            cfg: {}
        };

    if (!_.isNumber(attrVal)) {
        if (!_.isNil(cfg.gt) || !_.isNil(cfg.lt) ||!_.isNil(cfg.step))
            return callback(new Error('Report configuration setting error.'));
    }

    if (!_.isEmpty(cfg)) 
        rptCfgInfo.cfg = cfg;

    if (enable === false) {
        dev.configNotify(sid, cid, false);

        if (rptCfgInfo.min) {
            clearTimeout(rptCfgInfo.min);
            rptCfgInfo.min = null;
        }

        if (rptCfgInfo.max) {
            clearInterval(rptCfgInfo.max);
            rptCfgInfo.max = null;
        }
    } else if (enable === true) {
        dev.configNotify(sid, cid, true);

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
        sid = uuids[0],
        cid = _.parseInt(uuids[2]),
        charVal = dev.dump(sid, cid).value,
        attrVal = charVal[attrName],
        rpt = false,
        rptCfgInfo = _.get(reportCfgTable, [permAddr, auxId, attrName]),
        cfg = _.get(rptCfgInfo, 'cfg'),
        cb;

    if (!callback) callback = function () {};

    if (attrVal === undefined) {
        callback(new Error('attrName: ' + attrName + ' not exist.'));
    } else {
        cb = function(err, result) {
            var currVal = attrVal;

            if (err) 
                callback(err);
            else 
                callback(null, attrVal);
        };

        if (type === 'read'){
            dev.read(sid, cid, cb);
        } else {
            charVal[attrName] = val;
            dev.write(sid, cid, charVal, cb);
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