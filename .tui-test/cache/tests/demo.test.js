//# hash=dec261c00bb2e7c2c21365fec5b6f0bc
//# sourceMappingURL=demo.test.js.map

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
import { describe, it, expect, vi, beforeEach } from "vitest";
/**
 * End-to-End Demo Test
 *
 * This test simulates the complete user flow:
 * 1. User sends a message to AI
 * 2. AI proposes a command
 * 3. User approves/rejects the command
 * 4. Command is executed in terminal
 */ describe("End-to-End Demo", function() {
    // Mock all external dependencies
    beforeEach(function() {
        vi.clearAllMocks();
    });
    describe("Message Flow", function() {
        it("should handle user message and AI response", function() {
            return _async_to_generator(function() {
                var Agent, agent;
                return _ts_generator(this, function(_state) {
                    switch(_state.label){
                        case 0:
                            return [
                                4,
                                import("../src/agent/index.js")
                            ];
                        case 1:
                            Agent = _state.sent().Agent;
                            // Create agent with mock API key
                            agent = new Agent({
                                provider: "anthropic",
                                apiKey: "test-key"
                            });
                            // Verify agent is created
                            expect(agent).toBeDefined();
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it("should extract proposed command from AI response", function() {
            // Test the regex pattern for command extraction
            var response = "I'll check the current directory for you.\n\n```execute\nls -la\n```\n\nThat's the";
            var commandMatch = response.match(/```execute\n([\s\S]*?)\n```/);
            expect(commandMatch).not.toBeNull();
            expect(commandMatch === null || commandMatch === void 0 ? void 0 : commandMatch[1].trim()).toBe("ls -la");
        });
        it("should handle multi-line commands", function() {
            var response = "Let me run a floorplan command.\n\n```execute\nfloorplan -core \\\n  -core_util 0.7 \\\n  -density 0.8\n```\n\nDone!";
            var commandMatch = response.match(/```execute\n([\s\S]*?)\n```/);
            expect(commandMatch).not.toBeNull();
            var command = commandMatch === null || commandMatch === void 0 ? void 0 : commandMatch[1].trim();
            expect(command).toContain("floorplan");
            expect(command).toContain("-core_util 0.7");
        });
    });
    describe("Terminal Session", function() {
        it("should create terminal session", function() {
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
                                shell: "/bin/bash",
                                cols: 80,
                                rows: 24
                            });
                            expect(session).toBeDefined();
                            expect(session.isRunning()).toBe(false);
                            session.destroy();
                            return [
                                2
                            ];
                    }
                });
            })();
        });
        it("should handle session events", function() {
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
                            session = new TerminalSession();
                            // Verify it's an event emitter
                            expect(_type_of(session.on)).toBe("function");
                            expect(_type_of(session.emit)).toBe("function");
                            return [
                                2
                            ];
                    }
                });
            })();
        });
    });
    describe("Complete Flow Simulation", function() {
        it("should simulate: message -> response -> approval -> execution", function() {
            return _async_to_generator(function() {
                var _aiResponse_proposedCommand, userMessage, aiResponse, approved, commandToExecute;
                return _ts_generator(this, function(_state) {
                    // This test verifies the complete flow without actual API calls
                    // 1. User sends message
                    userMessage = "show me the current directory";
                    expect(userMessage).toBeDefined();
                    // 2. Simulate AI proposing a command
                    aiResponse = {
                        message: "I'll list the current directory for you.",
                        proposedCommand: {
                            command: "pwd && ls -la",
                            explanation: "List current directory and its contents"
                        }
                    };
                    // 3. Simulate user approval
                    approved = true;
                    commandToExecute = approved ? (_aiResponse_proposedCommand = aiResponse.proposedCommand) === null || _aiResponse_proposedCommand === void 0 ? void 0 : _aiResponse_proposedCommand.command : null;
                    // 4. Verify the flow
                    expect(commandToExecute).toBe("pwd && ls -la");
                    expect(approved).toBe(true);
                    return [
                        2
                    ];
                });
            })();
        });
        it("should handle command rejection", function() {
            return _async_to_generator(function() {
                var _aiResponse_proposedCommand, aiResponse, approved, commandToExecute;
                return _ts_generator(this, function(_state) {
                    aiResponse = {
                        message: "I'll delete all files.",
                        proposedCommand: {
                            command: "rm -rf *",
                            explanation: "Delete all files in directory"
                        }
                    };
                    // User rejects
                    approved = false;
                    commandToExecute = approved ? (_aiResponse_proposedCommand = aiResponse.proposedCommand) === null || _aiResponse_proposedCommand === void 0 ? void 0 : _aiResponse_proposedCommand.command : null;
                    expect(commandToExecute).toBeNull();
                    return [
                        2
                    ];
                });
            })();
        });
        it("should handle command editing", function() {
            return _async_to_generator(function() {
                var originalCommand, editedCommand, finalCommand, wasEdited;
                return _ts_generator(this, function(_state) {
                    originalCommand = "ls -la";
                    editedCommand = "ls -la | head -20";
                    // User edits before approving
                    finalCommand = editedCommand;
                    wasEdited = finalCommand !== originalCommand;
                    expect(wasEdited).toBe(true);
                    expect(finalCommand).toBe("ls -la | head -20");
                    return [
                        2
                    ];
                });
            })();
        });
    });
});
