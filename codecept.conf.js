const DEFAULT_WAIT_TIME = 10000; // 10 seconds
const {
    SAUCE_USERNAME,
    SAUCE_ACCESS_KEY,
    TRAVIS_JOB_NUMBER,
    CI,
    BROWSER_NAME = 'chrome',
    BROWSER_VERSION = 'latest',
    BROWSER_PLATFORM
} = process.env;

// Local selenium config
const webDriverIOlocal = {
    url: 'http://localhost:8000',
    browser: 'chrome',
    smartWait: DEFAULT_WAIT_TIME,
    restart: false,
    waitForTimeout: DEFAULT_WAIT_TIME
};

// CI saucelabs config
let WebDriverIO;
if (typeof SAUCE_USERNAME === 'undefined') {
    WebDriverIO = webDriverIOlocal;
} else {
    WebDriverIO = Object.assign({}, webDriverIOlocal, {
        host: 'ondemand.saucelabs.com',
        port: 80,
        user: SAUCE_USERNAME,
        key: SAUCE_ACCESS_KEY,
        desiredCapabilities: {
            'tunnel-identifier': TRAVIS_JOB_NUMBER,
            browserName: BROWSER_NAME,
            version: BROWSER_VERSION,
            platform: BROWSER_PLATFORM,
            chromeOptions: {
                args: ['--disable-web-security']
            }
        }
    });

    if (!CI) {
        // Local saucelabs config
        Object.assign(WebDriverIO, {
            host: 'localhost',
            port: 4445
        });
    }
}

exports.config = {
    tests: './functional-tests/*_test.js',
    timeout: DEFAULT_WAIT_TIME,
    output: './functional-tests/output',
    helpers: {
        WebDriverIO,
        Filesystem: {}
    },
    include: {},
    bootstrap: false,
    mocha: {},
    name: 'box-content-preview'
};
