import { QuickSearch, queryTerms, type Passage } from "@ixos/ui";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef, useState } from "react";
import logo from "../assets/ixos-icon.png";
import { hideOverlay, openFile, readPreview, showInFolder, type Config } from "../lib/api";
import { folderName } from "../lib/format";
import { snippetLines, toHits } from "../lib/hits";
import { progressOf, useSearch } from "../lib/useSearch";

export function Overlay({ config }: { config: Config }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [passage, setPassage] = useState<Passage | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const folders = config.search.locations;
  const state = useSearch(query, null);
  // The overlay stays short; the main window shows the full list.
  const hits = useMemo(() => toHits(state, folders).slice(0, 8), [state, folders]);
  const selected = state.results[Math.min(active, state.results.length - 1)];

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    const focus = () => {
      input.current?.focus();
      input.current?.select();
    };
    focus();
    const shown = listen("shortcut-triggered", focus);
    const blurred = getCurrentWindow().onFocusChanged(({ payload }) => {
      if (!payload) hideOverlay();
    });
    return () => {
      shown.then((stop) => stop());
      blurred.then((stop) => stop());
    };
  }, []);

  useEffect(() => {
    if (!selected?.snippet) return setPassage(null);
    let live = true;
    const { start_line: from, end_line: to } = selected.snippet;
    const base = {
      title: selected.filename,
      detail: `Lines ${from}–${to}`,
      from,
      to,
      terms: queryTerms(query),
    };
    setPassage({ ...base, lines: snippetLines(selected) });
    readPreview(selected.path, Math.max(1, from - 3), 12).then(
      (read) => {
        if (live) {
          setPassage({ ...base, lines: snippetLines(read) });
        }
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [selected, query]);

  const open = (index: number, reveal = false) => {
    const result = state.results[index];
    if (!result) return;
    (reveal ? showInFolder : openFile)(result.path).then(() => hideOverlay(), () => {});
  };

  const scope = folders.length === 1 ? folderName(folders[0]) : "All folders";
  const status =
    state.stage === "done" && state.elapsedMs !== null ? `${Math.round(state.elapsedMs)} ms` : state.stage === "meaning" ? "Adding meaning…" : "";

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && hideOverlay()}>
      <div className="overlay-panel">
        <QuickSearch
          logo={logo}
          query={
            <input
              ref={input}
              className="ix-qs-query"
              value={query}
              placeholder="Search your files"
              aria-label="Search"
              spellCheck={false}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  setActive((index) => Math.max(0, Math.min(hits.length - 1, index + step)));
                } else if (event.key === "Enter") {
                  open(active, event.ctrlKey || event.metaKey);
                } else if (event.key === "Escape") {
                  if (query) setQuery("");
                  else hideOverlay();
                }
              }}
            />
          }
          scope={<span className="ix-qs-scope">{scope}</span>}
          progress={progressOf(state.stage)}
          hits={hits}
          active={active}
          onActive={setActive}
          onOpen={(index) => open(index)}
          passage={passage}
          empty={
            !folders.length
              ? "Add a folder in Ixos first."
              : state.stage === "error"
                ? state.message
                : query.trim() && state.stage === "done"
                  ? "Nothing matched. Try describing it another way."
                  : "Describe what you are looking for."
          }
          status={status}
        />
      </div>
    </div>
  );
}
