export type Platform = "windows" | "unix";
const RAW = "https://github.com/Thunderboltdy-10/ixos/releases/latest/download";

export function installCommand(platform: Platform): string {
  return platform === "windows"
    ? `& ([scriptblock]::Create((irm ${RAW}/install-cli.ps1))) -NoDesktop`
    : `curl -fsSL ${RAW}/install-cli.sh | sh -s -- --no-desktop`;
}
