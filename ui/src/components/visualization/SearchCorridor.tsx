import { useEffect, useRef, useCallback } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { useLayoutStore } from '@/stores/layoutStore';

// Animation constants
const COLORS = {
  teal: { r: 13, g: 148, b: 136 },      // #0d9488
  cyan: { r: 6, g: 182, b: 212 },        // #06b6d4
  white: { r: 255, g: 255, b: 255 },
};

// Arc configuration
const ARC_CONFIG = {
  maxArcs: 4,
  minArcs: 1,
  travelTime: 500,        // ms to travel full height
  spawnInterval: 300,     // ms between arc spawns
  width: 1.5,
  glowRadius: 6,
  curveAmplitude: 30,     // max horizontal deviation
};

// Dust configuration
const DUST_CONFIG = {
  count: 40,
  speed: 2,               // pixels per frame
  size: 1,
  alpha: 0.3,
};

// Spark configuration
const SPARK_CONFIG = {
  travelTime: 280,        // ms
  size: 4,
  glowRadius: 12,
  trailLength: 5,
};

// Signal connector configuration
const SIGNAL_CONFIG = {
  travelTime: 200,        // ms - fast travel from search bar to deck
  width: 2,
  glowRadius: 8,
};

interface Arc {
  id: number;
  progress: number;       // 0-1
  curvePhase: number;     // random offset for curve
  alpha: number;
}

interface Dust {
  x: number;
  y: number;
  speed: number;
  alpha: number;
}

interface Spark {
  id: number;
  startY: number;
  targetY: number;
  startTime: number;
  progress: number;       // 0-1
  trail: { x: number; y: number; alpha: number }[];
  x: number;
  y: number;
  alpha: number;
}

interface SignalPulse {
  id: number;
  startTime: number;
  progress: number;
}

// Fade-out duration when search completes (ms)
const FADE_OUT_DURATION = 500;

