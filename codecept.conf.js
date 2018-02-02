const DEFAULT_WAIT_TIME = 10000; // 10 seconds
const { SAUCE_USERNAME, SAUCE_ACCESS_KEY, TRAVIS_JOB_NUMBER, CI } = process.env;

// Local selenium config
const webDriverIOlocal = {
    url: 'http://localhost:8000',
    browser: 'chrome',
    smartWait: DEFAULT_WAIT_TIME,
    restart: false,
    waitForTimeout: DEFAULT_WAIT_TIME
};

// CI saucelabs config
const WebDriverIO =
    typeof SAUCE_USERNAME === 'undefined'
        ? webDriverIOlocal
        : Object.assign({}, webDriverIOlocal, {
            host: 'ondemand.saucelabs.com',
            port: 80,
            user: SAUCE_USERNAME,
            key: SAUCE_ACCESS_KEY,
            desiredCapabilities: {
                'tunnel-identifier': TRAVIS_JOB_NUMBER,
                browserName: 'chrome',
                chromeOptions: {
                    args: ['--disable-web-security']
                }
            }
        });

// Local saucelabs config
if (!CI) {
    Object.assign(WebDriverIO, {
        host: 'localhost',
        port: 4445
    });
}

exports.config = {
    tests: './functional-tests/*_test.js',
    timeout: DEFAULT_WAIT_TIME,
    output: './functional-tests/output',
    helpers: {
        WebDriverIO
    },
    include: {},
    bootstrap: false,
    mocha: {},
    name: 'box-content-preview'
};
