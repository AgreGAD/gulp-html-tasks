'use strict';

var
    _ = require('lodash'),
    through2 = require('through2').obj,
    path = require('path'),
    fs = require('fs'),
    pug = require('pug'),
    ext = require('gulp-util').replaceExtension;

var index = {};

var getBlockIndex = function(relativePath) {
    if (undefined === index[relativePath]) {
        index[relativePath] = {
            template: {},
            data: {}
        };
    }

    return index[relativePath];
};

var compareTimes = function (time1, time2) {
    if (!time1 || !time2) {
        return false;
    }

    return time1.getTime() == time2.getTime();
};

var updateFileInfo = function (filepath, oldData) {
    if (!isExists(filepath)) {
        return undefined;
    }

    var stats = fs.statSync(filepath);
    var blockData = {};

    blockData.filepath = filepath;
    blockData.oldTimestamp = oldData.newTimestamp;
    blockData.newTimestamp = stats.mtime;
    blockData.isChanged = !compareTimes(blockData.oldTimestamp, blockData.newTimestamp);

    return blockData;
};

var getIncludesBlocks = function (file) {
    var matches = file.contents.toString().match(/include .+\.pug/ig);
    var blockDir = path.normalize(file.dirname + '/../');

    if (!matches) {
        return [];
    }

    return _.map(matches, function (str) {
        str = _.replace(str, 'include .', file.dirname);
        str = path.normalize(str);
        str = _.replace(str, blockDir, '');

        return str;
    });
};

var isNeedUpdate = function (relativePath) {
    var blockIndex = index[relativePath];

    if (blockIndex.template.isChanged) {
        return true;
    } else if (!blockIndex.dependecies.length) {
        return false;
    } else {
        var isNeedDependenciesUpdate = _.map(blockIndex.dependecies, function (dependencyRelativePath) {
            return isNeedUpdate(dependencyRelativePath);
        });

        return -1 != _.indexOf(isNeedDependenciesUpdate, true);
    }
};

var isExists = function (filepath) {
    try {
        fs.accessSync(filepath, fs.F_OK);

        return true;
    } catch (e) {
        return false;
    }

};

var loadData = function (filepath) {
    delete require.cache[require.resolve(filepath)];
    return require(filepath);
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

var isChanged = function (blockIndex) {
    if (blockIndex.template.isChanged) {
        return true;
    }

    if (!blockIndex.data) {
        return false;
    }

    return blockIndex.data.isChanged;
};

var compileFile = function (file, enc, cb) {
    var
        dirname = path.dirname(file.path),
        blocksPath = dirname + '/..',
        layoutDataFilepath = blocksPath + '/layout/layout.data.js',
        templateFilename = path.basename(file.path, '.pug');

    var blockIndex = index[file.relative];
    blockIndex.template.isChanged = isNeedUpdate(file.relative);

    if (!isChanged(blockIndex)) {
        cb();
        return;
    }
    var blockName = _.last(_.split(dirname, '/'));

    file.path = file.cwd + '/' + path.basename(file.path);

    var template = (templateFilename == 'layout') ? getLayoutTemplate() : getBlockTemplate(blockName, templateFilename);

    var html = pugCompile(template, {
        layoutData: isExists(layoutDataFilepath) ? loadData(layoutDataFilepath) : {},
        blockData: blockIndex.data ? loadData(blockIndex.data.filepath) : {}
    }, dirname + '/../tmp.pug');

    file.path = ext(file.path, '.html');

    if (file.isBuffer()) {
        file.contents = new Buffer(html);
    }

    cb(null, file);
};

var indexFile = function (file, enc, callback) {
    var templateFilename = path.basename(file.relative, '.pug');
    var blockDataFilepath = file.dirname + '/' + templateFilename + '.data.js';

    var blockIndex = getBlockIndex(file.relative);

    blockIndex.template = updateFileInfo(file.path, blockIndex.template);
    blockIndex.data = updateFileInfo(blockDataFilepath, blockIndex.data);
    blockIndex.dependecies = getIncludesBlocks(file);

    callback(null, file);
};

module.exports = function () {
    return through2(compileFile);
};

module.exports.index = function () {
    return through2(indexFile);
};
