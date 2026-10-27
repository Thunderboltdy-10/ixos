import { CACHE_CHOICES, PROFILE_CHOICES, Picker, QueryBar, ResultRow, useFlip } from "@ixos/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addFolder,
  listRecent,
  openFile,
  showInFolder,
  suggestedFolders,
  type Config,
  type LocationStatus,
  type Profile,
  type RecentSearch,
} from "../lib/api";
import { count, folderName, plural, relativeDir } from "../lib/format";
import { toHits } from "../lib/hits";
import { progressOf, useSearch, type SearchState } from "../lib/useSearch";
import { Preview } from "./Preview";

interface SearchViewProps {
  config: Config;
  locations: LocationStatus[];
  save: (config: Config) => void;
}

export function SearchView({ config, locations, save }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const folders = config.search.locations;
  const state = useSearch(query, folder || null);
  const hits = useMemo(() => toHits(state, folders), [state, folders]);
  useFlip(list, hits.map((hit) => hit.key).join("\n"));

  useEffect(() => setActive(0), [query, folder]);
  useEffect(() => {
    if (folder && !folders.includes(folder)) setFolder("");
  }, [folder, folders]);
  useEffect(() => {
    document.getElementById(`result-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);
  if (!folders.length) return <FirstRun onAdd={addFolder} />;

  const selected = state.results[Math.min(active, state.results.length - 1)];
  const profile = config.search.profile === "code" ? "Code" : "Documents";
  const reading = locations.some(
    (location) => (!folder || location.directory === folder) && location.stage !== "ready" && location.stage !== "error",
  );

  return (
    <main className="ix-search">
      <QueryBar
        progress={progressOf(state.stage)}
        busy={state.stage === "idle" && reading}
        input={
          <input
            ref={input}
            autoFocus
            className="ix-query-input"
            value={query}
            placeholder="Describe what you are looking for"
            aria-label="Search"
            aria-controls="results"
            aria-activedescendant={hits.length ? `result-${active}` : undefined}
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive((index) => Math.max(0, Math.min(hits.length - 1, index + step)));
              } else if (event.key === "Enter" && selected) {
                (event.ctrlKey || event.metaKey ? showInFolder : openFile)(selected.path);
              } else if (event.key === "Escape") {
                setQuery("");
              }
            }}
          />
        }
        pickers={
          <>
            <Picker
              title="Search in"
              label={folder ? folderName(folder) : folders.length === 1 ? folderName(folders[0]) : "All folders"}
              value={folders.length === 1 ? folders[0] : folder}
              choices={[
                ...(folders.length > 1 ? [{ value: "", label: "All folders" }] : []),
                ...folders.map((path) => ({ value: path, label: folderName(path), detail: path })),
              ]}
              onChange={setFolder}
              action={{ label: "Add a folder", run: () => addFolder() }}
            />
            <span className="ix-picker-rule" />
            <Picker<Profile | "auto">
              title="Search for"
              label={profile}
              hint={config.autoProfile ? "auto" : undefined}
              value={config.autoProfile ? "auto" : config.search.profile}
              choices={PROFILE_CHOICES}
              onChange={(value) =>
                save(
                  value === "auto"
                    ? { ...config, autoProfile: true }
                    : { ...config, autoProfile: false, search: { ...config.search, profile: value } },
                )
              }
            />
            <span className="ix-picker-rule" />
            <Picker
              title="Remember files"
              label={config.search.cache ? "Saved" : "Fresh"}
              value={config.search.cache}
              choices={CACHE_CHOICES}
              onChange={(cache) => save({ ...config, search: { ...config.search, cache } })}
            />
          </>
        }
      />
      <Status state={state} query={query} locations={locations} folder={folder} />

      <div className="ix-split">
        {hits.length ? (
          <ol ref={list} id="results" className="ix-rows ix-results" role="listbox" aria-label="Results">
            {hits.map((hit, index) => (
              <ResultRow
                key={hit.key}
                id={`result-${index}`}
                hit={hit}
                layout="stacked"
                selected={index === active}
                onSelect={() => setActive(index)}
                onOpen={() => openFile(state.results[index].path)}
              />
            ))}
          </ol>
        ) : (
          <div className="ix-results ix-results--empty">
            {query.trim() ? (
              state.stage === "done" && <p>Nothing matched. Try describing it another way.</p>
            ) : (
              <Recent onPick={setQuery} />
            )}
          </div>
        )}
        {selected ? (
          <Preview key={selected.path} result={selected} folder={relativeDir(selected.path, folders)} query={query} />
        ) : (
          <section className="ix-preview ix-preview--empty" aria-label="Preview">
            <p>The best passage from each file shows here.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function Status({ state, query, locations, folder }: { state: SearchState; query: string; locations: LocationStatus[]; folder: string }) {
  const scope = locations.filter((location) => !folder || location.directory === folder);
  const warming = scope.find((location) => location.stage !== "ready" && location.stage !== "error");
  const failed = scope.find((location) => location.error);
  let text: string;
  let note = "";
  if (state.stage === "error") {
    text = state.message ?? "Search failed.";
  } else if (!query.trim()) {
    const files = scope.reduce((sum, location) => sum + location.fileCount, 0);
    if (failed) text = failed.error!;
    else if (warming?.stage === "discover") text = `Reading ${folderName(warming.directory)} for the first time.`;
    else if (warming) text = `${count(files)} files ready for keyword search. Meaning follows in a moment.`;
    else text = files ? `${count(files)} files ready to search.` : "Ready to search.";
  } else if (state.stage === "keywords" && !state.results.length) {
    text = "Searching…";
  } else if (state.stage === "meaning") {
    text = `${plural(state.results.length, "file")} by keywords. Adding meaning…`;
  } else {
    const how = state.message ? "by keywords" : "by keywords and meaning";
    text = `${plural(state.results.length, "file")} ranked ${how}${state.elapsedMs !== null ? ` in ${Math.round(state.elapsedMs)} ms` : ""}.`;
    note = state.message ?? "";
  }
  const fixed = state.corrections?.length
    ? `Searched for “${state.corrections.map((c) => c.replacement).join(", ")}” instead of “${state.corrections.map((c) => c.original).join(", ")}”.`
    : "";
  return (
    <p className={`status${state.stage === "error" || (failed && !query.trim()) ? " status--error" : ""}`} role="status">
      <span>
        {text} {fixed}
      </span>
      {note && <span className="ix-status-note">{note}</span>}
    </p>
  );
}

function Recent({ onPick }: { onPick: (query: string) => void }) {
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  useEffect(() => {
    listRecent().then(setRecent, () => {});
  }, []);
  if (!recent.length) {
    return <p>Describe it in your own words, for example “where do we retry failed uploads”.</p>;
  }
  const queries = [...new Set(recent.map((entry) => entry.query))].slice(0, 8);
  return (
    <div className="recent">
      <p className="recent-title">Recent searches</p>
      {queries.map((query) => (
        <button key={query} className="recent-item" onClick={() => onPick(query)}>
          {query}
        </button>
      ))}
    </div>
  );
}

function FirstRun({ onAdd }: { onAdd: () => Promise<string | null> }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    suggestedFolders().then(setSuggestions, () => {});
  }, []);
  return (
    <main className="first-run">
      <h1>Choose a folder to search</h1>
      <p>Ixos only reads the folders you pick. You can add more later in Settings.</p>
      <button className="ix-button ix-button--primary ix-button--large" onClick={() => onAdd().catch((reason) => setError(String(reason)))}>
        Choose a folder
      </button>
      {suggestions.length > 0 && (
        <p className="first-run-hint">Common places to start: {suggestions.map(folderName).join(" or ")}.</p>
      )}
      {error && <p className="ix-status--error">{error}</p>}
    </main>
  );
}
