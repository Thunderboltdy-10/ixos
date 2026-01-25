"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/sections/Footer";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Button } from "@/components/ui/Button";
import { FadeInView } from "@/components/effects/FadeInView";
import { cn } from "@/lib/utils";

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("General");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to send");
      }
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <main className="flex flex-col min-h-screen w-full overflow-x-hidden bg-transparent">
      <Nav />

      <section className="pt-32 pb-8">
        <SectionDivider accent="teal" label="SUPPORT_MODULE" />
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10">
            <div className="space-y-8">
              <FadeInView direction="up">
                <h1 className="text-4xl md:text-5xl font-semibold text-porcelain">
                  Contact <span className="heading-gradient-teal">Support</span>
                </h1>
              </FadeInView>
              <FadeInView direction="up" delay={100}>
                <p className="text-lg text-fg-muted max-w-2xl">
                  Tell us what you need and we will get back quickly. We read every
                  message and keep support personal.
                </p>
              </FadeInView>

              <FadeInView direction="up" delay={200}>
                <form
                  onSubmit={handleSubmit}
                  className="bg-bg-graphite-1/70 border border-white/5 rounded-2xl p-6 space-y-5 backdrop-blur-sm"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-fg-muted uppercase tracking-widest">
                        Name
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-2 w-full rounded-lg bg-bg-graphite-2/60 border border-white/5 px-4 py-3 text-sm text-porcelain focus:border-accent-teal focus:outline-none"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-fg-muted uppercase tracking-widest">
                        Email
                      </label>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        type="email"
                        className="mt-2 w-full rounded-lg bg-bg-graphite-2/60 border border-white/5 px-4 py-3 text-sm text-porcelain focus:border-accent-teal focus:outline-none"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-fg-muted uppercase tracking-widest">
                      Topic
                    </label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="mt-2 w-full rounded-lg bg-bg-graphite-2/60 border border-white/5 px-4 py-3 text-sm text-porcelain focus:border-accent-teal focus:outline-none"
                    >
                      <option>General</option>
                      <option>Billing</option>
                      <option>Device Transfer</option>
                      <option>Bug Report</option>
                      <option>Partnerships</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-fg-muted uppercase tracking-widest">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={5}
                      className="mt-2 w-full rounded-lg bg-bg-graphite-2/60 border border-white/5 px-4 py-3 text-sm text-porcelain focus:border-accent-teal focus:outline-none"
                      placeholder="How can we help?"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      disabled={status === "sending"}
                      className="w-full font-mono text-xs uppercase tracking-widest h-12"
                    >
                      {status === "sending" ? "SENDING..." : "SEND_MESSAGE"}
                    </Button>

                    <p
                      className={cn(
                        "text-xs text-center",
                        status === "sent"
                          ? "text-accent-teal"
                          : status === "error"
                          ? "text-error"
                          : "text-fg-dim"
                      )}
                    >
                      {status === "sent" && "Message sent. We will reply shortly."}
                      {status === "error" && (error || "Failed to send. Please retry.")}
                      {status === "idle" &&
                        "We usually respond within 24 hours on business days."}
                    </p>
                  </div>
                </form>
              </FadeInView>
            </div>

            <FadeInView direction="up" delay={300}>
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-bg-graphite-2/50 border border-white/5">
                  <h3 className="text-lg font-semibold text-porcelain mb-2">
                    Need fast answers?
                  </h3>
                  <p className="text-sm text-fg-muted mb-4">
                    Start with docs and troubleshooting. If it is billing or device
                    access, mention your account email.
                  </p>
                  <Link
                    href="/docs"
                    className="text-accent-teal hover:text-accent-teal/80 text-sm font-medium"
                  >
                    Read documentation →
                  </Link>
                </div>

                <div className="p-6 rounded-2xl bg-bg-graphite-2/40 border border-white/5">
                  <h3 className="text-lg font-semibold text-porcelain mb-2">
                    Security & privacy
                  </h3>
                  <p className="text-sm text-fg-muted">
                    We only store account metadata. Your files and search data stay on
                    your device.
                  </p>
                </div>
              </div>
            </FadeInView>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

