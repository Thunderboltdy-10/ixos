import type { Choice } from "./Picker";

/** What the main window's pickers offer, so the website pictures the same menus. */
export const PROFILE_CHOICES: Choice<"auto" | "code" | "documents">[] = [
  { value: "auto", label: "Automatic", detail: "Picks code or documents from what the folders contain" },
  { value: "code", label: "Code", detail: "Source files in any language" },
  { value: "documents", label: "Documents", detail: "PDFs, Word files, notes and text" },
];

export const CACHE_CHOICES: Choice<boolean>[] = [
  { value: true, label: "Saved", detail: "Keeps a small record on each file, so the next search is fast" },
  { value: false, label: "Fresh", detail: "Reads every file each time and writes nothing" },
];
