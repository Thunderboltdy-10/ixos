import Link from "next/link";

const LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/download", label: "Download" },
  { href: "/privacy", label: "Privacy" },
];

export function FooterV4() {
  return (
    <footer
      className="px-6 py-10"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
        {/* Mark */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-3.5 h-3.5"
            style={{
              border: "1px solid rgba(45,212,191,0.3)",
              backgroundColor: "rgba(45,212,191,0.08)",
            }}
          />
          <span
            className="font-mono text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            Ixos
          </span>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-[9px] tracking-[0.25em] uppercase transition-colors duration-200"
              style={{ color: "rgba(255,255,255,0.22)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.22)";
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p
          className="font-mono text-[9px] tracking-[0.15em]"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          © 2026 Ixos Protocol
        </p>
      </div>
    </footer>
  );
}
