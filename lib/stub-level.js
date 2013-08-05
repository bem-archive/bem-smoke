'use strict';

var INHERIT = require('inherit'),
    Level = require('bem').Level;

module.exports = INHERIT(Level, /** @lends StubLevel.prototype */{


    /**
     * Creates new instance.
     *
     * @class StubLevel Special stub level to use in technology functional tests.
     * Created for one specific tech. Differences with regular levels.
     * Differences with regular level:
     *
     * <ul>
     *  <li> project root is always at /
     *  <li> getTechs always returns technologies given at constructor.
     * </ul>
     *
     * @private
     * @constructs
     * @param {String} path a path to the level
     * @param {Tech} tech technology to create level for
     */
    __constructor: function(path, techMap) {
        this.__base(path, {projectRoot: '/'});
        this._techMap = techMap;

    },

    getTechs: function() {
        return this._techMap;
    }
});
