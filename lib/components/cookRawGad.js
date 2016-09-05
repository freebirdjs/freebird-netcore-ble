var _ = require('busyman'),
    helper = require('../helper');

module.exports = function cookRawGad (gad, raw, cb) { 
    var cls,
        profile,
        newVal = {};

    if (raw._service.name)
        profile = raw._service.name;
    else 
        profile = raw._service.uuid;

    _.forEach(helper.getIpsoDefs(), function (uuids, name) {
        if (_.includes(uuids, raw.uuid))
            cls = name;
    });

    gad.setPanelInfo({
        profile: raw._service.name, 
        classId: cls
    });

    gad.setAttrs(_.merge({}, raw.value));

    cb(null, gad);
};