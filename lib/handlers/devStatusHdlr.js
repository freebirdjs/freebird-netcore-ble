module.exports = function(netcore, dev, status) {
    if (!netcore.isEnabled())
        return;

    netcore.commitDevNetChanging(dev.addr, { status: status });
};