import os
import json

base_dir = "ixos-site/src/app"

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "
")

# PAGE 1 - MISSION CONTROL
create_file(f"{base_dir}/1/layout.tsx", """
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ixos | Mission Control',
  description: 'Enter the operational core of Ixos Search.',
};

export default function MissionControlLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#0C0E10] text-porcelain min-h-screen font-sans">{children}</div>;
}
""")

create_file(f"{base_dir}/1/page.tsx", """
import MissionControlPage from './_mc/MissionControlPage';
export default function Page() { return <MissionControlPage />; }
""")

create_file(f"{base_dir}/1/_mc/mc.module.css", """
.mcContainer {
  position: relative;
  background-color: #0C0E10;
  overflow-x: hidden;
  --teal: #14B8A6;
  --amber: #F6B94C;
  --violet: #7C5CFF;
}

.noiseOverlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  opacity: 0.035;
  mix-blend-mode: overlay;
}

.dotGrid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(20, 184, 166, 0.15) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
}

.hudBorder {
  border: 1px solid rgba(20, 184, 166, 0.2);
  background: rgba(12, 14, 16, 0.6);
  backdrop-filter: blur(12px);
}
""")

create_file(f"{base_dir}/1/_mc/MissionControlPage.tsx", """
'use client';
import { useEffect } from 'react';
import styles from './mc.module.css';
import MCHero from './MCHero';
import MCSpeed from './MCSpeed';
import MCPipeline from './MCPipeline';
import MCPrivacy from './MCPrivacy';
import MCProduct from './MCProduct';
import MCCTA from './MCCTA';
import Lenis from '@studio-freight/lenis';

export default function MissionControlPage() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div className={styles.mcContainer}>
      <svg className={styles.noiseOverlay} width="100%" height="100%">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)"/>
      </svg>
      <MCHero />
      <MCSpeed />
      <MCPipeline />
      <MCPrivacy />
      <MCProduct />
      <MCCTA />
    </div>
  );
}
""")

create_file(f"{base_dir}/1/_mc/MCHero.tsx", """
'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import styles from './mc.module.css';

export default function MCHero() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: (e.clientX / window.innerWidth - 0.5) * 12, y: (e.clientY / window.innerHeight - 0.5) * 12 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className={styles.dotGrid} />
      <motion.div style={{ y }} className="z-10 text-center flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-[#14B8A6] mb-6">
          COMMAND YOUR DATA
        </h1>
        <p className="text-[#F6B94C] font-mono mb-12">STATUS: OPERATIONAL | LATENCY: <span className="animate-pulse">7MS</span></p>
        <motion.div 
          animate={{ rotateX: mousePos.y, rotateY: mousePos.x }}
          className={`w-[65vw] h-[40vw] rounded-xl ${styles.hudBorder} p-2 flex flex-col shadow-[0_0_50px_rgba(20,184,166,0.15)]`}
        >
          <div className="h-6 w-full border-b border-[#14B8A6]/20 flex items-center px-4 gap-2">
             <div className="w-2 h-2 rounded-full bg-[#14B8A6]/50" />
             <div className="w-2 h-2 rounded-full bg-[#14B8A6]/50" />
             <div className="w-2 h-2 rounded-full bg-[#14B8A6]/50" />
          </div>
          <div className="flex-1 flex items-center justify-center bg-[#080A0C] rounded-b-lg">
             <div className="text-[#14B8A6] font-mono text-sm">[ SYSTEM READY ]</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
""")

create_file(f"{base_dir}/1/_mc/MCSpeed.tsx", """
export default function MCSpeed() {
  return (
    <section className="py-32 px-12 border-t border-[#14B8A6]/20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Query Time', val: '7ms' },
          { label: 'Index Speed', val: '2M/s' },
          { label: 'Accuracy', val: '99.9%' }
        ].map((stat, i) => (
          <div key={i} className="border border-[#14B8A6]/20 bg-[#0C0E10] p-8 rounded-xl relative overflow-hidden group hover:border-[#F6B94C]/50 transition-colors">
            <div className="text-4xl font-bold text-[#14B8A6] mb-2">{stat.val}</div>
            <div className="text-[#F6B94C] font-mono text-sm">{stat.label}</div>
            <div className="absolute bottom-0 left-0 h-1 bg-[#14B8A6] w-0 group-hover:w-full transition-all duration-1000" />
          </div>
        ))}
      </div>
    </section>
  );
}
""")

