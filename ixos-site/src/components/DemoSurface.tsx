"use client";

import { useState, useEffect } from "react";
import { SearchSurface, createDemoAdapter, type IxosSearchResult } from "@ixos/ixos-ui";

const adapter = createDemoAdapter();

export function DemoSurface({
  initialQuery = "",
  forcedState,
  forcedStageLabel,
  forcedResults
}: {
  initialQuery?: string;
  forcedState?: "idle" | "searching" | "done";
  forcedStageLabel?: string;
  forcedResults?: IxosSearchResult[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<IxosSearchResult[]>([]);
  const [stats, setStats] = useState({
    stage: 'lexical',
    filesScanned: 0,
    candidates: 0,
    embedded: 0,
    cacheHits: 0,
    scanTrail: [] as string[]
  });

  useEffect(() => {
    if (forcedState === "searching") {
      setIsSearching(true);
      setStats(prev => ({ ...prev, stage: 'lexical', scanTrail: ['src/core/matcher.rs', 'src/core/tokenizer.rs'] }));
      setResults([]);
    } else if (forcedState === "done") {
      setIsSearching(false);
      setStats(prev => ({
        ...prev,
        stage: 'locked',
        filesScanned: 14205,
        candidates: 210,
        embedded: 45,
        cacheHits: 120,
        scanTrail: ['src/core/search.rs']
      }));
      setResults(forcedResults || []);
    }
  }, [forcedState, forcedResults]);

  const handleSubmit = async () => {
    if (forcedState) return;
    setIsSearching(true);
    const found: IxosSearchResult[] = [];
    await adapter.search.search(query, "auto", event => {
      if (event.type === "result" && event.result) found.push(event.result);
    });
    setResults(found);
    setStats({
      stage: 'locked',
      filesScanned: 12450,
      candidates: 412,
      embedded: 120,
      cacheHits: 80,
      scanTrail: []
    });
    setIsSearching(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <SearchSurface
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleSubmit}
        isSearching={isSearching}
        results={results}
        stageLabel={forcedStageLabel || (isSearching ? "Scanning" : "Ready")}
        pipelineStats={stats}
        interactive={!forcedState}
      />
    </div>
  );
}
