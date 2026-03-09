"use client";

import { useUser } from "@clerk/nextjs";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { Terminal, Shield, Zap, Box, User, CreditCard, Laptop } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// VARIANT 1
function AccountV1({ variant }: { variant: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [activeTab, setActiveTab] = useState("profile");
  const { data: subscription } = useSWR("/api/account/subscription", fetcher);
  const { data: devices } = useSWR("/api/desktop/devices", fetcher);

  if (!isLoaded) return <div className="p-12 font-mono text-[#F6B94C]/50">INITIALIZING_SESSION...</div>;
  if (!isSignedIn) { if (typeof window !== "undefined") window.location.href = `/${variant}/signin`; return null; }

  return (
    <div className="max-w-6xl mx-auto px-6 py-24 flex flex-col md:flex-row gap-12 font-mono text-sm min-h-screen pt-32 text-[#E2E8F0]">
      <div className="w-full md:w-56 shrink-0 flex flex-col gap-2">
        <h2 className="text-xl font-bold mb-6 text-[#F6B94C] flex items-center gap-2"><Terminal className="w-5 h-5"/> ACCOUNT_CTL</h2>
        {["profile", "subscription", "devices", "billing"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`text-left px-4 py-2 border-l-2 transition-colors uppercase tracking-widest text-xs ${activeTab === t ? "border-[#F6B94C] bg-[#F6B94C]/10 text-[#F6B94C]" : "border-transparent text-[#94A3B8] hover:bg-white/5 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 bg-[#0F172A] border border-[#334155] p-8">
        {activeTab === "profile" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#F6B94C] uppercase tracking-widest border-b border-[#334155] pb-2 mb-6">Identity_Matrix</h3>
            <div className="flex items-center gap-6">
              <img src={user.imageUrl} alt="Avatar" className="w-16 h-16 border border-[#F6B94C]" />
              <div>
                <div className="font-bold text-lg text-white">{user.fullName || "Operator"}</div>
                <div className="text-[#94A3B8]">{user.primaryEmailAddress?.emailAddress}</div>
              </div>
            </div>
            <div className="pt-6 border-t border-[#334155] grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-[#F6B94C] uppercase tracking-widest mb-1">Established</div>
                <div className="text-white">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#F6B94C] uppercase tracking-widest mb-1">UUID</div>
                <div className="text-white truncate">{user.id}</div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#F6B94C] uppercase tracking-widest border-b border-[#334155] pb-2 mb-6">License_State</h3>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-bold text-white mb-2">{subscription?.tier === "pro" ? "PRO_ESCALATION" : "BASE_PROTOCOL"}</div>
              </div>
            </div>
            {subscription?.tier === "pro" && (
              <div className="pt-6 border-t border-[#334155]">
                <div className="text-[10px] text-[#F6B94C] uppercase tracking-widest mb-1">Renewal_Cycle</div>
                <div className="text-white">{subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : "N/A"}</div>
              </div>
            )}
          </div>
        )}
        {activeTab === "devices" && (
          <div className="space-y-6">
             <h3 className="text-lg font-bold text-[#F6B94C] uppercase tracking-widest border-b border-[#334155] pb-2 mb-6">Active_Nodes</h3>
             {devices && devices.length > 0 ? (
               devices.map((d: any) => (
                 <div key={d.id} className="flex items-center justify-between p-4 border border-[#334155] bg-black/20">
                   <div>
                     <div className="font-bold">{d.name}</div>
                     <div className="text-xs text-[#94A3B8] mt-1">Ping: {new Date(d.lastSeen).toLocaleString()}</div>
                   </div>
                 </div>
               ))
             ) : <div className="text-[#94A3B8] italic p-4">No active local nodes detected.</div>}
          </div>
        )}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#F6B94C] uppercase tracking-widest border-b border-[#334155] pb-2 mb-6">Financial_Gateway</h3>
            <a href="https://billing.lemonsqueezy.com" className="inline-block px-6 py-2 border border-[#F6B94C] text-[#F6B94C] hover:bg-[#F6B94C] hover:text-black font-bold uppercase tracking-widest transition-colors text-xs">
              Access LemonSqueezy
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// VARIANT 2
function AccountV2({ variant }: { variant: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [activeTab, setActiveTab] = useState("profile");
  const { data: subscription } = useSWR("/api/account/subscription", fetcher);
  const { data: devices } = useSWR("/api/desktop/devices", fetcher);

  if (!isLoaded) return <div className="p-12 font-sans text-[#38BDF8]">Loading configuration...</div>;
  if (!isSignedIn) { if (typeof window !== "undefined") window.location.href = `/${variant}/signin`; return null; }

  return (
    <div className="max-w-5xl mx-auto px-6 py-24 flex gap-12 font-sans text-sm min-h-screen pt-32 text-[#F1F5F9]">
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <h2 className="text-2xl font-extrabold mb-6 text-[#E2E8F0]">Account</h2>
        {["profile", "subscription", "devices", "billing"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`text-left px-4 py-3 rounded-md transition-colors font-medium capitalize ${activeTab === t ? "bg-[#38BDF8] text-[#0F172A]" : "text-[#94A3B8] hover:bg-[#334155] hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 bg-[#0F172A] rounded-xl p-8 shadow-xl border border-[#334155]">
        {activeTab === "profile" && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#E2E8F0] mb-6">Profile Settings</h3>
            <div className="flex items-center gap-6">
              <img src={user.imageUrl} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-[#38BDF8]/30" />
              <div>
                <div className="font-extrabold text-xl">{user.fullName}</div>
                <div className="text-[#94A3B8] text-base">{user.primaryEmailAddress?.emailAddress}</div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#E2E8F0] mb-6">Current Plan</h3>
            <div className="p-6 bg-[#1E293B] rounded-lg border border-[#334155]">
              <div className="text-2xl font-extrabold text-[#38BDF8] mb-2">{subscription?.tier === "pro" ? "Pro Compute" : "Community Node"}</div>
              <div className="text-[#94A3B8]">{subscription?.tier === "pro" ? "Unlimited workflows enabled." : "Basic search capabilities."}</div>
            </div>
          </div>
        )}
        {activeTab === "devices" && (
           <div className="space-y-6">
             <h3 className="text-xl font-bold text-[#E2E8F0] mb-6">Connected Nodes</h3>
             {devices && devices.length > 0 ? (
               <div className="grid gap-4">
                 {devices.map((d: any) => (
                   <div key={d.id} className="p-4 bg-[#1E293B] rounded-lg border border-[#334155] flex justify-between items-center">
                     <span className="font-medium text-lg">{d.name}</span>
                     <span className="text-sm text-[#94A3B8]">{new Date(d.lastSeen).toLocaleDateString()}</span>
                   </div>
                 ))}
               </div>
             ) : <div className="text-[#94A3B8]">No nodes connected.</div>}
           </div>
        )}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#E2E8F0] mb-6">Billing</h3>
            <a href="https://billing.lemonsqueezy.com" className="inline-block px-6 py-3 bg-[#334155] text-white rounded-md font-bold hover:bg-[#475569] transition-colors">
              Manage Billing
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// VARIANT 3
function AccountV3({ variant }: { variant: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [activeTab, setActiveTab] = useState("profile");
  const { data: subscription } = useSWR("/api/account/subscription", fetcher);
  const { data: devices } = useSWR("/api/desktop/devices", fetcher);

  if (!isLoaded) return <div className="p-12 font-mono text-[#14B8A6]">AWAITING_AUTH...</div>;
  if (!isSignedIn) { if (typeof window !== "undefined") window.location.href = `/${variant}/signin`; return null; }

  return (
    <div className="max-w-6xl mx-auto px-6 py-24 flex gap-8 font-mono text-sm min-h-screen pt-32 text-[#F3F5F7]">
      <div className="w-48 shrink-0 flex flex-col gap-1">
        <div className="text-xs text-[#14B8A6] mb-4">/USER/PREFS</div>
        {["profile", "subscription", "devices", "billing"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`text-left px-3 py-1 text-xs uppercase ${activeTab === t ? "bg-[#14B8A6] text-black font-bold" : "text-white/50 hover:bg-white/10"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 border border-white/10 p-6 relative">
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#14B8A6]" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#14B8A6]" />
        
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="text-[#14B8A6] font-bold text-lg mb-4">{'>>'} IDENTITY</div>
            <div>Name: {user.fullName}</div>
            <div>Email: {user.primaryEmailAddress?.emailAddress}</div>
            <div>ID: {user.id}</div>
          </div>
        )}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <div className="text-[#14B8A6] font-bold text-lg mb-4">{'>>'} LICENSE</div>
            <div>Status: {subscription?.tier === "pro" ? "PRO_ACTIVE" : "COMMUNITY_ACTIVE"}</div>
          </div>
        )}
        {activeTab === "devices" && (
          <div className="space-y-6">
            <div className="text-[#14B8A6] font-bold text-lg mb-4">{'>>'} HARDWARE_NODES</div>
            {devices && devices.length > 0 ? (
               devices.map((d: any) => <div key={d.id} className="mb-2">- {d.name} [{new Date(d.lastSeen).toISOString()}]</div>)
             ) : <div className="text-white/40">EMPTY_SET</div>}
          </div>
        )}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="text-[#14B8A6] font-bold text-lg mb-4">{'>>'} FINANCIALS</div>
            <a href="https://billing.lemonsqueezy.com" className="text-[#14B8A6] underline hover:text-white">OPEN_PORTAL</a>
          </div>
        )}
      </div>
    </div>
  );
}

// VARIANT 4
function AccountV4({ variant }: { variant: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [activeTab, setActiveTab] = useState("profile");
  const { data: subscription } = useSWR("/api/account/subscription", fetcher);
  const { data: devices } = useSWR("/api/desktop/devices", fetcher);

  if (!isLoaded) return <div className="p-12 text-white/50">Loading...</div>;
  if (!isSignedIn) { if (typeof window !== "undefined") window.location.href = `/${variant}/signin`; return null; }

  return (
    <div className="max-w-4xl mx-auto px-8 py-24 flex gap-12 font-sans min-h-screen pt-32 text-white">
      <div className="w-48 shrink-0 flex flex-col gap-4">
        <h2 className="text-3xl font-light mb-8">Account</h2>
        {["profile", "subscription", "devices", "billing"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`text-left text-sm font-medium ${activeTab === t ? "text-[#2DD4BF]" : "text-white/40 hover:text-white/80"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 pt-16 border-t border-white/10">
        {activeTab === "profile" && (
          <div className="space-y-4 text-white/80">
            <div className="text-xl font-light mb-8">Profile Details</div>
            <div className="flex items-center gap-4 mb-8">
               <img src={user.imageUrl} className="w-12 h-12 rounded-full" />
               <div className="text-lg">{user.fullName}</div>
            </div>
            <div className="text-sm text-white/50">{user.primaryEmailAddress?.emailAddress}</div>
          </div>
        )}
        {activeTab === "subscription" && (
          <div className="space-y-4">
            <div className="text-xl font-light mb-8">Subscription</div>
            <div className="text-2xl text-[#2DD4BF] font-light">{subscription?.tier === "pro" ? "Pro" : "Community"}</div>
          </div>
        )}
        {activeTab === "devices" && (
          <div className="space-y-4">
            <div className="text-xl font-light mb-8">Devices</div>
            {devices && devices.length > 0 ? (
               devices.map((d: any) => <div key={d.id} className="text-white/70 py-2 border-b border-white/5">{d.name}</div>)
             ) : <div className="text-white/40">No devices</div>}
          </div>
        )}
        {activeTab === "billing" && (
          <div className="space-y-4">
            <div className="text-xl font-light mb-8">Billing</div>
            <a href="https://billing.lemonsqueezy.com" className="text-sm text-[#2DD4BF] hover:text-teal-300">Manage on LemonSqueezy →</a>
          </div>
        )}
      </div>
    </div>
  );
}

// VARIANT 5
function AccountV5({ variant }: { variant: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [activeTab, setActiveTab] = useState("profile");
  const { data: subscription } = useSWR("/api/account/subscription", fetcher);
  const { data: devices } = useSWR("/api/desktop/devices", fetcher);

  if (!isLoaded) return <div className="p-12 font-mono text-white/50">LOADING_SESSION...</div>;
  if (!isSignedIn) { if (typeof window !== "undefined") window.location.href = `/${variant}/signin`; return null; }

  return (
    <div className="max-w-6xl mx-auto px-6 py-24 flex gap-12 font-mono text-sm min-h-screen pt-32 relative">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2DD4BF]/5 blur-[120px] pointer-events-none" />
      <div className="w-48 shrink-0 flex flex-col gap-2 relative z-10">
        <h2 className="text-xl font-bold mb-6 text-white/90 uppercase tracking-widest">Account</h2>
        {["profile", "subscription", "devices", "billing"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`text-left px-4 py-2 rounded transition-colors uppercase tracking-widest text-xs ${activeTab === t ? "bg-[#2DD4BF]/10 text-[#2DD4BF] font-bold" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 bg-[#0C0E10]/80 backdrop-blur-md border border-white/10 p-8 rounded-lg relative z-10 shadow-[0_0_40px_rgba(45,212,191,0.03)]">
        {activeTab === "profile" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white/80 border-b border-white/10 pb-4">PROFILE_DATA</h3>
            <div className="flex items-center gap-6">
              <img src={user.imageUrl} alt="Avatar" className="w-16 h-16 rounded border border-white/20" />
              <div>
                <div className="font-bold text-lg text-white/90">{user.fullName || "User"}</div>
                <div className="text-white/50">{user.primaryEmailAddress?.emailAddress}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
              <div>
                <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Created</div>
                <div className="text-white/80">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}</div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white/80 border-b border-white/10 pb-4">SUBSCRIPTION</h3>
            <div className="text-2xl font-bold text-[#2DD4BF] mb-2">{subscription?.tier === "pro" ? "PRO_TIER" : "COMMUNITY_TIER"}</div>
            {subscription?.tier === "pro" && (
              <div className="pt-6 border-t border-white/10">
                <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Renewal Date</div>
                <div className="text-white/80">{subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : "N/A"}</div>
              </div>
            )}
          </div>
        )}
        {activeTab === "devices" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white/80 border-b border-white/10 pb-4">DEVICES</h3>
            {devices && devices.length > 0 ? (
              <div className="space-y-4">
                {devices.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-4 border border-white/10 bg-white/5 rounded">
                    <div>
                      <div className="font-bold text-white/80">{d.name}</div>
                      <div className="text-xs text-white/40 mt-1">Seen: {new Date(d.lastSeen).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-white/50 italic">No devices found.</div>}
          </div>
        )}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white/80 border-b border-white/10 pb-4">BILLING_PORTAL</h3>
            <a href="https://billing.lemonsqueezy.com" className="inline-block px-6 py-2 border border-white/20 text-white/80 font-bold rounded hover:bg-white/10 transition-colors uppercase tracking-widest text-xs">
              Open Portal
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountContent({ variant = "5" }: { variant?: string }) {
  switch (variant) {
    case "1": return <AccountV1 variant={variant} />;
    case "2": return <AccountV2 variant={variant} />;
    case "3": return <AccountV3 variant={variant} />;
    case "4": return <AccountV4 variant={variant} />;
    case "5": return <AccountV5 variant={variant} />;
    default: return <AccountV5 variant={variant} />;
  }
}
