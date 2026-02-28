'use client';

import type { CSSProperties, ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { DemoSurface } from '../../../landing/DemoSurface';
import s from './wire.module.css';

const COCKPIT_PRESETS = [
  'authentication token refresh',
  'workstream session recovery',
  'ephemeral mode privacy',
];

const COCKPIT_TOKENS = {
  '--v-accent-main': '#f3f5f7',
  '--v-accent-alt': '#2dd4bf',
  '--v-shell-bg': 'rgba(12,14,18,0.72)',
} as CSSProperties;

const LUXURY_METRICS = [
  { label: 'Warm launch', value: '31ms', note: 'first result render target' },
  { label: 'Ask alignment', value: 'model-respecting', note: 'no forced pro routing' },
  { label: 'Search flow', value: 'progressive', note: 'streamed lock-stage convergence' },
];

const FEATURE_ROWS = [
  { title: 'Session Continuity', copy: 'Recover workstream context instantly with Today and Workstreams views.' },
  { title: 'Privacy Envelope', copy: 'Ephemeral mode avoids persistent traces while preserving usable search speed.' },
  { title: 'Operator Control', copy: 'Mode switches stay explicit so users choose speed, balance, or depth.' },
];

function NoiseOverlay() {
  return (
    <svg className={s.noise} width="100%" height="100%" aria-hidden>
      <filter id="wireNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.64" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#wireNoise)" />
    </svg>
  );
}

function SurfaceFrame({ children }: { children: ReactNode }) {
  return (
    <div className={s.surfaceFrame}>
      <div className={s.surfaceTop}>
        <p>quiet-luxury cockpit</p>
        <span />
      </div>
      <div className={s.surfaceBody}>{children}</div>
    </div>
  );
}

function TopNav() {
  return (
    <nav className={s.nav}>
      <a href="/" className={s.brand}>Ixos</a>
      <div className={s.navLinks}>
        <a href="/3/docs">Docs</a>
        <a href="/3/pricing">Pricing</a>
        <a href="/3/download">Download</a>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className={s.hero}>
      <div className={s.heroHeader}>
        <p className={s.kicker}>Variant /3 - Quiet Luxury Cockpit</p>
        <h1>
          Refined speed
          <br />
          for focused operators.
        </h1>
        <p>
          A calmer visual language with high-contrast evidence surfaces. Fast retrieval, deliberate controls, and polished motion.
        </p>
      </div>
      <SurfaceFrame>
        <DemoSurface
          initialView="search"
          initialQuery="workstream session recovery"
          initialMode="flash"
          presets={COCKPIT_PRESETS}
          autoRun
          style={{ ...COCKPIT_TOKENS, minHeight: 430 }}
        />
      </SurfaceFrame>
    </section>
  );
}

function MetricsBand() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });

  return (
    <section className={s.section}>
      <p className={s.sectionLabel}>Control Band</p>
      <div ref={ref} className={s.metricBand}>
        {LUXURY_METRICS.map((metric, index) => (
          <motion.article
            key={metric.label}
            className={s.metricCard}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: index * 0.07 }}
          >
            <p>{metric.label}</p>
            <h3>{metric.value}</h3>
            <small>{metric.note}</small>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function FeatureLounge() {
  return (
    <section className={s.section}>
      <div className={s.featureLayout}>
        <div>
          <p className={s.sectionLabel}>Operations Lounge</p>
          <h2 className={s.sectionTitle}>Keep context, clarity, and momentum in one surface.</h2>
          <div className={s.featureRows}>
            {FEATURE_ROWS.map((row) => (
              <article key={row.title} className={s.featureRow}>
                <h3>{row.title}</h3>
                <p>{row.copy}</p>
              </article>
            ))}
          </div>
        </div>

        <SurfaceFrame>
          <DemoSurface
            initialView="workstreams"
            initialMode="auto"
            presets={COCKPIT_PRESETS}
            autoRun={false}
            style={{ ...COCKPIT_TOKENS, minHeight: 430 }}
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
        <p>Quiet Luxury release</p>
        <h2>Search fast, reason carefully, ship with confidence.</h2>
        <a href="/3/download">Download Ixos</a>
      </div>
    </section>
  );
}

export default function WirePage() {
  return (
    <main className={s.page}>
      <NoiseOverlay />
      <div className={s.sunA} />
      <div className={s.sunB} />
      <TopNav />
      <Hero />
      <MetricsBand />
      <FeatureLounge />
      <CTA />
    </main>
  );
}
