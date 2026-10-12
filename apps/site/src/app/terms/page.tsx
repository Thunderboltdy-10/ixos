import Link from "next/link";
export default function TermsPage() {
  return (
    <main className="container mx-auto px-6 py-32 max-w-3xl text-white">
      <h1 className="text-3xl font-semibold mb-6">Open-source terms</h1>
      <p className="text-white/60 leading-relaxed">
        Ixos is free to use. The source code is available under the MIT license.
        Individual embedding models and third-party dependencies carry their own
        licenses, which must be checked when distributing them.
      </p>
      <p className="mt-6">
        <Link className="text-amber-400" href="/open-source">
          Get Ixos
        </Link>
      </p>
    </main>
  );
}
