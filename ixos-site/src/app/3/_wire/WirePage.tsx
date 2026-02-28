'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { DemoSurface } from '../../../landing/DemoSurface';
import s from './wire.module.css';

/* ─── Noise ─── */
function NoiseOverlay() {
  return (
    <svg className={s.noise} width="100%" height="100%">
      <filter id="wireNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#wireNoise)" />
    </svg>
  );
}

/* ─── Nav ─── */
function WireNav() {
  return (
    <nav className={s.nav}>
      <a href="/" className={s.navBrand}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <path d="M16 4L28 28H4L16 4Z" stroke="#F6B94C" strokeWidth="2" fill="none" />
          <circle cx="16" cy="19" r="3" fill="#F6B94C" />
        </svg>
        Ixos
      </a>
      <div className={s.navLinks}>
        <a href="/3/docs" className={s.navLink}>Docs</a>
        <a href="/3/pricing" className={s.navLink}>Pricing</a>
        <a href="/3/download" className={s.navCta}>Download</a>
      </div>
    </nav>
  );
}

/* ─── Staggered reveal wrapper ─── */
function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Hero ─── */
function WireHero() {
  return (
    <section className={s.hero}>
      <div className={s.heroLeft}>
        <motion.h1
          className={s.heroHeadline}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={s.heroGradientText}>Find anything.</span>
          <br />
          Instantly.
        </motion.h1>
        <motion.p
          className={s.heroSub}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          On-device semantic search that processes 1,000 files in milliseconds.
          No cloud, no telemetry, just results.
        </motion.p>
        <motion.div
          className={s.heroBadges}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <span className={s.heroBadge}>~7ms load</span>
          <span className={s.heroBadge}>92% MRR@10</span>
          <span className={s.heroBadge}>Zero cloud</span>
        </motion.div>
      </div>
      <motion.div
        className={s.heroRight}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={s.heroProduct}>
          <DemoSurface
            initialView="search"
            initialQuery="project milestones deadline"
            initialMode="flash"
            autoRun
            style={{ minHeight: 400 }}
          />
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Flow (Horizontal Scroll) ─── */
const FLOW_STEPS = [
  { num: '01', title: 'JIT Scan', desc: 'Rayon-powered parallel discovery scans your entire directory. Modified files are detected instantly via filesystem metadata.' },
  { num: '02', title: 'Lexical', desc: 'N-gram keyword matching builds a candidate set from term overlap. Fast, deterministic, and always the first pass.' },
  { num: '03', title: 'Semantic', desc: 'Model2Vec embeddings compute cosine similarity. The semantic reranker promotes conceptual matches above keyword hits.' },
  { num: '04', title: 'Locked', desc: 'Results stabilize with HMAC verification, integrity scoring, and behavioral pattern detection. Attack-resistant by default.' },
];

function WireFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const containerHeight = container.offsetHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / containerHeight));
      const maxTranslate = track.scrollWidth - window.innerWidth + 128;
      track.style.transform = `translateX(-${progress * maxTranslate}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={containerRef} style={{ height: '280vh', position: 'relative' }}>
      <div className={s.divider} />
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 64px' }}>
        <div className={s.sectionLabel}>Flow</div>
        <h2 className={s.sectionTitle} style={{ marginBottom: 40 }}>How the wire carries data.</h2>
        <div ref={trackRef} className={s.flowTrack} style={{ transition: 'transform 0.1s linear' }}>
          {FLOW_STEPS.map((step) => (
            <div key={step.num} className={s.flowPanel}>
              <div className={s.flowNumber}>{step.num}</div>
              <h3 className={s.flowTitle}>{step.title}</h3>
              <p className={s.flowDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Speed Section ─── */
function WireSpeed() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let current = 0;
    const id = setInterval(() => {
      current += 0.3;
      if (current >= 7) {
        setCount(7);
        clearInterval(id);
      } else {
        setCount(Math.round(current * 10) / 10);
      }
    }, 30);
    return () => clearInterval(id);
  }, [isInView]);

  return (
    <section ref={ref} className={s.section}>
      <div className={s.divider} style={{ margin: '0 0 80px 0' }} />
      <div className={s.sectionLabel}>Speed</div>
      <h2 className={s.sectionTitle}>Measured in single digits.</h2>
      <div className={s.speedSplit}>
        <div style={{ position: 'relative' }}>
          <div className={s.speedCounterGlow} />
          <div className={s.speedCounter}>
            ~{count}<span style={{ fontSize: '0.4em', opacity: 0.6 }}>ms</span>
          </div>
          <p style={{ marginTop: 12, fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--wire-fg-muted)' }}>
            File loading time for 1,000 files with parallel rayon scanning.
          </p>
        </div>
        <div className={s.speedCards}>
          <div className={s.speedCard}>
            <div className={s.speedCardTitle}>Flash v2</div>
            <div className={s.speedCardValue}>MRR@10: 0.8340 · 339ms · 16.6MB (int8)</div>
          </div>
          <div className={s.speedCard} style={{ borderColor: 'rgba(124, 92, 255, 0.15)' }}>
            <div className={s.speedCardTitle} style={{ color: 'var(--wire-violet)' }}>Pro v2</div>
            <div className={s.speedCardValue}>MRR@10: 0.9209 · 430ms · ~102MB (float32)</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CLI Terminal ─── */
const CLI_COMMANDS = [
  { prompt: '$ ', cmd: 'ixos search "budget report" --dir ./docs --progressive', output: '→ Scanning 1,247 files... 7ms\n→ Lexical: 34 candidates\n→ Semantic rerank: complete\n→ Locked: 12 results' },
  { prompt: '$ ', cmd: 'ixos search "source leak" --journalist-mode', output: '→ Deep privacy profile active\n→ No cache writes, no history\n→ 8 results, ephemeral' },
  { prompt: '$ ', cmd: 'ixos search "deployment config" --json', output: '{"results": [{"file": "deploy.toml", "score": 0.94}], "pipeline": {"stage": "locked"}}' },
];

function WireCLI() {
  return (
    <section className={s.section}>
      <div className={s.sectionLabel}>CLI</div>
      <h2 className={s.sectionTitle}>Power at the terminal.</h2>
      <p className={s.sectionDesc}>
        Full-featured CLI with progressive search, journalist mode, JSON output, and context snippets.
      </p>
      <FadeUp>
        <div className={s.terminal}>
          <div className={s.terminalChrome}>
            <span className={s.terminalDot} />
            <span className={s.terminalDot} />
            <span className={s.terminalDot} />
            <span className={s.terminalTitle}>ixos — terminal</span>
          </div>
          <div className={s.terminalBody}>
            {CLI_COMMANDS.map((cmd, i) => (
              <div key={i} style={{ marginBottom: i < CLI_COMMANDS.length - 1 ? 20 : 0 }}>
                <div>
                  <span className={s.terminalPrompt}>{cmd.prompt}</span>
                  <span className={s.terminalCmd}>{cmd.cmd}</span>
                </div>
                {cmd.output.split('\n').map((line, j) => (
                  <div key={j} className={s.terminalOutput}>{line}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </FadeUp>
    </section>
  );
}

/* ─── Ask Mode ─── */
function WireAsk() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className={s.section}>
      <div className={s.divider} style={{ margin: '0 0 80px 0' }} />
      <div className={s.sectionLabel}>Ask Mode</div>
      <h2 className={s.sectionTitle}>Ask a question. Get evidence.</h2>
      <div className={s.askSplit}>
        <div>
          <p className={s.askText}>
            Intent detection identifies questions and extracts precise answers from your documents.
          </p>
          <p className={s.askDesc}>
            When your query ends with a question mark or starts with "who", "what", "when", "where", "how", or "why" — Ixos activates Ask Mode.
            It reads through matching documents to extract facts, dates, amounts, and names.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(243,245,247,0.06)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}
        >
          <DemoSurface
            initialView="search"
            initialQuery="when was the last board meeting?"
            initialMode="pro"
            autoRun
            style={{ minHeight: 360 }}
          />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function WireCTA() {
  return (
    <section className={s.cta}>
      <div className={s.ctaBar}>
        <h2 className={s.ctaTitle}>Get Ixos.</h2>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: 'rgba(8, 11, 15, 0.7)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
          Free for local search. Pro for semantic intelligence.
        </p>
        <a href="/3/download" className={s.ctaButton}>Download Now</a>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function WireFooter() {
  return (
    <footer className={s.footer}>
      <p className={s.footerText}>Ixos Protocol — Speed at the wire. Built with Rust.</p>
    </footer>
  );
}

/* ═══ Main Page ═══ */
export default function WirePage() {
  return (
    <div className={s.page}>
      <div className={s.meshGradient} />
      <NoiseOverlay />
      <WireNav />
      <WireHero />
      <WireFlow />
      <WireSpeed />
      <WireCLI />
      <WireAsk />
      <WireCTA />
      <WireFooter />
    </div>
  );
}
