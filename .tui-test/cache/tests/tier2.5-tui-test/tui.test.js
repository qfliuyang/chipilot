//# hash=a7d8eec8c93418b43c3657ac5b0daf02
//# sourceMappingURL=tui.test.js.map

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
 */ import { test, expect, Key } from '@microsoft/tui-test';
import * as path from 'path';
var CLI_PATH = path.join(process.cwd(), 'dist', 'cli.js');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Tier 2.5: TUI Integration (@microsoft/tui-test)          ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();
test.use({
    timeout: 10000
});
test.describe('Tier 2.5: TUI Integration', function() {
    test('should display welcome message on startup', function(param) {
        var terminal = param.terminal;
        return _async_to_generator(function() {
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            terminal.start("node ".concat(CLI_PATH))
                        ];
                    case 1:
                        _state.sent();
                        return [
                            4,
                            terminal.waitForText('Welcome to chipilot')
                        ];
                    case 2:
                        _state.sent();
                        return [
                            2
                        ];
                }
            });
        })();
    });
    test('should show help hint in header', function(param) {
        var terminal = param.terminal;
        return _async_to_generator(function() {
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            terminal.start("node ".concat(CLI_PATH))
                        ];
                    case 1:
                        _state.sent();
                        return [
                            4,
                            terminal.waitForText('Welcome to chipilot')
                        ];
                    case 2:
                        _state.sent();
                        return [
                            4,
                            expect(terminal.getByText('Tab: switch')).toBeVisible()
                        ];
                    case 3:
                        _state.sent();
                        return [
                            4,
                            expect(terminal.getByText('?: help')).toBeVisible()
                        ];
                    case 4:
                        _state.sent();
                        return [
                            2
                        ];
                }
            });
        })();
    });
    test('should accept and display typed input', function(param) {
        var terminal = param.terminal;
        return _async_to_generator(function() {
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            terminal.start("node ".concat(CLI_PATH))
                        ];
                    case 1:
                        _state.sent();
                        return [
                            4,
                            terminal.waitForText('Welcome')
                        ];
                    case 2:
                        _state.sent();
                        return [
                            4,
                            terminal.type('hello world')
                        ];
                    case 3:
                        _state.sent();
                        return [
                            4,
                            expect(terminal.getByText('hello world')).toBeVisible()
                        ];
                    case 4:
                        _state.sent();
                        return [
                            2
                        ];
                }
            });
        })();
    });
    test('should switch to terminal pane with Tab', function(param) {
        var terminal = param.terminal;
        return _async_to_generator(function() {
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            terminal.start("node ".concat(CLI_PATH))
                        ];
                    case 1:
                        _state.sent();
                        return [
                            4,
                            terminal.waitForText('Welcome')
                        ];
                    case 2:
                        _state.sent();
                        return [
                            4,
                            terminal.keyPress(Key.Tab)
                        ];
                    case 3:
                        _state.sent();
                        return [
                            4,
                            terminal.waitForText('Tab to return to chat')
                        ];
                    case 4:
                        _state.sent();
                        return [
                            4,
                            expect(terminal.getByText('Terminal')).toBeVisible()
                        ];
                    case 5:
                        _state.sent();
                        return [
                            2
                        ];
                }
            });
        })();
    });
    test('should preserve input when switching panes', function(param) {
        var terminal = param.terminal;
        return _async_to_generator(function() {
            var screen;
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            terminal.start("node ".concat(CLI_PATH))
                        ];
                    case 1:
                        _state.sent();
                        return [
                            4,
                            terminal.waitForText('Welcome')
                        ];
                    case 2:
                        _state.sent();
                        return [
                            4,
                            terminal.type('preserved message')
                        ];
                    case 3:
                        _state.sent();
                        return [
                            4,
                            terminal.keyPress(Key.Tab)
                        ];
                    case 4:
                        _state.sent();
                        return [
                            4,
                            terminal.waitForText('Tab to return to chat')
                        ];
                    case 5:
                        _state.sent();
                        // Input should NOT be visible in terminal pane
                        screen = terminal.getScreen();
                        return [
                            4,
                            expect(screen).not.toContain('preserved message')
                        ];
                    case 6:
                        _state.sent();
                        // Switch back to chat
                        return [
                            4,
                            terminal.keyPress(Key.Tab)
                        ];
                    case 7:
                        _state.sent();
                        // Input should be visible again
                        return [
                            4,
                            expect(terminal.getByText('preserved message')).toBeVisible()
                        ];
                    case 8:
                        _state.sent();
                        return [
                            2
                        ];
                }
            });
        })();
    });
    test('should show help overlay with ? key', function(param) {
        var terminal = param.terminal;
        return _async_to_generator(function() {
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            terminal.start("node ".concat(CLI_PATH))
                        ];
                    case 1:
                        _state.sent();
                        return [
                            4,
                            terminal.waitForText('Welcome')
                        ];
                    case 2:
                        _state.sent();
                        return [
                            4,
                            terminal.type('?')
                        ];
                    case 3:
                        _state.sent();
                        return [
                            4,
                            terminal.waitForText('Keyboard Shortcuts')
                        ];
                    case 4:
                        _state.sent();
                        return [
                            4,
                            expect(terminal.getByText('Tab')).toBeVisible()
                        ];
                    case 5:
                        _state.sent();
                        return [
                            2
                        ];
                }
            });
        })();
    });
});
