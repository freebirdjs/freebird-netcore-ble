By default, **freebird-netcore-ble** is designed for freebird framework, but you can use it as a standalone network manager.
If you decide to do this, you have to deal with the instances of Device and Gadget on your own. For example, use an array to manage all these instance. It is suggested to use this module with freebird, since it has prepared devices and gadgets management and persistance for you. If you just don't want to use freebird, then there is another oppertunity for you to use **LWMQN** solution.

Anyway, if you do really use this module as a standalone one, you have to implements the following message handlers on your own.

```js

bleCore.onError = function (err) {
    // your implementation
};

bleCore.onReady = function () {
    // your implementation
};

bleCore.onEnabled = function () {
    // your implementation
};

bleCore.onPermitJoin = function () {
    // your implementation
};

bleCore.onDevIncoming = function () {
    // your implementation
};

bleCore.onDevLeaving = function () {
    // your implementation
};

bleCore.onDevReporting = function () {
    // your implementation
};

bleCore.onDevNetChanging = function () {
    // your implementation
};

bleCore.onGadIncoming = function () {
    // your implementation
};

bleCore.onGadReporting = function () {
    // your implementation
};

bleCore.onBannedDevIncoming = function () {
    // your implementation
};

bleCore.onBannedDevReporting = function () {
    // your implementation
};

bleCore.onBannedGadIncoming = function () {
    // your implementation
};

bleCore.onBannedGadReporting = function () {
    // your implementation
};

bleCore.onDevError = function () {
    // your implementation
};

bleCore.onDevNetChanged = function () {
    // your implementation
};

bleCore.onDevPropsChanged = function () {
    // your implementation
};

bleCore.onDevAttrsChanged = function () {
    // your implementation
};

bleCore.onGadError = function () {
    // your implementation
};

bleCore.onGadPanelChanged = function () {
    // your implementation
};

bleCore.onGadPropsChanged = function () {
    // your implementation
};

bleCore.onGadAttrsChanged = function () {
    // your implementation
};

```