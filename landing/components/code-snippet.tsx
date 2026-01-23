"use client";

import { motion } from "framer-motion";

interface CodeSnippetProps {
    code: string;
    language?: string;
    className?: string;
}

export function CodeSnippet({ code, language = "bash", className }: CodeSnippetProps) {
    return (
        <div className={`rounded-lg bg-surface-1 border border-white/5 overflow-hidden font-mono text-sm ${className}`}>
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-white/2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <div className="ml-auto text-xs text-content-muted">{language}</div>
            </div>
            <div className="p-4 overflow-x-auto text-content-secondary">
                <motion.pre
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <code>{code}</code>
                </motion.pre>
            </div>
        </div>
    );
}
