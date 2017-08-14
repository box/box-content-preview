const webdriver = require('selenium-webdriver');
const expect = require('chai').expect;

describe('testing javascript in the browser', () => {
    beforeEach(() => {
        this.browser = new webdriver.Builder()
            .usingServer(`http://${process.env.SAUCE_USERNAME}:${process.env.SAUCE_ACCESS_KEY}@ondemand.saucelabs.com:80/wd/hub`)
            .withCapabilities({
                'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
                build: process.env.TRAVIS_BUILD_NUMBER,
                username: process.env.SAUCE_USERNAME,
                accessKey: process.env.SAUCE_ACCESS_KEY,
                browserName: 'chrome'
            }).build();
        return this.browser.get('http:localhost:8000/functional-tests/index.html');
    });

    afterEach(() => {
        return this.browser.quit();
    });

    it('should have a header bar', () => {
        const headline = this.browser.findElement(webdriver.By.className('bp-default-logo'));
        expect(headline).to.not.equal(undefined);
    });
});
