// GitHub Releases configuration
const BASE_URL = "https://github.com/IxosProtocol/ixos-releases/releases/latest/download";

export const DOWNLOADS = {
  "windows-x64": `${BASE_URL}/ixos-setup.exe`,
  "macos-arm64": `${BASE_URL}/ixos-aarch64.dmg`,
  "macos-x64": `${BASE_URL}/ixos-x64.dmg`,
  "linux-x64": `${BASE_URL}/ixos.AppImage`,
} as const;

export type DownloadPlatform = keyof typeof DOWNLOADS;
export type InstallOs = "windows" | "macos" | "linux";

export const CLI_INSTALL_COMMANDS: Record<InstallOs, { label: string; shell: string; command: string }> = {
  windows: {
    label: "Windows",
    shell: "PowerShell",
    command: "irm https://github.com/IxosProtocol/ixos-releases/releases/latest/download/install.ps1 | iex",
  },
  macos: {
    label: "macOS / Linux",
    shell: "bash / zsh",
    command: "curl -fsSL https://github.com/IxosProtocol/ixos-releases/releases/latest/download/install.sh | bash",
  },
  linux: {
    label: "macOS / Linux",
    shell: "bash / zsh / fish",
    command: "curl -fsSL https://github.com/IxosProtocol/ixos-releases/releases/latest/download/install.sh | bash",
  },
};

export const CLI_INSTALL_LOCATIONS: Record<InstallOs, string> = {
  windows: "%LOCALAPPDATA%\\IxosCLI\\bin\\ixos.exe",
  macos: "~/.ixos/cli/bin/ixos",
  linux: "~/.ixos/cli/bin/ixos",
};

type UaData = {
  platform?: string;
  architecture?: string;
};

function getNavigatorSignals() {
  if (typeof navigator === "undefined") {
    return { platform: "", arch: "", userAgent: "" };
  }

  const nav = navigator as Navigator & { userAgentData?: UaData };
  return {
    platform: (nav.userAgentData?.platform || navigator.platform || "").toLowerCase(),
    arch: (nav.userAgentData?.architecture || "").toLowerCase(),
    userAgent: navigator.userAgent.toLowerCase(),
  };
}

export function detectDesktopPlatform(): DownloadPlatform {
  const { platform, arch, userAgent } = getNavigatorSignals();

  if (platform.includes("mac") || userAgent.includes("mac os")) {
    const armSignal =
      arch.includes("arm") ||
      arch.includes("aarch64") ||
      userAgent.includes("arm64") ||
      userAgent.includes("aarch64") ||
      userAgent.includes("apple silicon");
    return armSignal ? "macos-arm64" : "macos-x64";
  }

  if (platform.includes("linux") || userAgent.includes("linux")) {
    return "linux-x64";
  }

  return "windows-x64";
}

export function detectInstallOs(): InstallOs {
  const desktop = detectDesktopPlatform();
  if (desktop.startsWith("macos")) return "macos";
  if (desktop.startsWith("linux")) return "linux";
  return "windows";
}

export function getDownloadUrl(platform: DownloadPlatform): string {
  return DOWNLOADS[platform];
}