create_file(f"{base_dir}/1/_mc/MCPipeline.tsx", """
'use client';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

export default function MCPipeline() {
  const container = useRef<HTMLDivElement>(null);
  const panels = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (!container.current || !panels.current) return;
    const ctx = gsap.context(() => {
      gsap.to(panels.current, {
        xPercent: -75,
        ease: 'none',
        scrollTrigger: {
          trigger: container.current,
          pin: true,
          scrub: 1,
          end: () => '+=' + container.current!.offsetWidth,
        }
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section ref={container} className="h-screen overflow-hidden bg-[#0A0C0E] border-y border-[#14B8A6]/20">
      <div ref={panels} className="flex h-full w-[400vw]">
        {['JIT SCAN', 'LEXICAL', 'SEMANTIC', 'LOCK'].map((step, i) => (
          <div key={i} className="w-[100vw] h-full flex items-center justify-center border-r border-[#14B8A6]/10 relative">
            <div className="absolute top-12 left-12 text-[#14B8A6] opacity-30 text-9xl font-bold font-mono">0{i+1}</div>
            <h2 className="text-5xl font-bold tracking-widest text-[#F6B94C]">{step}</h2>
          </div>
        ))}
      </div>
    </section>
  );
}
""")

create_file(f"{base_dir}/1/_mc/MCPrivacy.tsx", """
export default function MCPrivacy() {
  return (
    <section className="py-48 flex items-center justify-center bg-[#0C0E10]">
      <h2 className="text-4xl md:text-6xl font-bold text-center max-w-4xl text-white/50 leading-tight tracking-tight">
        <span className="text-white transition-colors duration-500 hover:text-[#14B8A6]">No cloud.</span>{' '}
        <span className="text-white transition-colors duration-500 hover:text-[#14B8A6]">No telemetry.</span>{' '}
        <span className="text-[#14B8A6] transition-colors duration-500 hover:text-[#F6B94C]">No exceptions.</span>
      </h2>
    </section>
  );
}
""")

create_file(f"{base_dir}/1/_mc/MCProduct.tsx", """
export default function MCProduct() { return <section className="py-32 bg-[#0A0C0E]"><div className="text-center text-[#14B8A6]">PRODUCT DEEP DIVE</div></section>; }
""")
create_file(f"{base_dir}/1/_mc/MCCTA.tsx", """
export default function MCCTA() { return <section className="py-32 flex justify-center"><button className="bg-[#14B8A6] text-[#0C0E10] px-12 py-4 font-bold rounded hover:bg-[#F6B94C] transition-colors font-mono">INITIALIZE DOWNLOAD</button></section>; }
""")

# PAGE 2 - THE CHAMBER
create_file(f"{base_dir}/2/layout.tsx", """
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Ixos | The Chamber', description: 'Clinical precision.' };
export default function ChamberLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#0C0E10] text-white min-h-screen font-sans">{children}</div>;
}
""")
create_file(f"{base_dir}/2/page.tsx", """import ChamberPage from './_ch/ChamberPage'; export default function Page() { return <ChamberPage />; }""")
create_file(f"{base_dir}/2/_ch/ChamberPage.tsx", """
import CHHero from './CHHero';
export default function ChamberPage() {
  return <div className="min-h-screen bg-[#0C0E10] text-[#f3f5f7] selection:bg-[#7C5CFF] selection:text-white"><CHHero /></div>;
}
""")
create_file(f"{base_dir}/2/_ch/CHHero.tsx", """
'use client';
import { motion } from 'framer-motion';
export default function CHHero() {
  return (
    <div className="h-screen flex items-center justify-center relative overflow-hidden bg-black">
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,92,255,0.15)_0,transparent_50%)]" />
       <motion.h1 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ duration: 1.5, ease: "easeOut" }}
         className="text-6xl md:text-8xl font-medium tracking-tight z-10"
       >
         Precision. <span className="text-[#7C5CFF]">Redefined.</span>
       </motion.h1>
    </div>
  );
}
""")

# PAGE 3 - THE WIRE
create_file(f"{base_dir}/3/layout.tsx", """
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Ixos | The Wire', description: 'Data flowing through circuits.' };
export default function WireLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#111] text-white min-h-screen font-sans">{children}</div>;
}
""")
create_file(f"{base_dir}/3/page.tsx", """import WirePage from './_wire/WirePage'; export default function Page() { return <WirePage />; }""")
create_file(f"{base_dir}/3/_wire/WirePage.tsx", """
import WireHero from './WireHero';
export default function WirePage() {
  return <div className="min-h-screen bg-[#111] text-[#eee]"><WireHero /></div>;
}
""")
create_file(f"{base_dir}/3/_wire/WireHero.tsx", """
export default function WireHero() {
  return (
    <div className="h-screen flex flex-col justify-center px-12 relative">
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,#F6B94C_0%,#7C5CFF_100%)] blur-[100px]" />
      <h1 className="text-8xl font-black uppercase tracking-tighter leading-[0.8] z-10 mix-blend-difference">
        THE <br/><span className="text-[#F6B94C]">WIRE</span>
      </h1>
      <p className="mt-8 font-mono text-xl z-10 border-l-4 border-[#7C5CFF] pl-4">HIGH SPEED. NO LAG.</p>
    </div>
  );
}
""")

print("Landing pages generated.")
