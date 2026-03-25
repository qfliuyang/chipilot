//# hash=d427c01dec771b4b2e70d233e0ee4b4e
//# sourceMappingURL=ApprovalModal.js.map

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
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
export var ApprovalModal = function ApprovalModal(param) {
    var command = param.command, explanation = param.explanation, onApprove = param.onApprove, onReject = param.onReject;
    var _useState = _sliced_to_array(useState("confirm"), 2), mode = _useState[0], setMode = _useState[1];
    var _useState1 = _sliced_to_array(useState(command), 2), editedCommand = _useState1[0], setEditedCommand = _useState1[1];
    useInput(function(input, key) {
        if (mode === "confirm") {
            if (input === "y" || input === "Y") {
                onApprove(command, false);
            } else if (input === "e" || input === "E") {
                setMode("edit");
            } else if (input === "n" || input === "N" || key.escape) {
                onReject();
            }
        } else if (mode === "edit") {
            if (key.escape) {
                setMode("confirm");
            } else if (key.return) {
                onApprove(editedCommand, true);
            }
        }
    });
    return /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        borderStyle: "double",
        borderColor: "yellow",
        padding: 1,
        position: "absolute",
        width: 80
    }, /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 1
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "⚠ Command Approval Required")), /*#__PURE__*/ React.createElement(Box, {
        marginBottom: 1,
        flexDirection: "column"
    }, /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "AI wants to run:"), /*#__PURE__*/ React.createElement(Text, {
        color: "gray"
    }, explanation)), /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        borderStyle: "single",
        borderColor: "cyan",
        paddingX: 1,
        marginBottom: 1
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "cyan"
    }, "Command:"), mode === "confirm" ? /*#__PURE__*/ React.createElement(Text, {
        color: "white"
    }, command) : /*#__PURE__*/ React.createElement(Box, null, /*#__PURE__*/ React.createElement(TextInput, {
        value: editedCommand,
        onChange: setEditedCommand,
        showCursor: true
    }))), mode === "confirm" ? /*#__PURE__*/ React.createElement(Box, {
        justifyContent: "center"
    }, /*#__PURE__*/ React.createElement(Box, {
        marginRight: 4
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "green"
    }, "[Y]"), /*#__PURE__*/ React.createElement(Text, null, " Approve ")), /*#__PURE__*/ React.createElement(Box, {
        marginRight: 4
    }, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "yellow"
    }, "[E]"), /*#__PURE__*/ React.createElement(Text, null, " Edit ")), /*#__PURE__*/ React.createElement(Box, null, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: "red"
    }, "[N]"), /*#__PURE__*/ React.createElement(Text, null, " Reject "))) : /*#__PURE__*/ React.createElement(Box, {
        justifyContent: "center"
    }, /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "Press Enter to execute edited command, Esc to cancel")));
};
export default ApprovalModal;
