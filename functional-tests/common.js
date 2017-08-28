const chai = require('chai');

const expect = chai.expect;
const webdriver = require('selenium-webdriver');

const PLATFORM_CONFIG = {
    'chrome': {
        browserName: 'chrome',
        platform: 'macOS 10.12',
        version: '60'
    },
    'safari': {
        browserName: 'safari',
        platform: 'macOS 10.12',
        version: '10.0'
    },
    'firefox': {
        browserName: 'firefox',
        platform: 'Windows 10',
        version: '54.0'
    },
    'edge': {
        browserName: 'MicrosoftEdge',
        platform: 'Windows 10',
        version: '14.14393'
    },
    'ie': {
        browserName: 'internet explorer',
        platform: 'Windows 8.1',
        version: '11.0'
    }
}

/**
 * Creates a webdriver that connects to Sauce Labs to execute tests.
 *
 * @param {string} username - sauce Labs username
 * @param {string} accessKey - sauce Labs access key
 * @param {string} jobNumber - job number from Travis CI
 * @param {string} build - build name from Travis CI
 * @param {string} browser - browser that maps to a name, platform, and version
 * @return {Object} webdriver
 */
function createSauceWebDriver(username, accessKey, jobNumber, build, browser) {
    return new webdriver.Builder()
        .usingServer(`http://${username}:${accessKey}@ondemand.saucelabs.com:80/wd/hub`)
        .withCapabilities({
            'tunnel-identifier': jobNumber,
            build,
            username,
            accessKey,
            browserName: PLATFORM_CONFIG[browser].browserName,
            platform: PLATFORM_CONFIG[browser].platform,
            version: PLATFORM_CONFIG[browser].version,
            chromeOptions: {
                args: ['--disable-web-security']
            }
        }).build();
}

/**
 * Creates a webdriver using a local browser.
 *
 * @param {string} browserName - browser name
 * @return {Object} webdriver
 */
function createLocalWebDriver(browserName) {
    return new webdriver.Builder()
        .withCapabilities({
            browserName,
            chromeOptions: {
                args: ['--disable-web-security']
            }
        }).build();
}

module.exports = {
    webdriver,
    expect,
    createSauceWebDriver,
    createLocalWebDriver
}
