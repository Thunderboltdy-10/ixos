"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const DOC_LINKS = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/desktop-app", label: "Desktop App" },
  { href: "/docs/cli-reference", label: "CLI Reference" },
  { href: "/docs/models", label: "Models + Hugging Face" },
  { href: "/docs/benchmarking", label: "Benchmarking" },
  { href: "/docs/agents", label: "Agent Architecture" },
  { href: "/docs/troubleshooting", label: "Troubleshooting" },
];

export function DocsSideNav() {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-24 lg:h-fit">
      <div className="rounded-lg border border-white/10 bg-bg-graphite-2/65 p-4 backdrop-blur-sm">
        <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-accent-teal">
          {"// DOC NAV"}
        </p>
        <ul className="mt-4 space-y-1.5">
          {DOC_LINKS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md border px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "border-accent-teal/35 bg-accent-teal/10 text-fg-porcelain"
                      : "border-transparent text-fg-muted/80 hover:border-white/10 hover:bg-white/5 hover:text-fg-porcelain"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
