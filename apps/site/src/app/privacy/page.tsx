export default function PrivacyPage() {
  return (
    <main className="pt-32 pb-24 container mx-auto px-6 max-w-4xl">
      <h1 className="text-4xl md:text-5xl font-semibold mb-8 text-white">
        Local data in Ixos
      </h1>
      <div className="prose prose-invert prose-lg max-w-none space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            Search locations
          </h2>
          <p className="text-text-secondary">
            The desktop searches folders you choose. Discovery honors ignore
            rules, skips cloud placeholders and avoids following symlinks. File
            extraction and ranking run on CPU.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            Embedding records
          </h2>
          <p className="text-text-secondary">
            With caching enabled, Ixos writes compact embedding records into its
            own file metadata. Filesystems that do not support it use the
            application cache. Storage settings inspect and remove these records
            without changing file contents.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            Recent searches
          </h2>
          <p className="text-text-secondary">
            The desktop keeps a short local list of queries and locations. Clear
            it from the sidebar. Models are downloaded separately from Hugging
            Face; searching uses the installed model.
          </p>
        </section>
      </div>
    </main>
  );
}
