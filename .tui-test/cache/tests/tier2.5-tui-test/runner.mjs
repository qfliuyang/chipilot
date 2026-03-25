//# hash=897e6a564ef001e6ae9fa519b8ae266e
//# sourceMappingURL=runner.mjs.map

#!/usr/bin/env node
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _ts_generator(thisArg, body) {
    var f, y, t, _ = {
        label: 0,
        sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
        },
        trys: [],
        ops: []
    }, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype), d = Object.defineProperty;
    return d(g, "next", {
        value: verb(0)
    }), d(g, "throw", {
        value: verb(1)
    }), d(g, "return", {
        value: verb(2)
    }), typeof Symbol === "function" && d(g, Symbol.iterator, {
        value: function() {
            return this;
        }
    }), g;
    function verb(n) {
        return function(v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while(g && (g = 0, op[0] && (_ = 0)), _)try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [
                op[0] & 2,
                t.value
            ];
            switch(op[0]){
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [
                        0
                    ];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [
                6,
                e
            ];
            y = 0;
        } finally{
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
}
/**
 * Tier 2.5 Test Runner for @microsoft/tui-test
 *
 * This runs outside vitest due to process communication conflicts.
 */ import { tuiTest, KEYS } from '@microsoft/tui-test';
import * as path from 'path';
import { fileURLToPath } from 'url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var CLI_PATH = path.join(process.cwd(), 'dist', 'cli.js');
// Simple test runner
var passed = 0;
var failed = 0;
var errors = [];
function test(name, fn) {
    return _async_to_generator(function() {
        var error;
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    _state.trys.push([
                        0,
                        2,
                        ,
                        3
                    ]);
                    return [
                        4,
                        fn()
                    ];
                case 1:
                    _state.sent();
                    console.log("✅ ".concat(name));
                    passed++;
                    return [
                        3,
                        3
                    ];
                case 2:
                    error = _state.sent();
                    console.log("❌ ".concat(name));
                    console.log("   Error: ".concat(error.message));
                    errors.push({
                        name: name,
                        error: error
                    });
                    failed++;
                    return [
                        3,
                        3
                    ];
                case 3:
                    return [
                        2
                    ];
            }
        });
    })();
}
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Tier 2.5: TUI Integration (@microsoft/tui-test)          ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();
await test('should display welcome message on startup', function() {
    return _async_to_generator(function() {
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    return [
                        4,
                        tuiTest(function(session) {
                            return _async_to_generator(function() {
                                return _ts_generator(this, function(_state) {
                                    switch(_state.label){
                                        case 0:
                                            return [
                                                4,
                                                session.start("node ".concat(CLI_PATH))
                                            ];
                                        case 1:
                                            _state.sent();
                                            return [
                                                4,
                                                session.waitForText('Welcome to chipilot')
                                            ];
                                        case 2:
                                            _state.sent();
                                            return [
                                                2
                                            ];
                                    }
                                });
                            })();
                        }, 10000)
                    ];
                case 1:
                    _state.sent();
                    return [
                        2
                    ];
            }
        });
    })();
});
await test('should show help hint in header', function() {
    return _async_to_generator(function() {
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    return [
                        4,
                        tuiTest(function(session) {
                            return _async_to_generator(function() {
                                var hasTab, hasHelp;
                                return _ts_generator(this, function(_state) {
                                    switch(_state.label){
                                        case 0:
                                            return [
                                                4,
                                                session.start("node ".concat(CLI_PATH))
                                            ];
                                        case 1:
                                            _state.sent();
                                            return [
                                                4,
                                                session.waitForText('Welcome to chipilot')
                                            ];
                                        case 2:
                                            _state.sent();
                                            return [
                                                4,
                                                session.hasText('Tab: switch')
                                            ];
                                        case 3:
                                            hasTab = _state.sent();
                                            return [
                                                4,
                                                session.hasText('?: help')
                                            ];
                                        case 4:
                                            hasHelp = _state.sent();
                                            if (!hasTab || !hasHelp) {
                                                throw new Error('Missing header hints');
                                            }
                                            return [
                                                2
                                            ];
                                    }
                                });
                            })();
                        }, 10000)
                    ];
                case 1:
                    _state.sent();
                    return [
                        2
                    ];
            }
        });
    })();
});
await test('should accept and display typed input', function() {
    return _async_to_generator(function() {
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    return [
                        4,
                        tuiTest(function(session) {
                            return _async_to_generator(function() {
                                var hasText;
                                return _ts_generator(this, function(_state) {
                                    switch(_state.label){
                                        case 0:
                                            return [
                                                4,
                                                session.start("node ".concat(CLI_PATH))
                                            ];
                                        case 1:
                                            _state.sent();
                                            return [
                                                4,
                                                session.waitForText('Welcome')
                                            ];
                                        case 2:
                                            _state.sent();
                                            return [
                                                4,
                                                session.type('hello world')
                                            ];
                                        case 3:
                                            _state.sent();
                                            return [
                                                4,
                                                session.hasText('hello world')
                                            ];
                                        case 4:
                                            hasText = _state.sent();
                                            if (!hasText) {
                                                throw new Error('Typed text not found');
                                            }
                                            return [
                                                2
                                            ];
                                    }
                                });
                            })();
                        }, 10000)
                    ];
                case 1:
                    _state.sent();
                    return [
                        2
                    ];
            }
        });
    })();
});
await test('should switch to terminal pane with Tab', function() {
    return _async_to_generator(function() {
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    return [
                        4,
                        tuiTest(function(session) {
                            return _async_to_generator(function() {
                                return _ts_generator(this, function(_state) {
                                    switch(_state.label){
                                        case 0:
                                            return [
                                                4,
                                                session.start("node ".concat(CLI_PATH))
                                            ];
                                        case 1:
                                            _state.sent();
                                            return [
                                                4,
                                                session.waitForText('Welcome')
                                            ];
                                        case 2:
                                            _state.sent();
                                            return [
                                                4,
                                                session.keyPress(KEYS.TAB)
                                            ];
                                        case 3:
                                            _state.sent();
                                            return [
                                                4,
                                                session.waitForText('Tab to return to chat')
                                            ];
                                        case 4:
                                            _state.sent();
                                            return [
                                                2
                                            ];
                                    }
                                });
                            })();
                        }, 10000)
                    ];
                case 1:
                    _state.sent();
                    return [
                        2
                    ];
            }
        });
    })();
});
await test('should preserve input when switching panes', function() {
    return _async_to_generator(function() {
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    return [
                        4,
                        tuiTest(function(session) {
                            return _async_to_generator(function() {
                                var screen, hasText;
                                return _ts_generator(this, function(_state) {
                                    switch(_state.label){
                                        case 0:
                                            return [
                                                4,
                                                session.start("node ".concat(CLI_PATH))
                                            ];
                                        case 1:
                                            _state.sent();
                                            return [
                                                4,
                                                session.waitForText('Welcome')
                                            ];
                                        case 2:
                                            _state.sent();
                                            return [
                                                4,
                                                session.type('preserved message')
                                            ];
                                        case 3:
                                            _state.sent();
                                            return [
                                                4,
                                                session.keyPress(KEYS.TAB)
                                            ];
                                        case 4:
                                            _state.sent();
                                            return [
                                                4,
                                                session.waitForText('Tab to return to chat')
                                            ];
                                        case 5:
                                            _state.sent();
                                            return [
                                                4,
                                                session.getScreen()
                                            ];
                                        case 6:
                                            screen = _state.sent();
                                            if (screen.includes('preserved message')) {
                                                throw new Error('Input visible in terminal pane (should be hidden)');
                                            }
                                            return [
                                                4,
                                                session.keyPress(KEYS.TAB)
                                            ];
                                        case 7:
                                            _state.sent();
                                            return [
                                                4,
                                                session.hasText('preserved message')
                                            ];
                                        case 8:
                                            hasText = _state.sent();
                                            if (!hasText) {
                                                throw new Error('Input not preserved after switching back');
                                            }
                                            return [
                                                2
                                            ];
                                    }
                                });
                            })();
                        }, 10000)
                    ];
                case 1:
                    _state.sent();
                    return [
                        2
                    ];
            }
        });
    })();
});
await test('should show help overlay with ? key', function() {
    return _async_to_generator(function() {
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    return [
                        4,
                        tuiTest(function(session) {
                            return _async_to_generator(function() {
                                return _ts_generator(this, function(_state) {
                                    switch(_state.label){
                                        case 0:
                                            return [
                                                4,
                                                session.start("node ".concat(CLI_PATH))
                                            ];
                                        case 1:
                                            _state.sent();
                                            return [
                                                4,
                                                session.waitForText('Welcome')
                                            ];
                                        case 2:
                                            _state.sent();
                                            return [
                                                4,
                                                session.type('?')
                                            ];
                                        case 3:
                                            _state.sent();
                                            return [
                                                4,
                                                session.waitForText('Keyboard Shortcuts')
                                            ];
                                        case 4:
                                            _state.sent();
                                            return [
                                                2
                                            ];
                                    }
                                });
                            })();
                        }, 10000)
                    ];
                case 1:
                    _state.sent();
                    return [
                        2
                    ];
            }
        });
    })();
});
console.log();
console.log('═'.repeat(60));
console.log("Results: ".concat(passed, " passed, ").concat(failed, " failed"));
console.log('═'.repeat(60));
if (errors.length > 0) {
    console.log('\nErrors:');
    var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
    try {
        for(var _iterator = errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
            var _step_value = _step.value, name = _step_value.name, error = _step_value.error;
            console.log("  - ".concat(name, ": ").concat(error.message));
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally{
        try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
                _iterator.return();
            }
        } finally{
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
}
process.exit(failed > 0 ? 1 : 0);
