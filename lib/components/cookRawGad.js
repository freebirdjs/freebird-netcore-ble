var _ = require('busyman'),
    helper = require('../helper');

module.exports = function cookRawGad (gad, raw, cb) { 
    var panelInfo = {
            profile: null,
            classId: null
        };

    if (raw._service.name)
        panelInfo.profile = raw._service.name;
    else 
        panelInfo.profile = raw._service.uuid;

    _.forEach(helper.getIpsoDefs(), function (uuids, name) {
        if (_.includes(uuids, raw.uuid))
            panelInfo.classId = name;
    });

    gad.set('panel', panelInfo);
    gad.set('attrs', _.merge({}, raw.value));

    cb(null, gad);
};