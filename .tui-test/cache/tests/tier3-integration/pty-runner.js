//# hash=82c1ffe9c70bfe1ec1659048110b0772
//# sourceMappingURL=pty-runner.js.map

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
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _define_property(target, key, source[key]);
        });
    }
    return target;
}
function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _object_spread_props(target, source) {
    source = source != null ? source : {};
    if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
        ownKeys(Object(source)).forEach(function(key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
    }
    return target;
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
 * PTY Runner - Real terminal interaction for Tier 3/4 tests
 *
 * Uses node-pty to spawn the actual built CLI and interact with it
 * as a real user would. This validates that the TUI works in a
 * genuine terminal environment.
 */ import * as pty from 'node-pty';
import * as path from 'path';
import * as fs from 'fs';
/**
 * Detects if the CLI is built, builds if necessary
 */ function ensureBuilt() {
    var distPath = path.join(process.cwd(), 'dist', 'cli.js');
    if (!fs.existsSync(distPath)) {
        throw new Error('CLI not built. Run "npm run build" first. ' + 'Tier 3+ tests require the actual compiled CLI.');
    }
    // Check if source files are newer than dist
    var srcPath = path.join(process.cwd(), 'src', 'cli.ts');
    if (fs.existsSync(srcPath)) {
        var srcStat = fs.statSync(srcPath);
        var distStat = fs.statSync(distPath);
        if (srcStat.mtime > distStat.mtime) {
            console.warn('⚠️  Source files are newer than dist. Build may be out of date.');
        }
    }
}
/**
 * Spawn the chipilot-cli in a real PTY
 */ export function spawnCLI() {
    return _async_to_generator(function() {
        var options, _options_cols, cols, _options_rows, rows, _options_cwd, cwd, _options_env, env, _options_timeout, timeout, cliPath, proc, output, screenBuffer, session;
        var _arguments = arguments;
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    options = _arguments.length > 0 && _arguments[0] !== void 0 ? _arguments[0] : {};
                    ensureBuilt();
                    _options_cols = options.cols, cols = _options_cols === void 0 ? 80 : _options_cols, _options_rows = options.rows, rows = _options_rows === void 0 ? 24 : _options_rows, _options_cwd = options.cwd, cwd = _options_cwd === void 0 ? process.cwd() : _options_cwd, _options_env = options.env, env = _options_env === void 0 ? process.env : _options_env, _options_timeout = options.timeout, timeout = _options_timeout === void 0 ? 5000 : _options_timeout;
                    cliPath = path.join(cwd, 'dist', 'cli.js');
                    // Spawn in mock mode for testing (no actual API calls)
                    proc = pty.spawn('node', [
                        cliPath,
                        '--mock'
                    ], {
                        name: 'xterm-256color',
                        cols: cols,
                        rows: rows,
                        cwd: cwd,
                        env: _object_spread_props(_object_spread({}, env), {
                            NODE_ENV: 'test',
                            CHIPILOT_TEST: 'true',
                            // Prevent any real API keys from being used
                            ANTHROPIC_API_KEY: 'test-key',
                            OPENAI_API_KEY: 'test-key'
                        })
                    });
                    output = '';
                    screenBuffer = [];
                    proc.onData(function(data) {
                        output += data;
                        // Maintain screen buffer (last 'rows' lines)
                        var lines = data.split('\n');
                        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                        try {
                            for(var _iterator = lines[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                                var line = _step.value;
                                // Handle clear screen
                                if (line.includes('\x1b[2J')) {
                                    screenBuffer = [];
                                } else if (line.includes('\r') && !line.includes('\n')) {
                                    var cleanLine = line.replace(/\r/g, '');
                                    if (screenBuffer.length > 0) {
                                        screenBuffer[screenBuffer.length - 1] = cleanLine;
                                    } else {
                                        screenBuffer.push(cleanLine);
                                    }
                                } else {
                                    var cleanLine1 = line.replace(/\r/g, '');
                                    if (cleanLine1) {
                                        screenBuffer.push(cleanLine1);
                                    }
                                }
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
                        // Keep only visible rows
                        if (screenBuffer.length > rows) {
                            screenBuffer = screenBuffer.slice(-rows);
                        }
                    });
                    // Create session interface
                    session = {
                        pid: proc.pid,
                        get output () {
                            return output;
                        },
                        get screen () {
                            return screenBuffer.join('\n');
                        },
                        send: function send(_0) {
                            return _async_to_generator(function(input) {
                                var options, _options_timeout;
                                var _arguments = arguments;
                                return _ts_generator(this, function(_state) {
                                    switch(_state.label){
                                        case 0:
                                            options = _arguments.length > 1 && _arguments[1] !== void 0 ? _arguments[1] : {};
                                            proc.write(input);
                                            if (!options.waitFor) return [
                                                3,
                                                2
                                            ];
                                            return [
                                                4,
                                                session.waitFor(options.waitFor, (_options_timeout = options.timeout) !== null && _options_timeout !== void 0 ? _options_timeout : timeout)
                                            ];
                                        case 1:
                                            _state.sent();
                                            _state.label = 2;
                                        case 2:
                                            return [
                                                2
                                            ];
                                    }
                                });
                            }).apply(this, arguments);
                        },
                        interact: function interact(steps) {
                            return _async_to_generator(function() {
                                var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, step, err;
                                return _ts_generator(this, function(_state) {
                                    switch(_state.label){
                                        case 0:
                                            _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                                            _state.label = 1;
                                        case 1:
                                            _state.trys.push([
                                                1,
                                                8,
                                                9,
                                                10
                                            ]);
                                            _iterator = steps[Symbol.iterator]();
                                            _state.label = 2;
                                        case 2:
                                            if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                                3,
                                                7
                                            ];
                                            step = _step.value;
                                            if (step.description) {
                                                console.log("  → ".concat(step.description));
                                            }
                                            if (step.input) {
                                                proc.write(step.input);
                                            }
                                            if (!step.waitMs) return [
                                                3,
                                                4
                                            ];
                                            return [
                                                4,
                                                sleep(step.waitMs)
                                            ];
                                        case 3:
                                            _state.sent();
                                            _state.label = 4;
                                        case 4:
                                            if (!step.waitFor) return [
                                                3,
                                                6
                                            ];
                                            return [
                                                4,
                                                session.waitFor(step.waitFor, timeout)
                                            ];
                                        case 5:
                                            _state.sent();
                                            _state.label = 6;
                                        case 6:
                                            _iteratorNormalCompletion = true;
                                            return [
                                                3,
                                                2
                                            ];
                                        case 7:
                                            return [
                                                3,
                                                10
                                            ];
                                        case 8:
                                            err = _state.sent();
                                            _didIteratorError = true;
                                            _iteratorError = err;
                                            return [
                                                3,
                                                10
                                            ];
                                        case 9:
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
                                        case 10:
                                            return [
                                                2
                                            ];
                                    }
                                });
                            })();
                        },
                        waitFor: function waitFor(_0) {
                            return _async_to_generator(function(pattern) {
                                var waitTimeout, startTime, regex;
                                var _arguments = arguments;
                                return _ts_generator(this, function(_state) {
                                    waitTimeout = _arguments.length > 1 && _arguments[1] !== void 0 ? _arguments[1] : timeout;
                                    startTime = Date.now();
                                    regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
                                    return [
                                        2,
                                        new Promise(function(resolve, reject) {
                                            var check = function check1() {
                                                if (regex.test(output)) {
                                                    resolve();
                                                    return;
                                                }
                                                if (Date.now() - startTime > waitTimeout) {
                                                    reject(new Error('Timeout waiting for pattern "'.concat(pattern, '". ') + "Recent output:\n".concat(session.getRecentOutput(10))));
                                                    return;
                                                }
                                                setTimeout(check, 50);
                                            };
                                            check();
                                        })
                                    ];
                                });
                            }).apply(this, arguments);
                        },
                        getRecentOutput: function getRecentOutput() {
                            var lines = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 10;
                            var allLines = output.split('\n');
                            return allLines.slice(-lines).join('\n');
                        },
                        contains: function contains(pattern) {
                            var regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
                            return regex.test(output);
                        },
                        kill: function kill() {
                            var signal = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 'SIGTERM';
                            proc.kill(signal);
                        },
                        resize: function resize(cols, rows) {
                            proc.resize(cols, rows);
                        }
                    };
                    // Wait for initial render
                    return [
                        4,
                        session.waitFor(/Welcome to chipilot|chipilot.*EDA/, timeout)
                    ];
                case 1:
                    _state.sent();
                    return [
                        2,
                        session
                    ];
            }
        });
    }).apply(this, arguments);
}
/**
 * Create a mock CLI mode for testing (no API dependencies)
 */ export function spawnMockCLI() {
    return _async_to_generator(function() {
        var mockResponses, options, session, lastPrompt, originalSend;
        var _arguments = arguments;
        return _ts_generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    mockResponses = _arguments.length > 0 && _arguments[0] !== void 0 ? _arguments[0] : new Map(), options = _arguments.length > 1 && _arguments[1] !== void 0 ? _arguments[1] : {};
                    return [
                        4,
                        spawnCLI(options)
                    ];
                case 1:
                    session = _state.sent();
                    // Track prompts and responses
                    lastPrompt = '';
                    originalSend = session.send.bind(session);
                    session.send = function(input) {
                        var opts = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
                        return _async_to_generator(function() {
                            return _ts_generator(this, function(_state) {
                                switch(_state.label){
                                    case 0:
                                        lastPrompt = input;
                                        if (!(input === '\r' && mockResponses.has(lastPrompt))) return [
                                            3,
                                            2
                                        ];
                                        // Wait for AI response simulation
                                        return [
                                            4,
                                            sleep(100)
                                        ];
                                    case 1:
                                        _state.sent();
                                        _state.label = 2;
                                    case 2:
                                        return [
                                            2,
                                            originalSend(input, opts)
                                        ];
                                }
                            });
                        })();
                    };
                    return [
                        2,
                        _object_spread_props(_object_spread({}, session), {
                            getLastPrompt: function getLastPrompt() {
                                return lastPrompt;
                            }
                        })
                    ];
            }
        });
    }).apply(this, arguments);
}
function sleep(ms) {
    return new Promise(function(resolve) {
        return setTimeout(resolve, ms);
    });
}
/**
 * Validate ANSI output contains expected sequences
 */ export function validateANSISequences(output) {
    var sequences = [];
    // Extract ANSI sequences
    var ansiRegex = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07/g;
    var match;
    while((match = ansiRegex.exec(output)) !== null){
        sequences.push(match[0]);
    }
    return {
        hasColor: /\x1b\[[0-9;]*m/.test(output),
        hasCursor: /\x1b\[[0-9]*[ABCDEFGH]/.test(output),
        hasClear: /\x1b\[2J/.test(output),
        sequences: sequences
    };
}
