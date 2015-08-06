var path = require('path');
var src = path.join(__dirname, 'src');
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
                        test: [ src, test ],
                        loader: 'babel-loader',
                        query: {
                            stage: 1
                        }
                    },
                    
                    {
                        test: [ src, test ],
                        include: src,
                        loader: 'isparta',
                        query: {
                            babel: {
                                stage: 1
                            }
                        }
                    },

                    {
                        test: path.join(__dirname, 'src/css'),
                        loader: 'style-loader!css-loader'
                    },
                    
                    {
                        test: path.join(__dirname, 'src/img'),
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
            statements: 35,
            branches: 25,
            functions: 30,
            lines: 35
        },

        port: 9876,

        colors: true,

        logLevel: config.LOG_INFO,

        autoWatch: true,

        browsers: ['Chrome'],

        singleRun: false
    });
};