const DEFAULT_WAIT_TIME = 90000; // 90 seconds
const {
    SAUCE_USERNAME,
    SAUCE_ACCESS_KEY,
    TRAVIS_JOB_NUMBER,
    CI,
    BROWSER_NAME = 'chrome',
    BROWSER_VERSION = 'latest',
    BROWSER_PLATFORM,
    PLATFORM_VERSION,
    DEVICE_NAME
} = process.env;
const MOBILE_PLATFORMS = ['iOS', 'Android'];

// Local selenium config
const commonConfigObj = {
    browser: BROWSER_NAME,
    url: 'http://localhost:8000',
    smartWait: DEFAULT_WAIT_TIME,
    restart: false,
    keepBrowserState: true,
    waitForTimeout: DEFAULT_WAIT_TIME
};

const helperObj = {};
if (typeof SAUCE_USERNAME === 'undefined') {
    helperObj.WebDriverIO = commonConfigObj;
} else {
    // Common saucelab config
    const sauceObj = {
        host: 'ondemand.saucelabs.com',
        port: 80,
        user: SAUCE_USERNAME,
        key: SAUCE_ACCESS_KEY,
        desiredCapabilities: {
            name: CI ? 'Travis cron' : require('os').userInfo().username, // eslint-disable-line global-require
            build: TRAVIS_JOB_NUMBER,
            'tunnel-identifier': TRAVIS_JOB_NUMBER,
            browserName: BROWSER_NAME,
            platform: BROWSER_PLATFORM
        }
    };

    const mixedInSauceObj = Object.assign({}, commonConfigObj, sauceObj);
    if (MOBILE_PLATFORMS.indexOf(BROWSER_PLATFORM) === -1) {
        // webdriver (desktop)
        Object.assign(sauceObj.desiredCapabilities, {
            version: BROWSER_VERSION
        });
        helperObj.WebDriverIO = mixedInSauceObj;
    } else {
        // appium (mobile)
        Object.assign(sauceObj.desiredCapabilities, {
            platformVersion: PLATFORM_VERSION,
            deviceName: DEVICE_NAME,
            deviceOrientation: 'portrait',
            appiumVersion: '1.7.2'
        });
        helperObj.Appium = mixedInSauceObj;
    }
}

exports.config = {
    tests: './functional-tests/*_test.js',
    timeout: DEFAULT_WAIT_TIME,
    output: './functional-tests/output',
    helpers: helperObj,
    include: {},
    bootstrap: false,
    mocha: {},
    name: 'box-content-preview'
};
