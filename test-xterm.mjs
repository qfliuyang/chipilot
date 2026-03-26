import pkg from 'xterm-headless';
const { Terminal } = pkg;
console.log('SUCCESS: Terminal type:', typeof Terminal);

const term = new Terminal({ cols: 80, rows: 24 });
console.log('Terminal created:', term.cols, 'x', term.rows);
