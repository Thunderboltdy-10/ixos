import Link from "next/link";

export default function NotFound() {
  return (
    <main className="missing">
      <h1>Nothing here.</h1>
      <p>
        This page doesn&apos;t exist. <Link href="/">Back to Ixos</Link>
      </p>
    </main>
  );
}
