'use strict';

var
    _ = require('lodash'),
    through = require('through2'),
    path = require('path'),
    fs = require('fs'),
    pug = require('pug'),
    ext = require('gulp-util').replaceExtension,
    md5File = require('md5-file');

var isExists = function (filepath) {
    try {
        fs.accessSync(filepath, fs.F_OK);

        return true;
    } catch (e) {
        return false;
    }

};

var loadData = function (filepath) {
    var data = undefined;

    if (isExists(filepath)) {
        delete require.cache[require.resolve(filepath)];
        data = require(filepath);
    } else {
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

var getBlockTemplate = function (blockName, filename) {
    var mixinName = calcBlockName(filename);

    return `
include ./${blockName}/${filename}.pug
include ./layout/layout.pug

+layout(layoutData)
  +${mixinName}(blockData)
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

var files = {};
var checkFileUpdates = function (filepath) {
    if (!isExists(filepath)) {
        return false;
    }

    var hash = md5File.sync(filepath);

    if (undefined === files[filepath] || files[filepath] !== hash) {
        files[filepath] = hash;

        return true;
    }

    return false;
};


var compile = function (file, enc, cb) {
    var
        dirname = path.dirname(file.path),
        blocksPath = dirname + '/..',
        layoutDataFilepath = blocksPath + '/layout/layout.data.js',
        templateFilename = path.basename(file.path, '.pug'),
        blockDataFilepath = dirname + '/' + templateFilename + '.data.js';

    var isTemplateUpdated = checkFileUpdates(file.path),
        isLayoutDataFileUpdated = checkFileUpdates(layoutDataFilepath),
        isTemplateDataFileUpdated = checkFileUpdates(blockDataFilepath);

    if (!isTemplateUpdated && !isLayoutDataFileUpdated && !isTemplateDataFileUpdated) {
        cb();
        return;
    }

    var blockName = _.last(_.split(dirname, '/'));

    file.path = file.cwd + '/' + path.basename(file.path);

    var template = (templateFilename == 'layout') ? getLayoutTemplate() : getBlockTemplate(blockName, templateFilename);

    var html = pugCompile(template, {
        layoutData: loadData(layoutDataFilepath),
        blockData: loadData(blockDataFilepath)
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
