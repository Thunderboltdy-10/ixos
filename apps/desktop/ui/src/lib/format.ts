const number = new Intl.NumberFormat("en");

export const count = (value: number) => number.format(value);

export function plural(value: number, word: string) {
  return `${count(value)} ${word}${value === 1 ? "" : "s"}`;
}

export function bytes(value: number) {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[unit]}`;
}

export function large(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} billion`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} million`;
  return count(value);
}

const separator = /[\\/]/;

export function folderName(path: string) {
  return path.split(separator).filter(Boolean).pop() ?? path;
}

/** Folder of a result, relative to the chosen location that contains it. */
export function relativeDir(path: string, locations: string[]) {
  const normal = (value: string) => value.replace(/\\/g, "/").toLowerCase();
  const target = normal(path);
  const root = locations
    .filter((location) => target.startsWith(normal(location).replace(/\/?$/, "/")))
    .sort((a, b) => b.length - a.length)[0];
  const parts = path.split(separator).filter(Boolean);
  parts.pop();
  if (!root) return parts.slice(-2).join("/");
  const inside = parts.slice(root.split(separator).filter(Boolean).length);
  return [folderName(root), ...inside].join("/");
}

export function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
