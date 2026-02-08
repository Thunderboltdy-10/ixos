"use client";

import { useState, useCallback, useRef } from 'react';

/**
 * Demo queries to auto-cycle through
 */
export const DEMO_QUERIES = [
  { query: "quarterly revenue report", expectedFile: "Q4_2025_Summary.pdf" },
  { query: "that email about the denver trip", expectedFile: "flight_confirmation.eml" },
  { query: "how does API authentication work", expectedFile: "auth_api_reference.md" },
  { query: "photos from the beach", expectedFile: "IMG_2847_sunset.jpg" },
  { query: "contract with TechCorp", expectedFile: "NDA_TechCorp_2024.pdf" },
  { query: "team meeting notes", expectedFile: "team_standup_notes.md" },
];

export interface DemoFile {
  filename: string;
  directory: string;
  score: number;
  snippet: string;
  tags: string[];
  semanticField: string[];
  fileSize: string;
  modifiedAt: string;
  fileExtension: string;
}

/**
 * Synonym map for semantic bridging
 */
const SYNONYM_MAP: Record<string, string[]> = {
  money: ['finance', 'budget', 'revenue', 'expense', 'cost', 'payment', 'invoice', 'tax'],
  spend: ['expense', 'cost', 'budget', 'payment', 'invoice', 'finance'],
  trip: ['travel', 'flight', 'hotel', 'vacation', 'journey', 'destination'],
  travel: ['trip', 'flight', 'hotel', 'vacation', 'journey', 'booking'],
  meeting: ['standup', 'sync', 'call', 'notes', 'agenda', 'minutes'],
  code: ['api', 'engineering', 'docs', 'schema', 'readme', 'config'],
  auth: ['authentication', 'login', 'jwt', 'token', 'security', 'password'],
  photo: ['image', 'picture', 'screenshot', 'diagram', 'camera', 'vacation'],
  picture: ['photo', 'image', 'screenshot', 'diagram'],
  contract: ['legal', 'nda', 'agreement', 'license', 'compliance'],
  legal: ['contract', 'nda', 'agreement', 'license', 'compliance', 'terms'],
  recipe: ['food', 'cooking', 'kitchen', 'meal', 'ingredients'],
  workout: ['exercise', 'fitness', 'gym', 'health', 'training'],
  database: ['schema', 'sql', 'tables', 'migration', 'query'],
  deploy: ['ci', 'pipeline', 'docker', 'build', 'release'],
  team: ['standup', 'meeting', 'sync', 'collaboration', 'notes'],
  client: ['customer', 'account', 'stakeholder', 'partner'],
  email: ['mail', 'message', 'inbox', 'correspondence', 'newsletter'],
  presentation: ['slides', 'deck', 'pitch', 'roadmap', 'quarterly'],
  report: ['summary', 'quarterly', 'analysis', 'review', 'data'],
  budget: ['finance', 'cost', 'expense', 'allocation', 'planning'],
  project: ['plan', 'roadmap', 'initiative', 'sprint', 'milestone'],
  security: ['privacy', 'encryption', 'compliance', 'audit', 'firewall'],
  server: ['infrastructure', 'deployment', 'nginx', 'docker', 'hosting'],
  design: ['architecture', 'diagram', 'wireframe', 'mockup', 'ux'],
  analytics: ['metrics', 'dashboard', 'tracking', 'data', 'insights'],
  onboarding: ['training', 'setup', 'guide', 'new hire', 'welcome'],
  reading: ['books', 'articles', 'literature', 'research', 'study'],
  inventory: ['stock', 'warehouse', 'supply', 'catalog', 'assets'],
};

/**
 * ~45 demo files across categories
 */
