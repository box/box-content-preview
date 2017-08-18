const chai = require('chai');

const expect = chai.expect;
const webdriver = require('selenium-webdriver');

/**
 * Creates a webdriver that connects to Sauce Labs to execute tests.
 *
 * @param {string} username - sauce Labs username
 * @param {string} accessKey - sauce Labs access key
 * @param {string} jobNumber - job number from Travis CI
 * @param {string} build - build name from Travis CI
 * @param {string} browserName - browser name
 * @return {Object} webdriver
 */
function createSauceWebDriver(username, accessKey, jobNumber, build, browserName) {
    return new webdriver.Builder()
        .usingServer(`http://${username}:${accessKey}@ondemand.saucelabs.com:80/wd/hub`)
        .withCapabilities({
            'tunnel-identifier': jobNumber,
            build,
            username,
            accessKey,
            browserName,
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
