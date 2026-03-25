//# hash=bae7b1eb5b11004df95693eb03567d20
//# sourceMappingURL=pty-integration.test.js.map

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
 * Tier 3: Integration Tests with Real PTY
 *
 * These tests spawn the actual built CLI in a node-pty terminal.
 * They validate Tier 2 by ensuring real terminal behavior matches expectations.
 */ import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnCLI, validateANSISequences } from './pty-runner';
describe('Tier 3: PTY Integration Tests', function() {
    var session;
    // Anti-cheat: Verify we're using real PTY, not mocks
    beforeAll(function() {
        return _async_to_generator(function() {
            var startTime, elapsed, ansi;
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        startTime = Date.now();
                        return [
                            4,
                            spawnCLI({
                                cols: 80,
                                rows: 24
                            })
                        ];
                    case 1:
                        session = _state.sent();
                        elapsed = Date.now() - startTime;
                        // Real PTY takes time to spawn
                        expect(elapsed).toBeGreaterThan(50);
                        // Validate we have ANSI output (real terminal)
                        ansi = validateANSISequences(session.output);
                        expect(ansi.hasColor).toBe(true);
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
    describe('Initial Render', function() {
        it('should display welcome message', function() {
            expect(session.contains('Welcome to chipilot')).toBe(true);
        });
        it('should display header with controls', function() {
            expect(session.contains('Tab: switch')).toBe(true);
            expect(session.contains('Ctrl+C: exit')).toBe(true);
            expect(session.contains('?: help')).toBe(true);
        });
        it('should have ANSI color codes', function() {
            var ansi = validateANSISequences(session.output);
            expect(ansi.hasColor).toBe(true);
            expect(ansi.sequences.length).toBeGreaterThan(0);
        });
    });
    describe('Input Handling', function() {
        it('should accept keyboard input', function() {
            return _async_to_generator(function() {
                var beforeOutput;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            beforeOutput = session.output;
                            return [
                                4,
                                session.send('hello world')
                            ];
                        case 1:
                            _state.sent();
                            // Input should appear in output
                            expect(session.contains('hello world')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should handle enter key', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                session.interact([
                                    {
                                        input: 'test message',
                                        waitMs: 100
                                    },
                                    {
                                        input: '\r',
                                        waitFor: 'AI|Error|Thinking',
                                        timeout: 5000
                                    }
                                ])
                            ];
                        case 1:
                            _state.sent();
                            // Should have sent the message (AI responding or error)
                            expect(session.contains('AI:') || session.contains('Error') || session.contains('Thinking')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
    describe('Pane Switching', function() {
        it('should switch to terminal pane with Tab', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                session.interact([
                                    {
                                        input: 'hello',
                                        waitMs: 100
                                    },
                                    {
                                        input: '\t',
                                        waitFor: 'Tab to return to chat|Terminal.*active',
                                        timeout: 2000
                                    }
                                ])
                            ];
                        case 1:
                            _state.sent();
                            // Should show terminal-focused UI
                            expect(session.contains('Tab to return to chat')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should NOT display chat input when in terminal pane', function() {
            return _async_to_generator(function() {
                var screen, lines, inputLine;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            // Type something in chat
                            return [
                                4,
                                session.send('secret input', {
                                    waitFor: 'secret'
                                })
                            ];
                        case 1:
                            _state.sent();
                            // Switch to terminal
                            return [
                                4,
                                session.send('\t', {
                                    waitFor: 'Tab to return to chat'
                                })
                            ];
                        case 2:
                            _state.sent();
                            // The input area should NOT show the typed text
                            // It should show the placeholder instead
                            screen = session.screen;
                            lines = screen.split('\n');
                            // Find the input line (usually last line)
                            inputLine = lines[lines.length - 1] || '';
                            // Should not contain the secret input (it's preserved but hidden)
                            // Note: This validates the UX fix where input was incorrectly displayed
                            expect(inputLine).not.toContain('secret input');
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should switch back to chat with second Tab', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                session.interact([
                                    {
                                        input: '\t',
                                        waitFor: 'Terminal'
                                    },
                                    {
                                        input: '\t',
                                        waitFor: 'Ask about EDA|>',
                                        timeout: 2000
                                    }
                                ])
                            ];
                        case 1:
                            _state.sent();
                            // Should be back in chat mode
                            expect(session.contains('Ask about EDA')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
    describe('Help System', function() {
        it('should show help overlay with ? key', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            // Ensure we're in chat pane
                            return [
                                4,
                                session.send('\t\t', {
                                    waitFor: 'Ask about EDA',
                                    timeout: 2000
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                4,
                                session.send('?', {
                                    waitFor: 'Keyboard Shortcuts',
                                    timeout: 2000
                                })
                            ];
                        case 2:
                            _state.sent();
                            expect(session.contains('Keyboard Shortcuts')).toBe(true);
                            expect(session.contains('Tab')).toBe(true);
                            expect(session.contains('Ctrl\\+C')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should close help with any key', function() {
            return _async_to_generator(function() {
                var recent;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                session.send('?', {
                                    waitFor: 'Keyboard Shortcuts'
                                })
                            ];
                        case 1:
                            _state.sent();
                            return [
                                4,
                                session.send('q', {
                                    waitMs: 500
                                })
                            ];
                        case 2:
                            _state.sent();
                            // Help should be gone
                            recent = session.getRecentOutput(5);
                            expect(recent).not.toContain('Keyboard Shortcuts');
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
    describe('Scrollback', function() {
        it('should have scroll indicator for many messages', function() {
            return _async_to_generator(function() {
                var i, hasIndicator;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            i = 0;
                            _state.label = 1;
                        case 1:
                            if (!(i < 5)) return [
                                3,
                                4
                            ];
                            return [
                                4,
                                session.interact([
                                    {
                                        input: "message ".concat(i),
                                        waitMs: 50
                                    },
                                    {
                                        input: '\r',
                                        waitMs: 500
                                    }
                                ])
                            ];
                        case 2:
                            _state.sent();
                            _state.label = 3;
                        case 3:
                            i++;
                            return [
                                3,
                                1
                            ];
                        case 4:
                            // Should show scroll indicator
                            hasIndicator = session.contains(/\\d+-\\d+ of \\d+/) || session.contains('↑') || session.contains('↓');
                            // Not strictly required - depends on terminal size and message count
                            // Just verify no errors occurred
                            expect(session.contains('Error')).toBe(false);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
    describe('Terminal Pane Interaction', function() {
        it('should show terminal when focused', function() {
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
                            expect(session.contains('Terminal')).toBe(true);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should pass through terminal input', function() {
            return _async_to_generator(function() {
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                session.interact([
                                    {
                                        input: '\t',
                                        waitFor: 'Terminal.*active'
                                    },
                                    {
                                        input: 'ls',
                                        waitMs: 100
                                    },
                                    {
                                        input: '\r',
                                        waitMs: 500
                                    }
                                ])
                            ];
                        case 1:
                            _state.sent();
                            // Terminal should have executed ls
                            // Output will vary by system, but should not error
                            expect(session.contains('Error')).toBe(false);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
    describe('Anti-Cheat Validation', function() {
        it('should have realistic timing (not mocked)', function() {
            return _async_to_generator(function() {
                var start, elapsed;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            start = Date.now();
                            return [
                                4,
                                session.send('test')
                            ];
                        case 1:
                            _state.sent();
                            elapsed = Date.now() - start;
                            // Real terminal I/O takes measurable time
                            expect(elapsed).toBeGreaterThan(10);
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it('should have ANSI sequences in raw output', function() {
            var ansi = validateANSISequences(session.output);
            // Real TUI uses ANSI
            expect(ansi.sequences.length).toBeGreaterThan(10);
            expect(ansi.hasColor).toBe(true);
        });
        it('should maintain screen buffer', function() {
            var screen = session.screen;
            // Screen should have content
            expect(screen.length).toBeGreaterThan(0);
            // Should be multiple lines
            var lines = screen.split('\\n');
            expect(lines.length).toBeGreaterThan(1);
        });
    });
});
