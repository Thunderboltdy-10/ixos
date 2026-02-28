'use client';

import type { CSSProperties, ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { DemoSurface } from '../../../landing/DemoSurface';
import s from './chamber.module.css';

const LOOM_PRESETS = [
  'How does token refresh work?',
  'cache signing validation',
  'journalist mode privacy',
];

const LOOM_TOKENS = {
  '--v-accent-main': '#8b5cf6',
  '--v-accent-alt': '#2dd4bf',
  '--v-shell-bg': 'rgba(14,12,21,0.82)',
} as CSSProperties;

const EVIDENCE_CARDS = [
  {
    title: 'Signal Decomposition',
    copy: 'Each result can be inspected by lexical score, semantic weight, recency, and integrity markers.',
  },
  {
    title: 'Threat-aware fallback',
    copy: 'Anomaly handling moves ranking toward safer pathways when blended signals become suspicious.',
  },
  {
    title: 'Audit-friendly output',
    copy: 'Pipeline stats are visible in the interface to keep retrieval behavior reviewable by the team.',
  },
  {
    title: 'Mode intent respect',
    copy: 'Ask flows remain aligned with the currently selected mode instead of silently forcing slower routes.',
  },
];

const BENCH_ROWS = [
  { model: 'flash-v2', mrr: '0.8340', latency: '339ms', size: '16.6MB', tone: 'neutral' },
  { model: 'auto', mrr: 'adaptive', latency: 'adaptive', size: 'hybrid', tone: 'neutral' },
  { model: 'pro-v2', mrr: '0.9209', latency: '430ms', size: '~102MB', tone: 'accent' },
];

function NoiseOverlay() {
  return (
    <svg className={s.noise} width="100%" height="100%" aria-hidden>
      <filter id="loomNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.66" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#loomNoise)" />
    </svg>
  );
}

function DemoFrame({ children }: { children: ReactNode }) {
  return (
    <div className={s.demoFrame}>
      <div className={s.demoHeader}>
        <p>evidence loom / active</p>
        <div>
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className={s.demoBody}>{children}</div>
    </div>
  );
}

function TopNav() {
  return (
    <nav className={s.nav}>
      <a href="/" className={s.brand}>Ixos</a>
      <div className={s.navLinks}>
        <a href="/2/docs">Docs</a>
        <a href="/2/pricing">Pricing</a>
        <a href="/2/download">Download</a>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className={s.hero}>
      <div>
        <p className={s.kicker}>Variant /2 - Evidence Loom</p>
        <h1 className={s.heroTitle}>
          Evidence-first search
          <br />
          without abstraction haze.
        </h1>
        <p className={s.heroText}>
          Designed for teams that need relevance with auditability. Ranking remains fast, visible, and traceable at every stage.
        </p>
        <div className={s.heroChips}>
          <span>traceable ranking</span>
          <span>cryptographic integrity</span>
          <span>question-ready retrieval</span>
        </div>
      </div>

      <DemoFrame>
        <DemoSurface
          initialView="search"
          initialQuery="cache signing validation"
          initialMode="pro"
          presets={LOOM_PRESETS}
          autoRun
          style={{ ...LOOM_TOKENS, minHeight: 430 }}
        />
      </DemoFrame>
    </section>
  );
}

function EvidenceGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });

  return (
    <section className={s.section}>
      <p className={s.sectionLabel}>Signal Weave</p>
      <h2 className={s.sectionTitle}>Ranking threads are visible by design.</h2>
      <div ref={ref} className={s.cardGrid}>
        {EVIDENCE_CARDS.map((card, index) => (
          <motion.article
            key={card.title}
            className={s.evidenceCard}
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: index * 0.07 }}
          >
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function AuditDeck() {
  return (
    <section className={s.section}>
      <div className={s.auditLayout}>
        <div className={s.auditPanel}>
          <p className={s.sectionLabel}>Bench Record</p>
          <h2 className={s.sectionTitle}>Measured against canonical retrieval sets.</h2>
          <p className={s.sectionText}>
            Evidence mode favors reliability and explainability while maintaining practical latency for large local directories.
          </p>
          <table className={s.benchTable}>
            <thead>
              <tr>
                <th>Model</th>
                <th>MRR@10</th>
                <th>Latency</th>
                <th>Footprint</th>
              </tr>
            </thead>
            <tbody>
              {BENCH_ROWS.map((row) => (
                <tr key={row.model} data-tone={row.tone}>
                  <td>{row.model}</td>
                  <td>{row.mrr}</td>
                  <td>{row.latency}</td>
                  <td>{row.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DemoFrame>
          <DemoSurface
            initialView="workstreams"
            initialMode="pro"
            presets={LOOM_PRESETS}
            autoRun={false}
            style={{ ...LOOM_TOKENS, minHeight: 430 }}
          />
        </DemoFrame>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className={s.cta}>
      <div className={s.ctaPanel}>
        <p>Evidence Loom release</p>
        <h2>Inspect ranking behavior while you search.</h2>
        <a href="/2/download">Download Ixos</a>
      </div>
    </section>
  );
}

export default function ChamberPage() {
  return (
    <main className={s.page}>
      <NoiseOverlay />
      <div className={s.glowA} />
      <div className={s.glowB} />
      <TopNav />
      <Hero />
      <EvidenceGrid />
      <AuditDeck />
      <CTA />
    </main>
  );
}
