# DESKTOP APP GUIDE

## WHAT THE APP DOES

Ixos provides local-first semantic file search with privacy-by-default behavior and fast progressive results.

## PRIMARY FLOWS

- Sign in and entitlement bootstrap
- Model install/select (Flash/Pro paths)
- Search and open/reveal files
- Ask mode for evidence-driven query handling
- Settings for privacy, shortcuts, compliance, and account controls

## SEARCH PIPELINE IN PRODUCT TERMS

1. Query parse
2. Embedding
3. Ranking
4. Privacy wipe
5. Streaming results

This sequence is reflected in both UI status and the landing pipeline story.

## AUTH + ENTITLEMENT

- Desktop auth UI is implemented in `ui/src/components/auth/AuthGate.tsx`.
- Entitlement and lease routes are handled by site API endpoints under `ixos-site/src/app/api/desktop/*`.
- Device transfer and trusted-device flows are included for Pro portability.

## MODEL SELECTION AND ASK MODE RULE

- Ask mode must respect user-selected model.
- Ask mode must not silently force a slower Pro path.
- Keep progressive UX fast and transparent.

## KEY FILES

- `ui/src/components/search/MainSearchView.tsx`
- `ui/src/components/search/ModelSwitcher.tsx`
- `ui/src/components/search/AskModeSwitcher.tsx`
- `ui/src/components/settings/SearchSettings.tsx`
- `src-tauri/src/commands/search.rs`

## RELEASE CHECKPOINTS

- Search performance verified against baseline
- Model naming consistent in UI and CLI
- Installer and manifests updated
- Docs + reports updated

