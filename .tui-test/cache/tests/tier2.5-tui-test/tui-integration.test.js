//# hash=98c472c62f8222fb03b647fe75a55be2
//# sourceMappingURL=tui-integration.test.js.map

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
 * Tier 2.5: TUI Integration Tests with @microsoft/tui-test
 *
 * @microsoft/tui-test provides high-level TUI testing that bridges
 * the gap between component tests (Tier 2) and full PTY tests (Tier 3).
 * It can test the actual CLI in a controlled terminal environment.
 *
 * This tier validates that Tier 2's mocked components match real behavior
 * before Tier 3's full PTY testing.
 */ import { describe, it, expect } from 'vitest';
import { tuiTest, KEYS } from '@microsoft/tui-test';
import * as path from 'path';
var CLI_PATH = path.join(process.cwd(), 'dist', 'cli.js');
describe('Tier 2.5: TUI Integration (@microsoft/tui-test)', function() {
    describe('Initial Render', function() {
        it('should display welcome message on startup', function() {
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
                                                    // Wait for the welcome message
                                                    return [
                                                        4,
                                                        session.waitForText('Welcome to chipilot')
                                                    ];
                                                case 2:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.hasText('chipilot')
                                                    ];
                                                case 3:
                                                    // Verify header elements
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        4,
                                                        session.hasText('Agentic EDA')
                                                    ];
                                                case 4:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        2
                                                    ];
                                            }
                                        });
                                    })();
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        }, 10000);
        it('should show help hint in header', function() {
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
                                                        4,
                                                        session.hasText('Tab: switch')
                                                    ];
                                                case 3:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        4,
                                                        session.hasText('Ctrl+C: exit')
                                                    ];
                                                case 4:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        4,
                                                        session.hasText('?: help')
                                                    ];
                                                case 5:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        2
                                                    ];
                                            }
                                        });
                                    })();
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        }, 10000);
    });
    describe('Input Handling', function() {
        it('should accept and display typed input', function() {
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
                                                    // Type some text
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
                                                    // Verify text appears
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        2
                                                    ];
                                            }
                                        });
                                    })();
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        }, 10000);
        it('should handle backspace', function() {
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
                                                        session.type('helo')
                                                    ];
                                                case 3:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.keyPress(KEYS.BACKSPACE)
                                                    ];
                                                case 4:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.type('lo')
                                                    ];
                                                case 5:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.hasText('hello')
                                                    ];
                                                case 6:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        2
                                                    ];
                                            }
                                        });
                                    })();
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        }, 10000);
    });
    describe('Pane Switching', function() {
        it('should switch to terminal pane with Tab', function() {
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
                                                    // Press Tab to switch panes
                                                    return [
                                                        4,
                                                        session.keyPress(KEYS.TAB)
                                                    ];
                                                case 3:
                                                    _state.sent();
                                                    // Should show terminal-focused UI
                                                    return [
                                                        4,
                                                        session.waitForText('Tab to return to chat')
                                                    ];
                                                case 4:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.hasText('Terminal')
                                                    ];
                                                case 5:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        2
                                                    ];
                                            }
                                        });
                                    })();
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        }, 10000);
        it('should preserve input when switching panes', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                tuiTest(function(session) {
                                    return _async_to_generator(function() {
                                        var screen;
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
                                                    // Type in chat pane
                                                    return [
                                                        4,
                                                        session.type('preserved message')
                                                    ];
                                                case 3:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.hasText('preserved message')
                                                    ];
                                                case 4:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    // Switch to terminal
                                                    return [
                                                        4,
                                                        session.keyPress(KEYS.TAB)
                                                    ];
                                                case 5:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.waitForText('Tab to return to chat')
                                                    ];
                                                case 6:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.getScreen()
                                                    ];
                                                case 7:
                                                    screen = _state.sent();
                                                    expect(screen).not.toContain('preserved message');
                                                    // Switch back to chat
                                                    return [
                                                        4,
                                                        session.keyPress(KEYS.TAB)
                                                    ];
                                                case 8:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.hasText('preserved message')
                                                    ];
                                                case 9:
                                                    // Input should be visible again
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        2
                                                    ];
                                            }
                                        });
                                    })();
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        }, 10000);
    });
    describe('Help System', function() {
        it('should show help overlay with ? key', function() {
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
                                                        4,
                                                        session.hasText('Tab')
                                                    ];
                                                case 5:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        4,
                                                        session.hasText('Ctrl+C')
                                                    ];
                                                case 6:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        4,
                                                        session.hasText('Y')
                                                    ];
                                                case 7:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        4,
                                                        session.hasText('N')
                                                    ];
                                                case 8:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        4,
                                                        session.hasText('E')
                                                    ];
                                                case 9:
                                                    expect.apply(void 0, [
                                                        _state.sent()
                                                    ]).toBe(true);
                                                    return [
                                                        2
                                                    ];
                                            }
                                        });
                                    })();
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        }, 10000);
        it('should close help with any key', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                tuiTest(function(session) {
                                    return _async_to_generator(function() {
                                        var screen;
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
                                                        4,
                                                        session.keyPress(KEYS.ENTER)
                                                    ];
                                                case 5:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.sleep(500)
                                                    ];
                                                case 6:
                                                    _state.sent();
                                                    return [
                                                        4,
                                                        session.getScreen()
                                                    ];
                                                case 7:
                                                    screen = _state.sent();
                                                    expect(screen).not.toContain('Keyboard Shortcuts');
                                                    return [
                                                        2
                                                    ];
                                            }
                                        });
                                    })();
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        }, 10000);
    });
    describe('Cross-Tier Validation', function() {
        it('should match Tier 2 mocked component output', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                tuiTest(function(session) {
                                    return _async_to_generator(function() {
                                        var screen, hasYouIndicator;
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
                                                        session.getScreen()
                                                    ];
                                                case 3:
                                                    screen = _state.sent();
                                                    // Validate key elements that Tier 2 tests check for
                                                    expect(screen).toContain('Welcome');
                                                    expect(screen).toContain('Tab');
                                                    expect(screen).toContain('chipilot');
                                                    // These should be present in both Tier 2 mocks and real app
                                                    hasYouIndicator = screen.includes('You') || screen.includes('>');
                                                    expect(hasYouIndicator).toBe(true);
                                                    return [
                                                        2
                                                    ];
                                            }
                                        });
                                    })();
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        }, 10000);
    });
});
