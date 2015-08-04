// Karma configuration

module.exports = function(config) {
    
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['browserify', 'mocha', 'chai-sinon', 'chai-as-promised', 'chai', 'fixture'],


        // list of files / patterns to load in the browser
        files: [
            'dist/js/**/*.js',

            'test/**/*.js',
            'test/**/*.html',

            'dist/css/**/*.css',
            'dist/img/sprite.png'
        ],


        // list of files to exclude
        exclude: [],


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'dist/js/**/*.js': ['coverage'],
            
            'test/**/*.js': ['browserify'],
            'test/**/*.html': ['html2js']
        },

        browserify: {
            debug: true,
            transform: [
                ['babelify', {
                    'stage': ['1']
                }]
            ],
            extensions: ['.js']
        },


        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', 'coverage', 'threshold'],


        // output HTML report of code coverage
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

        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome'],


        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false
    });
};