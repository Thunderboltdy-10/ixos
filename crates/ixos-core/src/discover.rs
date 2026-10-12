//! Ignore-aware discovery shared by search, grep and cache management.
use ignore::WalkBuilder;
use std::path::Path;
/// Dependency/cache directories skipped regardless of .gitignore settings.
/// `build` is intentionally absent: it can be a source module (e.g. Clap).
/// Generated build outputs should be excluded by the repository's ignore rules.
pub const HARDCODED_SKIP_DIRS: &[&str] = &[
    "node_modules",
    ".next",
    "vendor",
    "target",
    "dist",
    "__pycache__",
    ".git",
    ".svn",
    ".hg",
    ".idea",
    ".vscode",
    "venv",
    ".venv",
    ".cargo",
    ".rustup",
    "bower_components",
    ".cache",
    ".npm",
    ".yarn",
    ".pnpm",
    "coverage",
    ".nyc_output",
    ".tox",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
];

/// One discovery contract for lexical, semantic and cache-warmup searches.
pub fn search_walk(
    root: &Path,
    skip_hidden: bool,
    respect_gitignore: bool,
    follow_symlinks: bool,
    max_file_size: Option<u64>,
) -> WalkBuilder {
    let mut builder = WalkBuilder::new(root);
    // Outside Git, honor ordinary folder .gitignore files. Inside Git, use the
    // nearest repository boundary: require_git(false) also reads ignores above
    // a nested Git root, which can prune unrelated imported repositories.
    let inside_git = root
        .ancestors()
        .any(|ancestor| ancestor.join(".git").exists());
    builder
        .hidden(skip_hidden)
        .git_ignore(respect_gitignore)
        .git_global(respect_gitignore)
        .git_exclude(respect_gitignore)
        .require_git(inside_git)
        .follow_links(follow_symlinks)
        .max_filesize(max_file_size);
    builder.filter_entry(|entry| {
        entry.depth() == 0
            || !entry.file_type().is_some_and(|kind| kind.is_dir())
            || !entry.file_name().to_str().is_some_and(|name| {
                HARDCODED_SKIP_DIRS.contains(&name)
                    || name == "env" && entry.path().join("pyvenv.cfg").is_file()
            })
    });
    builder
}

#[cfg(test)]
mod tests {
    use super::*;
    fn files(root: &Path) -> Vec<String> {
        let mut paths = search_walk(root, true, true, false, None)
            .build()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_type().is_some_and(|kind| kind.is_file()))
            .map(|entry| {
                entry
                    .path()
                    .strip_prefix(root)
                    .unwrap()
                    .to_string_lossy()
                    .replace('\\', "/")
            })
            .collect::<Vec<_>>();
        paths.sort();
        paths
    }
    #[test]
    fn source_build_and_env_folders_survive_ignore_rules() {
        let root = tempfile::tempdir().unwrap();
        for folder in ["src/build", "build", "env", "node_modules/pkg"] {
            std::fs::create_dir_all(root.path().join(folder)).unwrap();
        }
        for name in [
            "src/build/module.rs",
            "build/generated.rs",
            "env/source.rs",
            "node_modules/pkg/index.js",
            "ignored.txt",
        ] {
            std::fs::write(root.path().join(name), "source").unwrap();
        }
        std::fs::write(root.path().join(".gitignore"), "/build/\nignored.txt\n").unwrap();
        assert_eq!(files(root.path()), ["env/source.rs", "src/build/module.rs"]);
        std::fs::write(root.path().join("env/pyvenv.cfg"), "home=python").unwrap();
        assert_eq!(files(root.path()), ["src/build/module.rs"]);
    }
    #[test]
    fn nested_repository_stops_outer_ignore_rules() {
        let root = tempfile::tempdir().unwrap();
        std::fs::create_dir(root.path().join(".git")).unwrap();
        std::fs::write(root.path().join(".gitignore"), "build/\n").unwrap();
        let nested = root.path().join("nested");
        std::fs::create_dir_all(nested.join(".git")).unwrap();
        std::fs::create_dir_all(nested.join("build")).unwrap();
        std::fs::write(nested.join("build/module.rs"), "source").unwrap();
        assert_eq!(files(&nested), ["build/module.rs"]);
    }
    #[cfg(unix)]
    #[test]
    fn symlinks_are_never_followed() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        std::fs::write(outside.path().join("file.txt"), "outside").unwrap();
        std::os::unix::fs::symlink(outside.path(), root.path().join("link")).unwrap();
        assert!(files(root.path()).is_empty());
    }
}
