'use strict';

var
    _ = require('lodash'),
    wait = require('gulp-wait'),
    argv = require('yargs').argv,
    gulpWebpackTask = require('gulp-webpack-task'),
    watch = require('gulp-watch'),
    notify = require('gulp-notify'),
    plumber = require('gulp-plumber'),
    del = require('del'),
    browserSync = require('browser-sync').create(),
    pugBlockCompiler = require('./pugBlockCompiler'),
    createHtmlIndex = require('./createHtmlIndex'),
    applyManifest = require('./applyManifest');

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
        publicPath: config.publicPath,
        destination: _.map(config.destination, function (path) { return path + '/'; }),
        aliases: aliases,
        provides: provides,
        watch: 'development' == env,
        hash: 'development' != env,
        minimize: 'development' != env,
        manifest: true,
        extract: config.extract,
        frontendPath: config.frontendPath
    });
};

var getApplyManifestFile = function (gulp, destinations) {
    return function () {
        var lastDestination = _.head(destinations)
        var gulpPipe = gulp.src(lastDestination + '/*.html')
            .pipe(wait(1000))
            .pipe(applyManifest());

        _.each(destinations, function (path) {
            gulpPipe.pipe(gulp.dest(path));
        });

        return gulpPipe;
    };
};

var getServeTask = function (config) {
    return function () {
        browserSync.init({
            server: _.head(config.destination) + '/',
            open: (argv.o || argv.open) ? 'local' : false
        });

        browserSync.watch(_.head(config.destination) + '/**/*.*').on('change', browserSync.reload);
    }
};

var getPugTask = function (gulp, config) {
    return function () {
        var gulpPipe = gulp.src(config.blockPath)
            .pipe(plumber({
                errorHandler: function(err) {
                    notify.onError({
                        title:    'Pug',
                        message:  err.message
                    })(err);
                }
            }))
            .pipe(pugBlockCompiler.index())
            .pipe(pugBlockCompiler())
            .pipe(createHtmlIndex());

        _.each(config.destination, function (path) {
            gulpPipe.pipe(gulp.dest(path));
        });

        return gulpPipe;
    };
};

var getPugWatchTask = function (gulp, config) {
    return function (callback) {
        watch(config.pugWatchList, gulp.series('pug'));
        callback();
    };
};

var getDefaultTask = function (gulp, env) {
    switch (env) {
        case 'production':
            return gulp.series('clean', 'assets');
            break;
        case 'development':
            return gulp.series('clean', 'pug', gulp.parallel('assets', 'pug_watch'), 'serve');
            break;
        case 'stage':
            return gulp.series('clean', 'assets', 'pug', 'apply_manifest');
            break;
    }
};

module.exports = function (gulp, config) {
    const webpackConfig = _.assign(defaultConfig, config);

    if (!_.isArray(webpackConfig.destination)) {
        webpackConfig.destination = [webpackConfig.destination];
    }

    gulp.task('clean', getCleanTask(webpackConfig));
    gulp.task('assets', getAssetsTask(gulp, webpackConfig, config.aliases, config.provides, config.env));
    gulp.task('apply_manifest', getApplyManifestFile(gulp, webpackConfig.destination));
    gulp.task('serve', getServeTask(webpackConfig));
    gulp.task('pug', getPugTask(gulp, webpackConfig));
    gulp.task('pug_watch', getPugWatchTask(gulp, webpackConfig));
    gulp.task('default', getDefaultTask(gulp, config.env));
};
