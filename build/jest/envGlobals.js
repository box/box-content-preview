const i18n = require('../../src/i18n/json/en-US.json');
const fixture = require('./fixtureLoader');
const Worker = require('./workerMock');

global.EventEmitter = require('events');
global.sinon = require('sinon');

global.__ = function translate(key) {
    return i18n[key] || key;
};
global.BoxSDK = () => ({});
global.fixture = fixture;
global.URL.createObjectURL = () => '';
global.URL.revokeObjectURL = () => '';
global.Worker = Worker;
