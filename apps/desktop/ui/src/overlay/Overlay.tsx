import { QuickSearch, queryTerms, type Passage } from "@ixos/ui";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef, useState } from "react";
import logo from "../assets/ixos-icon.png";
import { addFolders, hideOverlay, openFile, readPreview, resizeOverlay, showInFolder, showOverlay, type Config } from "../lib/api";
import { folderName } from "../lib/format";
import { snippetLines, toHits } from "../lib/hits";
import { ReadingNote } from "../lib/ReadingNote";
import { markQuickSearchTried } from "../lib/ShortcutKeys";
import { useReading } from "../lib/useReading";
import { progressOf, useSearch } from "../lib/useSearch";

export function Overlay({ config, save }: { config: Config; save: (config: Config) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>();
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const folders = config.search.locations;
  const state = useSearch(query, null);
  const live = useReading();
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
    const shown = listen<number>("shortcut-triggered", ({ payload }) => {
      setMaxHeight(payload);
      markQuickSearchTried();
      focus();
    });
    const blurred = getCurrentWindow().onFocusChanged(({ payload }) => {
      if (!payload) hideOverlay();
    });
    return () => {
      shown.then((stop) => stop());
      blurred.then((stop) => stop());
    };
  }, []);

  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const resize = new ResizeObserver(() => {
      resizeOverlay(Math.ceil(element.getBoundingClientRect().height)).catch(console.error);
    });
    resize.observe(element);
    return () => resize.disconnect();
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

  // The picker opens below an always-on-top panel, so step aside and come back after.
  const chooseFolders = async () => {
    await hideOverlay();
    const picked = await addFolders(config, save).catch(() => []);
    if (picked.length) await showOverlay();
  };

  const scope = folders.length === 1 ? folderName(folders[0]) : folders.length ? "All folders" : "";
  const status =
    state.stage === "done" && state.elapsedMs !== null ? `${Math.round(state.elapsedMs)} ms` : state.stage === "meaning" ? "Adding meaning…" : "";

  return (
    <div
      className="overlay"
      ref={panel}
      style={{ maxHeight }}
      data-compact={folders.length > 0 && !query.trim() && !live}
      data-preview={Boolean(passage) && active < hits.length}
    >
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
                  const next = Math.max(0, Math.min(hits.length - 1, active + step));
                  setActive(next);
                  panel.current?.querySelectorAll(".ix-row")[next]?.scrollIntoView({ block: "nearest" });
                } else if (event.key === "Enter") {
                  if (!folders.length) chooseFolders();
                  else open(active, event.ctrlKey || event.metaKey);
                } else if (event.key === "Escape") {
                  setQuery("");
                  hideOverlay();
                }
              }}
            />
          }
          scope={<span className="ix-qs-scope">{scope}</span>}
          progress={live ? live.percent : progressOf(state.stage)}
          busy={live?.stage === "walking"}
          glimmer={Boolean(live)}
          hits={hits}
          active={active}
          onActive={setActive}
          onOpen={(index) => open(index)}
          passage={passage}
          empty={
            !folders.length ? (
              <>
                Ixos has no folders to search yet.{" "}
                <button className="ix-qs-action" onClick={chooseFolders}>
                  Choose folders
                </button>
              </>
            )
              : state.stage === "error"
                ? state.message
                : query.trim() && state.stage === "done"
                  ? "Nothing matched. Try describing it another way."
                  : "Describe what you are looking for."
          }
          status={
            live ? (
              <>
                Reading · {Math.round(live.percent * 100)}%
                <ReadingNote reading={live} />
              </>
            ) : (
              status
            )
          }
        />
      </div>
    </div>
  );
}
