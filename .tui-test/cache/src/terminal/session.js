//# hash=ac74bd9f82f3409464a91deb0b3cd02c
//# sourceMappingURL=session.js.map

function _assert_this_initialized(self) {
    if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
}
function _call_super(_this, derived, args) {
    derived = _get_prototype_of(derived);
    return _possible_constructor_return(_this, _is_native_reflect_construct() ? Reflect.construct(derived, args || [], _get_prototype_of(_this).constructor) : derived.apply(_this, args));
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
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
function _get_prototype_of(o) {
    _get_prototype_of = Object.setPrototypeOf ? Object.getPrototypeOf : function getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _get_prototype_of(o);
}
function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
            value: subClass,
            writable: true,
            configurable: true
        }
    });
    if (superClass) _set_prototype_of(subClass, superClass);
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
function _possible_constructor_return(self, call) {
    if (call && (_type_of(call) === "object" || typeof call === "function")) {
        return call;
    }
    return _assert_this_initialized(self);
}
function _set_prototype_of(o, p) {
    _set_prototype_of = Object.setPrototypeOf || function setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
    };
    return _set_prototype_of(o, p);
}
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
function _is_native_reflect_construct() {
    try {
        var result = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {}));
    } catch (_) {}
    return (_is_native_reflect_construct = function() {
        return !!result;
    })();
}
import * as pty from "node-pty";
import { EventEmitter } from "events";
export var TerminalSession = /*#__PURE__*/ function(EventEmitter) {
    "use strict";
    _inherits(TerminalSession, EventEmitter);
    function TerminalSession() {
        var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        _class_call_check(this, TerminalSession);
        var _this;
        _this = _call_super(this, TerminalSession), _define_property(_this, "ptyProcess", null), _define_property(_this, "shell", void 0), _define_property(_this, "cwd", void 0), _define_property(_this, "env", void 0), _define_property(_this, "cols", void 0), _define_property(_this, "rows", void 0), _define_property(_this, "started", false);
        _this.shell = options.shell || process.env.SHELL || "/bin/bash";
        _this.cwd = options.cwd || process.cwd();
        _this.cols = options.cols || 80;
        _this.rows = options.rows || 24;
        _this.env = _object_spread(_object_spread_props(_object_spread({}, process.env), {
            TERM: "xterm-256color"
        }), options.env);
        return _this;
    }
    _create_class(TerminalSession, [
        {
            key: "start",
            value: function start() {
                var _this = this;
                if (this.started) {
                    return;
                }
                this.ptyProcess = pty.spawn(this.shell, [], {
                    name: "xterm-256color",
                    cols: this.cols,
                    rows: this.rows,
                    cwd: this.cwd,
                    env: this.env
                });
                this.ptyProcess.onData(function(data) {
                    _this.emit("output", data);
                });
                this.ptyProcess.onExit(function(param) {
                    var exitCode = param.exitCode, signal = param.signal;
                    _this.emit("exit", {
                        exitCode: exitCode,
                        signal: signal
                    });
                    _this.ptyProcess = null;
                    _this.started = false;
                });
                this.started = true;
                this.emit("started");
            }
        },
        {
            key: "write",
            value: function write(data) {
                if (this.ptyProcess) {
                    this.ptyProcess.write(data);
                }
            }
        },
        {
            key: "execute",
            value: function execute(command) {
                if (this.ptyProcess) {
                    // Add newline to execute the command
                    this.ptyProcess.write(command + "\r");
                }
            }
        },
        {
            key: "resize",
            value: function resize(cols, rows) {
                this.cols = cols;
                this.rows = rows;
                if (this.ptyProcess) {
                    this.ptyProcess.resize(cols, rows);
                }
            }
        },
        {
            key: "destroy",
            value: function destroy() {
                if (this.ptyProcess) {
                    this.ptyProcess.kill();
                    this.ptyProcess = null;
                }
                this.started = false;
                this.removeAllListeners();
            }
        },
        {
            key: "isRunning",
            value: function isRunning() {
                return this.started && this.ptyProcess !== null;
            }
        },
        {
            key: "getShell",
            value: function getShell() {
                return this.shell;
            }
        }
    ]);
    return TerminalSession;
}(EventEmitter);
export default TerminalSession;
