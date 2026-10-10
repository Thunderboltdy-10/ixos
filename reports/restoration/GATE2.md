# Gate 2: free access and monorepo preparation

All local search modes and desktop utilities are available without accounts, subscriptions or device leases. The desktop starts directly into its local interface. Initial model installation still requires downloading weights; installed models run locally and offline.

| Area | Before | After |
|---|---|---|
| Desktop entry | Clerk sign-in and entitlement synchronization gated entry and some model paths. | The app boots directly. Search, Ask, personal ranking, Today and workstreams use local configuration. Model failures remain explicit. |
| Paid access | Subscription status, account API calls and entitlement checks controlled features. | Paid UI, account API bindings, authentication SDKs and access checks are removed from the engine, desktop and site. |
| Instances | A Tauri plugin restricted running instances; device lease APIs enforced account policy. | Multiple processes may run. Short OS locks serialize local key creation and state-file reads/writes in application directories. |
| Site | Pricing cards, checkout/auth routes, webhook/database control-plane code and paid terms. | Free-access sections, download redirects for old account URLs and open-source routes. Layouts/animations are retained; exposed source build errors were repaired. |
| Build | Desktop builds required account variables; the site ignored TypeScript errors. | Desktop builds need no account variables. Site builds enforce types and use the verified Webpack path. Removed SDK dependencies are absent from the lockfile. |
| Repository preparation | Outdated root inventories/specifications and loose generated source mixed with active projects. | Earlier docs moved intact into `docs/archive/`; retired loose source is under `legacy/`. The monorepo and shared UI packages remain. Full product docs await engine evaluations. |
| Local envs | Three actual env files were tracked; examples and release configuration referenced paid services. | Local files remain on disk, payment/account fields are removed, actual envs are Git-excluded and untracked. This does not remove secrets from earlier commits. |

## Validation

```powershell
cargo check --locked -p ixos-app --lib
cargo test --locked --workspace --lib --bins --test settings_matrix
cargo test --locked -p ixos-protocol --lib security::local_lock
npx tsc --noEmit -p ixos-search/ui/tsconfig.json
npm run build --workspace ixos-search/ui
npx tsc --noEmit -p ixos-site/tsconfig.json
npm run build --workspace ixos-site
npm run test:visual:update --workspace ixos-site
```

The final workspace run passes **508 engine tests**, six ignored, **15 desktop tests**, and the settings matrix (48 combinations). Concurrency regressions check separate-handle write serialization and simultaneous initial key creation. Desktop UI type checking/build and site type checking/build pass. Raw outputs are `gate2-{workspace-tests,local-lock-test,desktop-check,desktop-tests,ui-check,ui-build,site-check,site-build}.*`.

The site browser suite checks nine viewport captures across three main variants, with console/page-error assertions, plus four desktop overflow checks. The harness now scrolls through reveal animations and asserts that free-access content is visible; the earlier capture method could record hidden below-fold sections. Exact browser outcome is in `gate2-site-visual.*`; these checks do not verify native Tauri/macOS runtime behavior.

`gate2-env-preparation.json` records only paths and counts, without env values. No public push, credential-history rewrite or remote deployment was performed.

## Remaining practical limits

- Windows Rust behavior and web UI builds were exercised. The historical Mac failure occurred after signup; that path is removed, but macOS execution remains unverified until a Mac run.
- Local-state locks prevent interleaved bytes and competing first-created keys. They do not merge stale in-memory activity/workstream updates from independent processes: persistence remains last-writer-wins. Crash-safe state replacement is separate work.
- The OS-lock API requires Rust 1.89 or later; this machine ran 1.92. The minimum toolchain has not separately been tested against every transitive dependency.
- Old history still contains previously tracked configuration. Public release requires actual credential revocation/rotation and a reviewed history preparation plan. Untracking envs does not establish credential safety.
- This gate does not change embedding models, establish retrieval superiority, update final presets, or replace the user's design work. No architecture/model experiment has run.
