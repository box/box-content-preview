require('babel-polyfill');

var baseConf = require('./karma.base.conf');
var webpackConfig = require('./webpack.karma.config');
var ispartaConfig = require('./isparta.config');
var coverage = process.env.COVERAGE === '1';

module.exports = function(config) {

    var devConf = {

        logLevel: config.LOG_INFO,

        reporters: [ 'mocha' ],

        browsers: [ 'Chrome_without_security' ],

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
        devConf.browsers = [ 'PhantomJS' ];
        devConf.singleRun = true;
        devConf.webpack.module.preLoaders.push(ispartaConfig);
    }

    config.set(Object.assign({}, baseConf, devConf));
};
