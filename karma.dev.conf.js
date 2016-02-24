require('babel-polyfill');

var baseConf = require('./karma.base.conf');
var webpackConfig = require('./webpack.karma.config');
var path = require('path');
var js = path.join(__dirname, 'src/js');
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
        }

    };

    if (coverage) {
        devConf.reporters.push('coverage', 'threshold');
        devConf.browsers = [ 'PhantomJS' ];
        devConf.webpack.module.preLoaders.push({
            test: js,
            loader: 'isparta',
            exclude: [
                /__tests__/
            ],
        });
    }

    config.set(Object.assign({}, baseConf, devConf));
};