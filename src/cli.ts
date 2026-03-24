#!/usr/bin/env node

import { program } from "commander";
import { runChipilot } from "./tui/App.js";

program
  .name("chipilot")
  .description("Agentic EDA design platform for chip designers")
  .version("0.1.0")
  .option("-p, --provider <provider>", "LLM provider (anthropic, openai, ollama)", "anthropic")
  .option("-m, --model <model>", "Model to use")
  .option("-k, --api-key <key>", "API key for the provider")
  .option("-u, --base-url <url>", "Base URL for the API endpoint")
  .option("-d, --debug", "Enable debug mode", false)
  .action(async (options) => {
    try {
      await runChipilot({
        provider: options.provider,
        model: options.model,
        apiKey: options.apiKey,
        baseURL: options.baseUrl,
        debug: options.debug,
      });
    } catch (error) {
      console.error("Fatal error:", error);
      process.exit(1);
    }
  });

// Subcommands for non-interactive use
program
  .command("generate")
  .description("Generate Tcl script from natural language")
  .argument("<prompt>", "What to generate")
  .option("-t, --tool <tool>", "Target tool (innovus, genus, icc2, dc)")
  .action(async (prompt, options) => {
    console.log("Generate command - TODO");
    console.log(`Prompt: ${prompt}`);
    console.log(`Tool: ${options.tool || "auto-detect"}`);
  });

program
  .command("analyze")
  .description("Analyze a report or log file")
  .argument("<file>", "File to analyze")
  .action(async (file, options) => {
    console.log("Analyze command - TODO");
    console.log(`File: ${file}`);
  });

program.parse();
