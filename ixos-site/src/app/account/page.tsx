"use client";
import { useEffect, useState } from "react";
import { Settings, User, CreditCard } from "lucide-react";

function AccountV1() {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-amber-500">Account Settings</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 space-y-2">
            <button className="w-full text-left p-4 rounded-xl bg-white/5 border border-amber-500/20 text-amber-500 font-semibold">Profile</button>
            <button className="w-full text-left p-4 rounded-xl hover:bg-white/5 text-white/50">Billing</button>
            <button className="w-full text-left p-4 rounded-xl hover:bg-white/5 text-white/50">API Keys</button>
          </div>
          <div className="col-span-2 space-y-6">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3"><User className="text-amber-500" /> Personal Info</h2>
              <div className="space-y-4">
                <input type="text" value="Developer" disabled className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white/50" />
                <input type="email" value="dev@example.com" disabled className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountV2() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white font-sans p-8">
      <div className="max-w-5xl mx-auto py-24">
        <h1 className="text-5xl font-semibold tracking-tighter mb-12">Settings.</h1>
        <div className="p-10 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-6 mb-12 pb-12 border-b border-white/5">
            <div className="w-24 h-24 rounded-full bg-teal-400/20 border border-teal-400/50 flex items-center justify-center">
              <User className="w-10 h-10 text-teal-400" />
            </div>
            <div>
              <div className="text-2xl font-medium mb-1">Developer User</div>
              <div className="text-white/50">Community Plan</div>
            </div>
            <button className="ml-auto px-6 py-3 rounded-xl bg-teal-400 text-black font-semibold hover:bg-teal-300">Upgrade</button>
          </div>
          <div className="space-y-8">
            <div><div className="text-sm text-white/40 mb-2">Email</div><div className="text-lg">dev@example.com</div></div>
            <div><div className="text-sm text-white/40 mb-2">Member Since</div><div className="text-lg">2026</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountV3() {
  return (
    <div className="min-h-screen bg-[#0A0D0F] text-[#f3f5f7] font-mono p-8">
      <div className="max-w-3xl mx-auto py-20 border border-amber-400/20 bg-black/50 p-12 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-400" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-400" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-400" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-400" />

        <div className="text-amber-400 text-xs uppercase tracking-[0.3em] mb-12">▸ USER_DATABASE_RECORD</div>
        <div className="space-y-8">
          <div className="flex justify-between border-b border-white/5 py-4">
            <span className="text-white/40">USER_ID</span>
            <span className="text-white">usr_9x8f7d6e5</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-4">
            <span className="text-white/40">LICENSE_TIER</span>
            <span className="text-amber-400">COMMUNITY_ACTIVE</span>
          </div>
          <div className="flex justify-between border-b border-white/5 py-4">
            <span className="text-white/40">ENCRYPTION_KEYS</span>
            <span className="text-green-400">SYNCED</span>
          </div>
        </div>
        <button className="w-full py-4 mt-12 border border-red-500/50 text-red-500 font-bold uppercase tracking-widest hover:bg-red-500/10">
          PURGE_ACCOUNT
        </button>
      </div>
    </div>
  );
}

function AccountV4() {
  return (
    <div className="min-h-screen bg-[#04050A] text-white p-8 perspective-1000">
      <div className="max-w-4xl mx-auto py-24">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-black/40 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400"><User /></div>
              <div className="text-xl font-medium">Profile</div>
            </div>
            <div className="text-white/50 mb-2">dev@example.com</div>
            <div className="text-white/50 mb-8">Password: ********</div>
            <button className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10">Edit Profile</button>
          </div>
          <div className="bg-gradient-to-br from-violet-500/10 to-blue-500/5 border border-violet-500/30 rounded-3xl p-8 backdrop-blur-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><CreditCard /></div>
              <div className="text-xl font-medium">Plan & Billing</div>
            </div>
            <div className="text-3xl font-bold mb-2">Ixos Pro</div>
            <div className="text-white/50 mb-8">Next billing: April 1</div>
            <button className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200">Manage Subscription</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountV5() {
  return (
    <div className="min-h-screen bg-[#0C0E10] text-white font-mono p-8">
      <div className="max-w-2xl mx-auto py-20">
        <h1 className="text-2xl font-bold mb-12">Account.</h1>
        <div className="border border-white/10 bg-white/[0.02] p-8 mb-8">
          <h2 className="text-lg font-bold mb-6">Details</h2>
          <div className="space-y-4">
            <div className="flex justify-between"><span className="text-white/40">Email</span><span>dev@example.com</span></div>
            <div className="flex justify-between"><span className="text-white/40">Plan</span><span className="text-amber-400">Pro</span></div>
          </div>
        </div>
        <button className="w-full py-4 border border-white/20 hover:bg-white/5 font-bold">Sign Out</button>
      </div>
    </div>
  );
}

export { AccountV1, AccountV2, AccountV3, AccountV4, AccountV5 };

export default function AccountPage() {
  const [variant, setVariant] = useState<number>(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ixos_variant');
    if (stored) setVariant(Number(stored));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  switch (variant) {
    case 1: return <AccountV1 />;
    case 2: return <AccountV2 />;
    case 3: return <AccountV3 />;
    case 4: return <AccountV4 />;
    case 5: return <AccountV5 />;
    default: return <AccountV5 />;
  }
}
