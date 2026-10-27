export type Platform = "windows" | "unix";
const RAW = "https://github.com/Thunderboltdy-10/ixos/releases/latest/download";

export function installCommand(platform: Platform, desktop: boolean): string {
  return platform === "windows"
    ? `& ([scriptblock]::Create((irm ${RAW}/install-cli.ps1)))${desktop ? "" : " -NoDesktop"}`
    : `curl -fsSL ${RAW}/install-cli.sh | sh${desktop ? "" : " -s -- --no-desktop"}`;
}

/** Platform tabs fetch the executable directly; agent setup uses the verified script wrapper. */
export function executableCommand(platform: Platform, desktop: boolean): string {
  const args = desktop ? "" : " --no-desktop";
  return platform === "windows"
    ? `curl.exe -fL ${RAW}/ixos-install-Windows-X64.exe -o "$env:TEMP/ixos-install.exe"; if ($LASTEXITCODE -eq 0) { & "$env:TEMP/ixos-install.exe"${args} }`
    : `p=$(mktemp) && curl -fL "${RAW}/ixos-install-$(uname -s)-$(uname -m)" -o "$p" && chmod +x "$p" && "$p"${args}`;
}
