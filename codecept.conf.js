const { CI, DEFAULT_WAIT_TIME = 90000 } = process.env;

exports.config = {
    tests: './functional-tests/*_test.js',
    timeout: DEFAULT_WAIT_TIME,
    output: './functional-tests/output',
    helpers: {
        Puppeteer: {
            url: 'http://localhost:8000',
            restart: true,
            show: true,
            waitForTimeout: DEFAULT_WAIT_TIME,
            chrome: {
                defaultArgs: {
                    args: ['--no-sandbox', '--start-fullscreen']
                },
                executablePath: CI
                    ? '/usr/bin/google-chrome-beta'
                    : '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
            }
        }
    },
    include: {},
    bootstrap: false,
    mocha: {},
    name: 'box-content-preview',
    multiple: {
        parallel: {
            chunks: 4
        }
    }
};
