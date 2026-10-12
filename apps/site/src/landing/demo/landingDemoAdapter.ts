"use client";

import { createDemoAdapter } from "@ixos/ixos-ui";

import type { DemoSurfaceScenario } from "./types";

const adapter = createDemoAdapter();

export function getLandingDemoAdapter() {
  return adapter;
}

export const VARIANT_DEMO_SCENARIOS: Record<"1" | "2" | "3", DemoSurfaceScenario[]> =
  {
    "1": [
      {
        id: "v1-refresh",
        label: "Token Refresh",
        view: "search",
        query: "authentication token refresh",
        mode: "auto",
      },
      {
        id: "v1-rate",
        label: "Rate Limiter",
        view: "search",
        query: "rate limiter middleware",
        mode: "flash",
      },
      {
        id: "v1-expiry",
        label: "Token Expiry",
        view: "search",
        query: "How does token expiry work?",
        mode: "pro",
      },
    ],
    "2": [
      {
        id: "v2-proof",
        label: "Proof Query",
        view: "search",
        query: "How does token refresh work?",
        mode: "auto",
      },
      {
        id: "v2-cache",
        label: "Cache Signing",
        view: "search",
        query: "cache signing validation",
        mode: "pro",
      },
      {
        id: "v2-privacy",
        label: "Journalist",
        view: "search",
        query: "journalist mode privacy",
        mode: "flash",
      },
    ],
    "3": [
      {
        id: "v3-refresh",
        label: "Search Lock",
        view: "search",
        query: "authentication token refresh",
        mode: "auto",
      },
      {
        id: "v3-workstreams",
        label: "Workstreams",
        view: "workstreams",
        query: "",
        mode: "auto",
      },
      {
        id: "v3-private",
        label: "Privacy",
        view: "search",
        query: "ephemeral mode privacy",
        mode: "pro",
      },
    ],
  };
