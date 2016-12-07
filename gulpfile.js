/* eslint-disable */
var gulp = require('gulp');
var Server = require('karma').Server;

/**
 * Run test once and exit
 */
gulp.task('test-release', function testRelease(done) {
    new Server({
        configFile: __dirname + '/karma.release.conf.js'
    }, done).start();
});

gulp.task('test-dev', function testDev(done) {
 new Server({
     configFile: __dirname + '/karma.dev.conf.js'
 }, done).start();
});
