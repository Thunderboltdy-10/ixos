//! In cached mode, changed files are read as soon as they settle, so the next search
//! or launch has nothing left to do. Without a cache there is nothing to keep ready.
use crate::{
    commands::{search, settings::Settings},
    state::AppState,
};
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::{sync::mpsc, time::Duration};
use tauri::{AppHandle, Manager};

/// Long enough for a save or a copy to finish, and for bursts to count as one change.
const SETTLE: Duration = Duration::from_secs(5);

/// Follow the chosen folders, replacing what was followed before.
pub fn sync(app: &AppHandle, settings: &Settings) {
    let state = app.state::<AppState>();
    let Ok(mut current) = state.watcher.lock() else {
        return;
    };
    *current = None;
    if settings.search.cache && !settings.search.locations.is_empty() {
        match follow(app.clone(), settings) {
            Ok(watcher) => *current = Some(watcher),
            Err(error) => tracing::warn!("Could not follow file changes: {error}"),
        }
    }
}

fn follow(app: AppHandle, settings: &Settings) -> notify::Result<RecommendedWatcher> {
    let (changed, changes) = mpsc::channel();
    let mut watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
        if event.is_ok_and(|event| !matches!(event.kind, EventKind::Access(_))) {
            let _ = changed.send(());
        }
    })?;
    for location in &settings.search.locations {
        // A missing folder is reported by the status line; the others are still followed.
        if let Err(error) = watcher.watch(location, RecursiveMode::Recursive) {
            tracing::warn!("Could not follow {}: {error}", location.display());
        }
    }
    // Dropping the watcher closes the channel, which ends this thread.
    std::thread::spawn(move || {
        while changes.recv().is_ok() {
            std::thread::sleep(SETTLE);
            while changes.try_recv().is_ok() {}
            search::refresh_quietly(app.clone());
        }
    });
    Ok(watcher)
}
