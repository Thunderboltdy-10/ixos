"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Terminal, Copy, Check } from "lucide-react";
import {
  CLI_INSTALL_COMMANDS,
  CLI_INSTALL_LOCATIONS,
  detectDesktopPlatform,
  detectInstallOs,
  getDownloadUrl,
  type DownloadPlatform,
  type InstallOs,
} from "@/lib/downloads";

function useDownloadLogic() {
  const [platform, setPlatform] = useState<"windows" | "macos" | "linux">("windows");
  const [macChip, setMacChip] = useState<"apple" | "intel">("apple");
  const [installOs, setInstallOs] = useState<InstallOs>("windows");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = detectDesktopPlatform();
    if (p.startsWith("macos")) setPlatform("macos");
    else if (p.startsWith("linux")) setPlatform("linux");
    else setPlatform("windows");

    if (p === "macos-x64") setMacChip("intel");
    
    setInstallOs(detectInstallOs());
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CLI_INSTALL_COMMANDS[installOs].command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const getDownloadKey = (pid: "windows" | "macos" | "linux"): DownloadPlatform => {
    if (pid === "windows") return "windows-x64";
    if (pid === "linux") return "linux-x64";
    return macChip === "apple" ? "macos-arm64" : "macos-x64";
  };

  const handleDownload = (pid: "windows" | "macos" | "linux") => {
    const url = getDownloadUrl(getDownloadKey(pid));
    window.location.assign(url);
  };

  return { platform, setPlatform, macChip, setMacChip, installOs, setInstallOs, copied, handleCopy, handleDownload };
}

