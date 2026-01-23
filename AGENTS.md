# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the Rust core library and CLI (`src/main.rs`, `src/lib.rs`) plus domain modules (e.g., `src/ixos_rank`, `src/ixos_embed`, `src/security`).
- `src-tauri/` holds the Tauri desktop shell (Rust commands under `src-tauri/src/` plus `tauri.conf.json`).
- `ui/` is the Vite + React front-end for the desktop app (`ui/src/`).
- `landing/` is the Next.js marketing site (`landing/app`, `landing/components`, `landing/public`).
- `scripts/` includes Python and PowerShell utilities for model work and deployment.

## Build, Test, and Development Commands
- `cargo build` builds the Rust workspace (core + Tauri).
- `cargo test` runs Rust unit tests (many modules have inline `mod tests`).
- `npm run tauri:dev` starts the Tauri app with the UI.
- `npm run tauri:build` builds the Tauri app.
- `npm run dev` (from repo root) runs the Vite UI in `ui/`.
- `cd landing && npm run dev` runs the Next.js site.

## Coding Style & Naming Conventions
- Rust uses edition 2021; follow standard `rustfmt` defaults and keep modules in `snake_case`.
- React components in `ui/src/components/**` use `PascalCase` filenames (e.g., `SearchResults.tsx`).
- Tailwind is the styling system in `ui/` and `landing/`; keep utility class blocks grouped by layout, spacing, color.

## Testing Guidelines
- Rust tests live alongside modules with `mod tests` and use `#[test]` or `#[tokio::test]`.
- Run `cargo test` before changes that touch ranking, embedding, or compliance logic.
- Frontend tests are not configured yet; validate UI changes via `npm run dev` in `ui/`.

## Commit & Pull Request Guidelines
- Commit messages follow a Conventional Commit style (e.g., `feat: add secure embedder`).
- PRs should include a short summary, testing notes, and screenshots/GIFs for UI changes.
- Link any relevant issues or roadmap docs when applicable.

## Configuration & Data Notes
- The marketing site expects environment variables based on `landing/.env.example`.
- Large assets and model artifacts live under `models/` and `dataset/`; avoid committing derived outputs unless required.
