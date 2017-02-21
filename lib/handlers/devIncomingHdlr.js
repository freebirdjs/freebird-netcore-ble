var _ = require('busyman'),
    helper = require('../helper');

module.exports = function (netcore, dev) {
    var manuName,
        chars = {};

    if (!netcore.isEnabled()) 
        return;

    manuName = dev.dump('0x180a', '0x2a29').value.manufacturerName;

    netcore.commitDevIncoming(dev.addr, dev);

    _.forEach(dev.servs, function (serv) {
        chars = _.merge(chars, serv.chars);
    });

    commitGads(netcore, dev.addr, chars, helper.getUuids('public'));
    commitGads(netcore, dev.addr, chars, helper.getUuids('bipso'));

    if (manuName === 'Texas Instruments')
        commitGads(netcore, dev.addr, chars, helper.getUuids('ti'));
};

function commitGads (netcore, permAddr, chars, uuids) {
    _.forEach(chars, function (char) {
        var servUuid = char._service.uuid,
            auxId = servUuid + '.' + char.uuid + '.' + char.handle;

        if (_.includes(uuids, char.uuid)) 
            netcore.commitGadIncoming(permAddr, auxId, char);
    });
}