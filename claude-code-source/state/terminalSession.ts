import { TerminalSession } from '../components/Terminal/TerminalSession.js';

// Singleton instance of TerminalSession
const terminalSession = new TerminalSession(
  {
    shell: process.env.SHELL || '/bin/bash',
    cwd: process.cwd(),
  },
  true // restartOnExit
);

// Start the session
terminalSession.start();

// Cleanup on process exit
process.on('exit', () => {
  terminalSession.destroy();
});

// Cleanup on SIGINT
process.on('SIGINT', () => {
  terminalSession.destroy();
  process.exit(0);
});

// Cleanup on SIGTERM
process.on('SIGTERM', () => {
  terminalSession.destroy();
  process.exit(0);
});

export { terminalSession };
export default terminalSession;
