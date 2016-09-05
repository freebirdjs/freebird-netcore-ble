module.exports = function cookRawDev (dev, raw, cb) { 
    var netInfo = {
            role: 'peripheral',
            parent: null,
            maySleep: false,
            address: { permanent: raw.addr, dynamic: raw.connHandle },
        },
        attrs = {
            manufacturer: raw.dump('0x180a', '0x2a29').value.manufacturerName,
            model: raw.dump('0x180a', '0x2a24').value.modelNum,
            serial: raw.dump('0x180a', '0x2a25').value.serialNum,
            version: {
                fw: raw.dump('0x180a', '0x2a26').value.firmwareRev,
                hw: raw.dump('0x180a', '0x2a27').value.hardwareRev,
                sw: raw.dump('0x180a', '0x2a28').value.softwareRev,
            }
        };

    netInfo.parent = raw.parent;

    dev.setNetInfo(netInfo);
    dev.setAttrs(attrs);

    cb(null, dev);
};