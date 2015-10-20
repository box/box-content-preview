var path = require('path');
var js = path.join(__dirname, 'src/js');
var css = path.join(__dirname, 'src/css');
var img = path.join(__dirname, 'src/img');
var test = path.join(__dirname, 'test');

module.exports = function(config) {
    
    config.set({

        basePath: '',

        frameworks: ['mocha', 'chai-sinon', 'chai-as-promised', 'chai', 'fixture'],

        files: [
            'test/**/*.js',
            'test/**/*.html'
        ],

       exclude: [],

        preprocessors: {
            'test/**/*.js': ['webpack'],
            'test/**/*.html': ['html2js']
        },

        reporters: ['progress', 'coverage', 'threshold'],

        webpack: {
            module: {
                preLoaders: [
                    {
                        test: [ js, test ],
                        loader: 'babel-loader'
                    },
                    
                    {
                        test: [ js, test ],
                        include: js,
                        loader: 'isparta'
                    }
                ],

                loaders: [
                    {
                        test: css,
                        loader: 'style-loader!css-loader'
                    },
                    
                    {
                        test: img,
                        loader: 'url-loader?limit=1'
                    }
                ]
            }
        },

        webpackMiddleware: {
            noInfo: true
        },

        coverageReporter: {
            type: 'html',
            dir: 'coverage/'
        },

        thresholdReporter: {
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80
        },

        port: 9876,

        colors: true,

        logLevel: config.LOG_INFO,

        autoWatch: true,

        browsers: ['Chrome'],

        singleRun: false
    });
};