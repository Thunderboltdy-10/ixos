"use client";

import { useState, useCallback, useRef } from 'react';

/**
 * Demo queries to auto-cycle through
 */
export const DEMO_QUERIES = [
  { query: "quarterly revenue report", expectedFile: "Q4_2025_Summary.pdf" },
  { query: "that email about the denver trip", expectedFile: "flight_confirmation.eml" },
  { query: "api authentication docs", expectedFile: "auth_api_reference.md" },
  { query: "project meeting notes from last week", expectedFile: "team_standup_notes.md" },
  { query: "photo from the beach vacation", expectedFile: "IMG_2847_sunset.jpg" },
];

export interface DemoFile {
  filename: string;
  directory: string;
  score: number;
  snippet: string;
  tags: string[];
}

/**
 * Demo files covering various categories
 */
export const DEMO_FILES: DemoFile[] = [
  // Finance
  {
    filename: "Q4_2025_Summary.pdf",
    directory: "Documents/Finance",
    score: 0.94,
    snippet: "Quarterly revenue increased 23% YoY with strong growth in enterprise segment...",
    tags: ["finance", "report", "quarterly", "revenue"]
  },
  {
    filename: "expense_report_jan.xlsx",
    directory: "Documents/Finance",
    score: 0.78,
    snippet: "Travel expenses for Q1 planning meeting in Seattle...",
    tags: ["finance", "expense", "travel"]
  },
  {
    filename: "budget_2025.xlsx",
    directory: "Documents/Finance",
    score: 0.72,
    snippet: "Annual budget allocation for engineering team...",
    tags: ["finance", "budget", "planning"]
  },

  // Email
  {
    filename: "flight_confirmation.eml",
    directory: "Mail/Travel",
    score: 0.91,
    snippet: "Your flight to Denver on March 15 has been confirmed. Confirmation #DEN2847...",
    tags: ["email", "travel", "denver", "flight"]
  },
  {
    filename: "hotel_booking.eml",
    directory: "Mail/Travel",
    score: 0.85,
    snippet: "Reservation confirmed at Denver Marriott Downtown...",
    tags: ["email", "travel", "hotel", "denver"]
  },

  // Code/Docs
  {
    filename: "auth_api_reference.md",
    directory: "Projects/ixos/docs",
    score: 0.93,
    snippet: "## Authentication\nUse JWT tokens for API authentication. Include token in Authorization header...",
    tags: ["api", "auth", "docs", "code"]
  },
  {
    filename: "README.md",
    directory: "Projects/ixos",
    score: 0.71,
    snippet: "# Ixos Protocol\nPrivacy-first semantic file search with zero cloud dependency...",
    tags: ["readme", "docs", "project"]
  },
  {
    filename: "database_schema.sql",
    directory: "Projects/backend",
    score: 0.68,
    snippet: "CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR(255) UNIQUE...",
    tags: ["database", "sql", "schema"]
  },

  // Notes
  {
    filename: "team_standup_notes.md",
    directory: "Notes/Work",
    score: 0.88,
    snippet: "## Monday Standup\n- Sprint progress: 70% complete\n- Blockers: Waiting on design review...",
    tags: ["meeting", "notes", "team", "standup"]
  },
  {
    filename: "project_ideas.md",
    directory: "Notes/Personal",
    score: 0.65,
    snippet: "Ideas for side projects:\n1. AI-powered file organizer\n2. Local-first notes app...",
    tags: ["notes", "ideas", "projects"]
  },

  // Photos
  {
    filename: "IMG_2847_sunset.jpg",
    directory: "Photos/Vacation/Beach",
    score: 0.89,
    snippet: "Beach sunset photo from August trip to California coast",
    tags: ["photo", "beach", "vacation", "sunset"]
  },
  {
    filename: "IMG_3012_family.jpg",
    directory: "Photos/Vacation/Beach",
    score: 0.72,
    snippet: "Family group photo on the beach boardwalk",
    tags: ["photo", "family", "beach", "vacation"]
  },

  // Contracts/Legal
  {
    filename: "NDA_TechCorp_2024.pdf",
    directory: "Documents/Legal",
    score: 0.75,
    snippet: "Non-Disclosure Agreement between Party A and TechCorp Inc...",
    tags: ["legal", "nda", "contract"]
  },

  // Presentations
  {
    filename: "product_roadmap.pptx",
    directory: "Work/Presentations",
    score: 0.82,
    snippet: "Q2 Product Roadmap - New features and timeline...",
    tags: ["presentation", "roadmap", "product"]
  },
];

/**
 * Simple fuzzy matching for demo purposes
 */
function fuzzyMatch(query: string, file: DemoFile): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searchable = [
    file.filename.toLowerCase(),
    file.directory.toLowerCase(),
    file.snippet.toLowerCase(),
    ...file.tags.map(t => t.toLowerCase())
  ].join(' ');

  let score = 0;
  let matchedTerms = 0;

  for (const term of queryTerms) {
    if (searchable.includes(term)) {
      score += 0.18;
      matchedTerms++;
    }
    // Bonus for filename match
    if (file.filename.toLowerCase().includes(term)) {
      score += 0.12;
    }
    // Bonus for tag match
    if (file.tags.some(t => t.toLowerCase().includes(term))) {
      score += 0.08;
    }
  }

  // Boost if most query terms matched
  if (queryTerms.length > 0 && matchedTerms / queryTerms.length > 0.5) {
    score += 0.15;
  }

  return Math.min(score, 0.98);
}

/**
 * Delay helper
 */
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Hook for fake search functionality
 */
export function useFakeSearch() {
  const [results, setResults] = useState<DemoFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<boolean>(false);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    // Cancel previous search
    abortRef.current = true;
    await delay(30);
    abortRef.current = false;

    setIsSearching(true);
    setResults([]);

    // Simulate initial delay
    await delay(180);
    if (abortRef.current) return;

    // Score all files
    const scored = DEMO_FILES
      .map(f => ({ ...f, score: fuzzyMatch(query, f) }))
      .filter(f => f.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Stream results progressively (like real Ixos)
    for (const match of scored) {
      if (abortRef.current) return;
      await delay(100 + Math.random() * 80);
      setResults(prev => [...prev, match]);
    }

    setIsSearching(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setResults([]);
    setIsSearching(false);
  }, []);

  return { search, results, isSearching, reset };
}
