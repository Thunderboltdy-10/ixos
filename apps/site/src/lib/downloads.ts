import assets from "../../../../packages/releases/desktop-assets.json";
import { GITHUB } from "./github";

export type DesktopTarget = keyof typeof assets;
// These always point at the newest published release.
export const downloadUrl = (target: DesktopTarget) => `${GITHUB}/releases/latest/download/${assets[target]}`;
