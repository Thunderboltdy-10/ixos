'use client';

import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from 'framer-motion';
import { DemoSurface } from '../../../landing/DemoSurface';
import s from './chamber.module.css';

/* ─── Noise ─── */
function NoiseOverlay() {
  return (
    <svg className={s.noise} width="100%" height="100%">
      <filter id="chNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#chNoise)" />
    </svg>
  );
}

/* ─── Nav ─── */
function CHNav() {
  return (
    <nav className={s.nav}>
      <a href="/" className={s.navBrand}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="4" stroke="#7C5CFF" strokeWidth="2" /><circle cx="16" cy="16" r="3" fill="#7C5CFF" /></svg>
        Ixos
      </a>
      <div className={s.navLinks}>
        <a href="/2/docs" className={s.navLink}>Docs</a>
        <a href="/2/pricing" className={s.navLink}>Pricing</a>
        <a href="/2/download" className={s.navCta}>Download</a>
      </div>
    </nav>
  );
}

/* ─── Animated word-by-word headline ─── */
function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const words = text.split(' ');

  return (
    <h1 ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'inline-block', marginRight: '0.3em' }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

/* ─── Hero ─── */
function CHHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const clipInset = useTransform(scrollYProgress, [0, 0.5], [35, 0]);
  const productOpacity = useTransform(scrollYProgress, [0, 0.4], [0.3, 1]);

  return (
    <section ref={ref} className={s.hero}>
      <div className={s.heroGlow} />
      <WordReveal text="Precision search. Zero abstraction." className={s.heroHeadline} />
      <motion.p
        className={s.heroSub}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        Every result is evidence. Every pipeline stage is visible.
        No black box. No cloud. Just measured relevance.
      </motion.p>

      <motion.div className={s.heroProduct} style={{ opacity: productOpacity }}>
        <div className={s.lineGrid} />
        <motion.div
          className={s.heroProductInner}
          style={{
            clipPath: useTransform(clipInset, (v) => `inset(${v}% ${v}% ${v}% ${v}%)`),
          }}
        >
          <DemoSurface
            initialView="search"
            initialQuery="compliance audit results"
            initialMode="pro"
            autoRun
            style={{ minHeight: 400 }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── Evidence Section (Scroll-fill + Sticky Code) ─── */
const CODE_LINES = [
  '// ixos_rank/hybrid_engine.rs',
  'pub fn hybrid_rank(',
  '    query: &str,',
  '    candidates: &[FileCandidate],',
  '    config: &RankConfig,',
  ') -> Vec<RankedResult> {',
  '    let lexical = lexical_score(query, candidates);',
  '    let semantic = semantic_rerank(query, candidates);',
  '    ',
  '    // Adaptive: detect degradation attacks',
  '    if detect_attack(&lexical, &semantic) {',
  '        return pure_semantic_fallback(semantic);',
  '    }',
  '    ',
  '    merge_ranks(lexical, semantic, config)',
  '}',
];

const EVIDENCE_WORDS = 'Ixos shows you exactly how it ranks every file. Lexical overlap. Semantic similarity. Integrity verification. Temporal weighting. Behavioral patterns. Every signal is visible, every score is decomposed.'.split(' ');

function CHEvidence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const [progress, setProgress] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setProgress(Math.max(0, Math.min(1, (v - 0.15) / 0.55)));
  });

  const activeCodeLine = Math.floor(progress * (CODE_LINES.length - 1));

  return (
    <section ref={containerRef} className={s.section} style={{ minHeight: '180vh' }}>
      <div className={s.sectionLabel}>Evidence</div>
      <h2 className={s.sectionTitle}>No black box.</h2>
      <div className={s.evidenceSplit}>
        <div className={s.evidenceText} style={{ position: 'sticky', top: '30vh' }}>
          {EVIDENCE_WORDS.map((word, i) => {
            const wordProgress = i / EVIDENCE_WORDS.length;
            const isRevealed = progress > wordProgress;
            return (
              <span
                key={i}
                className={s.evidenceWord}
                style={{ color: isRevealed ? 'var(--ch-fg)' : 'var(--ch-fg-dim)' }}
              >
                {word}{' '}
              </span>
            );
          })}
        </div>
        <div className={s.codeBlock}>
          {CODE_LINES.map((line, i) => (
            <code
              key={i}
              className={i === activeCodeLine ? s.codeLineActive : s.codeLineInactive}
              style={{ display: 'block', padding: '1px 8px', borderRadius: 3, transition: 'all 0.2s' }}
            >
              {line || '\u00A0'}
            </code>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Benchmarks ─── */
const BENCH_DATA = [
  { model: 'Flash v2', mrr: '0.8340', speed: '339ms', size: '16.6MB', quant: 'int8' },
  { model: 'Auto', mrr: '—', speed: 'adaptive', size: '—', quant: '—' },
  { model: 'Pro v2', mrr: '0.9209', speed: '430ms', size: '~102MB', quant: 'float32', highlight: true },
];

function CHBenchmarks() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className={s.section} style={{ background: 'var(--ch-dark-2)' }}>
      <div className={s.sectionLabel}>Benchmarks</div>
      <h2 className={s.sectionTitle}>Measured, not marketed.</h2>
      <p className={s.sectionDesc}>
        MRR@10 on the canonical file retrieval test set. All measurements on a single consumer CPU.
      </p>
      <motion.table
        className={s.benchTable}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <thead>
          <tr>
            <th>Model</th>
            <th>MRR@10</th>
            <th>Speed (1k files)</th>
            <th>Size</th>
            <th>Quantization</th>
          </tr>
        </thead>
        <tbody>
          {BENCH_DATA.map((row) => (
            <tr key={row.model}>
              <td className={row.highlight ? s.benchHighlight : undefined}>{row.model}</td>
              <td className={row.highlight ? s.benchHighlight : undefined}>{row.mrr}</td>
              <td>{row.speed}</td>
              <td>{row.size}</td>
              <td>{row.quant}</td>
            </tr>
          ))}
        </tbody>
      </motion.table>
    </section>
  );
}

/* ─── Security ─── */
function CHSecurity() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className={s.section}>
      <div className={s.sectionLabel}>Security</div>
      <h2 className={s.sectionTitle}>Local-first. Always.</h2>
      <p className={s.sectionDesc}>
        Your files never leave your device. Every cache entry is cryptographically signed.
      </p>
      <motion.div
        className={s.securityGrid}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
      >
        <div className={s.securityCard}>
          <div className={s.securityCaption}>Signing</div>
          <h3 className={s.securityTitle}>HMAC-SHA256</h3>
          <p className={s.securityDesc}>Every embedding cache entry is signed with a device-derived key.</p>
        </div>
        <div className={s.securityCard}>
          <div className={s.securityCaption}>Storage</div>
          <h3 className={s.securityTitle}>ADS / xattr</h3>
          <p className={s.securityDesc}>Embeddings stored in NTFS Alternate Data Streams or Unix extended attributes.</p>
        </div>
        <div className={s.securityCard}>
          <div className={s.securityCaption}>Attestation</div>
          <h3 className={s.securityTitle}>Ed25519</h3>
          <p className={s.securityDesc}>Cryptographic attestation of search integrity with digital signatures.</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(243,245,247,0.06)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}
      >
        <DemoSurface
          initialView="search"
          initialQuery="journalist source documents"
          initialMode="pro"
          autoRun
          style={{ minHeight: 360 }}
        />
      </motion.div>
    </section>
  );
}

/* ─── CTA ─── */
function CHCTA() {
  return (
    <section className={s.cta}>
      <div className={s.sectionLabel}>Get Started</div>
      <h2 className={s.sectionTitle}>Precision starts here.</h2>
      <p className={s.sectionDesc} style={{ margin: '0 auto 40px', textAlign: 'center' }}>
        Download Ixos and experience search without abstraction.
      </p>
      <div>
        <a href="/2/download" className={s.ctaButton}>Download Ixos</a>
        <a href="/2/docs" className={s.ctaButtonOutline}>Read the Docs</a>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function CHFooter() {
  return (
    <footer className={s.footer}>
      <p className={s.footerText}>Ixos Protocol — Measured search. Built with Rust.</p>
    </footer>
  );
}

/* ═══ Main Page ═══ */
export default function ChamberPage() {
  return (
    <div className={s.page}>
      <NoiseOverlay />
      <CHNav />
      <CHHero />
      <CHEvidence />
      <CHBenchmarks />
      <CHSecurity />
      <CHCTA />
      <CHFooter />
    </div>
  );
}
