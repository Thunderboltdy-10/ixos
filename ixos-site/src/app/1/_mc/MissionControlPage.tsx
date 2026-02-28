'use client';

import type { CSSProperties, ReactNode } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { DemoSurface } from '../../../landing/DemoSurface';
import s from './mc.module.css';

const RIPPLE_PRESETS = [
  'authentication token refresh',
  'rate limiter middleware',
  'How does token expiry work?',
];

const RIPPLE_TOKENS = {
  '--v-accent-main': '#2dd4bf',
  '--v-accent-alt': '#f59e0b',
  '--v-shell-bg': 'rgba(10,14,16,0.78)',
} as CSSProperties;

const STACK_STEPS = [
  {
    id: '01',
    title: 'Scan Delta',
    detail: 'Fast filesystem delta pass identifies only changed files before ranking starts.',
  },
  {
    id: '02',
    title: 'Candidate Forge',
    detail: 'Lexical retrieval and semantic hints build a compact candidate set with traceability.',
  },
  {
    id: '03',
    title: 'Rerank Ripple',
    detail: 'Model reranking converges on evidence-backed matches while preserving retrieval speed.',
  },
  {
    id: '04',
    title: 'Integrity Lock',
    detail: 'Results lock with signed cache checks and timeline-aware weighting before display.',
  },
];

const STATS = [
  { label: 'Warm TTFR', value: '31ms', hint: 'first result appears' },
  { label: 'Flash v2 latency', value: '339ms', hint: '1k files, full pass' },
  { label: 'MRR@10', value: '0.8340', hint: 'canonical eval set' },
  { label: 'Model footprint', value: '16.6MB', hint: 'int8 artifact' },
];

function NoiseOverlay() {
  return (
    <svg className={s.noise} width="100%" height="100%" aria-hidden>
      <filter id="rippleNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#rippleNoise)" />
    </svg>
  );
}

function SurfaceFrame({ children }: { children: ReactNode }) {
  return (
    <div className={s.surfaceFrame}>
      <div className={s.surfaceChrome}>
        <span />
        <span />
        <span />
        <p>ixos://ripple-foundry</p>
      </div>
      <div className={s.surfaceBody}>{children}</div>
    </div>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const fade = useTransform(scrollYProgress, [0, 0.9], [1, 0]);

  return (
    <section ref={ref} className={s.hero}>
      <div className={s.heroTopline}>Variant /1 - Ripple Foundry</div>
      <motion.h1 className={s.heroTitle} style={{ y, opacity: fade }}>
        Precision search forged
        <br />
        for local speed.
      </motion.h1>
      <p className={s.heroText}>
        Fast convergence, visible pipeline stages, and privacy-safe defaults. Built to feel instant without hiding the mechanics.
      </p>
      <div className={s.heroBadges}>
        <span>flash-v2 runtime</span>
        <span>zero-index philosophy</span>
        <span>progressive retrieval</span>
      </div>

      <SurfaceFrame>
        <DemoSurface
          initialView="search"
          initialQuery="rate limiter middleware"
          initialMode="auto"
          presets={RIPPLE_PRESETS}
          autoRun
          style={{ ...RIPPLE_TOKENS, minHeight: 430 }}
        />
      </SurfaceFrame>
    </section>
  );
}

function MetricsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });

  return (
    <section className={s.section}>
      <div className={s.sectionLabel}>Mission Telemetry</div>
      <h2 className={s.sectionTitle}>Pipeline confidence in numbers.</h2>
      <div ref={ref} className={s.metricGrid}>
        {STATS.map((stat, index) => (
          <motion.article
            key={stat.label}
            className={s.metricCard}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: index * 0.08 }}
          >
            <p className={s.metricLabel}>{stat.label}</p>
            <p className={s.metricValue}>{stat.value}</p>
            <p className={s.metricHint}>{stat.hint}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function StackTimeline() {
  return (
    <section className={s.section}>
      <div className={s.sectionLabel}>Convergence Stack</div>
      <h2 className={s.sectionTitle}>A readable path from query to answer.</h2>
      <div className={s.stackScroller}>
        {STACK_STEPS.map((step) => (
          <article key={step.id} className={s.stackCard}>
            <p className={s.stackId}>{step.id}</p>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkstreamDeck() {
  return (
    <section className={s.section}>
      <div className={s.deckGrid}>
        <div>
          <div className={s.sectionLabel}>Today Surface</div>
          <h2 className={s.sectionTitle}>Resume context without index bloat.</h2>
          <p className={s.sectionText}>
            Workstream and today views keep momentum high while preserving local-only processing. No silent cloud handoff.
          </p>
          <ul className={s.bulletList}>
            <li>Signed cache checkpoints before result lock</li>
            <li>Model switch stays user-controlled in Ask flows</li>
            <li>Presets tuned for auth, middleware, and expiry questions</li>
          </ul>
        </div>
        <SurfaceFrame>
          <DemoSurface
            initialView="today"
            initialMode="auto"
            presets={RIPPLE_PRESETS}
            autoRun={false}
            style={{ ...RIPPLE_TOKENS, minHeight: 430 }}
          />
        </SurfaceFrame>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className={s.cta}>
      <div className={s.ctaPanel}>
        <p>Flash v2 readiness</p>
        <h2>Ship search that lands fast and stays transparent.</h2>
        <a href="/1/download">Download Ixos</a>
      </div>
    </section>
  );
}

function TopNav() {
  return (
    <nav className={s.nav}>
      <a href="/" className={s.brand}>Ixos</a>
      <div className={s.navLinks}>
        <a href="/1/docs">Docs</a>
        <a href="/1/pricing">Pricing</a>
        <a href="/1/download">Download</a>
      </div>
    </nav>
  );
}

export default function MissionControlPage() {
  return (
    <main className={s.page}>
      <NoiseOverlay />
      <div className={s.backdrop} />
      <TopNav />
      <Hero />
      <MetricsStrip />
      <StackTimeline />
      <WorkstreamDeck />
      <CTA />
    </main>
  );
}
