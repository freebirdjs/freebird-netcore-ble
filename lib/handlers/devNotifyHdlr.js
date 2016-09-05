var _ = require('busyman'),
    helper = require('../helper');

module.exports = function (netcore, dev, notifData) {
	var servId = notifData.sid.uuid,
        charId = notifData.cid.uuid,
        auxId = servId + '.' + charId + '.' + notifData.cid.handle,
        charVal = _.merge({}, notifData.value),
        charData = {},
        reportFunc;

    if (!netcore.isEnabled())
        return;

    // manuName = dev.findChar('0x180a', '0x2a29').val.manufacturerName;

    if (servId === '0x180a') {
        // device attributes reporting
        if (charId === '0x2a29') {
            netcore.commitDevReporting(dev.addr, { manufacturer: charVal.manufacturerName });
        } else if (charId === '0x2a24') {
            netcore.commitDevReporting(dev.addr, { model: charVal.modelNum });
        } else if (charId === '0x2a25') {
            netcore.commitDevReporting(dev.addr, { serial: charVal.serialNum });
        } else if (charId === '0x2a26' || charId === '0x2a27' || charId === '0x2a28') {
            charData.fw = dev.dump(servId, '0x2a26').value.firmwareRev;
            charData.hw = dev.dump(servId, '0x2a27').value.hardwareRev;
            charData.sw = dev.dump(servId, '0x2a28').value.softwareRev;
            netcore.commitDevReporting(dev.addr, { version: charData });
        }
    } else {
        // gadget attributes reporting
        if (_.includes(dev.dump(servId, notifData.cid.handle).prop, 'read'))
            reportFunc = netcore.commitGadReporting.bind(netcore);
        else 
            reportFunc = netcore.dangerouslyCommitGadReporting.bind(netcore);

        if (_.includes(helper.getUuids('public'), charId)) {
            reportFunc(dev.addr, auxId, charVal);
        } else if (_.includes(helper.getUuids('bipso'), charId)) {
            reportFunc(dev.addr, auxId, charVal);
        }/* else if (manuName === 'Texas Instruments' && _.includes(nspUuids.ti, charId)) {
            reportFunc(notifData.addr, notifData.servUuid + '.' + charId, charVal);
        }*/
    }
};