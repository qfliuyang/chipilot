//# hash=cc6cbd6c1a2003f8acc5cacbb423ae98
//# sourceMappingURL=TerminalPane.js.map

function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
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
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
import React, { memo, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
/**
 * TerminalPane - Real terminal feel
 *
 * Key: Keep ALL PTY output raw, only strip truly problematic sequences.
 */ export var TerminalPane = /*#__PURE__*/ memo(function(param) {
    var focused = param.focused, session = param.session, _param_maxLines = param.maxLines, maxLines = _param_maxLines === void 0 ? 20 : _param_maxLines;
    var bufferRef = useRef("");
    var _React_useReducer = _sliced_to_array(React.useReducer(function(n) {
        return n + 1;
    }, 0), 2), forceRender = _React_useReducer[1];
    useEffect(function() {
        var handleOutput = function handleOutput(data) {
            // Accumulate raw output - keep everything
            bufferRef.current = (bufferRef.current + data).slice(-50000);
            // Force re-render
            forceRender();
        };
        session.on("output", handleOutput);
        // Start the session if not already started
        if (!session.isRunning()) {
            session.start();
        }
        return function() {
            session.off("output", handleOutput);
        };
    }, [
        session
    ]);
    // Input handling - pass through to PTY immediately
    useInput(function(input, key) {
        if (!focused) return;
        // Tab switches panes (handled by parent), don't consume it
        if (key.tab) return;
        // Pass everything else directly to PTY - let PTY handle echo
        if (key.return) {
            session.write("\r");
        } else if (key.backspace || key.delete) {
            session.write("\x7f"); // DEL character for backspace
        } else if (key.upArrow) {
            session.write("\x1b[A");
        } else if (key.downArrow) {
            session.write("\x1b[B");
        } else if (key.leftArrow) {
            session.write("\x1b[D");
        } else if (key.rightArrow) {
            session.write("\x1b[C");
        } else if (key.ctrl && input.length === 1) {
            // Ctrl+C is handled by parent, other Ctrl keys pass through
            if (input !== "c") {
                session.write(String.fromCharCode(input.charCodeAt(0) - 96));
            }
        } else if (input.length === 1 && !key.meta) {
            // Regular character - pass to PTY, let it echo back
            session.write(input);
        }
    }, {
        isActive: focused
    });
    // Get display lines - process raw buffer
    var raw = bufferRef.current;
    // Pass through raw PTY output - Ink handles ANSI sequences
    // Stripping sequences breaks interactive programs (vim, less, htop)
    var lines = raw.split("\n");
    var displayLines = lines.slice(-maxLines);
    return /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        width: "100%",
        height: "100%"
    }, /*#__PURE__*/ React.createElement(Box, {
        paddingX: 1,
        flexShrink: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "Terminal"), focused && /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, " (active - type normally)")), /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        flexGrow: 1,
        paddingX: 1,
        overflow: "hidden"
    }, displayLines.map(function(line, i) {
        return /*#__PURE__*/ React.createElement(Text, {
            key: i
        }, line || " ");
    }), focused && /*#__PURE__*/ React.createElement(Text, {
        color: "green"
    }, "▋")), !focused && /*#__PURE__*/ React.createElement(Box, {
        justifyContent: "center",
        flexShrink: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "[Tab to focus]")));
});
TerminalPane.displayName = "TerminalPane";
export default TerminalPane;
