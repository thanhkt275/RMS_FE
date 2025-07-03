import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names and merges tailwind classes correctly
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date as a string
 * @param date - The date to format
 * @param includeTime - Whether to include the time in the output
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null, includeTime = false): string {
  if (!date) return "N/A";
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return dateObj.toLocaleDateString(undefined, options);
}

/**
 * Formats a date as a time string (HH:MM)
 */
export function formatTime(date: Date | string | null): string {
  if (!date) return "N/A";
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid Time";
  }

  return dateObj.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncates a string to a certain length
 */
export function truncate(str: string, length: number): string {
  if (!str) return "";
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

/**
 * Format a date to show relative time (e.g. "5m ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Formats a date range as a string (e.g. Jun 1, 2025 - Jun 3, 2025)
 */
export function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString(undefined, opts);
  return `${s.toLocaleDateString(undefined, opts)} - ${e.toLocaleDateString(undefined, opts)}`;
}

/**
 * Formats a time in ms as mm:ss (e.g. 02:30)
 */
export function formatTimeMsPad(ms: number): string {
  if (typeof ms !== 'number' || isNaN(ms)) return '--:--';
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Utility functions for audience display
export function formatTimeMs(ms: number): string {
  if (typeof ms !== "number" || isNaN(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function injectTextShadowStyle() {
  if (typeof document !== "undefined") {
    const styleId = "audience-text-shadow-style";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .text-shadow-xl {
          text-shadow: 0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3);
        }
      `;
      document.head.appendChild(styleEl);
    }
  }
}

/**
 * Get the color for a match status badge
 */
export function getMatchStatusColor(status: string): string {
  switch (status) {
    case "PENDING":
      return "#6b7280"; // gray-500
    case "IN_PROGRESS":
      return "#f59e0b"; // amber-500
    case "COMPLETED":
      return "#10b981"; // emerald-500
    default:
      return "#6b7280"; // gray-500
  }
}
