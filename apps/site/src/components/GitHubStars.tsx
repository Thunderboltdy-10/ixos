"use client";

import { useEffect, useState } from "react";
import { GITHUB_API } from "@/lib/github";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function GitHubStars({ initialStars }: { initialStars: number | null }) {
  const [stars, setStars] = useState(initialStars);

  useEffect(() => {
    const controller = new AbortController();

    async function refresh() {
      try {
        const response = await fetch(GITHUB_API, {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        });
        if (!response.ok) return;
        const repo = await response.json();
        if (!controller.signal.aborted && typeof repo.stargazers_count === "number" &&
            Number.isSafeInteger(repo.stargazers_count) && repo.stargazers_count >= 0) {
          setStars(repo.stargazers_count);
        }
      } catch {
        // Keep the server fallback or the last successful count.
      }
    }

    void refresh();
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, []);

  return stars === null ? "Star" : compact.format(stars);
}
