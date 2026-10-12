# Gaps and mismatches

Each item includes evidence, impact, and a recommended fix or de-scope.

## 1) index --watch is not implemented
- What is wrong: `--watch` flag is defined, but handler prints not implemented.
- Evidence: `src/cli/commands.rs:184`, `src/main.rs:446`
- Impact: Users expect file watching but it does not work.
- Recommended fix: Implement watch mode or remove the flag.

## 2) index --clear is TODO
- What is wrong: Clear logic is TODO.
- Evidence: `src/main.rs:401`
- Impact: Index clear option does not perform any action.
- Recommended fix: Implement index clearing or remove the flag.

## 3) daemon background mode is not implemented
- What is wrong: Daemon background mode prints not implemented.
- Evidence: `src/cli/commands.rs:221`, `src/main.rs:583`
- Impact: Background daemon mode is unavailable.
- Recommended fix: Implement background daemon or clarify that foreground only is supported.

## 4) cache mode preference not persisted
- What is wrong: Cache mode preference prints success but is not saved.
- Evidence: `src/main.rs:776`
- Impact: Users may believe preference is saved when it is not.
- Recommended fix: Persist to config or change message.

## 5) cache rebuild is stubbed
- What is wrong: Cache rebuild command prints not fully implemented.
- Evidence: `src/cli/commands.rs:345`, `src/main.rs:809`
- Impact: Rebuild command does not rebuild cache.
- Recommended fix: Implement rebuild or remove command.

## 6) background indexer is placeholder
- What is wrong: Background indexer has placeholder logic for indexing.
- Evidence: `src/ixos_embed/background_indexer.rs:93`
- Impact: Background indexing does not perform real work.
- Recommended fix: Implement real indexing logic or mark feature as experimental.

## 7) ixos-site spec vs package Next.js version mismatch
- What is wrong: Spec says Next ^15, package.json is Next 16.1.4.
- Evidence: `ixos-site/SPEC_PART4_PAGES.md:281`, `ixos-site/package.json:18`
- Impact: Docs do not reflect the actual runtime version.
- Recommended fix: Update spec or align package version.