// VARIANT 1: Command Center
function DownloadV1() {
  const { platform, setPlatform, macChip, setMacChip, installOs, setInstallOs, copied, handleCopy, handleDownload } = useDownloadLogic();
  return (
    <div className="max-w-4xl mx-auto py-24 px-6 text-[#E2E8F0] font-mono pt-32">
      <h1 className="text-2xl font-bold mb-8 text-[#F6B94C] uppercase tracking-widest border-b border-[#F6B94C]/20 pb-4">
        Acquisition_Protocol
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {(["macos", "windows", "linux"] as const).map((os) => (
          <div key={os} onClick={() => setPlatform(os)} className={`cursor-pointer p-6 bg-[#0F172A] border transition-colors ${platform === os ? "border-[#F6B94C] shadow-[0_0_15px_rgba(246,185,76,0.1)]" : "border-[#334155] hover:border-[#F6B94C]/50"}`}>
            <h3 className="text-xl font-bold mb-2 text-white capitalize">{os}</h3>
            {os === "macos" && platform === "macos" && (
              <div className="flex gap-2 mb-4">
                <button onClick={(e) => { e.stopPropagation(); setMacChip("apple"); }} className={`px-2 py-1 text-[10px] uppercase border ${macChip === "apple" ? "bg-[#F6B94C] text-black border-[#F6B94C]" : "border-[#334155] text-white/50"}`}>Apple</button>
                <button onClick={(e) => { e.stopPropagation(); setMacChip("intel"); }} className={`px-2 py-1 text-[10px] uppercase border ${macChip === "intel" ? "bg-[#F6B94C] text-black border-[#F6B94C]" : "border-[#334155] text-white/50"}`}>Intel</button>
              </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); handleDownload(os); }} className={`w-full py-2 border text-xs font-bold uppercase tracking-widest ${platform === os ? "bg-[#F6B94C] border-[#F6B94C] text-black hover:bg-[#FCD34D]" : "bg-[#1E293B] border-[#334155] text-[#94A3B8]"}`}>
              Initiate
            </button>
          </div>
        ))}
      </div>
      <div className="p-6 bg-[#1E293B] border-l-2 border-[#F6B94C] flex justify-between items-center">
        <div>
          <div className="text-[#F6B94C] text-xs uppercase tracking-widest mb-2 flex gap-4">
            <button onClick={() => setInstallOs("windows")} className={installOs === "windows" ? "text-[#F6B94C] underline" : "text-white/50"}>WINDOWS</button>
            <button onClick={() => setInstallOs("macos")} className={installOs !== "windows" ? "text-[#F6B94C] underline" : "text-white/50"}>UNIX</button>
          </div>
          <code className="text-[#E2E8F0] text-sm">{CLI_INSTALL_COMMANDS[installOs].command}</code>
        </div>
        <button onClick={handleCopy} className="p-3 bg-black/40 hover:bg-black/60 rounded text-[#F6B94C]">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

// VARIANT 2: Signal Architecture
function DownloadV2() {
  const { platform, setPlatform, macChip, setMacChip, installOs, setInstallOs, copied, handleCopy, handleDownload } = useDownloadLogic();
  return (
    <div className="max-w-5xl mx-auto py-24 px-6 text-[#F1F5F9] font-sans pt-32 text-center">
      <h1 className="text-4xl font-extrabold mb-4 text-[#E2E8F0]">Deploy Ixos</h1>
      <p className="text-[#94A3B8] mb-12 max-w-xl mx-auto">Download the native client to provision your local vector search engine.</p>
      
      <div className="flex flex-col md:flex-row justify-center gap-6 mb-16">
        <button onClick={() => handleDownload(platform)} className="px-8 py-4 bg-[#38BDF8] text-[#0F172A] font-bold rounded-md hover:bg-[#7DD3FC] transition-colors flex items-center justify-center gap-2">
          <Download size={20} /> Download for {platform === 'macos' ? (macChip === 'apple' ? 'Mac (Apple Silicon)' : 'Mac (Intel)') : platform}
        </button>
        <div className="flex gap-2">
          {(["macos", "windows", "linux"] as const).map(p => (
            p !== platform && <button key={p} onClick={() => setPlatform(p)} className="px-4 py-4 bg-[#1E293B] border border-[#334155] text-[#E2E8F0] font-bold rounded-md hover:bg-[#334155] transition-colors capitalize">{p}</button>
          ))}
        </div>
      </div>

      <div className="text-left bg-[#0F172A] p-8 rounded-xl border border-[#334155] max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#38BDF8] to-transparent" />
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[#38BDF8]">Terminal Provisioning</h3>
          <select value={installOs} onChange={(e) => setInstallOs(e.target.value as any)} className="bg-[#1E293B] text-xs border border-[#334155] rounded px-2 py-1 outline-none">
            <option value="windows">Windows</option>
            <option value="macos">macOS / Linux</option>
          </select>
        </div>
        <div className="bg-[#1E293B] p-4 rounded text-sm text-[#E2E8F0] font-mono flex justify-between items-center border border-[#334155]">
          <span>{CLI_INSTALL_COMMANDS[installOs].command}</span>
          <button onClick={handleCopy} className="text-[#38BDF8] hover:text-white transition-colors">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// VARIANT 3: Precision Grid
function DownloadV3() {
  const { platform, setPlatform, macChip, setMacChip, installOs, setInstallOs, copied, handleCopy, handleDownload } = useDownloadLogic();
  return (
    <div className="max-w-4xl mx-auto py-24 px-6 text-[#F3F5F7] font-mono pt-32">
      <div className="border border-[#14B8A6]/20 bg-[#14B8A6]/[0.02] p-8 relative">
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#14B8A6]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#14B8A6]" />
        <div className="text-[#14B8A6] text-sm mb-6">{'>>'} INITIALIZE_DOWNLOAD</div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {(["macos", "windows", "linux"] as const).map(p => (
            <div key={p} className={`p-4 border ${platform === p ? 'border-[#14B8A6] bg-[#14B8A6]/10' : 'border-white/10'} transition-all`}>
              <div className="text-white font-bold mb-1 uppercase cursor-pointer" onClick={() => setPlatform(p)}>{p}</div>
              {p === "macos" && platform === "macos" && (
                <select value={macChip} onChange={(e) => setMacChip(e.target.value as any)} className="bg-black border border-[#14B8A6]/50 text-xs p-1 mb-2 w-full outline-none">
                  <option value="apple">Apple Silicon</option>
                  <option value="intel">Intel</option>
                </select>
              )}
              <button onClick={() => handleDownload(p)} className="w-full py-1.5 mt-2 bg-[#14B8A6] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors">
                Acquire
              </button>
            </div>
          ))}
        </div>

        <div className="text-[#14B8A6] text-sm mb-2 flex justify-between items-center">
          <span>{'>>'} TERMINAL_FETCH</span>
          <div className="flex gap-2">
            <button onClick={() => setInstallOs('windows')} className={`text-[10px] ${installOs === 'windows' ? 'text-[#14B8A6]' : 'text-white/30'}`}>WIN</button>
            <button onClick={() => setInstallOs('macos')} className={`text-[10px] ${installOs !== 'windows' ? 'text-[#14B8A6]' : 'text-white/30'}`}>UNIX</button>
          </div>
        </div>
        <div className="text-white/90 bg-black/40 p-3 border border-white/10 text-sm flex justify-between items-center">
          {CLI_INSTALL_COMMANDS[installOs].command}
          <button onClick={handleCopy}>{copied ? <Check size={14} className="text-[#14B8A6]" /> : <Copy size={14} />}</button>
        </div>
      </div>
    </div>
  );
}

// VARIANT 4: Spatial Immersion
function DownloadV4() {
  const { platform, setPlatform, macChip, setMacChip, installOs, setInstallOs, copied, handleCopy, handleDownload } = useDownloadLogic();
  return (
    <div className="max-w-4xl mx-auto py-24 px-8 text-white font-sans pt-32">
      <div className="mb-16">
        <h1 className="text-5xl font-light mb-4">Get Ixos</h1>
        <p className="text-white/50 text-lg">Bring intelligent vector search directly to your desktop.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="p-8 bg-white/[0.03] border border-white/5 rounded-2xl backdrop-blur-md relative group transition-colors hover:bg-white/[0.05]">
           <div className="flex items-center gap-4 mb-8">
             <div className="w-12 h-12 rounded-full bg-[#2DD4BF]/20 flex items-center justify-center text-[#2DD4BF]">
               <Download size={24} />
             </div>
             <div>
               <div className="text-xl font-medium">Desktop App</div>
               <div className="text-sm text-white/50 capitalize">{platform}</div>
             </div>
           </div>
           
           <div className="flex flex-col gap-3">
             <div className="flex gap-2 mb-2">
               {(["macos", "windows", "linux"] as const).map(p => (
                 <button key={p} onClick={() => setPlatform(p)} className={`px-3 py-1 rounded-full text-xs transition-colors ${platform === p ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{p}</button>
               ))}
             </div>
             {platform === 'macos' && (
               <div className="flex gap-2">
                 <button onClick={() => setMacChip('apple')} className={`px-3 py-1 rounded-full text-xs transition-colors ${macChip === 'apple' ? 'bg-[#2DD4BF]/20 text-[#2DD4BF]' : 'bg-white/5 text-white/40'}`}>Apple Silicon</button>
                 <button onClick={() => setMacChip('intel')} className={`px-3 py-1 rounded-full text-xs transition-colors ${macChip === 'intel' ? 'bg-[#2DD4BF]/20 text-[#2DD4BF]' : 'bg-white/5 text-white/40'}`}>Intel</button>
               </div>
             )}
             <button onClick={() => handleDownload(platform)} className="w-full py-3 bg-[#2DD4BF] text-[#0C0E10] rounded-xl font-medium mt-2 hover:bg-[#5EEAD4] transition-colors">
               Download Latest
             </button>
           </div>
        </div>

        <div className="p-8 bg-white/[0.03] border border-white/5 rounded-2xl backdrop-blur-md relative group transition-colors">
           <div className="flex items-center gap-4 mb-8">
             <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/70">
               <Terminal size={24} />
             </div>
             <div>
               <div className="text-xl font-medium">CLI Tool</div>
               <div className="text-sm text-white/50">via Terminal</div>
             </div>
           </div>
           <div className="flex gap-2 mb-4">
             <button onClick={() => setInstallOs('windows')} className={`px-3 py-1 rounded-full text-xs transition-colors ${installOs === 'windows' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}>Windows</button>
             <button onClick={() => setInstallOs('macos')} className={`px-3 py-1 rounded-full text-xs transition-colors ${installOs !== 'windows' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}>macOS / Linux</button>
           </div>
           <div className="bg-[#0A0D0F] border border-white/10 rounded-xl p-4 flex justify-between items-center text-sm font-mono text-[#2DD4BF]">
             <span className="truncate">{CLI_INSTALL_COMMANDS[installOs].command}</span>
             <button onClick={handleCopy} className="text-white/40 hover:text-white shrink-0 ml-4">
               {copied ? <Check size={16} /> : <Copy size={16} />}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}

// VARIANT 5: Director's Cut
function DownloadV5() {
  const { platform, setPlatform, macChip, setMacChip, installOs, setInstallOs, copied, handleCopy, handleDownload } = useDownloadLogic();
  return (
    <div className="max-w-4xl mx-auto py-24 px-6 text-white font-mono pt-32 text-center">
      <h1 className="text-3xl font-bold mb-4 uppercase tracking-widest text-[#2DD4BF]">Deployment</h1>
      <p className="text-white/40 mb-12">Secure your local environment with native processing.</p>
      
      <div className="inline-flex flex-col gap-6 items-center">
        <div className="flex gap-4">
          {(["macos", "windows", "linux"] as const).map(p => (
            <button key={p} onClick={() => setPlatform(p)} className={`text-xs uppercase tracking-widest px-4 py-2 border rounded transition-colors ${platform === p ? 'border-[#2DD4BF] text-[#2DD4BF] bg-[#2DD4BF]/5' : 'border-white/10 text-white/50 hover:text-white'}`}>{p}</button>
          ))}
        </div>
        
        {platform === 'macos' && (
          <div className="flex gap-4">
             <button onClick={() => setMacChip('apple')} className={`text-[10px] uppercase tracking-widest ${macChip === 'apple' ? 'text-white' : 'text-white/30'}`}>[ Apple Silicon ]</button>
             <button onClick={() => setMacChip('intel')} className={`text-[10px] uppercase tracking-widest ${macChip === 'intel' ? 'text-white' : 'text-white/30'}`}>[ Intel ]</button>
          </div>
        )}

        <button onClick={() => handleDownload(platform)} className="px-12 py-4 bg-[#2DD4BF] text-[#0C0E10] font-bold tracking-widest uppercase text-sm hover:bg-[#5EEAD4] transition-colors rounded shadow-[0_0_20px_rgba(45,212,191,0.2)]">
          Download Image
        </button>
      </div>

      <div className="mt-20 border-t border-white/10 pt-12">
        <div className="text-white/30 text-xs mb-4 uppercase tracking-widest flex items-center justify-center gap-4">
           <span>Or install via terminal</span>
           <select value={installOs} onChange={(e) => setInstallOs(e.target.value as any)} className="bg-transparent border-b border-white/20 text-white/80 outline-none text-[10px]">
             <option value="windows" className="bg-black">Windows</option>
             <option value="macos" className="bg-black">Unix</option>
           </select>
        </div>
        <div className="inline-flex items-center px-6 py-3 bg-white/5 border border-white/10 text-white/80 rounded gap-4">
          <code className="text-[#2DD4BF]">{CLI_INSTALL_COMMANDS[installOs].command}</code>
          <button onClick={handleCopy} className="text-white/50 hover:text-white">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DownloadContent({ variant = "5" }: { variant?: string }) {
  switch (variant) {
    case "1": return <DownloadV1 />;
    case "2": return <DownloadV2 />;
    case "3": return <DownloadV3 />;
    case "4": return <DownloadV4 />;
    case "5": return <DownloadV5 />;
    default: return <DownloadV5 />;
  }
}
