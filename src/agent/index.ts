import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "../tui/App.js";

export interface AgentOptions {
  provider: string;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  systemPrompt?: string;
}

export interface AgentContext {
  terminalOutput?: string;
  messages?: Message[];
  cwd?: string;
}

export interface AgentResponse {
  message: string;
  proposedCommand?: {
    command: string;
    explanation: string;
  };
}

const SYSTEM_PROMPT = `You are chipilot, an AI assistant for physical design engineers.
You help users work with EDA tools like Cadence Innovus, Genus, and Synopsys ICC2, DC.

When the user asks you to run a command or perform an action:
1. First explain what you're going to do
2. If it requires running a terminal command, propose it clearly
3. The user will approve before execution

You have deep knowledge of:
- Physical design concepts (floorplanning, placement, routing, timing closure)
- Tcl scripting for EDA tools
- File formats (LIB, LEF, DEF, SDC, SPEF)
- Common EDA workflows and best practices

Be concise but thorough. Explain your reasoning when suggesting commands.

When you want to execute a command, format it like this:
\`\`\`execute
<command to run>
\`\`\`

The system will then ask the user for approval before running it.`;

export class Agent {
  private provider: string;
  private model: string;
  private client: Anthropic | null = null;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor(options: AgentOptions) {
    this.provider = options.provider;
    this.model = options.model || this.getDefaultModel();

    if (options.provider === "anthropic") {
      const apiKey = options.apiKey || process.env.CHIPILOT_ANTHROPIC_API_KEY;
      const baseURL = options.baseURL || process.env.CHIPILOT_ANTHROPIC_BASE_URL;
      if (apiKey) {
        this.client = new Anthropic({
          apiKey,
          ...(baseURL ? { baseURL } : {}),
        });
      }
    }
  }

  private getDefaultModel(): string {
    switch (this.provider) {
      case "anthropic":
        return "claude-sonnet-4-6-20250514";
      case "openai":
        return "gpt-4-turbo";
      default:
        return "claude-sonnet-4-6-20250514";
    }
  }

  async chat(userMessage: string, context: AgentContext): Promise<AgentResponse> {
    // Build context message
    const contextParts: string[] = [];

    if (context.terminalOutput) {
      contextParts.push(`Recent terminal output:\n\`\`\`\n${context.terminalOutput}\n\`\`\``);
    }

    if (context.cwd) {
      contextParts.push(`Current directory: ${context.cwd}`);
    }

    const contextMessage = contextParts.length > 0
      ? `\n\nContext:\n${contextParts.join("\n\n")}`
      : "";

    const fullMessage = userMessage + contextMessage;

    // Add to conversation history
    this.conversationHistory.push({ role: "user", content: fullMessage });

    if (this.provider === "anthropic") {
      return this.chatAnthropic();
    }

    // Fallback for other providers
    return {
      message: `Provider "${this.provider}" is not yet implemented. Please use "anthropic" for now.`,
    };
  }

  private async chatAnthropic(): Promise<AgentResponse> {
    if (!this.client) {
      return {
        message: "Anthropic client not initialized. Please set CHIPILOT_ANTHROPIC_API_KEY environment variable.",
      };
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: this.conversationHistory,
      });

      // Extract text from response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      const message = textBlocks.map((b) => b.text).join("\n");

      // Add to history
      this.conversationHistory.push({ role: "assistant", content: message });

      // Check for proposed commands
      const commandMatch = message.match(/```execute\n([\s\S]*?)\n```/);
      if (commandMatch) {
        const command = commandMatch[1].trim();
        // Extract explanation (text before the command block)
        const explanation = message
          .split("```execute")[0]
          .trim()
          .slice(-200); // Last 200 chars before command

        return {
          message: message.replace(/```execute\n[\s\S]*?\n```/, "").trim(),
          proposedCommand: { command, explanation },
        };
      }

      return { message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        message: `Error calling Claude API: ${errorMessage}`,
      };
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

export default Agent;
