'use strict';

var
    _ = require('lodash'),
    through = require('through2'),
    path = require('path'),
    fs = require('fs'),
    pug = require('pug'),
    ext = require('gulp-util').replaceExtension;

var loadData = function (filepath) {
    var data = undefined;

    try {
        fs.accessSync(filepath, fs.F_OK);

        delete require.cache[require.resolve(filepath)];
        data = require(filepath);
    } catch (e) {
        data = {};
    }

    return data;
};

var calcBlockName = function (filename) {
    var words = _.split(filename, '-');
    var upperWords = _.map(words, function (word) {
        return _.upperFirst(word);
    });

    return _.lowerFirst(_.join(upperWords, ''));
};

var getBlockTemplate = function (filename) {
    var blockName = calcBlockName(filename);

    return `
include ./${filename}/${filename}.pug
include ./layout/layout.pug

+layout(layoutData)
  +${blockName}(blockData)
    `;
};
var getLayoutTemplate = function () {
    return `
include ./layout/layout.pug

+layout(layoutData)
    `;
};

var pugCompile = function (template, data, tmpFile) {
    var fn = pug.compile(template, {
        pretty: true,
        filename: tmpFile
    });

    return fn(data);
};

var compile = function (file, enc, cb) {
    var dirname = path.dirname(file.path);
    var blocksPath = dirname + '/..';

    file.path = file.cwd + '/' + path.basename(file.path);

    var templateFilename = path.basename(file.path, '.pug');
    var template = (templateFilename == 'layout') ? getLayoutTemplate() : getBlockTemplate(templateFilename);

    var html = pugCompile(template, {
        layoutData: loadData(blocksPath + '/layout/data.js'),
        blockData: loadData(dirname + '/data.js')
    }, dirname + '/../tmp.pug');

    file.path = ext(file.path, '.html');

    if (file.isBuffer()) {
        file.contents = new Buffer(html);
    }

    cb(null, file);
};

module.exports = function () {
    return through.obj(compile);
};
