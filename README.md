# freebird-netcore-ble  
A ble machine network core for freebird framework.  

[![NPM](https://nodei.co/npm/freebird-netcore-ble.png?downloads=true)](https://nodei.co/npm/freebird-netcore-ble/)  

[![Travis branch](https://travis-ci.org/freebirdjs/freebird-netcore-ble.svg?branch=master)](https://travis-ci.org/freebirdjs/freebird-netcore-ble)
[![npm](https://img.shields.io/npm/v/freebird-netcore-ble.svg?maxAge=2592000)](https://www.npmjs.com/package/freebird-netcore-ble)
[![npm](https://img.shields.io/npm/l/freebird-netcore-ble.svg?maxAge=2592000)](https://www.npmjs.com/package/freebird-netcore-ble)


## Table of Contents  

1. [Overiew](#Overiew)  
2. [Installation](#Installation)  
3. [Basic Usage](#Basic)  
4. [APIs](#APIs)  

<br />

<a name="Overiew"></a>
## 1. Overview  

**freebird-netcore-ble** is the network controller (netcore) with managment facilities ready for freebird.  

<br />

<a name="Installation"></a>
## 2. Installation  

> $ npm install freebird-netcore-ble --save  

<br />
  
<a name="Basic"></a>
## 3. Basic Usage  

* To use this netcore with freebird, register it to freebird in your app:  

```js
var Freebird = require('freebird'),
    createBleCore = require('freebird-netcore-ble');

var freebird,
    bleCore = createBleCore('noble');

// Create freebird server and register freeebird-netcore-ble
freebird = new Freebird([ bleCore ]);

// Simply start the freebird server
freebird.start(function (err) {
    var bleCoreName = bleCore.getName();    // 'freebird-netcore-ble'
    freebird.permitJoin(bleCoreName, 180);  // Let your ble peripheral machines join the network
});

// That's it!
```

<br />

<a name="APIs"></a>
## 4. APIs  

#### 1. Basic API

**freebird-netcore-ble** exports a function `createBleCore()` to create BLE netcore, it will returns a [Netcore](https://github.com/freebirdjs/freebird-base/blob/master/docs/NetcoreClass.md#netcore-class) instance for network operating

* [createBleCore()](#API_createBleNc)


#### 2. Netcore APIs  

Netcore provides you with the following APIs, please go to [Netcore APIs](https://github.com/freebirdjs/freebird-base/blob/master/docs/NetcoreClass.md#netcore-class) for their usage.  

* Basic Methods  

| Medthod      | Description                                                                            |  
|--------------|----------------------------------------------------------------------------------------|  
| getName      | Get name of this netcore.                                                              |  
| isEnabled    | To see if this netcore is enabled.                                                     |  
| isRegistered | To see if this netcore is registered to freebird framework.                            |  
| isJoinable   | To see if this netcore is currently allowing devices to join the network.              |  
| enable       | Enable this netcore.                                                                   |  
| disable      | Disable this netcore.                                                                  |  
| dump         | Dump information about the netcore.                                                    |  

* Network Management  

| Medthod        | Description                                                                                      |  
|----------------|--------------------------------------------------------------------------------------------------|  
| start          | Start the network. To allow devices to join the network, use `permitJoin()`.                     |  
| stop           | Stop the network. All functions are disabled.                                                    |  
| reset          | Reset the netcore. Soft reset just restart the netcore, and hard reset will clear the blacklist. |  
| permitJoin     | Allow or disallow devices to join the network.                                                   |  
| remove         | Remove a remote device from the network.                                                         |  
| ban            | Ban a device from the network. Banned device can never join the network unless you unban it.     |  
| unban          | Unban a device.                                                                                  |  
| ping           | Ping a remote device.                                                                            |  
| maintain       | Maintain all remote devices of the netcore.                                                      |  
| getTraffic     | Get traffic records.                                                                             |  
| resetTraffic   | Reset record of the traffic.                                                                     |  
| getBlacklist   | Get blacklist of the banned devices. Use `ban()` to put a device into blacklist.                 |  
| clearBlacklist | Clear the blacklist. Use `unban()` to release a device from blacklist.                           |  
| isBlacklisted  | To see if a device is banned.                                                                    |  


<br />
*************************************************  
<a name="API_createBleNc"></a>  
### createBleCore(subModule[, spConfig])  
Create a BLE netcore with `cc-bnp` or `noble` sub-module.  

* With `cc-bnp` sub-module: `createBleCore('cc-bnp', spConfig)`
* With `noble` sub-module: `createBleCore('noble')`

**Arguments**  

* `subModule` (*String*): `subModule` can be either a string of `'cc-bnp'` or `'noble'` to specify the sub-module.  
* `spConfig` (*Object*): This value-object has two properties `path` and `options` to configure the serial port.  

    * `path`: A string that refers to the serial-port system path, e.g., `'/dev/ttyUSB0'`.  
    * `options`: An object to set up the [seiralport configuration options](https://www.npmjs.com/package/serialport#serialport-path-options-opencallback).  

**Returns**  

- (*Object*): bleCore  

**Example**  

* Using `cc-bnp` as a sub-module:  

```js
var createBleCore = require('freeebird-netcore-ble');

var bleCore = createBleCore('cc-bnp', {
        path: '/dev/ttyUSB0',
        options: {
            baudRate: 115200,   // default value
            rtscts: true,       // default value
            flowControl: true   // default value
        }
    });
```

* Using noble as a sub-module:  

```js
var createBleCore = require('freeebird-netcore-ble');

var bleCore = createBleCore('noble');
```