export const DEMO_FILES: DemoFile[] = [
  // Finance (5)
  {
    filename: "Q4_2025_Summary.pdf",
    directory: "Documents/Finance",
    score: 0.94,
    snippet: "Quarterly revenue increased 23% YoY with strong growth in enterprise segment...",
    tags: ["finance", "report", "quarterly", "revenue"],
    semanticField: ["finance", "report", "quarterly", "revenue", "growth", "enterprise"],
    fileSize: "2.4 MB",
    modifiedAt: "3 days ago",
    fileExtension: "pdf",
  },
  {
    filename: "annual_budget_2025.xlsx",
    directory: "Documents/Finance",
    score: 0.72,
    snippet: "Annual budget allocation for engineering team with Q1-Q4 projections...",
    tags: ["finance", "budget", "planning"],
    semanticField: ["finance", "budget", "planning", "allocation", "cost"],
    fileSize: "856 KB",
    modifiedAt: "2 weeks ago",
    fileExtension: "xlsx",
  },
  {
    filename: "expense_report_jan.xlsx",
    directory: "Documents/Finance",
    score: 0.78,
    snippet: "Travel expenses for Q1 planning meeting in Seattle totaling $4,280...",
    tags: ["finance", "expense", "travel"],
    semanticField: ["finance", "expense", "travel", "cost", "reimbursement"],
    fileSize: "340 KB",
    modifiedAt: "1 week ago",
    fileExtension: "xlsx",
  },
  {
    filename: "invoice_march_2025.pdf",
    directory: "Documents/Finance/Invoices",
    score: 0.70,
    snippet: "Invoice #INV-2025-0342 for consulting services rendered in March...",
    tags: ["finance", "invoice", "payment"],
    semanticField: ["finance", "invoice", "payment", "billing", "consulting"],
    fileSize: "156 KB",
    modifiedAt: "5 days ago",
    fileExtension: "pdf",
  },
  {
    filename: "tax_docs_2024.pdf",
    directory: "Documents/Finance/Tax",
    score: 0.65,
    snippet: "Federal and state tax filing documents for fiscal year 2024...",
    tags: ["finance", "tax", "filing"],
    semanticField: ["finance", "tax", "filing", "deduction", "compliance"],
    fileSize: "4.1 MB",
    modifiedAt: "1 month ago",
    fileExtension: "pdf",
  },

  // Legal (4)
  {
    filename: "NDA_TechCorp_2024.pdf",
    directory: "Documents/Legal",
    score: 0.89,
    snippet: "Non-Disclosure Agreement between Party A and TechCorp Inc effective Jan 2024...",
    tags: ["legal", "nda", "contract", "techcorp"],
    semanticField: ["legal", "nda", "contract", "confidential", "agreement"],
    fileSize: "312 KB",
    modifiedAt: "4 months ago",
    fileExtension: "pdf",
  },
  {
    filename: "employment_agreement.pdf",
    directory: "Documents/Legal",
    score: 0.74,
    snippet: "Employment agreement outlining terms, compensation, and intellectual property rights...",
    tags: ["legal", "employment", "agreement"],
    semanticField: ["legal", "employment", "contract", "compensation", "terms"],
    fileSize: "478 KB",
    modifiedAt: "8 months ago",
    fileExtension: "pdf",
  },
  {
    filename: "software_license_v2.pdf",
    directory: "Documents/Legal",
    score: 0.68,
    snippet: "End-user license agreement for enterprise software deployment...",
    tags: ["legal", "license", "software"],
    semanticField: ["legal", "license", "software", "compliance", "terms"],
    fileSize: "289 KB",
    modifiedAt: "2 months ago",
    fileExtension: "pdf",
  },
  {
    filename: "compliance_checklist.xlsx",
    directory: "Documents/Legal/Compliance",
    score: 0.62,
    snippet: "SOC 2 compliance requirements and audit preparation checklist...",
    tags: ["legal", "compliance", "audit"],
    semanticField: ["legal", "compliance", "audit", "security", "certification"],
    fileSize: "124 KB",
    modifiedAt: "3 weeks ago",
    fileExtension: "xlsx",
  },

  // Engineering (6)
  {
    filename: "auth_api_reference.md",
    directory: "Projects/ixos/docs",
    score: 0.93,
    snippet: "## Authentication\nUse JWT tokens for API authentication. Include token in Authorization header...",
    tags: ["api", "auth", "docs", "code"],
    semanticField: ["api", "authentication", "jwt", "token", "security", "docs"],
    fileSize: "18.2 KB",
    modifiedAt: "2 days ago",
    fileExtension: "md",
  },
  {
    filename: "README.md",
    directory: "Projects/ixos",
    score: 0.71,
    snippet: "# Ixos Protocol\nPrivacy-first semantic file search with zero cloud dependency...",
    tags: ["readme", "docs", "project"],
    semanticField: ["docs", "readme", "project", "overview", "setup"],
    fileSize: "8.4 KB",
    modifiedAt: "1 day ago",
    fileExtension: "md",
  },
  {
    filename: "database_schema.sql",
    directory: "Projects/backend",
    score: 0.68,
    snippet: "CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR(255) UNIQUE...",
    tags: ["database", "sql", "schema"],
    semanticField: ["database", "schema", "sql", "tables", "migration"],
    fileSize: "12.6 KB",
    modifiedAt: "4 days ago",
    fileExtension: "sql",
  },
  {
    filename: "ci_pipeline.yml",
    directory: "Projects/ixos/.github/workflows",
    score: 0.60,
    snippet: "name: CI\non: [push, pull_request]\njobs:\n  build:\n    runs-on: ubuntu-latest...",
    tags: ["ci", "pipeline", "config"],
    semanticField: ["ci", "pipeline", "deploy", "build", "automation"],
    fileSize: "3.2 KB",
    modifiedAt: "1 week ago",
    fileExtension: "yml",
  },
  {
    filename: "architecture_diagram.md",
    directory: "Projects/ixos/docs",
    score: 0.64,
    snippet: "System architecture overview showing data flow between embedding engine and ranking...",
    tags: ["architecture", "design", "docs"],
    semanticField: ["architecture", "design", "diagram", "system", "engineering"],
    fileSize: "6.8 KB",
    modifiedAt: "1 week ago",
    fileExtension: "md",
  },
  {
    filename: "design_system.md",
    directory: "Projects/ixos/docs",
    score: 0.58,
    snippet: "Design tokens, color palette, and component guidelines for the Ixos UI...",
    tags: ["design", "ui", "docs"],
    semanticField: ["design", "ui", "tokens", "components", "guidelines"],
    fileSize: "4.1 KB",
    modifiedAt: "3 days ago",
    fileExtension: "md",
  },

  // Email (4)
  {
    filename: "flight_confirmation.eml",
    directory: "Mail/Travel",
    score: 0.91,
    snippet: "Your flight to Denver on March 15 has been confirmed. Confirmation #DEN2847...",
    tags: ["email", "travel", "denver", "flight"],
    semanticField: ["email", "travel", "flight", "denver", "booking", "confirmation"],
    fileSize: "42 KB",
    modifiedAt: "1 week ago",
    fileExtension: "eml",
  },
  {
    filename: "meeting_invite_q2.eml",
    directory: "Mail/Work",
    score: 0.75,
    snippet: "Q2 Planning Meeting - Please join us on April 3rd to discuss roadmap priorities...",
    tags: ["email", "meeting", "planning"],
    semanticField: ["email", "meeting", "planning", "calendar", "invite"],
    fileSize: "28 KB",
    modifiedAt: "3 days ago",
    fileExtension: "eml",
  },
  {
    filename: "client_feedback_acme.eml",
    directory: "Mail/Clients",
    score: 0.70,
    snippet: "Hi team, Acme Corp sent their feedback on the latest prototype. Key points...",
    tags: ["email", "client", "feedback"],
    semanticField: ["email", "client", "feedback", "customer", "stakeholder"],
    fileSize: "35 KB",
    modifiedAt: "5 days ago",
    fileExtension: "eml",
  },
  {
    filename: "newsletter_march.eml",
    directory: "Mail/Subscriptions",
    score: 0.55,
    snippet: "This month in tech: AI advancements, new developer tools, and industry trends...",
    tags: ["email", "newsletter", "tech"],
    semanticField: ["email", "newsletter", "tech", "industry", "trends"],
    fileSize: "86 KB",
    modifiedAt: "2 weeks ago",
    fileExtension: "eml",
  },

  // Notes (5)
  {
    filename: "team_standup_notes.md",
    directory: "Notes/Work",
    score: 0.88,
    snippet: "## Monday Standup\n- Sprint progress: 70% complete\n- Blockers: Waiting on design review...",
    tags: ["meeting", "notes", "team", "standup"],
    semanticField: ["meeting", "notes", "team", "standup", "sprint", "sync"],
    fileSize: "5.2 KB",
    modifiedAt: "1 day ago",
    fileExtension: "md",
  },
  {
    filename: "project_ideas.md",
    directory: "Notes/Personal",
    score: 0.65,
    snippet: "Ideas for side projects:\n1. AI-powered file organizer\n2. Local-first notes app...",
    tags: ["notes", "ideas", "projects"],
    semanticField: ["notes", "ideas", "projects", "brainstorm", "personal"],
    fileSize: "3.1 KB",
    modifiedAt: "2 weeks ago",
    fileExtension: "md",
  },
  {
    filename: "research_embeddings.md",
    directory: "Notes/Research",
    score: 0.72,
    snippet: "Comparing sentence transformer models for local search: MiniLM vs Model2Vec vs...",
    tags: ["research", "embeddings", "ml"],
    semanticField: ["research", "embeddings", "ml", "models", "comparison"],
    fileSize: "7.8 KB",
    modifiedAt: "4 days ago",
    fileExtension: "md",
  },
  {
    filename: "onboarding_guide.md",
    directory: "Notes/Work",
    score: 0.60,
    snippet: "New team member onboarding checklist: accounts, tools, codebase walkthrough...",
    tags: ["onboarding", "guide", "team"],
    semanticField: ["onboarding", "training", "guide", "setup", "welcome"],
    fileSize: "4.5 KB",
    modifiedAt: "1 month ago",
    fileExtension: "md",
  },
  {
    filename: "SOP_deployment.md",
    directory: "Notes/Work/SOPs",
    score: 0.58,
    snippet: "Standard operating procedure for production deployments. Step 1: Create release branch...",
    tags: ["sop", "deployment", "process"],
    semanticField: ["sop", "deployment", "process", "procedure", "release"],
    fileSize: "6.2 KB",
    modifiedAt: "3 weeks ago",
    fileExtension: "md",
  },

  // Photos (4)
  {
    filename: "IMG_2847_sunset.jpg",
    directory: "Photos/Vacation/Beach",
    score: 0.89,
    snippet: "Beach sunset photo from August trip to California coast",
    tags: ["photo", "beach", "vacation", "sunset"],
    semanticField: ["photo", "beach", "vacation", "sunset", "travel", "image"],
    fileSize: "4.8 MB",
    modifiedAt: "3 months ago",
    fileExtension: "jpg",
  },
  {
    filename: "screenshot_dashboard.png",
    directory: "Photos/Screenshots",
    score: 0.62,
    snippet: "Screenshot of the analytics dashboard showing monthly user growth metrics",
    tags: ["screenshot", "dashboard", "analytics"],
    semanticField: ["screenshot", "dashboard", "analytics", "metrics", "image"],
    fileSize: "1.2 MB",
    modifiedAt: "1 week ago",
    fileExtension: "png",
  },
  {
    filename: "team_photo_offsite.jpg",
    directory: "Photos/Work",
    score: 0.70,
    snippet: "Team group photo from the annual offsite in Lake Tahoe",
    tags: ["photo", "team", "offsite"],
    semanticField: ["photo", "team", "offsite", "group", "image"],
    fileSize: "6.1 MB",
    modifiedAt: "2 months ago",
    fileExtension: "jpg",
  },
  {
    filename: "whiteboard_architecture.jpg",
    directory: "Photos/Work",
    score: 0.56,
    snippet: "Whiteboard diagram from architecture brainstorming session",
    tags: ["photo", "diagram", "architecture"],
    semanticField: ["photo", "diagram", "architecture", "whiteboard", "design"],
    fileSize: "3.4 MB",
    modifiedAt: "2 weeks ago",
    fileExtension: "jpg",
  },

  // Presentations (3)
  {
    filename: "product_roadmap_q2.pptx",
    directory: "Work/Presentations",
    score: 0.82,
    snippet: "Q2 Product Roadmap - New features, timeline, and resource allocation...",
    tags: ["presentation", "roadmap", "product"],
    semanticField: ["presentation", "roadmap", "product", "planning", "quarterly"],
    fileSize: "8.6 MB",
    modifiedAt: "1 week ago",
    fileExtension: "pptx",
  },
  {
    filename: "pitch_deck_v3.pptx",
    directory: "Work/Presentations",
    score: 0.76,
    snippet: "Investor pitch deck: market opportunity, traction, and fundraising goals...",
    tags: ["presentation", "pitch", "fundraising"],
    semanticField: ["presentation", "pitch", "investors", "funding", "deck"],
    fileSize: "12.4 MB",
    modifiedAt: "3 weeks ago",
    fileExtension: "pptx",
  },
  {
    filename: "quarterly_review_q1.pptx",
    directory: "Work/Presentations",
    score: 0.72,
    snippet: "Q1 2025 review: achievements, KPIs, and lessons learned across all departments...",
    tags: ["presentation", "quarterly", "review"],
    semanticField: ["presentation", "quarterly", "review", "report", "kpi"],
    fileSize: "6.8 MB",
    modifiedAt: "1 month ago",
    fileExtension: "pptx",
  },

  // Data (4)
  {
    filename: "customer_list_2025.csv",
    directory: "Data/CRM",
    score: 0.68,
    snippet: "Customer ID, Name, Plan, MRR, Last Active\n1001, Acme Corp, Enterprise, $4200...",
    tags: ["data", "customers", "crm"],
    semanticField: ["data", "customer", "crm", "list", "accounts"],
    fileSize: "245 KB",
    modifiedAt: "2 days ago",
    fileExtension: "csv",
  },
  {
    filename: "analytics_export.csv",
    directory: "Data/Analytics",
    score: 0.64,
    snippet: "Page views, unique visitors, bounce rate, and conversion data for February...",
    tags: ["data", "analytics", "metrics"],
    semanticField: ["data", "analytics", "metrics", "tracking", "insights"],
    fileSize: "1.1 MB",
    modifiedAt: "4 days ago",
    fileExtension: "csv",
  },
  {
    filename: "survey_results_jan.xlsx",
    directory: "Data/Research",
    score: 0.60,
    snippet: "Customer satisfaction survey results: NPS score 72, top requests include...",
    tags: ["data", "survey", "research"],
    semanticField: ["data", "survey", "research", "feedback", "satisfaction"],
    fileSize: "380 KB",
    modifiedAt: "3 weeks ago",
    fileExtension: "xlsx",
  },
  {
    filename: "inventory_tracker.xlsx",
    directory: "Data/Operations",
    score: 0.56,
    snippet: "Current stock levels, reorder points, and supplier lead times for all SKUs...",
    tags: ["data", "inventory", "operations"],
    semanticField: ["data", "inventory", "stock", "supply", "operations"],
    fileSize: "520 KB",
    modifiedAt: "1 day ago",
    fileExtension: "xlsx",
  },

  // Personal (4)
  {
    filename: "favorite_recipes.md",
    directory: "Personal/Cooking",
    score: 0.72,
    snippet: "Collection of favorite recipes: Thai basil chicken, homemade pasta, sourdough...",
    tags: ["personal", "recipes", "cooking", "food"],
    semanticField: ["recipe", "food", "cooking", "meal", "kitchen", "personal"],
    fileSize: "9.4 KB",
    modifiedAt: "1 week ago",
    fileExtension: "md",
  },
  {
    filename: "workout_log.xlsx",
    directory: "Personal/Fitness",
    score: 0.65,
    snippet: "Weekly workout tracker: sets, reps, and progressive overload metrics...",
    tags: ["personal", "fitness", "workout"],
    semanticField: ["workout", "fitness", "exercise", "gym", "health", "training"],
    fileSize: "180 KB",
    modifiedAt: "2 days ago",
    fileExtension: "xlsx",
  },
  {
    filename: "reading_list_2025.md",
    directory: "Personal",
    score: 0.58,
    snippet: "Books to read this year:\n- Designing Data-Intensive Applications\n- The Pragmatic Programmer...",
    tags: ["personal", "reading", "books"],
    semanticField: ["reading", "books", "list", "learning", "personal"],
    fileSize: "2.1 KB",
    modifiedAt: "2 weeks ago",
    fileExtension: "md",
  },
  {
    filename: "travel_plans_summer.md",
    directory: "Personal/Travel",
    score: 0.68,
    snippet: "Summer travel plans: Japan in July, Portugal in August. Flight options and hotels...",
    tags: ["personal", "travel", "planning"],
    semanticField: ["travel", "trip", "vacation", "planning", "destination", "flight"],
    fileSize: "3.8 KB",
    modifiedAt: "1 month ago",
    fileExtension: "md",
  },

  // Config (3)
  {
    filename: "env_backup.txt",
    directory: "Config",
    score: 0.50,
    snippet: "DATABASE_URL=postgres://...\nREDIS_URL=redis://localhost:6379\nAPI_KEY=sk-...",
    tags: ["config", "env", "secrets"],
    semanticField: ["config", "environment", "secrets", "settings", "server"],
    fileSize: "1.2 KB",
    modifiedAt: "2 weeks ago",
    fileExtension: "txt",
  },
  {
    filename: "docker-compose.yml",
    directory: "Projects/ixos",
    score: 0.55,
    snippet: "services:\n  app:\n    build: .\n    ports: ['3000:3000']\n  redis:\n    image: redis:7...",
    tags: ["config", "docker", "deploy"],
    semanticField: ["config", "docker", "deploy", "container", "infrastructure"],
    fileSize: "2.8 KB",
    modifiedAt: "1 week ago",
    fileExtension: "yml",
  },
  {
    filename: "nginx.conf",
    directory: "Config/Server",
    score: 0.48,
    snippet: "server {\n  listen 443 ssl;\n  server_name api.ixos.dev;\n  ssl_certificate...",
    tags: ["config", "nginx", "server"],
    semanticField: ["config", "nginx", "server", "infrastructure", "ssl"],
    fileSize: "1.8 KB",
    modifiedAt: "3 weeks ago",
    fileExtension: "conf",
  },
];

