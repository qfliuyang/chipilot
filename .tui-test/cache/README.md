# chipilot-cli

Agentic EDA Design Platform for Chip Designers.

An AI-powered CLI tool that helps physical design engineers work with commercial EDA tools (Cadence, Synopsys) through natural language.

## Features

- **Two-pane TUI**: AI chat on the left, controllable terminal on the right
- **Human-in-the-loop**: AI suggests commands, you approve before execution
- **Multi-vendor support**: Works with Cadence (Innovus, Genus) and Synopsys (ICC2, DC)
- **Multi-LLM**: Supports Claude, OpenAI, and local models
- **Knowledge base**: Understands EDA tools, Tcl scripting, and physical design concepts

## Installation

```bash
npm install -g chipilot-cli
```

## Usage

Start the interactive TUI:

```bash
chipilot
```

Generate Tcl scripts:

```bash
chipilot generate "create a floorplan with 80% utilization" --tool innovus
```

Analyze reports:

```bash
chipilot analyze timing_report.txt
```

## Configuration

Set up your API key:

```bash
export CHIPILOT_ANTHROPIC_API_KEY=your-key-here
# or
export CHIPILOT_OPENAI_API_KEY=your-key-here
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Run tests
npm test
```

## License

MIT
