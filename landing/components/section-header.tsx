"use client";

import { motion } from "framer-motion";
import { slideUp, fadeIn } from "@/lib/animations";

interface SectionHeaderProps {
    label: string;
    title: string;
    description: string;
    centered?: boolean;
}

export function SectionHeader({ label, title, description, centered = true }: SectionHeaderProps) {
    return (
        <div className={`mb-16 ${centered ? 'text-center' : 'text-left'}`}>
            <motion.span
                variants={slideUp}
                className="text-brand-teal text-sm uppercase tracking-widest mb-4 block font-medium"
            >
                {label}
            </motion.span>
            <motion.h2
                variants={slideUp}
                className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-brand text-transparent bg-clip-text"
            >
                {title}
            </motion.h2>
            <motion.p
                variants={fadeIn}
                className={`text-content-secondary text-lg leading-relaxed max-w-2xl ${centered ? 'mx-auto' : ''}`}
            >
                {description}
            </motion.p>
        </div>
    );
}
