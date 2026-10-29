import { GitHubIcon, StarIcon } from "@ixos/ui";
import Image from "next/image";
import Link from "next/link";
import { GITHUB, HUGGING_FACE } from "@/lib/github";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function Nav({ stars }: { stars: number | null }) {
  return (
    <header className="nav">
      <nav className="nav-inner" aria-label="Main">
        <Link href="/" className="nav-home">
          <Image src="/assets/logo.png" alt="" width={26} height={26} />
          Ixos
        </Link>
        <div className="nav-links">
          <Link href="/docs">Docs</Link>
          <a className="nav-hf" href={HUGGING_FACE} target="_blank" rel="noopener noreferrer">Hugging Face</a>
          <a href={GITHUB} className="nav-github" target="_blank" rel="noopener noreferrer">
            <GitHubIcon size={17} />
            GitHub
            <span className="nav-stars">
              <StarIcon size={13} />
              {stars === null ? "Star" : compact.format(stars)}
            </span>
          </a>
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-name">
          <Image src="/assets/logo.png" alt="" width={20} height={20} />
          Ixos
        </span>
        <span>Free and open source, MIT licensed.</span>
        <div className="footer-links">
          <Link href="/docs">Docs</Link>
          <a href={HUGGING_FACE}>Hugging Face</a>
          <a href={GITHUB}>GitHub</a>
        </div>
      </div>
    </footer>
  );
}
