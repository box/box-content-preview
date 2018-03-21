const { event, container } = require('codeceptjs');
const SauceLabs = require('saucelabs');

const { SAUCE_USERNAME, SAUCE_ACCESS_KEY } = process.env;

module.exports = function() {
    const myAccount = new SauceLabs({
        username: SAUCE_USERNAME,
        password: SAUCE_ACCESS_KEY
    });
    /**
     * Reports to saucelabs if a job has passed or failed
     * @param {Object} test - the test object from codeceptjs
     * @param {boolean} isPassed - true if passed
     * @return {void}
     */
    const updateStatus = (test, isPassed) => {
        const sessionId = container.helpers('WebDriverIO').browser.requestHandler.sessionID;

        myAccount.updateJob(sessionId, {
            name: test.title,
            passed: isPassed
        });
    };

    event.dispatcher.on(event.test.passed, (test) => {
        updateStatus(test, true);
    });

    event.dispatcher.on(event.test.failed, (test) => {
        updateStatus(test, false);
    });
};
