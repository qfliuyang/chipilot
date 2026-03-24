import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface ApprovalModalProps {
  command: string;
  explanation: string;
  onApprove: (command: string, edited: boolean) => void;
  onReject: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  command,
  explanation,
  onApprove,
  onReject,
}) => {
  const [mode, setMode] = useState<"confirm" | "edit">("confirm");
  const [editedCommand, setEditedCommand] = useState(command);

  useInput((input, key) => {
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

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      padding={1}
      position="absolute"
      width={80}
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          ⚠ Command Approval Required
        </Text>
      </Box>

      {/* Explanation */}
      <Box marginBottom={1} flexDirection="column">
        <Text dimColor>AI wants to run:</Text>
        <Text color="gray">{explanation}</Text>
      </Box>

      {/* Command display */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          Command:
        </Text>
        {mode === "confirm" ? (
          <Text color="white">{command}</Text>
        ) : (
          <Box>
            <TextInput
              value={editedCommand}
              onChange={setEditedCommand}
              showCursor={true}
            />
          </Box>
        )}
      </Box>

      {/* Actions */}
      {mode === "confirm" ? (
        <Box justifyContent="center">
          <Box marginRight={4}>
            <Text bold color="green">
              [Y]
            </Text>
            <Text> Approve </Text>
          </Box>
          <Box marginRight={4}>
            <Text bold color="yellow">
              [E]
            </Text>
            <Text> Edit </Text>
          </Box>
          <Box>
            <Text bold color="red">
              [N]
            </Text>
            <Text> Reject </Text>
          </Box>
        </Box>
      ) : (
        <Box justifyContent="center">
          <Text dimColor>Press Enter to execute edited command, Esc to cancel</Text>
        </Box>
      )}
    </Box>
  );
};

export default ApprovalModal;
