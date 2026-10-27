"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export interface Group {
  title: string;
  pages: { id: string; title: string }[];
}

/** The docs contents, marking the section being read. */
export function Sidebar({ groups }: { groups: Group[] }) {
  const [current, setCurrent] = useState(groups[0].pages[0].id);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = groups.flatMap((group) => group.pages.map((page) => document.getElementById(page.id)!));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [groups]);

  // Keep the marked link visible when the contents are taller than the window.
  useEffect(() => {
    const box = nav.current!;
    const link = box.querySelector<HTMLElement>("[aria-current]");
    if (!link) return;
    const top = link.offsetTop;
    if (top < box.scrollTop || top + link.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: top - box.clientHeight / 2, behavior: "smooth" });
    }
  }, [current]);

  return (
    <nav ref={nav} className="docs-nav" aria-label="Documentation">
      {groups.map((group) => (
        <div key={group.title} className="docs-group">
          <p>{group.title}</p>
          {group.pages.map((page) => (
            <a key={page.id} href={`#${page.id}`} aria-current={page.id === current ? "true" : undefined}>
              {page.id === current && <motion.span layoutId="docs-current" className="docs-current" />}
              {page.title}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
