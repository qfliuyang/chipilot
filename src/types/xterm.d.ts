declare module "xterm-headless" {
  const xterm: {
    Terminal: typeof import("./xterm-modules.js").Terminal;
  };
  export default xterm;
}

declare module "xterm-addon-serialize" {
  const addon: {
    SerializeAddon: typeof import("./xterm-modules.js").SerializeAddon;
  };
  export default addon;
}
