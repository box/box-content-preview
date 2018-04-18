#!/usr/bin/env node

/* eslint-disable no-console */
const async = require('async');
const util = require('util');
const colors = require('colors');
const exec = util.promisify(require('child_process').exec);

const { SAUCE_USERNAME, SAUCE_ACCESS_KEY, TRAVIS_JOB_NUMBER } = process.env;

// browsers
const CHROME = 'chrome';
const FIREFOX = 'firefox';
const EDGE = 'MicrosoftEdge';
const IE = 'internet explorer';

// platforms
const SAFARI = 'Safari';
const WINDOWS = 'Windows 10';
const OSX = 'macOS 10.13';
const ios = 'iOS';
const android = 'Android';

const envArr = [
    `BROWSER_PLATFORM="${WINDOWS}" BROWSER_NAME="${CHROME}"`,
    `BROWSER_PLATFORM="${WINDOWS}" BROWSER_NAME="${FIREFOX}"`,
    `BROWSER_PLATFORM="${WINDOWS}" BROWSER_NAME="internet explorer"`,
    `BROWSER_PLATFORM="${WINDOWS}" BROWSER_NAME="${EDGE}"`,
    `BROWSER_PLATFORM="${OSX}" BROWSER_NAME="safari"`,
    `BROWSER_PLATFORM="${OSX}" BROWSER_NAME="${CHROME}"`,
    `BROWSER_PLATFORM="${OSX}" BROWSER_NAME="${FIREFOX}"`,
    `BROWSER_PLATFORM="${ios}" DEVICE_NAME="iPhone X Simulator" PLATFORM_VERSION="11.2" BROWSER_NAME="${SAFARI}"`,
    `BROWSER_PLATFORM="${ios}" DEVICE_NAME="iPhone 6 Simulator" PLATFORM_VERSION="11.2" BROWSER_NAME="${SAFARI}"`,
    `BROWSER_PLATFORM="${ios}" DEVICE_NAME="iPad Simulator" PLATFORM_VERSION="11.2" BROWSER_NAME="${SAFARI}"`,
    `BROWSER_PLATFORM="${android}" DEVICE_NAME="Android GoogleAPI Emulator" PLATFORM_VERSION="7.1" BROWSER_NAME="Chrome"`
];

if (!TRAVIS_JOB_NUMBER || !SAUCE_USERNAME || !TRAVIS_JOB_NUMBER) {
    throw new Error('missing TRAVIS_JOB_NUMBER, SAUCE_USERNAME, or TRAVIS_JOB_NUMBER');
}

const processArr = [];
async.eachLimit(
    envArr,
    4,
    async (envStr) => {
        let grepStr = '';

        const ieRegex = new RegExp(IE);
        const mobileRegex = /iOS|Android/;

        if (mobileRegex.test(envStr)) {
            grepStr = '--grep "@mobile"';
        } else if (ieRegex.test(envStr)) {
            grepStr = '--grep "@ie"';
        }

        const cmd = `cd .. && CI=true SAUCE_USERNAME=${SAUCE_USERNAME} SAUCE_ACCESS_KEY=${SAUCE_ACCESS_KEY} TRAVIS_JOB_NUMBER=${TRAVIS_JOB_NUMBER} ${envStr} node ./node_modules/codeceptjs/bin/codecept.js run --steps ${grepStr}`;

        console.log('Running cmd: ', cmd);
        const process = exec(cmd);
        processArr.push(process);
        await process;
    },
    (err) => {
        if (err) {
            console.log(colors.red.underline(err));
            console.log(colors.red(err.stdout));
            processArr.forEach((process) => {
                if (process && process.kill) {
                    try {
                        process.kill();
                    } catch (err2) {
                        console.error(err2);
                    }
                }
            });
            throw new Error();
        }
        console.log('SUCCESS!');
    }
);
