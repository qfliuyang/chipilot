import * as pty from "node-pty";
import { EventEmitter } from "events";

export interface TerminalSessionOptions {
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

export class TerminalSession extends EventEmitter {
  private ptyProcess: pty.IPty | null = null;
  private shell: string;
  private cwd: string;
  private env: Record<string, string>;
  private cols: number;
  private rows: number;
  private started = false;

  constructor(options: TerminalSessionOptions = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || "/bin/bash";
    this.cwd = options.cwd || process.cwd();
    this.cols = options.cols || 80;
    this.rows = options.rows || 24;
    this.env = {
      ...process.env,
      TERM: "xterm-256color",
      ...options.env,
    };
  }

  start(): void {
    if (this.started) {
      return;
    }

    // Use interactive flag to prevent shell from exiting immediately with SIGHUP
    // Extract the shell name from the path (e.g., "/bin/zsh" -> "zsh")
    const shellName = this.shell.split('/').pop() || this.shell;
    const shellArgs = shellName === 'zsh' ? ['-i'] :
                      shellName === 'bash' ? ['-i'] :
                      [];  // fallback for other shells

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

      // Auto-restart unless explicitly killed
      if (signal !== "SIGKILL" && signal !== "SIGTERM") {
        console.log(`[TerminalSession] Shell exited (code: ${exitCode}, signal: ${signal}), restarting...`);
        setTimeout(() => this.start(), 100);
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
