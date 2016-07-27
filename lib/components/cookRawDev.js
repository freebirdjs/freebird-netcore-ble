module.exports = function cookRawDev (dev, raw, cb) { 
    var netInfo = {
            role: 'peripheral',
            parent: null,
            maySleep: false,
            address: { permanent: raw.addr, dynamic: raw.connHdl },
        },
        attrs = {
            manufacturer: raw.findChar('0x180a', '0x2a29').val.manufacturerName,
            model: raw.findChar('0x180a', '0x2a24').val.modelNum,
            serial: raw.findChar('0x180a', '0x2a25').val.serialNum,
            version: {
                fw: raw.findChar('0x180a', '0x2a26').val.firmwareRev,
                hw: raw.findChar('0x180a', '0x2a27').val.hardwareRev,
                sw: raw.findChar('0x180a', '0x2a28').val.softwareRev,
            }
        };

    netInfo.parent = dev.parent;

    dev.setNetInfo(netInfo);
    dev.setAttrs(attrs);

    cb(null, dev);
};