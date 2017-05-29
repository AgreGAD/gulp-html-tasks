'use strict';

var
    _ = require('lodash'),
    path = require('path'),
    through2 = require('through2').obj;

var replaces = undefined;

var getReplaces = function (manifestFilePath) {
    if (undefined === replaces) {
        replaces = require(manifestFilePath);
    }

    return replaces;
};

var createApplyManifest = function () {
    return function (file, enc, cb) {
        var content = file.contents.toString();
        var manifestFilePath = file.base + '/manifest.json';
        var replaces = getReplaces(manifestFilePath);

        _.forIn(replaces, function (replace, search) {
            content = _.replace(content, search, replace);
        });

        if (file.isBuffer()) {
            file.contents = new Buffer(content);
        }

        cb(null, file);
    };
};

module.exports = function (manifestFilePath) {
    return through2(createApplyManifest(manifestFilePath));
};
