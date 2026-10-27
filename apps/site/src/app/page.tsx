import { Agents } from "@/components/Agents";
import { Benchmarks } from "@/components/Benchmarks";
import { HeroSearch } from "@/components/HeroSearch";
import { Install } from "@/components/Install";
import { Ranking } from "@/components/Ranking";
import { Records } from "@/components/Records";
import { Speed } from "@/components/Speed";
import { Reveal } from "@/components/Stage";
import { Window } from "@/components/Window";
import Link from "next/link";
import { installers } from "@/lib/github";

export default async function Home() {
  const release = await installers();
  return (
    <main>
      <section id="install" className="hero">
        <div className="hero-text">
          <Reveal>
            <h1>Search your code and documents by meaning.</h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="hero-lede">
              Ixos finds files from a description, not just exact words. It runs on your computer and works from a
              shortcut, the terminal, or your AI agent.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <Install release={release} />
          </Reveal>
        </div>
        <HeroSearch />
      </section>
      <Speed />
      <Ranking />
      <Window />
      <Records />
      <Agents />
      <Benchmarks />
      <section className="closing">
        <Reveal>
          <h2>Try it on your own files.</h2>
          <p>No account, and nothing leaves your computer.</p>
        </Reveal>
        <Reveal delay={0.08} className="closing-actions">
          <a className="ix-button ix-button--primary ix-button--large" href="#install">
            Install
          </a>
          <Link className="ix-button ix-button--large" href="/docs">
            Read the docs
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
