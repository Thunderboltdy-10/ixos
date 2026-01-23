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
