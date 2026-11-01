import assets from "../../../../packages/releases/desktop-assets.json";
import { version } from "../../../desktop/src-tauri/tauri.conf.json";
import { GITHUB } from "./github";

export type DesktopTarget = keyof typeof assets;
// Pin the desktop version so a newer engine release cannot change these targets.
const release = `${GITHUB}/releases/download/desktop-v${version}`;
export const downloadUrl = (target: DesktopTarget) => `${release}/${assets[target].download}`;
export const LINUX_APPIMAGE = `${release}/${assets["Linux-X64"].update}`;
