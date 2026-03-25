//# hash=a5eec7aac8ad8a9621b0ca32ac111ae2
//# sourceMappingURL=terminal.test.js.map

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
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
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
import { describe, it, expect, vi } from "vitest";
// Unit tests for TerminalSession - testing the class interface
// We mock node-pty to avoid spawning real processes
// Create a mock factory for node-pty
var createMockPty = function createMockPty() {
    return {
        write: vi.fn(),
        kill: vi.fn(),
        onData: vi.fn(),
        onExit: vi.fn(),
        resize: vi.fn()
    };
};
describe("TerminalSession", function() {
    // We'll test the TerminalSession class by mocking node-pty
    // This ensures we don't spawn real processes during tests
    it("should be importable", function() {
        return _async_to_generator(function() {
            var TerminalSession;
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            import("../src/terminal/session.js")
                        ];
                    case 1:
                        TerminalSession = _state.sent().TerminalSession;
                        expect(TerminalSession).toBeDefined();
                        return [
                            2
                        ];
                }
            });
        })();
    });
    it("should create instance with default options", function() {
        return _async_to_generator(function() {
            var TerminalSession, session;
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            import("../src/terminal/session.js")
                        ];
                    case 1:
                        TerminalSession = _state.sent().TerminalSession;
                        // Mock node-pty before creating session
                        vi.mock("node-pty", function() {
                            return {
                                spawn: vi.fn().mockReturnValue(createMockPty())
                            };
                        });
                        session = new TerminalSession();
                        expect(session).toBeDefined();
                        expect(session.isRunning()).toBe(false);
                        return [
                            2
                        ];
                }
            });
        })();
    });
    it("should emit output events", function() {
        return _async_to_generator(function() {
            var TerminalSession, EventEmitter, session;
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            import("../src/terminal/session.js")
                        ];
                    case 1:
                        TerminalSession = _state.sent().TerminalSession;
                        return [
                            4,
                            import("events")
                        ];
                    case 2:
                        EventEmitter = _state.sent().EventEmitter;
                        // Create a simple test that verifies the event emitter pattern
                        session = new TerminalSession();
                        // Verify it's an EventEmitter
                        expect(_type_of(session.on)).toBe("function");
                        expect(_type_of(session.emit)).toBe("function");
                        expect(_type_of(session.off)).toBe("function");
                        return [
                            2
                        ];
                }
            });
        })();
    });
    it("should accept custom options", function() {
        return _async_to_generator(function() {
            var TerminalSession, customOptions, session;
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            import("../src/terminal/session.js")
                        ];
                    case 1:
                        TerminalSession = _state.sent().TerminalSession;
                        customOptions = {
                            shell: "/bin/zsh",
                            cwd: "/tmp",
                            cols: 120,
                            rows: 40
                        };
                        session = new TerminalSession(customOptions);
                        expect(session).toBeDefined();
                        return [
                            2
                        ];
                }
            });
        })();
    });
    it("should return shell from getShell", function() {
        return _async_to_generator(function() {
            var TerminalSession, session;
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        return [
                            4,
                            import("../src/terminal/session.js")
                        ];
                    case 1:
                        TerminalSession = _state.sent().TerminalSession;
                        session = new TerminalSession({
                            shell: "/bin/zsh"
                        });
                        expect(session.getShell()).toBe("/bin/zsh");
                        return [
                            2
                        ];
                }
            });
        })();
    });
});
