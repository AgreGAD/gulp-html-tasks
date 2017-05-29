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

var remotePublicPath = function (replaces, publicPath) {
    if (!publicPath) {
        return replaces;
    }

    var newReplaces = {};
    _.forIn(replaces, function (value, key) {
        newReplaces[_.replace(key, publicPath, '')] = _.replace(value, publicPath, '');
    });

    return newReplaces;
};

var createApplyManifest = function (publicPath) {
    return function (file, enc, cb) {
        var content = file.contents.toString();
        var manifestFilePath = file.base + '/manifest.json';
        var replaces = remotePublicPath(getReplaces(manifestFilePath), publicPath);

        _.forIn(replaces, function (replace, search) {
            content = _.replace(content, search, replace);
        });

        if (file.isBuffer()) {
            file.contents = new Buffer(content);
        }

        cb(null, file);
    };
};

module.exports = function (publicPath) {
    return through2(createApplyManifest(publicPath));
};
