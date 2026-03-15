'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import useSWR from 'swr'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Shield, Laptop, ChevronRight, LogOut, CreditCard, Camera, Star } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function Kicker({ text }: { text: string }) {
  return (
    <div className="text-[9px] font-mono tracking-[0.28em] uppercase text-white/25 mb-4">
      ▸ {text}
    </div>
  )
}

function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.18em] bg-amber-400/15 border border-amber-400/35 text-amber-400 rounded-sm">
      <Star size={8} className="fill-amber-400" />
      Pro
    </span>
  )
}

function CommunityBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.18em] bg-white/5 border border-white/10 text-white/40 rounded-sm">
      Community
    </span>
  )
}

export default function AccountPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const { data: subscription } = useSWR('/api/account/subscription', fetcher)
  const { data: devices } = useSWR('/api/desktop/devices', fetcher)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/sign-in'
    }
  }, [isLoaded, isSignedIn])

  if (!isLoaded) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-white/25">
          Loading…
        </div>
      </div>
    )
  }

  if (!isSignedIn) return null

  // Fix: API returns `plan` and `isActive`, not `tier`
  const isPro = subscription?.isActive && subscription?.plan === 'pro'
  const renewalDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null
  const portalUrl = subscription?.portalUrl || 'https://billing.lemonsqueezy.com'

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await user.setProfileImage({ file })
    } catch (err) {
      console.error('Failed to update profile image:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const initials = (user.fullName || user.firstName || 'U')[0].toUpperCase()

  return (
    <div className="min-h-[calc(100vh-60px)] text-[#F3F5F7]">
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Module label ───────────────────────────────── */}
      <div className="text-center pt-14 pb-4">
        <div className="inline-flex items-center gap-2 text-[9px] font-mono tracking-[0.28em] uppercase text-white/20">
          <span className="w-1 h-1 rounded-full bg-amber-400/50" />
          ACCOUNT_MODULE
          <span className="w-1 h-1 rounded-full bg-amber-400/50" />
        </div>
      </div>

      {/* ── Profile header ─────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div
          className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-8 relative"
          style={{ background: 'rgba(246,185,76,0.015)', border: '1px solid rgba(246,185,76,0.12)' }}
        >
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: 'rgba(246,185,76,0.3)' }} />
          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: 'rgba(246,185,76,0.3)' }} />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: 'rgba(246,185,76,0.3)' }} />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: 'rgba(246,185,76,0.3)' }} />

          {/* Avatar with edit overlay */}
          <div className="relative shrink-0">
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="relative group cursor-pointer"
              title="Change profile picture"
            >
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt=""
                  className="w-24 h-24 rounded-xl object-cover"
                  style={{ border: isPro ? '2px solid rgba(246,185,76,0.4)' : '2px solid rgba(255,255,255,0.1)' }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-xl flex items-center justify-center text-3xl font-bold font-mono"
                  style={{
                    background: isPro ? 'rgba(246,185,76,0.1)' : 'rgba(255,255,255,0.05)',
                    border: isPro ? '2px solid rgba(246,185,76,0.3)' : '2px solid rgba(255,255,255,0.1)',
                    color: isPro ? '#F6B94C' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {initials}
                </div>
              )}
              {/* Edit overlay */}
              <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera size={18} className="text-white" />
                )}
              </div>
            </button>
            {/* Pro badge under avatar */}
            {isPro && (
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-[0.15em] bg-amber-400 text-[#0A0D0F] rounded-sm whitespace-nowrap">
                  PRO
                </span>
              </div>
            )}
          </div>

          {/* Name + email */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="font-mono text-xl font-bold text-white mb-1" style={{ letterSpacing: '-0.01em' }}>
              {user.fullName || user.firstName || 'Account'}
            </div>
            <div className="font-mono text-sm text-white/40 mb-3 truncate">
              {user.primaryEmailAddress?.emailAddress}
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              {isPro ? <ProBadge /> : <CommunityBadge />}
              <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.12em]">
                Since {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAvatarClick}
              className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 border border-white/10 hover:border-white/25 hover:text-white/80 transition-all"
            >
              Edit Photo
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 border border-white/8 hover:border-white/15 hover:text-white/60 transition-all"
            >
              <LogOut size={11} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pb-16 space-y-4">

        {/* Row: Subscription + Devices side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Subscription card */}
          <div
            className="relative p-6"
            style={{
              border: isPro ? '1px solid rgba(246,185,76,0.28)' : '1px solid rgba(255,255,255,0.08)',
              background: isPro ? 'rgba(246,185,76,0.03)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: isPro ? 'rgba(246,185,76,0.3)' : 'rgba(255,255,255,0.1)' }} />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: isPro ? 'rgba(246,185,76,0.3)' : 'rgba(255,255,255,0.1)' }} />
            <Kicker text="Subscription" />

            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-mono text-2xl font-bold mb-1" style={{ color: isPro ? '#F6B94C' : '#F3F5F7' }}>
                  {isPro ? 'Pro' : 'Community'}
                </div>
                <div className="font-mono text-xs text-white/35">
                  {isPro
                    ? renewalDate ? `Renews ${renewalDate}` : 'Active subscription'
                    : 'Free access · Flash v2 · 3 workstreams'}
                </div>
              </div>
              {isPro ? <ProBadge /> : null}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/22 mb-1">Plan</div>
                <div className="font-mono text-xs font-semibold" style={{ color: isPro ? '#F6B94C' : 'rgba(255,255,255,0.5)' }}>
                  {isPro ? 'Professional' : 'Community'}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/22 mb-1">Status</div>
                <div className="font-mono text-xs font-semibold" style={{ color: isPro ? '#27c93f' : 'rgba(255,255,255,0.4)' }}>
                  {isPro ? 'Active' : 'Free tier'}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/22 mb-1">Model</div>
                <div className="font-mono text-xs" style={{ color: isPro ? '#F6B94C' : 'rgba(255,255,255,0.5)' }}>
                  {isPro ? 'Pro v2 (Fusion)' : 'Flash v2'}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/22 mb-1">MRR@10</div>
                <div className="font-mono text-xs text-white/40">
                  {isPro ? '0.9209' : '0.8340'}
                </div>
              </div>
            </div>

            {isPro ? (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-400/70 border border-amber-400/20 hover:border-amber-400/40 hover:text-amber-400 transition-all"
              >
                <CreditCard size={10} />
                Manage Subscription
                <ChevronRight size={10} />
              </a>
            ) : (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 text-[#0A0D0F] font-mono text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-amber-300 transition-colors"
              >
                ▸ Upgrade to Pro
              </Link>
            )}
          </div>

          {/* Devices card */}
          <div
            className="relative p-6"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/10" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/10" />
            <div className="flex items-start justify-between mb-4">
              <Kicker text="Connected Devices" />
              {devices && devices.length > 0 && (
                <span className="font-mono text-[9px] text-white/25 uppercase tracking-[0.15em]">
                  {devices.length} registered
                </span>
              )}
            </div>

            {devices && devices.length > 0 ? (
              <div className="space-y-2">
                {devices.slice(0, 3).map((d: { id: string; name: string; lastSeen: string; platform?: string }) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3"
                    style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="flex items-center gap-3">
                      <Laptop size={13} className="text-white/30 shrink-0" />
                      <div>
                        <div className="font-mono text-xs text-white/70 font-semibold mb-0.5">
                          {d.name}
                        </div>
                        <div className="font-mono text-[10px] text-white/28">
                          {new Date(d.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-[0.12em] text-green-400/80 px-1.5 py-0.5 border border-green-400/20 bg-green-400/5">
                        <span className="w-1 h-1 rounded-full bg-green-400" />
                        Active
                      </span>
                    </div>
                  </div>
                ))}
                {isPro && (
                  <div className="font-mono text-[9px] text-white/20 mt-2 leading-relaxed">
                    Pro license active · one device at a time
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Laptop size={22} className="text-white/10 mx-auto mb-3" />
                <div className="font-mono text-xs text-white/28 leading-relaxed mb-4">
                  No devices connected yet.<br />
                  Download and launch Ixos to register.
                </div>
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/35 border border-white/10 px-4 py-2 hover:text-white/60 hover:border-white/20 transition-all"
                >
                  Download Ixos →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Account details + Usage row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Account details */}
          <div className="relative p-6" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/10" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/10" />
            <Kicker text="Account Details" />

            <div className="space-y-4">
              {[
                { label: 'Full name', value: user.fullName || '—' },
                { label: 'Email address', value: user.primaryEmailAddress?.emailAddress || '—' },
                { label: 'Member since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                { label: 'Auth method', value: user.externalAccounts.length > 0 ? user.externalAccounts[0].provider.replace('oauth_', '').replace(/^\w/, c => c.toUpperCase()) : 'Email + password' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-baseline gap-4">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25 shrink-0">{label}</div>
                  <div className="font-mono text-xs text-white/60 text-right truncate">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 p-3 border border-amber-400/08 bg-amber-400/[0.02]">
              <div className="flex items-start gap-2 font-mono text-[10px] text-white/28 leading-relaxed">
                <Shield size={10} className="text-amber-400/50 mt-0.5 shrink-0" />
                Profile changes are managed via your authentication provider.
              </div>
            </div>
          </div>

          {/* Plan features */}
          <div className="relative p-6" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/10" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/10" />
            <Kicker text="Plan Features" />

            <ul className="space-y-2.5">
              {(isPro
                ? ['Unlimited workstreams', 'Pro v2 embedding model', 'Journalist mode (ephemeral)', 'Ed25519 cryptographic attestation', 'Priority support + early access']
                : ['Up to 3 workstreams', 'Flash v2 model (MRR 0.8340)', 'CLI + VS Code extension', 'HMAC-SHA256 cache signing', 'Community support']
              ).map(feat => (
                <li key={feat} className="flex items-center gap-2.5 font-mono text-xs text-white/45">
                  <span className={`text-[9px] ${isPro ? 'text-amber-400' : 'text-white/22'}`}>▸</span>
                  {feat}
                </li>
              ))}
            </ul>

            {!isPro && (
              <div className="mt-5 p-3 border border-amber-400/08 bg-amber-400/[0.02]">
                <div className="font-mono text-[10px] text-white/28 leading-relaxed">
                  <Shield size={10} className="inline text-amber-400/50 mr-1.5 mb-0.5" />
                  Upgrade to Pro for unlimited workstreams, advanced models, and journalist mode.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Privacy banner */}
        <div
          className="p-5 flex items-start gap-4"
          style={{ border: '1px solid rgba(246,185,76,0.12)', background: 'rgba(246,185,76,0.02)' }}
        >
          <Shield size={16} className="text-amber-400/60 shrink-0 mt-0.5" />
          <div>
            <span className="font-mono text-sm font-bold text-amber-400/80">Your data is yours.</span>
            <span className="font-mono text-sm text-white/35 ml-2">
              All search indexing and queries happen locally on your device. We only store your account info and subscription status.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/38 border border-white/10 bg-white/[0.025] hover:border-white/20 hover:text-white/60 transition-all"
          >
            <CreditCard size={11} />
            Billing Portal
          </a>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/38 border border-white/10 bg-white/[0.025] hover:border-white/20 hover:text-white/60 transition-all cursor-pointer"
          >
            <LogOut size={11} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
