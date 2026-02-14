export default function DocsAgentsPage() {
  return (
    <div className="docs-content max-w-4xl">
      <p className="docs-kicker">{"// AGENT_WORKFLOWS"}</p>
      <h1 className="docs-h1">Agent Workflows</h1>
      <p className="docs-lead">
        Ixos uses a strict autonomous loop for quality, performance, and release safety. Every
        iteration must be measurable and restart-safe.
      </p>

      <h2>Required loop (Ralph protocol)</h2>
      <p>
        Observe -&gt; Hypothesize -&gt; Implement -&gt; Measure -&gt; Decide -&gt; Document -&gt; Repeat.
      </p>

      <h2>Persistent project memory</h2>
      <ul>
        <li><code>PLAN.md</code>: active goals + state snapshot + top 3 next tasks.</li>
        <li><code>RUNLOG.md</code>: append-only command history and artifact links.</li>
        <li><code>DECISIONS.md</code>: keep/revert/pivot decisions with rationale.</li>
        <li><code>reports/</code>: checkpoints, benchmark evidence, and audits.</li>
      </ul>

      <h2>Hard constraints</h2>
      <ul>
        <li>No stubs for quality/perf claims. Real model artifacts must load.</li>
        <li>No optimization without baseline and profiler evidence.</li>
        <li>Every claim must include command + output artifact path.</li>
        <li>Zero-index privacy is default; optional indexing must be explicit and documented.</li>
        <li>Model naming and cache mode naming must stay globally consistent.</li>
      </ul>

      <h2>Checkpoint expectations</h2>
      <ul>
        <li>R0/R1: baseline capture and benchmark harness validation.</li>
        <li>R2-R6: performance/quality gains with no regressions in confidence or safety.</li>
        <li>R7-R8: release checks and landing/documentation accuracy.</li>
        <li>R10: final report comparing against baseline.</li>
      </ul>

      <h2>Minimum command set per iteration</h2>
      <pre>
        <code>{`cargo test
cargo test --test settings_matrix
python scripts/run_settings_matrix.py
python scripts/ralph_loop.py --checkpoint R1 --bench-dir . --bench-runs 3 --objective-profile harsh
python scripts/compare_performance.py`}</code>
      </pre>

      <h2>Definition of done for an iteration</h2>
      <ol>
        <li>All tests and matrix checks pass.</li>
        <li>Benchmarks produce timestamped reports and objective gate results.</li>
        <li>Any regression is either fixed or explicitly documented with owner + next action.</li>
        <li>PLAN/RUNLOG/DECISIONS updated before handoff.</li>
      </ol>
    </div>
  );
}
