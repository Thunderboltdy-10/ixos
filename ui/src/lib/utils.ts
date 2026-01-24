import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a file path for display
 */
export function formatPath(path: string, maxLength = 50): string {
  if (path.length <= maxLength) return path;

  // Try to show the end of the path
  const parts = path.split(/[\\/]/);
  let result = parts[parts.length - 1]; // filename

  for (let i = parts.length - 2; i >= 0; i--) {
    const newResult = parts[i] + '/' + result;
    if (newResult.length > maxLength - 3) {
      return '...' + result;
    }
    result = newResult;
  }

  return result;
}

/**
 * Format a score as percentage
 */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get color class for score value
 */
export function getScoreColor(score: number): string {
  if (score >= 0.8) return 'text-secure';
  if (score >= 0.5) return 'text-warning';
  return 'text-danger';
}

/**
 * Get background color class for score value
 */
export function getScoreBgColor(score: number): string {
  if (score >= 0.8) return 'bg-secure';
  if (score >= 0.5) return 'bg-warning';
  return 'bg-danger';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Get file icon based on extension
 */
export function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const icons: Record<string, string> = {
    // Documents
    pdf: 'file-text',
    doc: 'file-text',
    docx: 'file-text',
    txt: 'file-text',
    md: 'file-text',
    // Code
    js: 'file-code',
    ts: 'file-code',
    jsx: 'file-code',
    tsx: 'file-code',
    py: 'file-code',
    rs: 'file-code',
    go: 'file-code',
    java: 'file-code',
    // Data
    json: 'file-json',
    xml: 'file-code',
    yaml: 'file-code',
    yml: 'file-code',
    toml: 'file-code',
    // Images
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    svg: 'image',
  };

  return icons[ext || ''] || 'file';
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null) return '';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  // Use 0 decimals for bytes, 1 decimal for others
  const decimals = unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * Format Unix timestamp as relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(timestamp: number | undefined): string {
  if (timestamp === undefined || timestamp === null) return '';

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 0) return 'just now';

  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return 'just now';
  if (diff < hour) {
    const mins = Math.floor(diff / minute);
    return `${mins}m ago`;
  }
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h ago`;
  }
  if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days}d ago`;
  }
  if (diff < month) {
    const weeks = Math.floor(diff / week);
    return `${weeks}w ago`;
  }
  if (diff < year) {
    const months = Math.floor(diff / month);
    return `${months}mo ago`;
  }

  const years = Math.floor(diff / year);
  return `${years}y ago`;
}

/**
 * Get file type icon name based on extension
 */
export function getFileTypeIcon(extension: string | undefined): string {
  if (!extension) return 'file-text';

  const ext = extension.toLowerCase();

  // Code files
  if (['rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp'].includes(ext)) return 'file-code-2';
  if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext)) return 'file-code';
  if (['py', 'pyw', 'pyx'].includes(ext)) return 'file-code';
  if (['rb', 'erb'].includes(ext)) return 'file-code';
  if (['php', 'phtml'].includes(ext)) return 'file-code';
  if (['cs', 'vb', 'fs'].includes(ext)) return 'file-code';
  if (['swift', 'kt', 'kts'].includes(ext)) return 'file-code';
  if (['sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd'].includes(ext)) return 'terminal';

  // Config/data files
  if (['json', 'jsonc', 'json5'].includes(ext)) return 'file-json';
  if (['yaml', 'yml'].includes(ext)) return 'file-cog';
  if (['toml', 'ini', 'cfg', 'conf'].includes(ext)) return 'file-cog';
  if (['xml', 'xsl', 'xslt'].includes(ext)) return 'file-code';
  if (['csv', 'tsv'].includes(ext)) return 'file-spreadsheet';

  // Documents
  if (['md', 'markdown', 'mdx'].includes(ext)) return 'file-text';
  if (['txt', 'text', 'log'].includes(ext)) return 'file-text';
  if (['pdf'].includes(ext)) return 'file-text';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'file-text';

  // Web
  if (['html', 'htm', 'xhtml'].includes(ext)) return 'file-code';
  if (['css', 'scss', 'sass', 'less'].includes(ext)) return 'file-code';
  if (['vue', 'svelte'].includes(ext)) return 'file-code';

  return 'file-text';
}
