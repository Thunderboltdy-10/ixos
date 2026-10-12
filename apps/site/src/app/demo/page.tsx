import { DemoSurface } from "@/components/DemoSurface";
export default function DemoPage() {
  return (
    <main className="relative z-10 pt-36 pb-20 px-6 text-white">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-semibold font-display mb-6">
          Try the search interface.
        </h1>
        <p className="text-white/50 mb-12">
          This demo searches a small set of sample files. Install Ixos to search
          your locations.
        </p>
        <DemoSurface />
      </div>
    </main>
  );
}
