require('babel-polyfill');

const baseConf = require('./karma.base.conf');
const webpackConfig = require('./webpack.karma.config');
const ispartaConfig = require('./isparta.config');
const coverage = process.env.COVERAGE === '1';

module.exports = function karmaDevConf(config) {
    // Dev conf
    const devConf = {
        logLevel: config.LOG_INFO,

        reporters: ['mocha'],

        browsers: ['Chrome_without_security'],

        webpack: webpackConfig,

        customLaunchers: {
            Chrome_without_security: {
                base: 'Chrome',
                flags: ['--disable-web-security']
            }
        },

        singleRun: false
    };

    if (coverage) {
        devConf.reporters.push('coverage', 'threshold');
        devConf.browsers = ['PhantomJS'];
        devConf.singleRun = true;
        devConf.webpack.module.preLoaders.push(ispartaConfig);
    }

    config.set(Object.assign({}, baseConf, devConf));
};
