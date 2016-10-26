'use strict';

var
    _ = require('lodash'),
    argv = require('yargs').argv,
    gulpWebpackTask = require('gulp-webpack-task'),
    watch = require('gulp-watch'),
    del = require('del'),
    browserSync = require('browser-sync').create(),
    pugBlockCompiler = require('./pugBlockCompiler');

var defaultConfig = {
    entry: 'blocks/layout/layout.js',
    blockPath: 'blocks/*/*.pug',
    frontendPath: ['/blocks/', '/scss/'],
    pugWatchList: ['blocks/*/*.pug', 'blocks/*/*.data.js'],
    destination: 'var',
    extract: true
};

var getCleanTask = function (config) {
    return function () {
        return del(config.destination, {force: true});
    };
};

var getAssetsTask = function (gulp, config, aliases, provides, env) {
    return gulpWebpackTask(gulp, {
        entry: config.entry,
        destination: config.destination + '/',
        aliases: aliases,
        provides: provides,
        watch: 'development' == env,
        extract: config.extract,
        hash: 'production' == env,
        manifest: 'production' == env,
        frontendPath: config.frontendPath
    });
};

var getServeTask = function (config) {
    return function () {
        browserSync.init({
            server: config.destination + '/',
            open: (argv.o || argv.open) ? 'local' : false
        });

        browserSync.watch(config.destination + '/**/*.*').on('change', browserSync.reload);
    }
};

var getPugTask = function (gulp, config) {
    // todo: mystic destination path
    return function () {
        return gulp.src(config.blockPath)
            .pipe(pugBlockCompiler.index())
            .pipe(pugBlockCompiler())
            .pipe(gulp.dest(config.destination + '/test/'));
    };
};

var getPugWatchTask = function (gulp, config) {
    return function () {
        watch(config.pugWatchList, gulp.series('pug'));
    };
};

var getDefaultTask = function (gulp, env) {
    switch (env) {
        case 'production':
            return gulp.series('clean', 'assets');
            break;
        case 'development':
            return gulp.series('clean', 'pug', gulp.parallel('assets', 'pug_watch', 'serve'));
            break;
        case 'stage':
            return gulp.series('clean', 'pug', 'assets');
            break;
    }
};

module.exports = function (gulp, config) {
    const webpackConfig = _.assign(defaultConfig, config);

    gulp.task('clean', getCleanTask(webpackConfig));
    gulp.task('assets', getAssetsTask(gulp, webpackConfig, config.aliases, config.provides, config.env));
    gulp.task('serve', getServeTask(webpackConfig));
    gulp.task('pug', getPugTask(gulp, webpackConfig));
    gulp.task('pug_watch', getPugWatchTask(gulp, webpackConfig));
    gulp.task('default', getDefaultTask(gulp, config.env));
};
