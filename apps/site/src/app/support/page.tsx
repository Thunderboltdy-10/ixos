import { REPOSITORY_URL } from "@/lib/downloads";
import { FadeInView } from "@/components/effects/FadeInView";
export default function SupportPage() {
  return (
    <main className="flex flex-col min-h-screen w-full overflow-x-hidden bg-transparent">
      <section className="pt-32 pb-8">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10">
            <div className="space-y-8">
              <FadeInView direction="up">
                <h1 className="text-4xl md:text-5xl font-semibold text-porcelain">
                  Ixos <span className="heading-gradient-teal">Support</span>
                </h1>
              </FadeInView>
              <FadeInView direction="up" delay={100}>
                <p className="text-lg text-fg-muted max-w-2xl">
                  Report a bug or ask a question in the repository. Include your
                  operating system, Ixos version, and steps to reproduce it.
                </p>
              </FadeInView>
              <a
                href={`${REPOSITORY_URL}/issues`}
                className="inline-block rounded-lg bg-amber-400 text-black px-5 py-3 font-semibold"
              >
                Open the issue tracker
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
