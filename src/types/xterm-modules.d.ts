// Type definitions for xterm modules - separate from module declarations to avoid conflicts

export interface ITerminalOptions {
  cols?: number;
  rows?: number;
  cursorBlink?: boolean;
  allowProposedApi?: boolean;
}

export interface IDisposable {
  dispose(): void;
}

export declare class Terminal {
  constructor(options?: ITerminalOptions);
  cols: number;
  rows: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  dispose(): void;
  loadAddon(addon: unknown): void;
}

export declare class SerializeAddon {
  serialize(): string;
}