export function SearchCorridor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  // Animation state refs (mutable for performance)
  const arcsRef = useRef<Arc[]>([]);
  const dustRef = useRef<Dust[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const signalPulsesRef = useRef<SignalPulse[]>([]);
  const arcIdRef = useRef(0);
  const sparkIdRef = useRef(0);
  const signalIdRef = useRef(0);
  const lastSignalSpawnRef = useRef(0);

  // Fade-out tracking for DONE transition
  const fadeOutStartRef = useRef<number | null>(null);
  const fadeOutProgressRef = useRef(0);

  // Store selectors
  const phase = useSearchStore((s) => s.phase);
  const streamStage = useSearchStore((s) => s.streamStage);
  const pendingSparkTargets = useSearchStore((s) => s.pendingSparkTargets);
  const consumeSparkTarget = useSearchStore((s) => s.consumeSparkTarget);
  const hasSearchIntent = useSearchStore((s) => s.hasSearchIntent);

  const searchBarBox = useLayoutStore((s) => s.searchBarBox);
  const deckUnderlineBox = useLayoutStore((s) => s.deckUnderlineBox);
  const resultBoxes = useLayoutStore((s) => s.resultBoxes);
  const ghostSlotBoxes = useLayoutStore((s) => s.ghostSlotBoxes);

  const isActive = phase === 'lexical' || phase === 'semantic' || phase === 'refining' || hasSearchIntent;
  const isComplete = phase === 'complete';
  const isSemantic = streamStage === 'semantic' || streamStage === 'refining' || streamStage === 'tail';

  // Reset fade-out when starting new search
  useEffect(() => {
    if (isActive && !isComplete) {
      fadeOutStartRef.current = null;
      fadeOutProgressRef.current = 0;
    }
  }, [isActive, isComplete]);

  // Initialize dust particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    dustRef.current = Array.from({ length: DUST_CONFIG.count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: DUST_CONFIG.speed * (0.5 + Math.random()),
      alpha: DUST_CONFIG.alpha * Math.random(),
    }));
  }, []);

  // Handle spark creation when new results arrive
  useEffect(() => {
    if (pendingSparkTargets.length === 0 || !deckUnderlineBox) return;

    const target = consumeSparkTarget();
    if (target === null) return;

    // Find target Y position from result boxes or ghost slots
    const resultBox = resultBoxes.get(target);
    const ghostBox = ghostSlotBoxes.get(target);
    const targetBox = resultBox || ghostBox;

    if (!targetBox) return;

    const spark: Spark = {
      id: sparkIdRef.current++,
      startY: deckUnderlineBox.y,
      targetY: targetBox.y,
      startTime: performance.now(),
      progress: 0,
      trail: [],
      x: 0,
      y: 0,
      alpha: 1,
    };

    sparksRef.current.push(spark);
  }, [pendingSparkTargets, consumeSparkTarget, deckUnderlineBox, resultBoxes, ghostSlotBoxes]);

  // Easing function
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // Draw functions
  const drawArc = useCallback((
    ctx: CanvasRenderingContext2D,
    arc: Arc,
    centerX: number,
    height: number,
    color: typeof COLORS.teal
  ) => {
    const y = arc.progress * height;
    const curveX = Math.sin(arc.progress * Math.PI * 2 + arc.curvePhase) * ARC_CONFIG.curveAmplitude;
    const x = centerX + curveX;

    // Glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, ARC_CONFIG.glowRadius);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${arc.alpha * 0.6})`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, ARC_CONFIG.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${arc.alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, ARC_CONFIG.width, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const drawDust = useCallback((
    ctx: CanvasRenderingContext2D,
    dust: Dust,
    color: typeof COLORS.teal
  ) => {
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${dust.alpha})`;
    ctx.beginPath();
    ctx.arc(dust.x, dust.y, DUST_CONFIG.size, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const drawSpark = useCallback((
    ctx: CanvasRenderingContext2D,
    spark: Spark,
    centerX: number,
    color: typeof COLORS.cyan
  ) => {
    const y = spark.startY + (spark.targetY - spark.startY) * easeOutCubic(spark.progress);

    // Draw trail
    spark.trail.forEach((point: { x: number; y: number; alpha: number }, i: number) => {
      const trailAlpha = (1 - i / spark.trail.length) * 0.5;
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${trailAlpha})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, SPARK_CONFIG.size * (1 - i / spark.trail.length), 0, Math.PI * 2);
      ctx.fill();
    });

    // Update trail
    spark.trail.unshift({ x: centerX, y, alpha: 1 });
    if (spark.trail.length > SPARK_CONFIG.trailLength) {
      spark.trail.pop();
    }

    // Glow
    const gradient = ctx.createRadialGradient(centerX, y, 0, centerX, y, SPARK_CONFIG.glowRadius);
    gradient.addColorStop(0, `rgba(${COLORS.white.r}, ${COLORS.white.g}, ${COLORS.white.b}, 0.9)`);
    gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, 0.7)`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, y, SPARK_CONFIG.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Core (bright white)
    ctx.fillStyle = `rgba(255, 255, 255, 0.95)`;
    ctx.beginPath();
    ctx.arc(centerX, y, SPARK_CONFIG.size, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Draw signal connector pulse from search bar to deck
  const drawSignalPulse = useCallback((
    ctx: CanvasRenderingContext2D,
    pulse: SignalPulse,
    startY: number,
    endY: number,
    centerX: number,
    color: typeof COLORS.teal
  ) => {
    const progress = easeInOutQuad(pulse.progress);
    const y = startY + (endY - startY) * progress;

    // Trail effect
    const trailLength = 20;
    const trailStart = Math.max(startY, y - trailLength);

    // Draw gradient trail
    const gradient = ctx.createLinearGradient(centerX, trailStart, centerX, y);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = SIGNAL_CONFIG.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX, trailStart);
    ctx.lineTo(centerX, y);
    ctx.stroke();

    // Glow at head
    const glowGradient = ctx.createRadialGradient(centerX, y, 0, centerX, y, SIGNAL_CONFIG.glowRadius);
    glowGradient.addColorStop(0, `rgba(${COLORS.white.r}, ${COLORS.white.g}, ${COLORS.white.b}, 0.9)`);
    glowGradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`);
    glowGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(centerX, y, SIGNAL_CONFIG.glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const tick = (now: number) => {
      const dt = Math.min(33, now - lastTimeRef.current); // Cap at ~30fps worth of dt
      lastTimeRef.current = now;

      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const height = rect.height;

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, height);

      const color = isSemantic ? COLORS.cyan : COLORS.teal;

      // Draw faint corridor rails (only during active search, fade with complete)
      if ((isActive || isComplete) && fadeOutProgressRef.current < 1) {
        const railAlpha = isComplete ? 0.04 * (1 - fadeOutProgressRef.current) : 0.04;
        const railOffset = 100; // Corridor width from center

        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${railAlpha})`;
        ctx.lineWidth = 1;

        // Left rail
        ctx.beginPath();
        ctx.moveTo(centerX - railOffset, 0);
        ctx.lineTo(centerX - railOffset, height);
        ctx.stroke();

        // Right rail
        ctx.beginPath();
        ctx.moveTo(centerX + railOffset, 0);
        ctx.lineTo(centerX + railOffset, height);
        ctx.stroke();
      }

      // Handle fade-out on complete
      if (isComplete) {
        if (fadeOutStartRef.current === null) {
          fadeOutStartRef.current = now;
        }
        fadeOutProgressRef.current = Math.min(1, (now - fadeOutStartRef.current) / FADE_OUT_DURATION);

        // If fade-out is complete, clear all animations and stop drawing
        if (fadeOutProgressRef.current >= 1) {
          arcsRef.current = [];
          dustRef.current = [];
          sparksRef.current = [];
          signalPulsesRef.current = [];
          frameRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      // Global alpha multiplier for fade-out
      const fadeMultiplier = isComplete ? 1 - fadeOutProgressRef.current : 1;

      // Spawn signal pulses from search bar to deck when search intent starts
      if (hasSearchIntent && !isComplete && searchBarBox && deckUnderlineBox) {
        // Spawn signal pulse every 600ms
        if (now - lastSignalSpawnRef.current > 600) {
          signalPulsesRef.current.push({
            id: signalIdRef.current++,
            startTime: now,
            progress: 0,
          });
          lastSignalSpawnRef.current = now;
        }
      }

      // Draw and update signal pulses
      if (searchBarBox && deckUnderlineBox) {
        const searchBarY = searchBarBox.top + searchBarBox.height - rect.top;
        const deckY = deckUnderlineBox.top - rect.top;

        signalPulsesRef.current = signalPulsesRef.current.filter(pulse => {
          pulse.progress = Math.min(1, (now - pulse.startTime) / SIGNAL_CONFIG.travelTime);

          if (pulse.progress >= 1) return false;

          ctx.save();
          ctx.globalAlpha = fadeMultiplier;
          drawSignalPulse(ctx, pulse, searchBarY, deckY, centerX, color);
          ctx.restore();
          return true;
        });
      }

      // Spawn arcs during active search (not when complete)
      if (isActive && !isComplete && now - lastSpawnRef.current > ARC_CONFIG.spawnInterval) {
        if (arcsRef.current.length < ARC_CONFIG.maxArcs) {
          arcsRef.current.push({
            id: arcIdRef.current++,
            progress: 0,
            curvePhase: Math.random() * Math.PI * 2,
            alpha: 0.6 + Math.random() * 0.4,
          });
          lastSpawnRef.current = now;
        }
      }

      // Update and draw arcs
      arcsRef.current = arcsRef.current.filter(arc => {
        arc.progress += dt / ARC_CONFIG.travelTime;

        if (arc.progress >= 1) return false;

        // Fade in at start, fade out at end
        const fadeAlpha = arc.progress < 0.1
          ? arc.progress / 0.1
          : arc.progress > 0.9
            ? (1 - arc.progress) / 0.1
            : 1;

        const adjustedArc = { ...arc, alpha: arc.alpha * fadeAlpha * fadeMultiplier };
        drawArc(ctx, adjustedArc, centerX, height, color);
        return true;
      });

      // Update and draw dust (only during active search, fade during complete)
      if (isActive || (isComplete && fadeMultiplier > 0)) {
        dustRef.current.forEach(dust => {
          if (!isComplete) {
            dust.y += dust.speed;
            if (dust.y > height) {
              dust.y = 0;
              dust.x = centerX + (Math.random() - 0.5) * 200;
            }
          }

          // Only draw dust within corridor bounds, with fade multiplier
          if (Math.abs(dust.x - centerX) < 100) {
            const fadedDust = { ...dust, alpha: dust.alpha * fadeMultiplier };
            drawDust(ctx, fadedDust, color);
          }
        });
      }

      // Update and draw sparks (with fade multiplier)
      sparksRef.current = sparksRef.current.filter(spark => {
        spark.progress = Math.min(1, (now - spark.startTime) / SPARK_CONFIG.travelTime);

        if (spark.progress >= 1) return false;

        // Apply fade multiplier to spark alpha via context globalAlpha
        ctx.save();
        ctx.globalAlpha = fadeMultiplier;
        drawSpark(ctx, spark, centerX, COLORS.cyan);
        ctx.restore();
        return true;
      });

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [isActive, isComplete, isSemantic, hasSearchIntent, searchBarBox, deckUnderlineBox, drawArc, drawDust, drawSpark, drawSignalPulse]);

  // Don't render if no search intent
  if (!hasSearchIntent && phase === 'idle') return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />
    </div>
  );
}
