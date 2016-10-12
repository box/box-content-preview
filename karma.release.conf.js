require('babel-polyfill');

const baseConf = require('./karma.base.conf');
const webpackConfig = require('./webpack.karma.config');
const ispartaConfig = require('./isparta.config');

module.exports = function karmaReleaseConf(config) {
    // Karma release conf
    const releaseConf = {

        logLevel: config.LOG_INFO,

        browsers: ['PhantomJS'],

        webpack: webpackConfig,

        coverageReporter: {
            dir: 'reports/coverage-client',
            type: 'cobertura'
        },

        reporters: ['dots', 'coverage', 'threshold'],

        singleRun: true

    };

    releaseConf.webpack.module.preLoaders.push(ispartaConfig);

    config.set(Object.assign({}, baseConf, releaseConf));
};
