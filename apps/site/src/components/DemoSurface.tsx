"use client";
import { useMemo, useState } from "react";
import { SearchSurface, type IxosSearchResult } from "@ixos/ixos-ui";

const SAMPLES = {
  code: [
    {
      path: "cache.rs",
      text: "fn source_is_unchanged(size: u64, modified: SystemTime, file_id: u64) -> bool {\n    previous == (size, modified, file_id)\n}",
    },
    {
      path: "search.rs",
      text: "fn hybrid_score(cosine: f32, bm25: f32) -> f32 {\n    0.5 * cosine + 0.5 * bm25\n}",
    },
    {
      path: "record.rs",
      text: "fn clear_cache(path: &Path) -> Result<()> {\n    remove_ixos_metadata(path)\n}",
    },
  ],
  documents: [
    {
      path: "meeting.txt",
      text: "The team meeting covered the next project milestone and the release schedule.",
    },
    {
      path: "architecture.txt",
      text: "Search combines keywords with static embeddings. Records cache vectors in file metadata.",
    },
    {
      path: "notes.txt",
      text: "Choose locations in Settings. The desktop keeps parsed text and the search model in memory.",
    },
  ],
};

export function DemoSurface({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [profile, setProfile] = useState<"code" | "documents">("code");
  const [selected, setSelected] = useState(0);
  const results = useMemo<IxosSearchResult[]>(() => {
    const words = submitted.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    return SAMPLES[profile]
      .map((file) => ({
        id: file.path,
        title: file.path,
        path: file.path,
        snippet: file.text,
        matchedLineNumber: 1,
        score: words.filter((word) =>
          (file.path + " " + file.text).toLowerCase().includes(word),
        ).length,
      }))
      .filter((file) => words.length > 0 && file.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [submitted, profile]);
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1000,
        margin: "0 auto",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <SearchSurface
        query={query}
        onQueryChange={setQuery}
        onSubmit={() => {
          setSubmitted(query);
          setSelected(0);
        }}
        profile={profile}
        onProfileChange={(value) => {
          setProfile(value);
          setSelected(0);
        }}
        directoryLabel="3 sample files · illustrative keyword matches"
        results={results}
        selectedIndex={selected}
        onSelectResult={setSelected}
        stageLabel="Complete"
      />
    </div>
  );
}
