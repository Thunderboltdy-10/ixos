use ixos_runtime::config::{Config, Profile};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Emitter;

#[derive(Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub search: Config,
    pub quit_on_close: bool,
    /// Choose the code or documents model from what the folders contain.
    pub auto_profile: bool,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            search: Config::default(),
            quit_on_close: false,
            auto_profile: true,
        }
    }
}
#[derive(Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct DesktopOptions {
    quit_on_close: bool,
    auto_profile: bool,
}
impl Default for DesktopOptions {
    fn default() -> Self {
        Self {
            quit_on_close: false,
            auto_profile: true,
        }
    }
}
impl Settings {
    fn path() -> PathBuf {
        ixos_runtime::config::settings_dir().join("desktop.json")
    }
    pub fn load() -> Self {
        let desktop: DesktopOptions = std::fs::read(Self::path())
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default();
        Self {
            search: Config::load(&Config::path()).unwrap_or_default(),
            quit_on_close: desktop.quit_on_close,
            auto_profile: desktop.auto_profile,
        }
    }
    pub fn save(&self) -> Result<(), String> {
        self.search.validate().map_err(|e| e.to_string())?;
        if self.search.locations.iter().any(|path| !path.is_dir()) {
            return Err("Each location must be a directory".into());
        }
        self.search
            .save(&Config::path())
            .map_err(|e| e.to_string())?;
        let path = Self::path();
        std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
        std::fs::write(
            path,
            serde_json::to_vec_pretty(&DesktopOptions {
                quit_on_close: self.quit_on_close,
                auto_profile: self.auto_profile,
            })
            .map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())
    }
}

const CODE: &[&str] = &[
    "c", "cc", "cpp", "cs", "css", "dart", "ex", "go", "h", "hpp", "html", "java", "js", "jsx",
    "kt", "lua", "m", "php", "ps1", "py", "r", "rb", "rs", "scala", "scss", "sh", "sql", "svelte",
    "swift", "ts", "tsx", "vue", "zig",
];
const DOCUMENTS: &[&str] = &[
    "doc", "docx", "epub", "md", "odt", "pdf", "ppt", "pptx", "rtf", "tex", "txt",
];

/// Counts file types in the first few thousand files; code wins ties.
fn detect(locations: &[PathBuf]) -> Profile {
    let (mut code, mut documents, mut seen) = (0usize, 0usize, 0usize);
    let mut pending = locations.to_vec();
    'walk: while let Some(directory) = pending.pop() {
        let Ok(entries) = std::fs::read_dir(&directory) else {
            continue;
        };
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.')
                || matches!(name.as_str(), "node_modules" | "target" | "dist" | "build")
            {
                continue;
            }
            let Ok(kind) = entry.file_type() else {
                continue;
            };
            if kind.is_dir() {
                pending.push(entry.path());
            } else if kind.is_file() {
                let extension = Path::new(&name)
                    .extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
                    .unwrap_or_default();
                code += usize::from(CODE.contains(&extension.as_str()));
                documents += usize::from(DOCUMENTS.contains(&extension.as_str()));
                seen += 1;
                if seen >= 4000 {
                    break 'walk;
                }
            }
        }
    }
    if documents > code {
        Profile::Documents
    } else {
        Profile::Code
    }
}

#[tauri::command]
pub fn get_config() -> Settings {
    Settings::load()
}
pub fn apply(app: tauri::AppHandle, mut config: Settings) -> Result<(), String> {
    use tauri::Manager;
    if config.auto_profile {
        config.search.profile = detect(&config.search.locations);
    }
    let model_directory_changed = Settings::load().search.model_dir != config.search.model_dir;
    config.save()?;
    let state = app.state::<crate::state::AppState>();
    state
        .generation
        .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    state
        .warming_generation
        .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    *state.engine.lock().map_err(|error| error.to_string())? = None;
    let _ = app.emit("settings-changed", ());
    if model_directory_changed {
        super::system::setup_models(app.clone());
    }
    super::search::warm(app);
    Ok(())
}
#[tauri::command]
pub async fn update_config(config: Settings, app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || apply(app, config))
        .await
        .map_err(|error| error.to_string())?
}
