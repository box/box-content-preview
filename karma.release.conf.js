require('babel-polyfill');

var baseConf = require('./karma.base.conf');
var webpackConfig = require('./webpack.karma.config');
var ispartaConfig = require('./isparta.config');

module.exports = function(config) {

    var releaseConf = {

        logLevel: config.LOG_INFO,

        browsers: [ 'PhantomJS' ],

        webpack: webpackConfig,

        coverageReporter: {
            dir: 'reports/coverage-client',
            type: 'cobertura'
        },

        junitReporter: {
            outputDir: 'reports/junit/',
            outputFile: 'webapp-client-test-results.xml'
        },

        logLevel: config.LOG_INFO,

        reporters: [ 'dots', 'junit', 'coverage', 'threshold' ],

        singleRun: true

    };

    releaseConf.webpack.module.preLoaders.push(ispartaConfig);

    config.set(Object.assign({}, baseConf, releaseConf));
};
