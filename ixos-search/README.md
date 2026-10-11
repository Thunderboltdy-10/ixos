# Desktop interface

`src-tauri/` is the Rust desktop shell; `ui/` is the React/Vite interface. From the monorepo root run `npm ci` then `npm run tauri:dev`; `npm run dev` serves only the UI. Shared product primitives live under `packages/` and `shared/`.

The desktop uses the retained progressive retrieval pipeline. Accounts, payment unlocks, device leases and the one-instance restriction were removed. Ask respects the selected model. Existing search animations/general design are retained; broader UI work belongs to the owner.

The measured CLI profiles and compact document records are not yet desktop representations. Model resources, packaging and native Mac startup/search/open/reveal still require platform validation. Saving desktop settings preserves CLI retrieval/index preferences. Historical UI notes are byte-preserved under `docs/archive/pre-restoration/ixos-search/`; they are progression records, not active specs.
