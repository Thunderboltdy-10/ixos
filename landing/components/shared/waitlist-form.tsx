"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

interface WaitlistFormProps {
    source?: string;
    className?: string;
}

export function WaitlistForm({ source = "unknown", className }: WaitlistFormProps) {
    const [email, setEmail] = useState("");
    const [honeypot, setHoneypot] = useState(""); // Anti-spam
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !email.includes("@")) {
            setStatus("error");
            setMessage("Please enter a valid email address.");
            return;
        }

        setStatus("loading");

        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, source, honeypot }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus("success");
                setMessage("You're on the list! We'll notify you when ready.");
                setEmail("");
            } else {
                setStatus("error");
                setMessage(data.error || "Something went wrong. Please try again.");
            }
        } catch {
            setStatus("error");
            setMessage("Network error. Please try again.");
        }
    };

    if (status === "success") {
        return (
            <div className={`flex items-center gap-2 text-green-400 ${className}`}>
                <Check className="w-5 h-5" />
                <span>{message}</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={className}>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full pl-10 pr-4 py-3 bg-surface-0 border border-white/10 rounded-lg text-white placeholder-content-muted focus:outline-none focus:border-brand-teal/50 transition-colors"
                        disabled={status === "loading"}
                    />
                    {/* Honeypot - hidden from users */}
                    <input
                        type="text"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        className="absolute -left-[9999px]"
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </div>
                <button
                    type="submit"
                    disabled={status === "loading"}
                    className="px-6 py-3 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {status === "loading" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        "Notify Me"
                    )}
                </button>
            </div>
            {status === "error" && (
                <p className="text-red-400 text-sm mt-2">{message}</p>
            )}
        </form>
    );
}
