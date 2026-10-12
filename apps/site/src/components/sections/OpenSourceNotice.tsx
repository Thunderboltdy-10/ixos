import Link from "next/link";
import { REPOSITORY_URL } from "@/lib/downloads";
export function OpenSourceNotice({ className = "" }: { className?: string }) {
  return (
    <section
      id="open-source"
      className={`container mx-auto px-6 py-20 ${className}`}
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-amber-400 mb-3">
          Open source
        </p>
        <h2 className="text-3xl font-semibold text-white">
          Read the code. Build it yourself.
        </h2>
        <p className="mt-4 text-white/60 leading-relaxed">
          Use the Rust CLI or desktop app. Models run on your CPU, and installed
          models work offline. The project is MIT licensed.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link
            className="rounded-lg bg-amber-400 text-black px-5 py-3 font-semibold"
            href="/download"
          >
            Download Ixos
          </Link>
          <a
            className="rounded-lg border border-white/20 text-white px-5 py-3"
            href={REPOSITORY_URL}
          >
            Explore the source
          </a>
        </div>
      </div>
    </section>
  );
}
