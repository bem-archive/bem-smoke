'use strict';
var INHERIT = require('inherit'),
    requireMocked = require('require-mocked'),
    Q = require('q'),
    QFSMock = require('q-io/fs-mock'),
    assert = require('chai').assert,
    FSMock = require('./fs-mock');

require('chai').use(require('chai-as-promised'));

function merge(obj1, obj2) {
    var result = {};
    Object.keys(obj1 || {}).forEach(function(key) {
        result[key] = obj1[key];
    });
    Object.keys(obj2 || {}).forEach(function(key) {
        result[key] = obj2[key];
    });

    return result;
}

var TechTest = INHERIT(/** @lends *TechTest.prototype*/{

    /**
     * Creates new instance
     * @class TechTest class that assists functional testing of the technology modules.
     * @constructs
     * @param {String} techName a name of the technology.
     * @param {String} modulePath an absolute path to technology module file.
     */
    __constructor: function(techName, modulePath) {
        this._techName = techName;
        this._modulePath = modulePath;
    },

    /**
     * Specifies source files to use during the test.
     *
     * @param {Object} sources source files tree to use. Each key represents an FS node name.
     * If the value of a key is an object, then virtual directory of the same name will be created.
     * If value is string or Buffer, file with appropriate content will be created.
     *
     * @returns {TechTest}
     */
    withSourceFiles: function(sources) {
        this._sources = sources;
        return this;
    },

    /**
     * Specifies mock modules to use during the test.
     * Multiple calls to this method will be merged together.
     *
     * @param {Object} modules a mock to load instead of a specified modules. Format is
     * <pre>{"moduleId": mockObject}</pre>
     * @returns {TechTest}
     */
    withMockedModules: function(modules) {
        if (modules.fs || modules['q-fs'] || modules['q-io/fs']) {
            throw new Error('"fs", "q-fs" and "q-io/fs" modules are already mocked. Use .withSourceFiles method');
        }
        this._mockedModules = merge(this._mockedModules, modules);
        return this;
    },

    /**
     * Specifies paths to return from require.resolve instead of originals.
     * Multiple calls to this method will be merged together.
     *
     * @param {Object} modulePaths a paths to return from require.resolve during a test.
     * Format is {"moduleId": "/stub/path"}.
     *
     * @returns {TechTest}
     */
    withMockedModulesResolves: function (modulePaths) {
        this._mockedResolves = merge(this._mockedResolves, modulePaths);
        return this;
    },

    /**
     * Specifies single level to use during a test
     *
     * @param {String} level level path.
     *
     * @returns {TechTest}
     */
    withLevel: function(level) {
        this.withLevels([level]);
        return this;
    },

    /**
     * Specifies multiple levels to use during a test.
     *
     * @param {String[]} levels array of level paths.
     *
     * @returns {TechTest}
     */
    withLevels: function(levels) {
        this._levelPaths = levels;
        return this;
    },

    /**
     * Specifies tech map to use during the test. Can be useful
     * to allow to resolve base tech by name.
     *
     * @param {Object} techMap tech map in format <pre>{name: "absolute/path"}</pre>
     * @returns {TechTest}
     */
    withTechMap: function(techMap) {
        this._techMap = techMap;
        return this;
    },

    /**
     * Updates last accessed and last modified dates of a file.
     * Should be called after create or build calls.
     *
     * @param {String} path a file to touch
     * @returns {TechTest}
     */
    touchFile: function(path) {
        var self = this;
        this._enqueue(function() {
            return self._fs.open(path, 'w+').then(function(stream) {
                return stream.close();
            });
        });
        return this;
    },

    /**
     * Creates element using then tech.
     *
     * @param {Object} elem element to create.
     * @param {String} elem.block block name.
     * @param {String} elem.elem element name.
     * @param {String} elem.mod modifier name.
     * @param {String} elem.val modifier value.
     *
     * @returns {TechTest}
     */
    create: function(elem) {
        this._load();

        var self = this;

        var level = this._levels[0];

        this._enqueue(function () {
            self._testStartTime = new Date().getTime();
            return self._tech.createByDecl(elem, level, {});
        });
        return this;
    },

    /**
     * Builds a project using tech.
     *
     * @todo Specifiy parameters
     */
    build: function(output, decl) {
        this._buildDecl = decl;
        var self = this;
        this._load();

        this._enqueue(function () {
            self._testStartTime = new Date().getTime();
            /*jshint newcap:false*/
            return self._tech.buildByDecl(Q(decl), self._levels, output, {});
        });
        return this;
    },

    /**
     * @private
     */
    _enqueue: function(call) {
        if (!this._promise) {
            this._promise = call();
        } else {
            this._promise = this._promise.then(call);
        }
    },

    /**
     * Checks that action results produces file with given name.
     * Checks only existence of the file. Use {@link TechTest#withContent} method
     * to assert on file content.
     *
     * @param {String} path a path to a file to check.
     *
     * @returns {TechTest}
     */

    producesFile: function(path) {
        var self = this;
        this._lastFileName = path;
        this._enqueue(function() {
            return assert.eventually.isTrue(self._fs.exists(path), 'expected tech to produce file ' + path);
        });
        return this;
    },

    /**
     * Used after {@link TechTest#producesFile} to check for actual file contents.
     *
     * @param {...String} content Expected file content. Each argument represents one expected line of
     * a file.
     *
     * @returns {TechTest}
     */
    withContent: function(content) {
        var self = this,
            fileName = this._lastFileName;

        if (arguments.length > 1) {
            content = Array.prototype.join.call(arguments, '\n');
        }
        this._enqueue(function() {
            return assert.eventually.equal(
                self._fs.read(fileName),
                content,
                'expected file ' + self._lastFileName + ' to have content ' + content);
        });
        return this;
    },

    /**
     * Checks that file have been written to. Actual content of the file does not checked, only the fact
     * of modification.
     *
     * @param {String} path path to file to check for modification.
     * @returns {TechTest}
     */
    writesToFile: function(path) {
        var self = this;
        this._enqueue(function() {
            return assert.eventually.operator(self._fs.lastModified(path).invoke('getTime'),
                                              '>',
                                              self._testStartTime,
                                              'Expected file ' + path + ' to be modifed');
        });
        return this;
    },

    /**
     * Checks that file have not been written during test.
     *
     * @param {String} path a path to file to check.
     * @returns {TechTest}
     */
    notWritesToFile: function(path) {
        var self = this;
        this._enqueue(function() {
            return assert.eventually.operator(self._fs.lastModified(path).invoke('getTime'),
                                              '<=',
                                              self._testStartTime,
                                              'Expected file ' + path + ' not to be modifed');
        });
        return this;
    },

    /**
     * Notify test framework completion callback after all tests are finished.
     * @param {Function} done completion callback.
     *
     * @returns {TechTest}
     */
    notify: function(done) {
        this._promise.then(done, done);
        return this;
    },

    /**
     * Execute any custom asserts after the action.
     * @param {Function} callback callback that will execute the assertions.
     *
     * @return {TechTest}
     */
    asserts: function(callback) {
        this._enqueue(function() {
            return Q.fcall(callback);
        });
        return this;
    },

    /**
     * @private
     */
    _load: function() {
        this._fs = this._fs || new QFSMock(this._sources || {});

        var opts = {
            mocks: this._getMocks(),
            resolves: this._mockedResolves,
            ignoreMocks: [
                'winston',
                'mime',
                'node.extend',
                'uglify-js',
                'insight'
            ]
        };

        this._loadLevels(opts);
        this._loadContext(opts);
        this._loadTech();
    },

    /**
     * @private
     */
    _getMocks: function() {
        return merge(this._mockedModules, {
            'q-io/fs': this._fs,
            'q-fs': this._fs,
            'fs': new FSMock(this._fs)
        });
    },

    /**
     * @private
     */
    _loadTech: function() {
        this._tech = this._context.getTech(this._techName);
    },

    /**
     * @private
     */
    _loadLevels: function(opts) {
        var StubLevel = requireMocked(require.resolve('./stub-level'), opts);

        this._levelPaths = this._levelPaths || ['/'];
        this._techMap = this._techMap || {};

        this._techMap[this._techName] = this._modulePath;

        this._levels = this._levelPaths.map(function(path) {
            return new StubLevel(path, this._techMap);
        }, this);
    },

    /**
     * @private
     */
    _loadContext: function(mockOpts) {
        var Context = requireMocked(require.resolve('bem'), mockOpts).Context;
        var opts = {
            root: '/',
            level: this._levels,
            /*jshint newcap:false*/
            declaration: Q(this._buildDecl),
            /*jshint newcap:true*/
            tech: Object.keys(this._techMap).map(function(key) {
                return this._techMap[key];
            }, this)
        };

        this._context = new Context(this._levels[0], opts);
    }
});

exports.TechTest = TechTest;

