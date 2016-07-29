var _ = require('busyman'),
    helper = require('../helper');

module.exports = function (netcore, dev, notifData) {
	var charId = notifData.charUuid,
        charVal = _.merge({}, notifData.value),
        char = dev.findChar(notifData.servUuid, charId),
        charData = {},
        reportFunc;

    if (!netcore.isEnabled())
                return;

    // manuName = dev.findChar('0x180a', '0x2a29').val.manufacturerName;

    if (notifData.servUuid === '0x180a') {
        // device attributes reporting
        if (charId === '0x2a29') {
            netcore.commitDevReporting(dev.addr, { manufacturer: charVal.manufacturerName });
        } else if (charId === '0x2a24') {
            netcore.commitDevReporting(dev.addr, { model: charVal.modelNum });
        } else if (charId === '0x2a25') {
            netcore.commitDevReporting(dev.addr, { serial: charVal.serialNum });
        } else if (charId === '0x2a26' || charId === '0x2a27' || charId === '0x2a28') {
            charData.fw = dev.findChar('0x180a', charId).val.firmwareRev;
            charData.hw = dev.findChar('0x180a', charId).val.hardwareRev;
            charData.sw = dev.findChar('0x180a', charId).val.softwareRev;
            netcore.commitDevReporting(dev.addr, { version: charData });
        }
    } else {
        // gadget attributes reporting
        if (_.includes(char.prop, 'read'))
            reportFunc = netcore.commitGadReporting.bind(netcore);
        else 
            reportFunc = netcore.dangerouslyCommitGadReporting.bind(netcore);

        if (_.includes(helper.getUuids('public'), charId)) {
            reportFunc(dev.addr, notifData.servUuid + '.' + charId, charVal);
        } else if (_.includes(helper.getUuids('bipso'), charId)) {
            reportFunc(dev.addr, notifData.servUuid + '.' + charId, charVal);
        }/* else if (manuName === 'Texas Instruments' && _.includes(nspUuids.ti, charId)) {
            reportFunc(notifData.addr, notifData.servUuid + '.' + charId, charVal);
        }*/
    }
};