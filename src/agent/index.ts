import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "../tui/App.js";
import { AgentRecorder } from "../agents/AgentRecorder.js";

export interface AgentOptions {
  provider: string;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  systemPrompt?: string;
  recorder?: AgentRecorder;
  agentId?: string;
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

When the user asks about EDA tool operations (placement, routing, timing analysis, etc.),
ALWAYS include the specific TCL command they should run in an execute block like this:

\`\`\`execute
<tcl command to run>
\`\`\`

For example, if asked about placement optimization, include:
\`\`\`execute
optDesign -preCTS
\`\`\`

You have deep knowledge of:
- Physical design concepts (floorplanning, placement, routing, timing closure)
- Tcl scripting for EDA tools
- File formats (LIB, LEF, DEF, SDC, SPEF)
- Common EDA workflows and best practices

Be concise but thorough. Explain your reasoning when suggesting commands.`;

export class Agent {
  private provider: string;
  private model: string;
  private client: Anthropic | null = null;
  private conversationHistory: Anthropic.MessageParam[] = [];
  private recorder?: AgentRecorder;
  private agentId: string;

  constructor(options: AgentOptions) {
    this.provider = options.provider;
    this.model = options.model || this.getDefaultModel();
    this.recorder = options.recorder;
    this.agentId = options.agentId || "unknown-agent";

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
    // Check for environment variable override
    const envModel = process.env.CHIPILOT_MODEL;
    if (envModel) {
      return envModel;
    }
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
      throw new Error(
        "Anthropic client not initialized. Please set CHIPILOT_ANTHROPIC_API_KEY environment variable."
      );
    }

    try {
      // Record LLM call
      const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
      let prompt = "";
      if (lastMessage?.content) {
        if (typeof lastMessage.content === "string") {
          prompt = lastMessage.content;
        } else if (Array.isArray(lastMessage.content)) {
          // Extract text from content blocks
          prompt = lastMessage.content
            .filter((block): block is { type: "text"; text: string } =>
              typeof block === "object" && block !== null && "type" in block && block.type === "text"
            )
            .map((block) => block.text)
            .join("\n");
        }
      }
      this.recorder?.recordLLMCall(this.agentId, prompt, this.model);

      const startTime = Date.now();
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: this.conversationHistory,
      });
      const duration = Date.now() - startTime;

      // Record LLM response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      const message = textBlocks.map((b) => b.text).join("\n");

      // Record the response with token usage
      this.recorder?.recordLLMResponse(
        this.agentId,
        message,
        {
          input: response.usage?.input_tokens || 0,
          output: response.usage?.output_tokens || 0,
        },
        undefined,
        duration
      );

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
      // Record the error
      this.recorder?.recordError(this.agentId, errorMessage);
      // Re-throw the error - NEVER return fake responses
      throw error;
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

export default Agent;