/**
 * Tokenize a string into lowercase terms
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s_\-./\\]+/).filter(t => t.length > 1);
}

/**
 * Expand query terms using synonym map
 */
function expandTerms(terms: string[]): Set<string> {
  const expanded = new Set(terms);
  for (const term of terms) {
    const synonyms = SYNONYM_MAP[term];
    if (synonyms) {
      for (const syn of synonyms) expanded.add(syn);
    }
    // Also check if any synonym key contains this term
    for (const [key, values] of Object.entries(SYNONYM_MAP)) {
      if (values.includes(term)) expanded.add(key);
    }
  }
  return expanded;
}

/**
 * Semantic matching algorithm - replaces primitive fuzzyMatch
 */
function semanticMatch(query: string, file: DemoFile): number {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return 0;

  const expandedQuery = expandTerms(queryTerms);
  const fileTokens = new Set([
    ...tokenize(file.filename),
    ...tokenize(file.snippet),
    ...file.tags,
    ...file.semanticField,
  ]);

  // Signal 1: Direct term matches in filename/snippet/tags (0-0.30)
  let directScore = 0;
  let directMatches = 0;
  for (const term of queryTerms) {
    if (fileTokens.has(term)) {
      directScore += 0.10;
      directMatches++;
    }
    // Partial match bonus
    for (const ft of fileTokens) {
      if (ft.includes(term) || term.includes(ft)) {
        directScore += 0.04;
        break;
      }
    }
  }
  directScore = Math.min(directScore, 0.30);

  // Signal 2: Semantic field overlap via synonym expansion (0-0.35)
  let semanticScore = 0;
  for (const expanded of expandedQuery) {
    if (file.semanticField.includes(expanded)) {
      semanticScore += 0.07;
    }
    if (file.tags.includes(expanded)) {
      semanticScore += 0.04;
    }
  }
  semanticScore = Math.min(semanticScore, 0.35);

  // Signal 3: Filename relevance (0-0.15)
  let filenameScore = 0;
  const filenameLower = file.filename.toLowerCase();
  for (const term of queryTerms) {
    if (filenameLower.includes(term)) filenameScore += 0.06;
  }
  filenameScore = Math.min(filenameScore, 0.15);

  // Signal 4: Tag intersection (0-0.15)
  let tagScore = 0;
  for (const term of expandedQuery) {
    if (file.tags.includes(term)) tagScore += 0.05;
  }
  tagScore = Math.min(tagScore, 0.15);

  // Signal 5: Query coverage bonus (0-0.10)
  const coverageRatio = queryTerms.length > 0 ? directMatches / queryTerms.length : 0;
  const coverageScore = coverageRatio > 0.5 ? 0.10 * coverageRatio : 0;

  // Small random jitter for realism
  const jitter = (Math.random() - 0.5) * 0.06;

  return Math.max(0, Math.min(0.98, directScore + semanticScore + filenameScore + tagScore + coverageScore + jitter));
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Hook for fake search functionality
 */
export type PauseAtStage = 'scan' | 'embed' | 'rank' | 'results' | null;

export function useFakeSearch() {
  const [results, setResults] = useState<DemoFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStage, setSearchStage] = useState<'idle' | 'scan' | 'embed' | 'rank'>('idle');
  const abortRef = useRef<boolean>(false);
  const pauseRef = useRef<PauseAtStage>(null);

  const setPauseAtStage = useCallback((stage: PauseAtStage) => {
    pauseRef.current = stage;
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      setSearchStage('idle');
      return;
    }

    abortRef.current = true;
    await delay(30);
    abortRef.current = false;

    setIsSearching(true);
    setResults([]);
    setSearchStage('scan');

    while (!abortRef.current && pauseRef.current === 'scan') {
      await delay(60);
    }
    if (abortRef.current) {
      setSearchStage('idle');
      setIsSearching(false);
      return;
    }

    await delay(200);
    if (abortRef.current) {
      setSearchStage('idle');
      setIsSearching(false);
      return;
    }

    setSearchStage('embed');

    while (!abortRef.current && pauseRef.current === 'embed') {
      await delay(60);
    }
    if (abortRef.current) {
      setSearchStage('idle');
      setIsSearching(false);
      return;
    }

    await delay(200);
    if (abortRef.current) {
      setSearchStage('idle');
      setIsSearching(false);
      return;
    }

    setSearchStage('rank');

    while (!abortRef.current && pauseRef.current === 'rank') {
      await delay(60);
    }
    if (abortRef.current) {
      setSearchStage('idle');
      setIsSearching(false);
      return;
    }

    // Score all files with semantic matching
    const ranked = DEMO_FILES
      .map(f => ({ ...f, score: semanticMatch(query, f) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    const scored = ranked.filter(f => f.score > 0.15);
    const fallbackResults =
      scored.length > 0
        ? scored
        : ranked.slice(0, 3).map((item) => ({ ...item, score: Math.max(item.score, 0.22) }));

    await delay(200);
    if (abortRef.current) {
      setSearchStage('idle');
      setIsSearching(false);
      return;
    }

    // Stream results progressively
    for (const match of fallbackResults) {
      if (abortRef.current) {
        setSearchStage('idle');
        setIsSearching(false);
        return;
      }
      await delay(80 + Math.random() * 60);
      setResults(prev => [...prev, match]);
    }

    while (!abortRef.current && pauseRef.current === 'results') {
      await delay(60);
    }
    if (abortRef.current) {
      setSearchStage('idle');
      setIsSearching(false);
      return;
    }

    setSearchStage('idle');
    setIsSearching(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setResults([]);
    setIsSearching(false);
    setSearchStage('idle');
  }, []);

  return { search, results, isSearching, searchStage, reset, setPauseAtStage };
}
