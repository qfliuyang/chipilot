//# hash=7995af528522a147dc7623553d6e1a18
//# sourceMappingURL=ChatPane.js.map

import React, { memo, useMemo } from "react";
import { Box, Text } from "ink";
// Memoized message - only re-renders if content changes
var MessageItem = /*#__PURE__*/ memo(function(param) {
    var msg = param.msg;
    return /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        marginY: 1
    }, /*#__PURE__*/ React.createElement(Box, null, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: msg.role === "user" ? "green" : "cyan"
    }, msg.role === "user" ? "You" : "AI"), /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, ":")), /*#__PURE__*/ React.createElement(Box, {
        paddingLeft: 1
    }, /*#__PURE__*/ React.createElement(Text, {
        wrap: "wrap"
    }, msg.content)));
});
MessageItem.displayName = "MessageItem";
export var ChatPane = /*#__PURE__*/ memo(function(param) {
    var messages = param.messages, isLoading = param.isLoading;
    // Visible messages
    var visibleMessages = useMemo(function() {
        return messages.slice(-8);
    }, [
        messages
    ]);
    return /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        width: "100%",
        height: "100%"
    }, /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        flexGrow: 1,
        paddingX: 1
    }, visibleMessages.map(function(msg, i) {
        return /*#__PURE__*/ React.createElement(MessageItem, {
            key: i,
            msg: msg
        });
    }), isLoading && /*#__PURE__*/ React.createElement(Box, null, /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "Thinking..."))));
});
ChatPane.displayName = "ChatPane";
export default ChatPane;
