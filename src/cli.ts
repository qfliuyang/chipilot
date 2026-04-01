#!/usr/bin/env node
// Polyfill MUST be loaded first before xterm imports
import "./terminal/xterm-polyfill.js";

import { runApp } from "./tui/App.js";

runApp();
