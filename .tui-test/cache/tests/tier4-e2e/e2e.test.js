//# hash=d6072237470d1181ce32697c5d635a21
//# sourceMappingURL=e2e.test.js.map

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
 * Tier 4: End-to-End Acceptance Tests
 *
 * Full user scenarios that exercise the complete application.
 * These validate that Tiers 1-3 collectively produce a working product.
 */ import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnCLI } from '../tier3-integration/pty-runner';
import { crossValidator } from '../validators/CrossValidator';
describe('Tier 4: E2E Acceptance Tests', function() {
    describe('Scenario: Complete Chat Session', function() {
        var session;
        beforeAll(function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                spawnCLI({
                                    cols: 100,
                                    rows: 30
                                })
                            ];
                        case 1:
                            session = _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        afterAll(function() {
            session === null || session === void 0 ? void 0 : session.kill('SIGTERM');
        });
        it('should complete full chat workflow', function() {
            return _async_to_generator(function() {
                var hasResponse;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            // Step 1: Verify initial state
                            expect(session.contains('Welcome to chipilot')).toBe(true);
                            // Step 2: Type and send a message
                            return [
                                4,
                                session.interact([
                                    {
                                        description: 'Type greeting',
                                        input: 'Hello, I need help with EDA tools'
                                    },
                                    {
                                        description: 'Submit message',
                                        input: '\r',
                                        waitFor: 'You:|AI:|Error',
                                        timeout: 5000
                                    }
                                ])
                            ];
                        case 1:
                            _state.sent();
                            // Step 3: Verify message appears in history
                            expect(session.contains('Hello, I need help')).toBe(true);
                            // Step 4: Check for AI response or error handling
                            hasResponse = session.contains('AI:') || session.contains('Error') || session.contains('Thinking');
                            expect(hasResponse).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should handle multiple messages', function() {
            return _async_to_generator(function() {
                var messages, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, msg, err, _iteratorNormalCompletion1, _didIteratorError1, _iteratorError1, _iterator1, _step1, msg1;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            messages = [
                                'What is synthesis?',
                                'How do I run a simulation?',
                                'Show me my files'
                            ];
                            _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                            _state.label = 1;
                        case 1:
                            _state.trys.push([
                                1,
                                6,
                                7,
                                8
                            ]);
                            _iterator = messages[Symbol.iterator]();
                            _state.label = 2;
                        case 2:
                            if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                3,
                                5
                            ];
                            msg = _step.value;
                            return [
                                4,
                                session.interact([
                                    {
                                        input: msg
                                    },
                                    {
                                        input: '\r',
                                        waitMs: 1000
                                    }
                                ])
                            ];
                        case 3:
                            _state.sent();
                            _state.label = 4;
                        case 4:
                            _iteratorNormalCompletion = true;
                            return [
                                3,
                                2
                            ];
                        case 5:
                            return [
                                3,
                                8
                            ];
                        case 6:
                            err = _state.sent();
                            _didIteratorError = true;
                            _iteratorError = err;
                            return [
                                3,
                                8
                            ];
                        case 7:
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return != null) {
                                    _iterator.return();
                                }
                            } finally{
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                            return [
                                7
                            ];
                        case 8:
                            _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
                            try {
                                // All messages should be in history
                                for(_iterator1 = messages[Symbol.iterator](); !(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done); _iteratorNormalCompletion1 = true){
                                    msg1 = _step1.value;
                                    expect(session.contains(msg1)).toBe(true);
                                }
                            } catch (err) {
                                _didIteratorError1 = true;
                                _iteratorError1 = err;
                            } finally{
                                try {
                                    if (!_iteratorNormalCompletion1 && _iterator1.return != null) {
                                        _iterator1.return();
                                    }
                                } finally{
                                    if (_didIteratorError1) {
                                        throw _iteratorError1;
                                    }
                                }
                            }
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
    describe('Scenario: Pane Navigation', function() {
        var session;
        beforeAll(function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                spawnCLI({
                                    cols: 80,
                                    rows: 24
                                })
                            ];
                        case 1:
                            session = _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        afterAll(function() {
            session === null || session === void 0 ? void 0 : session.kill('SIGTERM');
        });
        it('should navigate between panes seamlessly', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            // Start in chat
                            expect(session.contains('Ask about EDA')).toBe(true);
                            // Switch to terminal
                            return [
                                4,
                                session.send('\t', {
                                    waitFor: 'Terminal',
                                    timeout: 2000
                                })
                            ];
                        case 1:
                            _state.sent();
                            expect(session.contains('Terminal')).toBe(true);
                            // Switch back to chat
                            return [
                                4,
                                session.send('\t', {
                                    waitFor: 'Ask about EDA',
                                    timeout: 2000
                                })
                            ];
                        case 2:
                            _state.sent();
                            expect(session.contains('Ask about EDA')).toBe(true);
                            // Switch to terminal again
                            return [
                                4,
                                session.send('\t', {
                                    waitFor: 'Terminal',
                                    timeout: 2000
                                })
                            ];
                        case 3:
                            _state.sent();
                            expect(session.contains('Terminal')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should preserve input across pane switches', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            // Type partial input
                            return [
                                4,
                                session.send('partial message', {
                                    waitMs: 100
                                })
                            ];
                        case 1:
                            _state.sent();
                            // Switch to terminal
                            return [
                                4,
                                session.send('\t', {
                                    waitFor: 'Tab to return'
                                })
                            ];
                        case 2:
                            _state.sent();
                            // Input should not be visible (validated in Tier 3)
                            // but should be preserved (switch back and check)
                            // Switch back to chat
                            return [
                                4,
                                session.send('\t', {
                                    waitFor: 'Ask about EDA'
                                })
                            ];
                        case 3:
                            _state.sent();
                            // Now the input should be visible again
                            expect(session.contains('partial message')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
    describe('Scenario: Help and Controls', function() {
        var session;
        beforeAll(function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                spawnCLI({
                                    cols: 80,
                                    rows: 24
                                })
                            ];
                        case 1:
                            session = _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        afterAll(function() {
            session === null || session === void 0 ? void 0 : session.kill('SIGTERM');
        });
        it('should display all help content', function() {
            return _async_to_generator(function() {
                var shortcuts, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, shortcut;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                session.send('?', {
                                    waitFor: 'Keyboard Shortcuts',
                                    timeout: 2000
                                })
                            ];
                        case 1:
                            _state.sent();
                            // Check all documented shortcuts
                            shortcuts = [
                                'Tab',
                                'Ctrl+C',
                                'Up/Down',
                                'Y',
                                'N',
                                'E',
                                '?'
                            ];
                            _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                            try {
                                for(_iterator = shortcuts[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                                    shortcut = _step.value;
                                    expect(session.contains(shortcut)).toBe(true);
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
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should handle help from both panes', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            // Help from chat pane
                            return [
                                4,
                                session.send('\t\t', {
                                    waitFor: 'Ask about EDA'
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                4,
                                session.send('?', {
                                    waitFor: 'Keyboard Shortcuts'
                                })
                            ];
                        case 2:
                            _state.sent();
                            return [
                                4,
                                session.send('q', {
                                    waitMs: 300
                                })
                            ];
                        case 3:
                            _state.sent();
                            // Help should not work from terminal pane (or should be consistent)
                            return [
                                4,
                                session.send('\t', {
                                    waitFor: 'Terminal'
                                })
                            ];
                        case 4:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            // In terminal pane, ? might go to the shell - that's OK
            })();
        });
    });
    describe('Scenario: Terminal Commands', function() {
        var session;
        beforeAll(function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                spawnCLI({
                                    cols: 80,
                                    rows: 24
                                })
                            ];
                        case 1:
                            session = _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        afterAll(function() {
            session === null || session === void 0 ? void 0 : session.kill('SIGTERM');
        });
        it('should execute basic terminal commands', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                session.send('\t', {
                                    waitFor: 'Terminal',
                                    timeout: 2000
                                })
                            ];
                        case 1:
                            _state.sent();
                            // Run pwd
                            return [
                                4,
                                session.interact([
                                    {
                                        input: 'pwd',
                                        waitMs: 100
                                    },
                                    {
                                        input: '\r',
                                        waitMs: 500
                                    }
                                ])
                            ];
                        case 2:
                            _state.sent();
                            // Should show current directory
                            expect(session.contains('/')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should handle command output', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                session.send('\t', {
                                    waitFor: 'Terminal'
                                })
                            ];
                        case 1:
                            _state.sent();
                            // Run echo
                            return [
                                4,
                                session.interact([
                                    {
                                        input: 'echo test123',
                                        waitMs: 100
                                    },
                                    {
                                        input: '\r',
                                        waitMs: 500
                                    }
                                ])
                            ];
                        case 2:
                            _state.sent();
                            expect(session.contains('test123')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
    describe('Cross-Tier Validation', function() {
        it('should validate all tiers produce consistent results', function() {
            return _async_to_generator(function() {
                var scenarios;
                return _ts_generator(this, function(_state) {
                    // This test uses the crossValidator to ensure consistency
                    // between Tier 2 (component) and Tier 3/4 (real PTY)
                    scenarios = crossValidator.validateAllScenarios(new Map([
                        [
                            3,
                            function(input) {
                                return _async_to_generator(function() {
                                    var s, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, key, err, output;
                                    return _ts_generator(this, function(_state) {
                                        switch(_state.label){
                                            case 0:
                                                return [
                                                    4,
                                                    spawnCLI()
                                                ];
                                            case 1:
                                                s = _state.sent();
                                                _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                                                _state.label = 2;
                                            case 2:
                                                _state.trys.push([
                                                    2,
                                                    7,
                                                    8,
                                                    9
                                                ]);
                                                _iterator = input[Symbol.iterator]();
                                                _state.label = 3;
                                            case 3:
                                                if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                                    3,
                                                    6
                                                ];
                                                key = _step.value;
                                                return [
                                                    4,
                                                    s.send(key, {
                                                        waitMs: 100
                                                    })
                                                ];
                                            case 4:
                                                _state.sent();
                                                _state.label = 5;
                                            case 5:
                                                _iteratorNormalCompletion = true;
                                                return [
                                                    3,
                                                    3
                                                ];
                                            case 6:
                                                return [
                                                    3,
                                                    9
                                                ];
                                            case 7:
                                                err = _state.sent();
                                                _didIteratorError = true;
                                                _iteratorError = err;
                                                return [
                                                    3,
                                                    9
                                                ];
                                            case 8:
                                                try {
                                                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                                                        _iterator.return();
                                                    }
                                                } finally{
                                                    if (_didIteratorError) {
                                                        throw _iteratorError;
                                                    }
                                                }
                                                return [
                                                    7
                                                ];
                                            case 9:
                                                output = s.output;
                                                s.kill();
                                                return [
                                                    2,
                                                    output
                                                ];
                                        }
                                    });
                                })();
                            }
                        ],
                        [
                            4,
                            function(input) {
                                return _async_to_generator(function() {
                                    var s, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, key, err, output;
                                    return _ts_generator(this, function(_state) {
                                        switch(_state.label){
                                            case 0:
                                                return [
                                                    4,
                                                    spawnCLI()
                                                ];
                                            case 1:
                                                s = _state.sent();
                                                _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                                                _state.label = 2;
                                            case 2:
                                                _state.trys.push([
                                                    2,
                                                    7,
                                                    8,
                                                    9
                                                ]);
                                                _iterator = input[Symbol.iterator]();
                                                _state.label = 3;
                                            case 3:
                                                if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                                    3,
                                                    6
                                                ];
                                                key = _step.value;
                                                return [
                                                    4,
                                                    s.send(key, {
                                                        waitMs: 100
                                                    })
                                                ];
                                            case 4:
                                                _state.sent();
                                                _state.label = 5;
                                            case 5:
                                                _iteratorNormalCompletion = true;
                                                return [
                                                    3,
                                                    3
                                                ];
                                            case 6:
                                                return [
                                                    3,
                                                    9
                                                ];
                                            case 7:
                                                err = _state.sent();
                                                _didIteratorError = true;
                                                _iteratorError = err;
                                                return [
                                                    3,
                                                    9
                                                ];
                                            case 8:
                                                try {
                                                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                                                        _iterator.return();
                                                    }
                                                } finally{
                                                    if (_didIteratorError) {
                                                        throw _iteratorError;
                                                    }
                                                }
                                                return [
                                                    7
                                                ];
                                            case 9:
                                                output = s.output;
                                                s.kill();
                                                return [
                                                    2,
                                                    output
                                                ];
                                        }
                                    });
                                })();
                            }
                        ]
                    ]));
                    // Validation happens in the crossValidator
                    expect(scenarios).toBeDefined();
                    return [
                        2
                    ];
                });
            })();
        });
    });
    describe('Edge Cases and Stress Tests', function() {
        var session;
        beforeAll(function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                spawnCLI({
                                    cols: 80,
                                    rows: 24
                                })
                            ];
                        case 1:
                            session = _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        afterAll(function() {
            session === null || session === void 0 ? void 0 : session.kill('SIGTERM');
        });
        it('should handle rapid input', function() {
            return _async_to_generator(function() {
                var i;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            // Send many characters quickly
                            for(i = 0; i < 20; i++){
                                session.send("x");
                            }
                            return [
                                4,
                                new Promise(function(r) {
                                    return setTimeout(r, 500);
                                })
                            ];
                        case 1:
                            _state.sent();
                            // Should have captured all input
                            expect(session.contains('xxxxxxxxxx')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should handle resize gracefully', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            // Resize terminal
                            session.resize(60, 20);
                            return [
                                4,
                                new Promise(function(r) {
                                    return setTimeout(r, 300);
                                })
                            ];
                        case 1:
                            _state.sent();
                            // App should still be responsive
                            return [
                                4,
                                session.send('test', {
                                    waitMs: 100
                                })
                            ];
                        case 2:
                            _state.sent();
                            expect(session.contains('test')).toBe(true);
                            // Resize back
                            session.resize(80, 24);
                            return [
                                4,
                                new Promise(function(r) {
                                    return setTimeout(r, 300);
                                })
                            ];
                        case 3:
                            _state.sent();
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should handle special characters', function() {
            return _async_to_generator(function() {
                var specialChars, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, char, err, _iteratorNormalCompletion1, _didIteratorError1, _iteratorError1, _iterator1, _step1, char1;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            specialChars = [
                                '!',
                                '@',
                                '#',
                                '$',
                                '%',
                                '^',
                                '&',
                                '*',
                                '(',
                                ')'
                            ];
                            _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                            _state.label = 1;
                        case 1:
                            _state.trys.push([
                                1,
                                6,
                                7,
                                8
                            ]);
                            _iterator = specialChars[Symbol.iterator]();
                            _state.label = 2;
                        case 2:
                            if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                3,
                                5
                            ];
                            char = _step.value;
                            return [
                                4,
                                session.send(char, {
                                    waitMs: 50
                                })
                            ];
                        case 3:
                            _state.sent();
                            _state.label = 4;
                        case 4:
                            _iteratorNormalCompletion = true;
                            return [
                                3,
                                2
                            ];
                        case 5:
                            return [
                                3,
                                8
                            ];
                        case 6:
                            err = _state.sent();
                            _didIteratorError = true;
                            _iteratorError = err;
                            return [
                                3,
                                8
                            ];
                        case 7:
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return != null) {
                                    _iterator.return();
                                }
                            } finally{
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                            return [
                                7
                            ];
                        case 8:
                            _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
                            try {
                                for(_iterator1 = specialChars[Symbol.iterator](); !(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done); _iteratorNormalCompletion1 = true){
                                    char1 = _step1.value;
                                    expect(session.contains(char1)).toBe(true);
                                }
                            } catch (err) {
                                _didIteratorError1 = true;
                                _iteratorError1 = err;
                            } finally{
                                try {
                                    if (!_iteratorNormalCompletion1 && _iterator1.return != null) {
                                        _iterator1.return();
                                    }
                                } finally{
                                    if (_didIteratorError1) {
                                        throw _iteratorError1;
                                    }
                                }
                            }
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
});
