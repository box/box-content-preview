/* eslint-disable max-classes-per-file */
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

/**
 * Older versions of JSDOM (<21.1.2) don't support pageX and pageY attributes in MouseEvent which breaks mouse move simulation in unit tests.
 * Jest v30 comes with JSDOM version 22 which has this issue resolved. After upgrade to Jest v30 this patch can be removed.
 * More details:  https://github.com/jestjs/jest/pull/13825#issuecomment-1452037295
 */
class MouseEventExtended extends MouseEvent {
    constructor(type, values) {
        const { pageX, pageY, ...mouseValues } = values;
        super(type, mouseValues);
        Object.assign(this, {
            pageX: pageX || 0,
            pageY: pageY || 0,
        });
    }
}

global.MouseEventExtended = MouseEventExtended;
