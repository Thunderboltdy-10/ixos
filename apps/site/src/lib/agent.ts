/** A real exchange with `ixos mcp --dir crates --profile code`, as an agent sees it. */
export const EXCHANGE = [
  {
    tool: "search",
    args: '{ "query": "skip files that are still in the cloud", "limit": 3, "view": "numbered" }',
    bytes: 810,
    output: `1. ixos-core/src/cloud.rs score=0.73457474
ixos-core/src/cloud.rs:L182-L186
182 |}
183 |
184 |/// Check if we should skip processing this file to avoid triggering a cloud download
185 |///
186 |/// Returns \`true\` if the file should be skipped (cloud-only)
2. ixos-core/src/discover.rs score=0.46462297
ixos-core/src/discover.rs:L5-L9
5 |/// \`build\` is intentionally absent: it can be a source module (e.g. Clap).
  …
3. ixos-core/src/extract.rs score=0.433509
ixos-core/src/extract.rs:L1-L5
  …`,
  },
  {
    tool: "read",
    args: '{ "path": "ixos-core/src/cloud.rs", "within": "should_skip_cloud_file", "view": "numbered" }',
    bytes: 627,
    output: `Function should_skip_cloud_file L187-L198 (definition extent)
ixos-core/src/cloud.rs:L187-L198
187 |pub fn should_skip_cloud_file(path: &Path) -> bool {
188 |    match get_cloud_storage_status(path) {
189 |        CloudStorageStatus::CloudOnly => {
190 |            tracing::info!(
191 |                "Skipping cloud-only file to prevent auto-download: {}",
192 |                path.display()
193 |            );
194 |            true
195 |        }
196 |        _ => false,
197 |    }
198 |}`,
  },
];
