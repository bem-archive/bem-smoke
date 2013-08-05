'use strict';

var PATH = require('path'),
    BEMUtil = require('bem').util,
    TechTest = require('./tech-test').TechTest;

/**
 * Creates functional test helper for technology module.
 *
 * @param {String} [techName] name of the technology. If omitted, will be derived
 * from module path.
 * @param {String} moduleName an absolute path to a module to test.
 * @returns {TechTest}
 */
exports.testTech = function(techName, modulePath) {
    if (arguments.length === 1) {
        modulePath = arguments[0];
        techName = BEMUtil.stripModuleExt(PATH.basename(modulePath));
    }
    return new TechTest(techName, modulePath);
};
