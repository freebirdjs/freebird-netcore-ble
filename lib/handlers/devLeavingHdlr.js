module.exports = function(netcore, permAddr) {
	if (!netcore.isEnabled())
        return;

    netcore.commitDevLeaving(permAddr);
};