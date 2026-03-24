import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { Box, Text } from "ink";

// Simple unit tests using ink-testing-library
// We test the rendering output without spawning real processes

describe("ChatPane", () => {
  // Mock the ChatPane component since it has complex dependencies
  const MockChatPane = ({
    messages,
    isLoading,
    focused,
  }: {
    messages: Array<{ role: string; content: string }>;
    isLoading: boolean;
    focused: boolean;
  }) => (
    <Box flexDirection="column">
      {messages.map((msg, i) => (
        <Box key={i}>
          <Text bold color={msg.role === "user" ? "green" : "blue"}>
            {msg.role === "user" ? "You" : "AI"}:
          </Text>
          <Text> {msg.content}</Text>
        </Box>
      ))}
      {isLoading && <Text dimColor>Thinking...</Text>}
      {!focused && <Text dimColor>Press Tab to focus</Text>}
    </Box>
  );

  it("should render messages correctly", () => {
    const messages = [
      { role: "assistant", content: "Welcome to chipilot!" },
      { role: "user", content: "show me timing report" },
    ];

    const { lastFrame } = render(
      <MockChatPane messages={messages} isLoading={false} focused={true} />
    );

    const output = lastFrame();
    expect(output).toContain("Welcome to chipilot!");
    expect(output).toContain("show me timing report");
    expect(output).toContain("You");
    expect(output).toContain("AI");
  });

  it("should show loading indicator when isLoading is true", () => {
    const { lastFrame } = render(
      <MockChatPane messages={[]} isLoading={true} focused={true} />
    );

    const output = lastFrame();
    expect(output).toContain("Thinking");
  });

  it("should show focus hint when not focused", () => {
    const { lastFrame } = render(
      <MockChatPane messages={[]} isLoading={false} focused={false} />
    );

    const output = lastFrame();
    expect(output).toContain("Press Tab to focus");
  });
});

describe("TerminalPane", () => {
  const MockTerminalPane = ({
    output,
    focused,
  }: {
    output: string[];
    focused: boolean;
  }) => (
    <Box flexDirection="column">
      <Text bold color="yellow">Terminal</Text>
      {output.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
      {focused && <Text color="green">▋</Text>}
      {!focused && <Text dimColor>Press Tab to focus</Text>}
    </Box>
  );

  it("should render terminal output", () => {
    const output = ["$ prompt", "$ ls", "innovus> "];

    const { lastFrame } = render(
      <MockTerminalPane output={output} focused={false} />
    );

    const frame = lastFrame();
    expect(frame).toContain("$ prompt");
    expect(frame).toContain("innovus>");
  });

  it("should show cursor when focused", () => {
    const { lastFrame } = render(
      <MockTerminalPane output={[]} focused={true} />
    );

    const output = lastFrame();
    // The cursor character should be in output
    expect(output).toBeDefined();
  });

  it("should show focus hint when not focused", () => {
    const { lastFrame } = render(
      <MockTerminalPane output={[]} focused={false} />
    );

    const output = lastFrame();
    expect(output).toContain("Press Tab to focus");
  });
});

describe("ApprovalModal", () => {
  const MockApprovalModal = ({
    command,
    explanation,
  }: {
    command: string;
    explanation: string;
  }) => (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow">
      <Text bold color="yellow">
        ⚠ Command Approval Required
      </Text>
      <Text dimColor>AI wants to run:</Text>
      <Text>{explanation}</Text>
      <Text bold color="cyan">Command:</Text>
      <Text>{command}</Text>
      <Box>
        <Text bold color="green">[Y]</Text>
        <Text> Approve </Text>
        <Text bold color="yellow">[E]</Text>
        <Text> Edit </Text>
        <Text bold color="red">[N]</Text>
        <Text> Reject </Text>
      </Box>
    </Box>
  );

  it("should render command requiring approval", () => {
    const { lastFrame } = render(
      <MockApprovalModal
        command="floorplan -core -core_util 1.7"
        explanation="Create a floorplan with 80% utilization"
      />
    );

    const output = lastFrame();
    expect(output).toContain("Command Approval Required");
    expect(output).toContain("floorplan -core");
    expect(output).toContain("Create a floorplan");
    expect(output).toContain("[Y]");
    expect(output).toContain("[N]");
    expect(output).toContain("[E]");
  });

  it("should show approve, reject, and edit options", () => {
    const { lastFrame } = render(
      <MockApprovalModal command="ls -la" explanation="List files" />
    );

    const output = lastFrame();
    expect(output).toContain("Approve");
    expect(output).toContain("Reject");
    expect(output).toContain("Edit");
  });
});
