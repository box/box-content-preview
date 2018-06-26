const Helper = codecept_helper;

const NUM_RETRIES = 5;
const BROWSER_START_TIMEOUT = 30000;

class Browser extends Helper {
    timeout() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                clearTimeout(timeout);
                reject();
            }, BROWSER_START_TIMEOUT);
        });
    }

    startBrowser(currentRetryNum = 0) {
        return Promise.race([this.timeout(), this.helpers.WebDriverIO._startBrowser()]).catch(() => {
            console.log('Timed out when starting a new browser.');
            const retryNum = currentRetryNum + 1;
            if (currentRetryNum >= NUM_RETRIES) {
                throw new Error('unable to start browser');
            }
            return this.startBrowser(retryNum);
        });
    }

    _before() {
        return this.startBrowser();
    }
}

module.exports = Browser;
