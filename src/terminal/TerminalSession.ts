import * as pty from "node-pty";
import { EventEmitter } from "events";

export interface TerminalSessionOptions {
  shell?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

export class TerminalSession extends EventEmitter {
  private ptyProcess: pty.IPty | null = null;
  private shell: string;
  private args: string[];
  private cwd: string;
  private env: Record<string, string>;
  private cols: number;
  private rows: number;
  private started = false;
  private restartOnExit: boolean;

  constructor(options: TerminalSessionOptions = {}, restartOnExit = true) {
    super();
    this.shell = options.shell || process.env.SHELL || "/bin/bash";
    this.args = options.args || [];
    this.cwd = options.cwd || process.cwd();
    this.cols = options.cols || 80;
    this.rows = options.rows || 24;
    this.restartOnExit = restartOnExit;
    this.env = {
      ...process.env,
      TERM: "xterm-256color",
      ...options.env,
    } as Record<string, string>;
  }

  start(): void {
    if (this.started) {
      return;
    }

    // Determine shell args
    let shellArgs: string[];
    if (this.args) {
      // Use provided args
      shellArgs = this.args;
    } else if (this.shell.includes("zsh") || this.shell.includes("bash")) {
      // Interactive mode for shells to prevent SIGHUP issues
      shellArgs = ["-i"];
    } else {
      shellArgs = [];
    }

    this.ptyProcess = pty.spawn(this.shell, shellArgs, {
      name: "xterm-256color",
      cols: this.cols,
      rows: this.rows,
      cwd: this.cwd,
      env: this.env,
    });

    this.ptyProcess.onData((data: string) => {
      this.emit("output", data);
    });

    this.ptyProcess.onExit(({ exitCode, signal }) => {
      this.emit("exit", { exitCode, signal });
      this.ptyProcess = null;
      this.started = false;

      // Auto-restart unless killed with SIGKILL (9) or SIGTERM (15)
      if (this.restartOnExit && signal !== 9 && signal !== 15) {
        this.start();
      }
    });

    this.started = true;
    this.emit("started");
  }

  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  execute(command: string): void {
    if (this.ptyProcess) {
      // Add newline to execute the command
      this.ptyProcess.write(command + "\r");
    }
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  destroy(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    this.started = false;
    this.removeAllListeners();
  }

  isRunning(): boolean {
    return this.started && this.ptyProcess !== null;
  }

  getShell(): string {
    return this.shell;
  }
}

export default TerminalSession;
