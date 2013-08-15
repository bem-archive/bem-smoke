# bem-smoke

Helper library to assist smoke-testing of the bem technologies

## Installation

`npm install bem-smoke`

## Usage

### Tech modules testing

You need to require `bem-smoke` module and call `testTech` method with a path to your
technology module:

```javascript
    var BEMSmoke = require('bem-smoke');
    var tech = BEMSmoke.testTech('/absolute/path/to/tech');
```

You can use `require.resolve` to get an absolute path from module id.

All `TechTest` modules can be divided into three groups that should be called in order:

* setup - prepares initial state for a tech;
* action - performs action you are testing;
* assert - check the final state after the action.

#### Example test:

```javascript
var tech = BEMTesting.testTech(require.resolve('path/to/css-tech'));
tech.withSourceFiles({
    'menu': {
        'menu.css': '.test1 {}',
        '__item': {
            'menu__item.css': '.test2 {}'
        }
    }
})
.build('/name', {
    deps: [
        {block: 'menu'},
        {block: 'menu', elem: 'item'}
    ]
})
.producesFile('name.css')
.withContent('@import url(menu/menu.css);',
             '@import url(menu/__item/menu__item.css);',
             '');
```

#### Setup methods

* `withSourceFiles(fsTree)` - specifies how FS tree should look like during a test. Keys  of `fsTree` represent
files/directories names. If value of a key is an object, then it represents directory, if it's string or Buffer -
file with corresponding content.

* `withLevel(path)` - specify level to use during the test. If not called, level at root of a mock fs tree will
be used.

* `withLevels(levels)` - specifies levels to use for a create/bulid. `levels` is an array of directory paths.

* `withTechMap(map)` - specifies tech map to use during tests. Map format is
`{"techName": "/absolute/path/to/module"}`. Can be useful to resolve base technologies by names.

* `withMockModules(modules)` - specifies mocks to use instead of particular modules during the test. Format is
`{"moduleId": mockObject}`. Note, that `fs` and `q-io/fs` modules are already mocked by framework.
    Example:
    ```javascript
    tech.withMockedModules({
        'net': {
            createServer: function() {
                ...
            }
        }
    });
    ```
* `withMockedModulesResolves(modulePaths)` - stub `require.resolve` for tech under the test to return
specified path instead of original. Doesn't affect actual module loaded via `require`. Format is
`{"moduleId": "/stub/path"}`.

* `touchFile(path)` - updates access and modification dates for file at `path`. Should be called after
`build` or `create`.

#### Action methods

* `create(elem)` - performs create action for the technology. `elem.block`, `elem.elem`, `elem.mod` and `elem.val`
specifies entity to create.

* `build(prefix, decl)` - performs build action. `prefix` specifies output path prefix, `decl` - declaration
to use for a build.

#### Assert methods

* `producesFile(path)` - assert that file at `path` exists after action finishes.
* `withContent(line1, line2, ...)` - assert that file specified at the last `producesFile` has correct content
after action finishes. Each argument represents one expected line of a file.
* `writesToFile(path)` - assert that file at `path` have been written to during the test.
* `notWritesToFile(path)` - assert that file at `path` have not been written to during test.

#### Utility methods

* `notify(callback)` - used with asynchronous test runners, such as [mocha](https://github.com/visionmedia/mocha)
to notify runner that test is complete.
* `asserts(callback)` - pass a function to this method to execute any additional assertions on a tech.

Example:

```javascript
describe('example', function() {
    it('completes', function(done) {
        tech.withSourceFiles({
        })
        ...
        .notify(done);
    });
});

```

## License

Licensed under MIT license.
