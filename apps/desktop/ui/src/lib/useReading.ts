import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { Reading } from "./api";

/** The read in progress, if any. Its percentage never moves backwards. */
export function useReading() {
  const [reading, setReading] = useState<Reading | null>(null);
  useEffect(() => {
    const subscription = listen<Reading | null>("reading", ({ payload }) =>
      setReading((previous) => payload && { ...payload, percent: Math.max(previous?.percent ?? 0, payload.percent) }),
    );
    return () => {
      subscription.then((stop) => stop());
    };
  }, []);
  return reading;
}
