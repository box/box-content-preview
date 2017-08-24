const webdriver = require('selenium-webdriver');
const expect = require('chai').expect;

describe('Base Test', () => {
    before(() => {
        if (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
            this.browser = new webdriver.Builder()
                .usingServer(`http://${process.env.SAUCE_USERNAME}:${process.env.SAUCE_ACCESS_KEY}@ondemand.saucelabs.com:80/wd/hub`)
                .withCapabilities({
                    'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
                    build: process.env.TRAVIS_BUILD_NUMBER,
                    username: process.env.SAUCE_USERNAME,
                    accessKey: process.env.SAUCE_ACCESS_KEY,
                    browserName: 'chrome',
                    chromeOptions: {
                        args: ['--disable-web-security']
                    }
                }).build();
        } else {
            this.browser = new webdriver.Builder()
                .withCapabilities({
                    browserName: 'chrome',
                    chromeOptions: {
                        args: ['--disable-web-security']
                    }
                }).build();
        }
    });

    beforeEach(() => {
        return this.browser.get('http://localhost:8000/functional-tests/index.html');
    });

    after(() => {
        return this.browser.quit();
    });

    it('should load a file', () => {
        return this.browser.wait(webdriver.until.elementLocated(webdriver.By.className('bp-loaded')), 5000).then((element) => {
            this.browser.wait(webdriver.until.elementIsVisible(element), 5000).then((el) => {
                expect(el).to.not.equal(undefined);
            });
        });
    });
});
