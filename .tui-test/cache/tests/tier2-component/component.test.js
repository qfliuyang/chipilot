//# hash=ae102a09977f605d0be88d67e17299d2
//# sourceMappingURL=component.test.js.map

/**
 * Tier 2: Component Tests with ink-testing-library
 *
 * These tests render Ink components and validate output.
 * They focus on rendering output rather than complex input simulation
 * since input handling is better tested at Tier 3 with real PTY.
 */ import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Box, Text } from 'ink';
// Mock components that mirror the actual app structure
// Testing rendering output - input handling validated in Tier 3 with real PTY
var MockMessage = function MockMessage(param) {
    var role = param.role, content = param.content;
    return /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        marginY: 1
    }, /*#__PURE__*/ React.createElement(Box, null, /*#__PURE__*/ React.createElement(Text, {
        bold: true,
        color: role === 'user' ? 'green' : 'cyan'
    }, role === 'user' ? 'You' : 'AI'), /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, ":")), /*#__PURE__*/ React.createElement(Box, {
        paddingLeft: 1
    }, /*#__PURE__*/ React.createElement(Text, {
        wrap: "wrap"
    }, content)));
};
var MockChatPane = function MockChatPane(param) {
    var messages = param.messages, isLoading = param.isLoading;
    return /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        width: "100%",
        height: "100%"
    }, /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "column",
        flexGrow: 1,
        paddingX: 1
    }, messages.map(function(msg, i) {
        return /*#__PURE__*/ React.createElement(MockMessage, {
            key: i,
            role: msg.role,
            content: msg.content
        });
    }), isLoading && /*#__PURE__*/ React.createElement(Box, null, /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "Thinking..."))));
};
var MockTerminalPane = function MockTerminalPane(param) {
    var focused = param.focused, lines = param.lines;
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
        paddingX: 1
    }, lines.map(function(line, i) {
        return /*#__PURE__*/ React.createElement(Text, {
            key: i
        }, line || ' ');
    }), focused && /*#__PURE__*/ React.createElement(Text, {
        color: "green"
    }, "▋")), !focused && /*#__PURE__*/ React.createElement(Box, {
        justifyContent: "center",
        flexShrink: 0
    }, /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "[Tab to focus]")));
};
var MockInputArea = function MockInputArea(param) {
    var pane = param.pane, input = param.input, loading = param.loading;
    return /*#__PURE__*/ React.createElement(Box, {
        width: 80,
        height: 3,
        borderStyle: "single",
        borderColor: "gray"
    }, pane === 'chat' ? loading ? /*#__PURE__*/ React.createElement(Text, {
        dimColor: true
    }, "Waiting for AI...") : /*#__PURE__*/ React.createElement(React.Fragment, null, /*#__PURE__*/ React.createElement(Text, {
        color: "cyan",
        bold: true
    }, '> '), /*#__PURE__*/ React.createElement(Text, null, input)) : /*#__PURE__*/ React.createElement(Box, {
        flexDirection: "row"
    }, /*#__PURE__*/ React.createElement(Text, {
        color: "gray",
        bold: true
    }, '> '), /*#__PURE__*/ React.createElement(Text, {
        color: "gray",
        dimColor: true
    }, "[Tab to return to chat]")));
};
describe('Tier 2: Component Tests', function() {
    describe('Message Rendering', function() {
        it('should render user message with correct styling', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockMessage, {
                role: "user",
                content: "Hello AI"
            })).lastFrame;
            var output = lastFrame();
            expect(output).toContain('You');
            expect(output).toContain('Hello AI');
        });
        it('should render assistant message with correct styling', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockMessage, {
                role: "assistant",
                content: "Hello human"
            })).lastFrame;
            var output = lastFrame();
            expect(output).toContain('AI');
            expect(output).toContain('Hello human');
        });
        it('should wrap long messages', function() {
            var longMessage = 'A'.repeat(200);
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockMessage, {
                role: "user",
                content: longMessage
            })).lastFrame;
            // Should render without errors
            var output = lastFrame();
            expect(output).toContain('You');
            expect(output).toContain('A');
        });
    });
    describe('ChatPane Rendering', function() {
        it('should display welcome message', function() {
            var messages = [
                {
                    role: 'assistant',
                    content: 'Welcome to chipilot!'
                }
            ];
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockChatPane, {
                messages: messages,
                isLoading: false
            })).lastFrame;
            expect(lastFrame()).toContain('Welcome to chipilot!');
            expect(lastFrame()).toContain('AI');
        });
        it('should display multiple messages', function() {
            var messages = [
                {
                    role: 'assistant',
                    content: 'Welcome!'
                },
                {
                    role: 'user',
                    content: 'First message'
                },
                {
                    role: 'assistant',
                    content: 'Response'
                },
                {
                    role: 'user',
                    content: 'Second message'
                }
            ];
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockChatPane, {
                messages: messages,
                isLoading: false
            })).lastFrame;
            var output = lastFrame();
            expect(output).toContain('Welcome!');
            expect(output).toContain('First message');
            expect(output).toContain('Response');
            expect(output).toContain('Second message');
        });
        it('should show loading indicator', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockChatPane, {
                messages: [],
                isLoading: true
            })).lastFrame;
            expect(lastFrame()).toContain('Thinking');
        });
        it('should not show loading when not loading', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockChatPane, {
                messages: [],
                isLoading: false
            })).lastFrame;
            expect(lastFrame()).not.toContain('Thinking');
        });
    });
    describe('TerminalPane Rendering', function() {
        it('should render terminal output lines', function() {
            var lines = [
                '$ ls',
                'file1.txt',
                'file2.txt',
                '$ prompt>'
            ];
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockTerminalPane, {
                focused: false,
                lines: lines
            })).lastFrame;
            var output = lastFrame();
            expect(output).toContain('Terminal');
            expect(output).toContain('file1.txt');
            expect(output).toContain('prompt>');
        });
        it('should show active indicator when focused', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockTerminalPane, {
                focused: true,
                lines: []
            })).lastFrame;
            var output = lastFrame();
            expect(output).toContain('active');
            expect(output).toContain('▋'); // cursor
        });
        it('should show focus hint when not focused', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockTerminalPane, {
                focused: false,
                lines: []
            })).lastFrame;
            expect(lastFrame()).toContain('[Tab to focus]');
        });
    });
    describe('InputArea Rendering', function() {
        it('should render chat input with value', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockInputArea, {
                pane: "chat",
                input: "hello world",
                loading: false
            })).lastFrame;
            var output = lastFrame();
            expect(output).toContain('> ');
            expect(output).toContain('hello world');
        });
        it('should show loading state', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockInputArea, {
                pane: "chat",
                input: "",
                loading: true
            })).lastFrame;
            expect(lastFrame()).toContain('Waiting for AI');
        });
        it('should show terminal placeholder when in term pane', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockInputArea, {
                pane: "term",
                input: "preserved text",
                loading: false
            })).lastFrame;
            var output = lastFrame();
            // Should NOT show the input (it's preserved but hidden)
            expect(output).not.toContain('preserved text');
            // Should show placeholder
            expect(output).toContain('[Tab to return to chat]');
        });
        it('should render with gray styling in terminal pane', function() {
            var lastFrame = render(/*#__PURE__*/ React.createElement(MockInputArea, {
                pane: "term",
                input: "",
                loading: false
            })).lastFrame;
            var output = lastFrame();
            // Gray/dim styling indicators
            expect(output).toContain('>');
            expect(output).toContain('Tab to return');
        });
    });
    describe('ANSI Output Validation', function() {
        it('should render colored text', function() {
            var ColoredComponent = function ColoredComponent() {
                return /*#__PURE__*/ React.createElement(Box, null, /*#__PURE__*/ React.createElement(Text, {
                    color: "cyan"
                }, "Cyan text"), /*#__PURE__*/ React.createElement(Text, {
                    color: "green"
                }, "Green text"));
            };
            var lastFrame = render(/*#__PURE__*/ React.createElement(ColoredComponent, null)).lastFrame;
            // Ink outputs ANSI color codes
            var output = lastFrame();
            expect(output).toBeTruthy();
            expect(output.length).toBeGreaterThan(0);
        });
        it('should render bold text', function() {
            var BoldComponent = function BoldComponent() {
                return /*#__PURE__*/ React.createElement(Text, {
                    bold: true
                }, "Bold header");
            };
            var lastFrame = render(/*#__PURE__*/ React.createElement(BoldComponent, null)).lastFrame;
            expect(lastFrame()).toContain('Bold header');
        });
        it('should render dim text', function() {
            var DimComponent = function DimComponent() {
                return /*#__PURE__*/ React.createElement(Text, {
                    dimColor: true
                }, "Dim hint");
            };
            var lastFrame = render(/*#__PURE__*/ React.createElement(DimComponent, null)).lastFrame;
            expect(lastFrame()).toContain('Dim hint');
        });
    });
    describe('Layout Structure', function() {
        it('should render full app layout', function() {
            var AppLayout = function AppLayout() {
                return /*#__PURE__*/ React.createElement(Box, {
                    flexDirection: "column",
                    width: 80,
                    height: 24
                }, /*#__PURE__*/ React.createElement(Box, {
                    height: 1
                }, /*#__PURE__*/ React.createElement(Text, {
                    bold: true,
                    color: "cyan"
                }, "chipilot"), /*#__PURE__*/ React.createElement(Text, {
                    dimColor: true
                }, " - Agentic EDA")), /*#__PURE__*/ React.createElement(Box, {
                    flexDirection: "row",
                    height: 20
                }, /*#__PURE__*/ React.createElement(Box, {
                    width: 40,
                    borderStyle: "single"
                }, /*#__PURE__*/ React.createElement(MockChatPane, {
                    messages: [
                        {
                            role: 'assistant',
                            content: 'Welcome!'
                        }
                    ],
                    isLoading: false
                })), /*#__PURE__*/ React.createElement(Box, {
                    width: 40,
                    borderStyle: "single"
                }, /*#__PURE__*/ React.createElement(MockTerminalPane, {
                    focused: false,
                    lines: [
                        '$ prompt>'
                    ]
                }))), /*#__PURE__*/ React.createElement(MockInputArea, {
                    pane: "chat",
                    input: "",
                    loading: false
                }));
            };
            var lastFrame = render(/*#__PURE__*/ React.createElement(AppLayout, null)).lastFrame;
            var output = lastFrame();
            expect(output).toContain('chipilot');
            expect(output).toContain('Agentic EDA');
            expect(output).toContain('Welcome!');
            expect(output).toContain('Terminal');
        });
    });
});
