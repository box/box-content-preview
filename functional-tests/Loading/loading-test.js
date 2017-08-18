const common = require('../common');

const expect = common.expect;
const webdriver = common.webdriver;

describe('Loading', () => {
    before(() => {
        if (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
            this.browser = common.createSauceWebDriver();
        } else {
            this.browser = common.createLocalWebDriver('chrome');
        }
    });

    beforeEach(() => {
        this.browser.get('http://localhost:8000/functional-tests/Loading/index.html');
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
