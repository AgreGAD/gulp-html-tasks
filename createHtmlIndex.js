'use strict';

var
    _ = require('lodash'),
    through2 = require('through2').obj,
    path = require('path'),
    fs = require('fs'),
    pug = require('pug'),
    ext = require('gulp-util').replaceExtension,
    File = require('vinyl');

var files = [];

var registerFiles = function (file, enc, callback) {
    if (-1 === _.indexOf(files, file.basename)) {
        files.push(file.basename);
    }

    callback(null, file);
};

var createIndexTemlate = function (files) {
    var str = '<!DOCTYPE html><html><head><title></title><meta charset="UTF-8"></head>';
    str += '<ul>';

    _.forEach(files, function (file) {
        str += '<li><a href="/' + file + '">' + file + '</a></li>';
    });

    str += '</ul>';

    str += '<body></body></html>';

    return str;
}

module.exports = function () {
    return through2(registerFiles, function (callback) {

        var basePath = process.cwd() + '/..';

        var indexFile = new File({
            contents: new Buffer(createIndexTemlate(files)),
            base: basePath,
            path: basePath + '/index.html'
        });

        this.push(indexFile);

        callback();
    });
};
