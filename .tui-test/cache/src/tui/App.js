//# hash=5fd693e0b0cc356c3c7712708688e30f
//# sourceMappingURL=App.js.map

function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
}
function _array_without_holes(arr) {
    if (Array.isArray(arr)) return _array_like_to_array(arr);
}
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
function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _iterable_to_array_limit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _s, _e;
    try {
        for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
        }
    } catch (err) {
        _d = true;
        _e = err;
    } finally{
        try {
            if (!_n && _i["return"] != null) _i["return"]();
        } finally{
            if (_d) throw _e;
        }
    }
    return _arr;
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
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
import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Box, Text, useApp, useInput, useStdout, render } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { TerminalPane } from "./TerminalPane.js";
import { ApprovalModal } from "./ApprovalModal.js";
import { TerminalSession } from "../terminal/session.js";
import { Agent } from "../agent/index.js";
export function runChipilot(options) {
    return _async_to_generator(function() {
        return _ts_generator(this, function(_state) {
            render(/*#__PURE__*/ React.createElement(App, {
                options: options
            }));
            return [
                2
            ];
        });
    })();
}
// Help overlay component
var HelpOverlay = function HelpOverlay(param) {
    var onClose = param.onClose;
    useInput(function() {
        onClose();
    });
    return /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        borderStyle: "double",
        borderColor: "cyan",
        padding: 1,
        position: "absolute",
        width: 60
    }, /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 1
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "cyan"
    }, "Keyboard Shortcuts")), /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        marginBottom: 1
    }, /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "Tab"), /*#__PURE__*/ React.createElement(Text, null, " - Switch between chat and terminal panes")), /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "Ctrl+C"), /*#__PURE__*/ React.createElement(Text, null, " - Exit application")), /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "Up/Down"), /*#__PURE__*/ React.createElement(Text, null, " - Scroll through messages (chat pane)")), /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "PageUp/PageDown"), /*#__PURE__*/ React.createElement(Text, null, " - Scroll by page (chat pane)")), /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "Y"), /*#__PURE__*/ React.createElement(Text, null, " - Approve command (when approval shown)")), /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "N"), /*#__PURE__*/ React.createElement(Text, null, " - Reject command (when approval shown)")), /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "E"), /*#__PURE__*/ React.createElement(Text, null, " - Edit command (when approval shown)")), /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "?"), /*#__PURE__*/ React.createElement(Text, null, " - Show/hide this help"))), /*#__PURE__*/ React.createElement(Box, {
        justifyContent: "center"
    }, /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "Press any key to close")));
};
export var App = function App(param) {
    var options = param.options;
    var exit = useApp().exit;
    var stdout = useStdout().stdout;
    // Get terminal dimensions
    var width = stdout.columns || 120;
    var height = stdout.rows || 40;
    var half = Math.floor(width / 2);
    // Fixed layout proportions
    var headerHeight = 1;
    var inputHeight = 3;
    var mainHeight = Math.max(10, height - headerHeight - inputHeight);
    // State
    var _useState = _sliced_to_array(useState("chat"), 2), pane = _useState[0], setPane = _useState[1];
    var _useState1 = _sliced_to_array(useState(""), 2), input = _useState1[0], setInput = _useState1[1];
    var _useState2 = _sliced_to_array(useState(false), 2), loading = _useState2[0], setLoading = _useState2[1];
    var _useState3 = _sliced_to_array(useState(null), 2), command = _useState3[0], setCommand = _useState3[1];
    var _useState4 = _sliced_to_array(useState(false), 2), showHelp = _useState4[0], setShowHelp = _useState4[1];
    var _useState5 = _sliced_to_array(useState([
        {
            role: "assistant",
            content: "Welcome to chipilot! Ask me about EDA tools."
        }
    ]), 2), messages = _useState5[0], setMessages = _useState5[1];
    var _useState6 = _sliced_to_array(useState(0), 2), scrollOffset = _useState6[0], setScrollOffset = _useState6[1];
    // Refs for stable instances (created once)
    var sessionRef = useRef(null);
    var agentRef = useRef(null);
    // Initialize session once
    if (!sessionRef.current) {
        sessionRef.current = new TerminalSession({
            cols: Math.max(20, half - 4),
            rows: Math.max(10, mainHeight - 4)
        });
    }
    // Initialize agent once
    if (!agentRef.current) {
        agentRef.current = new Agent({
            provider: options.provider || "anthropic",
            model: options.model,
            apiKey: options.apiKey,
            baseURL: options.baseURL
        });
    }
    // Resize terminal session when dimensions change
    useEffect(function() {
        if (sessionRef.current) {
            var cols = Math.max(20, half - 4);
            var rows = Math.max(10, mainHeight - 4);
            sessionRef.current.resize(cols, rows);
        }
    }, [
        half,
        mainHeight
    ]);
    // Global input handler - Tab always switches panes
    useInput(function(input, key) {
        // Help toggle with ? key (only when not showing approval modal)
        if (!command && input === "?") {
            setShowHelp(function(prev) {
                return !prev;
            });
            return;
        }
        // When help is shown, any key closes it (handled by HelpOverlay)
        if (showHelp) {
            return;
        }
        if (key.tab) {
            setPane(function(p) {
                return p === "chat" ? "term" : "chat";
            });
            return;
        }
        if (key.ctrl && input === "c") {
            exit();
        }
        // Scroll handlers (only when chat pane is focused)
        if (pane === "chat") {
            var totalMessages = messages.length;
            var maxScroll = Math.max(0, totalMessages - maxVisibleMessages);
            if (key.upArrow) {
                // Scroll up (show older messages)
                setScrollOffset(function(offset) {
                    return Math.min(maxScroll, offset + 1);
                });
            } else if (key.downArrow) {
                // Scroll down (show newer messages)
                setScrollOffset(function(offset) {
                    return Math.max(0, offset - 1);
                });
            } else if (key.pageUp) {
                // Page up - scroll multiple messages
                setScrollOffset(function(offset) {
                    return Math.min(maxScroll, offset + maxVisibleMessages);
                });
            } else if (key.pageDown) {
                // Page down - scroll multiple messages
                setScrollOffset(function(offset) {
                    return Math.max(0, offset - maxVisibleMessages);
                });
            }
        }
    });
    // Submit chat message
    var submit = useCallback(function(msg) {
        return _async_to_generator(function() {
            var res, e;
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        if (!msg.trim() || loading) return [
                            2
                        ];
                        setInput("");
                        setLoading(true);
                        setMessages(function(m) {
                            return _to_consumable_array(m).concat([
                                {
                                    role: "user",
                                    content: msg
                                }
                            ]);
                        });
                        _state.label = 1;
                    case 1:
                        _state.trys.push([
                            1,
                            3,
                            ,
                            4
                        ]);
                        return [
                            4,
                            agentRef.current.chat(msg, {})
                        ];
                    case 2:
                        res = _state.sent();
                        setMessages(function(m) {
                            return _to_consumable_array(m).concat([
                                {
                                    role: "assistant",
                                    content: res.message
                                }
                            ]);
                        });
                        if (res.proposedCommand) setCommand(res.proposedCommand);
                        return [
                            3,
                            4
                        ];
                    case 3:
                        e = _state.sent();
                        setMessages(function(m) {
                            return _to_consumable_array(m).concat([
                                {
                                    role: "assistant",
                                    content: "Error: ".concat(e)
                                }
                            ]);
                        });
                        return [
                            3,
                            4
                        ];
                    case 4:
                        setLoading(false);
                        return [
                            2
                        ];
                }
            });
        })();
    }, [
        loading
    ]);
    // Calculate visible messages with scroll support
    var maxVisibleMessages = Math.max(3, Math.floor((mainHeight - 4) / 3));
    var totalMessages = messages.length;
    var maxScroll = Math.max(0, totalMessages - maxVisibleMessages);
    // Auto-reset scroll when at bottom and new messages arrive
    var visibleMessages = useMemo(function() {
        var startIndex = Math.max(0, totalMessages - maxVisibleMessages - scrollOffset);
        var endIndex = Math.min(totalMessages, startIndex + maxVisibleMessages);
        return messages.slice(startIndex, endIndex);
    }, [
        messages,
        maxVisibleMessages,
        scrollOffset,
        totalMessages
    ]);
    // Calculate display range for scroll indicator
    var displayStart = totalMessages > 0 ? Math.max(1, totalMessages - maxVisibleMessages - scrollOffset + 1) : 0;
    var displayEnd = Math.min(totalMessages, displayStart + maxVisibleMessages - 1);
    var isScrolled = scrollOffset > 0;
    return /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        width: width,
        height: height,
        flexShrink: 0
    }, /*#__PURE__*/ React.createElement(Box, {
        width: width,
        height: headerHeight,
        flexShrink: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "cyan"
    }, "chipilot"), /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, " - Agentic EDA"), /*#__PURE__*/ React.createElement(Box, {
        flexGrow: 1
    }), /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "Tab: switch | Ctrl+C: exit | ?: help")), /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "row",
        width: width,
        height: mainHeight,
        flexShrink: 0
    }, /*#__PURE__*/ React.createElement(Box, {
        width: half,
        height: mainHeight,
        borderStyle: "single",
        borderColor: pane === "chat" ? "cyan" : "gray",
        flexDirection: "column"
    }, /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        flexGrow: 1,
        paddingX: 1,
        overflow: "hidden"
    }, visibleMessages.map(function(m, i) {
        return /*#__PURE__*/ React.createElement(Box, {
            key: i,
            flexDirection: "column",
            marginBottom: 1
        }, /*#__PURE__*/ React.createElement(Text, {
            bold: true,
            color: m.role === "user" ? "green" : "cyan"
        }, m.role === "user" ? "You:" : "AI:"), /*#__PURE__*/ React.createElement(Text, {
            wrap: "wrap"
        }, m.content));
    }), loading && /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, /*#__PURE__*/ React.createElement(Spinner, {
        type: "dots"
    }), " Thinking...")), totalMessages > maxVisibleMessages && /*#__PURE__*/ React.createElement(Box, {
        paddingX: 1,
        height: 1
    }, /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, isScrolled ? "↑ " : "  ", displayStart, "-", displayEnd, " of ", totalMessages, scrollOffset > 0 && " ↓"))), /*#__PURE__*/ React.createElement(Box, {
        width: width - half,
        height: mainHeight,
        borderStyle: "single",
        borderColor: pane === "term" ? "cyan" : "gray",
        flexDirection: "column"
    }, /*#__PURE__*/ React.createElement(TerminalPane, {
        focused: pane === "term",
        session: sessionRef.current,
        maxLines: Math.max(5, mainHeight - 4)
    }))), /*#__PURE__*/ React.createElement(Box, {
        width: width,
        height: inputHeight,
        borderStyle: "single",
        borderColor: "gray",
        flexShrink: 0
    }, pane === "chat" ? loading ? /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "Waiting for AI...") : /*#__PURE__*/ React.createElement(React.Fragment, null, /*#__PURE__*/ React.createElement(Text, {
        color: "cyan",
        bold: true
    }, "> "), /*#__PURE__*/ React.createElement(TextInput, {
        value: input,
        onChange: setInput,
        onSubmit: submit,
        placeholder: "Ask about EDA..."
    })) : /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "row"
    }, /*#__PURE__*/ React.createElement(Text, {
        color: "gray",
        bold: true
    }, "> "), /*#__PURE__*/ React.createElement(Text, {
        color: "gray",
        dimColor: true
    }, "[Tab to return to chat]"))), command && /*#__PURE__*/ React.createElement(ApprovalModal, {
        command: command.command,
        explanation: command.explanation,
        onApprove: function onApprove(cmd) {
            sessionRef.current.write(cmd + "\r");
            setCommand(null);
            setMessages(function(m) {
                return _to_consumable_array(m).concat([
                    {
                        role: "assistant",
                        content: "Executing: ".concat(cmd)
                    }
                ]);
            });
        },
        onReject: function onReject() {
            return setCommand(null);
        }
    }), showHelp && /*#__PURE__*/ React.createElement(HelpOverlay, {
        onClose: function onClose() {
            return setShowHelp(false);
        }
    }));
};
export default App;
