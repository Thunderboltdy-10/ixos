// Pablo will confirm the repository before publishing the site.
export const RELEASES_URL =
  "https://github.com/Thunderboltdy-10/ixos/releases";
export const REPOSITORY_URL = RELEASES_URL.replace(/\/releases$/, "");
export const CLI_INSTALL_COMMANDS = {
  windows: {
    label: "Windows",
    shell: "PowerShell",
    command: "cargo install --path crates/ixos-cli --locked",
  },
  macos: {
    label: "macOS",
    shell: "Terminal",
    command: "cargo install --path crates/ixos-cli --locked",
  },
  linux: {
    label: "Linux",
    shell: "Terminal",
    command: "cargo install --path crates/ixos-cli --locked",
  },
};
export type InstallOs = keyof typeof CLI_INSTALL_COMMANDS;
