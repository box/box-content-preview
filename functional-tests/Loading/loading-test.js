const common = require('../common');

const webdriver = common.webdriver;

describe('Loading', () => {
    before(() => {
        if (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
            this.browser = common.createSauceWebDriver(process.env.SAUCE_USERNAME,
                process.env.SAUCE_ACCESS_KEY,
                process.env.TRAVIS_JOB_NUMBER,
                process.env.TRAVIS_BUILD_NUMBER,
                process.env.BROWSER);
        } else {
            this.browser = common.createLocalWebDriver('chrome');
        }
    });

    beforeEach((done) => {
        this.browser.get('http://localhost:8000/functional-tests/Loading/index.html').then(() => {
            done();
        });
    });

    afterEach(() => {
        return this.browser.navigate().refresh();
    });

    after(() => {
        return this.browser.quit();
    });

    it('should load a file', () => {
        return this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('bp-page-1')), 10000).then((element) => {
            this.browser.wait(webdriver.until.elementIsVisible(element), 10000);
        });
    });

    it('should load a file', () => {
        return this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('bp-page-1')), 10000).then((element) => {
            this.browser.wait(webdriver.until.elementIsVisible(element), 10000);
        });
    });
});
