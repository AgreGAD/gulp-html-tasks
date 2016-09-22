'use strict';

var
    gulpWebpackTask = require('gulp-webpack-task'),
    watch = require('gulp-watch'),
    del = require('del'),
    browserSync = require('browser-sync').create(),
    pugBlockCompiler = require('./pugBlockCompiler');

var defaultConfig = {
    entry: 'blocks/layout/layout.js',
    blockPath: 'blocks/*/*.pug',
    frontendPath: ['/blocks/', '/scss/'],
    pugWatchList: ['blocks/*/*.pug', 'blocks/*/data.js'],
    destination: 'var',
    extract: true
};

var getCleanTask = function (config) {
    return function () {
        return del(config.destination);
    };
};

var getAssetsTask = function (gulp, config, aliases, provides, isDevelopment) {
    return gulpWebpackTask(gulp, {
        entry: config.entry,
        destination: config.destination + '/',
        aliases: aliases,
        provides: provides,
        watch: isDevelopment,
        extract: config.extract,
        frontendPath: config.frontendPath
    });
};

var getServeTask = function (config) {
    return function () {
        browserSync.init({
            server: config.destination + '/'
        });

        browserSync.watch(config.destination + '/**/*.*').on('change', browserSync.reload);
    }
};

var getPugTask = function (gulp, config) {
    // todo: mystic destination path
    return function () {
        return gulp.src(config.blockPath)
            .pipe(pugBlockCompiler())
            .pipe(gulp.dest(config.destination + '/test/'));
    };
};

var getPugWatchTask = function (gulp, config) {
    return function () {
        watch(config.pugWatchList, gulp.series('pug'));
    };
};

var getDefaultTask = function (gulp, isDevelopment) {
    return isDevelopment
        ? gulp.series('clean', 'pug', gulp.parallel('assets', 'pug_watch', 'serve'))
        : gulp.series('clean', 'pug', 'assets');
};

module.exports = function (gulp, config) {
    gulp.task('clean', getCleanTask(defaultConfig));
    gulp.task('assets', getAssetsTask(gulp, defaultConfig, config.aliases, config.provides, config.isDevelopment));
    gulp.task('serve', getServeTask(defaultConfig));
    gulp.task('pug', getPugTask(gulp, defaultConfig));
    gulp.task('pug_watch', getPugWatchTask(gulp, defaultConfig));
    gulp.task('default', getDefaultTask(gulp, config.isDevelopment));
};
