export default function DocsAgentsPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// AGENT_WORKFLOWS"}</p>
      <h1 className="docs-h1">Agent Workflows</h1>
      <p className="docs-lead">
        Ixos is optimized for autonomous coding loops with explicit measurement, documentation, and
        restart-safe state tracking.
      </p>

      <h2>Required execution loop</h2>
      <p>
        Observe -&gt; Hypothesize -&gt; Implement -&gt; Measure -&gt; Decide -&gt; Document -&gt;
        Repeat.
      </p>

      <h2>Persistent project memory</h2>
      <ul>
        <li>`PLAN.md` for current goals, state snapshot, and next actions.</li>
        <li>`RUNLOG.md` for append-only command and output history.</li>
        <li>`DECISIONS.md` for rationale and chosen direction.</li>
        <li>`reports/` for benchmark tables and final writeups.</li>
      </ul>

      <h2>Hard constraints</h2>
      <ul>
        <li>No benchmark stubs. Real model artifacts must load.</li>
        <li>No optimization without baseline and profiling.</li>
        <li>Every claim includes commands and captured outputs.</li>
        <li>Zero-index privacy philosophy must be preserved.</li>
        <li>Model naming must remain canonical and consistent.</li>
      </ul>

      <h2>State snapshot rule</h2>
      <p>
        Before compaction or major pivots, append a state snapshot to `PLAN.md` with baseline
        numbers, current best v2 metrics, bottleneck ranking, and top three next tasks.
      </p>

      <h2>Completion checklist</h2>
      <ul>
        <li>Before/after benchmark suite executed and logged.</li>
        <li>Docs, manifests, and UI labels updated consistently.</li>
        <li>CLI and desktop paths verified end-to-end.</li>
        <li>Hugging Face upload flow documented and reproducible.</li>
      </ul>
    </div>
  );
}
