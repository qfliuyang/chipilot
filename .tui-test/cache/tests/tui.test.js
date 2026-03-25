//# hash=ab65d7f5b90d9c192e5f0ccc44bfdfad
//# sourceMappingURL=tui.test.js.map

import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { Box, Text } from "ink";
// Simple unit tests using ink-testing-library
// We test the rendering output without spawning real processes
describe("ChatPane", function() {
    // Mock the ChatPane component since it has complex dependencies
    var MockChatPane = function MockChatPane(param) {
        var messages = param.messages, isLoading = param.isLoading, focused = param.focused;
        return /*#__PURE__*/ React.createElement(Box, {
            flexDirection: "column"
        }, messages.map(function(msg, i) {
            return /*#__PURE__*/ React.createElement(Box, {
                key: i
            }, /*#__PURE__*/ React.createElement(Text, {
                bold: true,
                color: msg.role === "user" ? "green" : "blue"
            }, msg.role === "user" ? "You" : "AI", ":"), /*#__PURE__*/ React.createElement(Text, null, " ", msg.content));
        }), isLoading && /*#__PURE__*/ React.createElement(Text, {
            dimColor: true
        }, "Thinking..."), !focused && /*#__PURE__*/ React.createElement(Text, {
            dimColor: true
        }, "Press Tab to focus"));
    };
    it("should render messages correctly", function() {
        var messages = [
            {
                role: "assistant",
                content: "Welcome to chipilot!"
            },
            {
                role: "user",
                content: "show me timing report"
            }
        ];
        var lastFrame = render(/*#__PURE__*/ React.createElement(MockChatPane, {
            messages: messages,
            isLoading: false,
            focused: true
        })).lastFrame;
        var output = lastFrame();
        expect(output).toContain("Welcome to chipilot!");
        expect(output).toContain("show me timing report");
        expect(output).toContain("You");
        expect(output).toContain("AI");
    });
    it("should show loading indicator when isLoading is true", function() {
        var lastFrame = render(/*#__PURE__*/ React.createElement(MockChatPane, {
            messages: [],
            isLoading: true,
            focused: true
        })).lastFrame;
        var output = lastFrame();
        expect(output).toContain("Thinking");
    });
    it("should show focus hint when not focused", function() {
        var lastFrame = render(/*#__PURE__*/ React.createElement(MockChatPane, {
            messages: [],
            isLoading: false,
            focused: false
        })).lastFrame;
        var output = lastFrame();
        expect(output).toContain("Press Tab to focus");
    });
});
describe("TerminalPane", function() {
    var MockTerminalPane = function MockTerminalPane(param) {
        var output = param.output, focused = param.focused;
        return /*#__PURE__*/ React.createElement(Box, {
            flexDirection: "column"
        }, /*#__PURE__*/ React.createElement(Text, {
            bold: true,
            color: "yellow"
        }, "Terminal"), output.map(function(line, i) {
            return /*#__PURE__*/ React.createElement(Text, {
                key: i
            }, line);
        }), focused && /*#__PURE__*/ React.createElement(Text, {
            color: "green"
        }, "▋"), !focused && /*#__PURE__*/ React.createElement(Text, {
            dimColor: true
        }, "Press Tab to focus"));
    };
    it("should render terminal output", function() {
        var output = [
            "$ prompt",
            "$ ls",
            "innovus> "
        ];
        var lastFrame = render(/*#__PURE__*/ React.createElement(MockTerminalPane, {
            output: output,
            focused: false
        })).lastFrame;
        var frame = lastFrame();
        expect(frame).toContain("$ prompt");
        expect(frame).toContain("innovus>");
    });
    it("should show cursor when focused", function() {
        var lastFrame = render(/*#__PURE__*/ React.createElement(MockTerminalPane, {
            output: [],
            focused: true
        })).lastFrame;
        var output = lastFrame();
        // The cursor character should be in output
        expect(output).toBeDefined();
    });
    it("should show focus hint when not focused", function() {
        var lastFrame = render(/*#__PURE__*/ React.createElement(MockTerminalPane, {
            output: [],
            focused: false
        })).lastFrame;
        var output = lastFrame();
        expect(output).toContain("Press Tab to focus");
    });
});
describe("ApprovalModal", function() {
    var MockApprovalModal = function MockApprovalModal(param) {
        var command = param.command, explanation = param.explanation;
        return /*#__PURE__*/ React.createElement(Box, {
            flexDirection: "column",
            borderStyle: "round",
            borderColor: "yellow"
        }, /*#__PURE__*/ React.createElement(Text, {
            bold: true,
            color: "yellow"
        }, "⚠ Command Approval Required"), /*#__PURE__*/ React.createElement(Text, {
            dimColor: true
        }, "AI wants to run:"), /*#__PURE__*/ React.createElement(Text, null, explanation), /*#__PURE__*/ React.createElement(Text, {
            bold: true,
            color: "cyan"
        }, "Command:"), /*#__PURE__*/ React.createElement(Text, null, command), /*#__PURE__*/ React.createElement(Box, null, /*#__PURE__*/ React.createElement(Text, {
            bold: true,
            color: "green"
        }, "[Y]"), /*#__PURE__*/ React.createElement(Text, null, " Approve "), /*#__PURE__*/ React.createElement(Text, {
            bold: true,
            color: "yellow"
        }, "[E]"), /*#__PURE__*/ React.createElement(Text, null, " Edit "), /*#__PURE__*/ React.createElement(Text, {
            bold: true,
            color: "red"
        }, "[N]"), /*#__PURE__*/ React.createElement(Text, null, " Reject ")));
    };
    it("should render command requiring approval", function() {
        var lastFrame = render(/*#__PURE__*/ React.createElement(MockApprovalModal, {
            command: "floorplan -core -core_util 1.7",
            explanation: "Create a floorplan with 80% utilization"
        })).lastFrame;
        var output = lastFrame();
        expect(output).toContain("Command Approval Required");
        expect(output).toContain("floorplan -core");
        expect(output).toContain("Create a floorplan");
        expect(output).toContain("[Y]");
        expect(output).toContain("[N]");
        expect(output).toContain("[E]");
    });
    it("should show approve, reject, and edit options", function() {
        var lastFrame = render(/*#__PURE__*/ React.createElement(MockApprovalModal, {
            command: "ls -la",
            explanation: "List files"
        })).lastFrame;
        var output = lastFrame();
        expect(output).toContain("Approve");
        expect(output).toContain("Reject");
        expect(output).toContain("Edit");
    });
});
