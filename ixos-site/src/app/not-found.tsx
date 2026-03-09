"use client";

import Link from "next/link";
import { V4AmbientField } from "./5/_v4/V4AmbientField";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0C0E10] text-[#F3F5F7] font-mono flex flex-col items-center justify-center relative overflow-hidden">
      <V4AmbientField />
      
      <div className="relative z-10 text-center p-8 backdrop-blur-sm bg-white/[0.02] border border-white/10 rounded-xl">
        <h1 className="text-8xl font-bold text-teal-400 mb-4 tracking-tighter">404</h1>
        <p className="text-xl text-white/60 uppercase tracking-widest mb-8">Signal Lost</p>
        <p className="text-sm text-white/40 max-w-sm mx-auto mb-8">
          The requested coordinate does not exist in the local vector cache or the remote index.
        </p>
        
        <Link 
          href="/"
          className="px-6 py-3 border border-teal-400/30 text-teal-400 font-bold uppercase tracking-widest text-xs hover:bg-teal-400/10 transition-colors"
        >
          Return to Hub
        </Link>
      </div>
    </div>
  );
}
