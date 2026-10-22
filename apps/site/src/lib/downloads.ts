export const RELEASES_URL =
  "https://github.com/Thunderboltdy-10/ixos/releases";
export const REPOSITORY_URL = RELEASES_URL.replace(/\/releases$/, "");
export const CLI_INSTALL_COMMANDS = {
  windows: {
    label: "Windows",
    shell: "PowerShell",
    command: "./scripts/install-cli.ps1",
  },
  macos: {
    label: "macOS",
    shell: "Terminal",
    command: "sh scripts/install-cli.sh",
  },
  linux: {
    label: "Linux",
    shell: "Terminal",
    command: "sh scripts/install-cli.sh",
  },
};
export type InstallOs = keyof typeof CLI_INSTALL_COMMANDS;
