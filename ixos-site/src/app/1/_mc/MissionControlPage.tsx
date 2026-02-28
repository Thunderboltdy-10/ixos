'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from 'framer-motion';
import { DemoSurface } from '../../../landing/DemoSurface';
import s from './mc.module.css';

/* ─── Noise overlay ─── */
function NoiseOverlay() {
  return (
    <svg className={s.noise} width="100%" height="100%">
      <filter id="mcNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#mcNoise)" />
    </svg>
  );
}

/* ─── Nav ─── */
function MCNav() {
  return (
    <nav className={s.nav}>
      <a href="/" className={s.navBrand}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="#14B8A6" strokeWidth="2" /><circle cx="16" cy="16" r="4" fill="#14B8A6" /></svg>
        Ixos
      </a>
      <div className={s.navLinks}>
        <a href="/1/docs" className={s.navLink}>Docs</a>
        <a href="/1/pricing" className={s.navLink}>Pricing</a>
        <a href="/1/download" className={s.navCta}>Download</a>
      </div>
    </nav>
  );
}

/* ─── Browser Mockup ─── */
function BrowserMockup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${s.browserFrame} ${className || ''}`}>
      <div className={s.browserChrome}>
        <span className={s.browserDot} />
        <span className={s.browserDot} />
        <span className={s.browserDot} />
        <span className={s.browserUrl}>ixos://search</span>
      </div>
      <div className={s.browserContent}>
        {children}
      </div>
    </div>
  );
}

/* ─── Animated staggered text ─── */
function AnimatedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const chars = text.split('');

  return (
    <h1 ref={ref} className={className}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </h1>
  );
}

/* ─── Counter Card ─── */
function CounterCard({ value, suffix, label, fill }: { value: number; suffix: string; label: string; fill: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let current = 0;
    const step = value / 40;
    const id = setInterval(() => {
      current += step;
      if (current >= value) {
        setCount(value);
        clearInterval(id);
      } else {
        setCount(Math.floor(current));
      }
    }, 25);
    return () => clearInterval(id);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      className={s.metricCard}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={s.metricValue}>
        {suffix === 'ms' ? '~' : ''}{count}<span style={{ fontSize: '1.5rem', opacity: 0.7 }}>{suffix}</span>
      </div>
      <div className={s.metricLabel}>{label}</div>
      <div className={s.metricBar}>
        <div className={s.metricBarFill} style={{ width: isInView ? `${fill}%` : '0%' }} />
      </div>
    </motion.div>
  );
}

/* ─── Hero Section ─── */
function MCHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 8]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
    setMousePos({ x, y });
  };

  return (
    <section ref={ref} className={s.hero} onMouseMove={handleMouseMove}>
      <AnimatedText text="Search that converges." className={s.heroHeadline} />
      <motion.p
        className={s.heroSub}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        Local-first semantic file search. Progressive retrieval, hybrid intelligence, entirely on-device.
      </motion.p>

      <motion.div
        style={{
          rotateX: rotateX,
          scale: scale,
          opacity: opacity,
          transform: `perspective(1200px) rotateX(${mousePos.y * -0.5}deg) rotateY(${mousePos.x * 0.5}deg)`,
        }}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrowserMockup>
          <DemoSurface
            initialView="search"
            initialQuery="quarterly budget proposal"
            initialMode="auto"
            autoRun
            style={{ minHeight: 380 }}
          />
        </BrowserMockup>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <motion.div
          className="w-px h-12 bg-gradient-to-b from-[var(--mc-teal)] to-transparent"
          animate={{ scaleY: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  );
}

/* ─── Speed Section ─── */
function MCSpeed() {
  return (
    <section className={s.section}>
      <div className={s.sectionLabel}>Performance</div>
      <h2 className={s.sectionTitle}>Measured in milliseconds.</h2>
      <p className={s.sectionDesc}>
        Parallel file scanning with rayon, HMAC-verified caching, and on-device embedding generation.
        No network. No waiting.
      </p>
      <div className={s.metricsGrid}>
        <CounterCard value={7} suffix="ms" label="File loading (1,000 files)" fill={95} />
        <CounterCard value={800} suffix="ms" label="Total search time" fill={82} />
        <CounterCard value={92} suffix="%" label="MRR@10 accuracy (Pro)" fill={92} />
        <CounterCard value={250} suffix="" label="Tests passing" fill={100} />
      </div>
    </section>
  );
}

/* ─── Pipeline Section (Horizontal Scroll) ─── */
const PIPELINE_STEPS = [
  { num: '01', title: 'JIT Scan', desc: 'Rayon-powered parallel file discovery. 1,000 files scanned in ~7ms. Only new or modified files get re-embedded.' },
  { num: '02', title: 'Lexical Match', desc: 'Fast keyword matching with n-gram analysis. Generates candidate set from exact and fuzzy term overlap.' },
  { num: '03', title: 'Semantic Rerank', desc: 'Model2Vec embeddings compute cosine similarity against your query. Sub-800ms for the full corpus.' },
  { num: '04', title: 'Lock', desc: 'Results stabilize. HMAC-SHA256 verified, integrity scored, ranked by semantic + temporal + behavioral signals.' },
];

function MCPipeline() {
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
      const maxTranslate = track.scrollWidth - window.innerWidth + 96;
      track.style.transform = `translateX(-${progress * maxTranslate}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={containerRef} style={{ height: '300vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px' }}>
        <div className={s.sectionLabel}>Pipeline</div>
        <h2 className={s.sectionTitle} style={{ marginBottom: 40 }}>How search converges.</h2>
        <div ref={trackRef} className={s.pipelineTrack} style={{ transition: 'transform 0.1s linear' }}>
          {PIPELINE_STEPS.map((step) => (
            <div key={step.num} className={s.pipelinePanel}>
              <div className={s.pipelineNumber}>{step.num}</div>
              <h3 className={s.pipelineTitle}>{step.title}</h3>
              <p className={s.pipelineDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Privacy Section (Scroll-fill text) ─── */
const PRIVACY_WORDS = 'No cloud. No telemetry. No exceptions. Your files never leave your device. Every embedding is generated locally. Every cache entry is HMAC-signed. Every search is ephemeral by default.'.split(' ');

function MCPrivacy() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const [progress, setProgress] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setProgress(Math.max(0, Math.min(1, (v - 0.2) / 0.5)));
  });

  return (
    <section ref={containerRef} className={s.privacySection}>
      <div className={s.privacyText}>
        {PRIVACY_WORDS.map((word, i) => {
          const wordProgress = i / PRIVACY_WORDS.length;
          const isRevealed = progress > wordProgress;
          return (
            <span
              key={i}
              className={s.privacyWord}
              style={{ color: isRevealed ? 'var(--mc-fg)' : 'var(--mc-fg-dim)' }}
            >
              {word}{' '}
            </span>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Product Deep Dive ─── */
function MCProduct() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-150px' });

  return (
    <section className={s.productReveal}>
      <div style={{ maxWidth: 1100, width: '100%' }}>
        <div className={s.sectionLabel}>Product</div>
        <h2 className={s.sectionTitle}>Your daily search companion.</h2>
        <p className={s.sectionDesc} style={{ marginBottom: 48 }}>
          Today view, workstreams, and progressive search — all in a clean desktop app built for daily use.
        </p>
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.88, rotateX: 10, filter: 'blur(6px)' }}
          animate={isInView ? { opacity: 1, scale: 1, rotateX: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ perspective: 1200 }}
        >
          <BrowserMockup>
            <DemoSurface
              initialView="today"
              initialMode="auto"
              style={{ minHeight: 380 }}
            />
          </BrowserMockup>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA Section ─── */
function MCCTA() {
  return (
    <section className={s.cta}>
      <div className={s.sectionLabel}>Get Started</div>
      <h2 className={s.sectionTitle}>Ready to converge?</h2>
      <p className={s.sectionDesc} style={{ margin: '0 auto 0', textAlign: 'center' }}>
        Ixos is free for local search. Upgrade to Pro for semantic reranking, evidence extraction, and workstreams.
      </p>
      <div className={s.ctaGrid}>
        <div className={s.ctaCard}>
          <div style={{ fontSize: 12, color: 'var(--mc-teal)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Free</div>
          <h3 style={{ fontFamily: "'Instrument Sans', sans-serif", fontWeight: 700, fontSize: '1.3rem', marginBottom: 8 }}>Ixos Core</h3>
          <p style={{ fontSize: 14, color: 'var(--mc-fg-muted)', lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>
            Lexical search, JIT file scanning, HMAC-verified caching. Local-first, always.
          </p>
          <a href="/1/download" className={s.ctaButton}>Download</a>
        </div>
        <div className={s.ctaCard} style={{ borderColor: 'rgba(20, 184, 166, 0.2)' }}>
          <div style={{ fontSize: 12, color: 'var(--mc-amber)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Pro</div>
          <h3 style={{ fontFamily: "'Instrument Sans', sans-serif", fontWeight: 700, fontSize: '1.3rem', marginBottom: 8 }}>Ixos Pro</h3>
          <p style={{ fontSize: 14, color: 'var(--mc-fg-muted)', lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>
            Semantic reranking, evidence extraction, Ask Mode, Today view, and workstreams.
          </p>
          <a href="/1/pricing" className={s.ctaButton} style={{ background: 'var(--mc-amber)', color: 'var(--mc-dark)' }}>See Pricing</a>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function MCFooter() {
  return (
    <footer className={s.footer}>
      <p className={s.footerText}>
        Ixos Protocol — Privacy-first semantic search. Built with Rust.
      </p>
    </footer>
  );
}

/* ─── Scroll Progress Line ─── */
function ScrollProgressLine() {
  const { scrollYProgress } = useScroll();
  const height = useTransform(scrollYProgress, [0, 1], ['0vh', '100vh']);

  return (
    <motion.div className={s.scrollLine} style={{ height }} />
  );
}

/* ═══ Main Page ═══ */
export default function MissionControlPage() {
  return (
    <div className={s.page}>
      <NoiseOverlay />
      <div className={s.dotGrid} />
      <ScrollProgressLine />
      <MCNav />
      <MCHero />
      <MCSpeed />
      <MCPipeline />
      <MCPrivacy />
      <MCProduct />
      <MCCTA />
      <MCFooter />
    </div>
  );
}
