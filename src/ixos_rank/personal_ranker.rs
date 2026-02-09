//! Personal ranking signal math and helpers.

use std::path::Path;

use crate::storage::personal_ranking::{
    clear_personal_signals, get_personal_signals, set_personal_signals, PersonalSignals,
};

pub const DECAY_TAU_SECONDS: f32 = 604_800.0; // 7 days
pub const OPEN_SCORE_NORMALIZER: f32 = 20.0;

pub fn now_unix_s() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub fn recency_factor(last_open_ts: u64, now: u64) -> f32 {
    if last_open_ts == 0 || now <= last_open_ts {
        return 0.0;
    }
    let delta = (now - last_open_ts) as f32;
    (-delta / DECAY_TAU_SECONDS).exp().clamp(0.0, 1.0)
}

pub fn update_on_open(mut signals: PersonalSignals, now: u64) -> PersonalSignals {
    if signals.last_open_ts > 0 && now > signals.last_open_ts {
        let delta = (now - signals.last_open_ts) as f32;
        let decay = (-delta / DECAY_TAU_SECONDS).exp();
        signals.open_score = signals.open_score * decay + 1.0;
    } else {
        signals.open_score += 1.0;
    }
    signals.last_open_ts = now;
    signals
}

pub fn normalize_open_score(score: f32) -> f32 {
    (score / OPEN_SCORE_NORMALIZER).clamp(0.0, 1.0)
}

pub fn pin(path: &Path) -> Result<(), std::io::Error> {
    if !path.is_file() {
        return Ok(());
    }
    let mut signals = get_personal_signals(path)?.unwrap_or_default();
    signals.pinned = true;
    set_personal_signals(path, signals)
}

pub fn unpin(path: &Path) -> Result<(), std::io::Error> {
    if !path.is_file() {
        return Ok(());
    }
    let mut signals = get_personal_signals(path)?.unwrap_or_default();
    signals.pinned = false;
    set_personal_signals(path, signals)
}

pub fn ignore(path: &Path) -> Result<(), std::io::Error> {
    if !path.is_file() {
        return Ok(());
    }
    let mut signals = get_personal_signals(path)?.unwrap_or_default();
    signals.ignored = true;
    set_personal_signals(path, signals)
}

pub fn unignore(path: &Path) -> Result<(), std::io::Error> {
    if !path.is_file() {
        return Ok(());
    }
    let mut signals = get_personal_signals(path)?.unwrap_or_default();
    signals.ignored = false;
    set_personal_signals(path, signals)
}

pub fn mark_not_relevant(path: &Path) -> Result<(), std::io::Error> {
    if !path.is_file() {
        return Ok(());
    }
    let mut signals = get_personal_signals(path)?.unwrap_or_default();
    signals.ignored = true;
    signals.open_score = 0.0;
    set_personal_signals(path, signals)
}

pub fn reset_learning(path: &Path) -> Result<(), std::io::Error> {
    clear_personal_signals(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::personal_ranking::{get_personal_signals, set_personal_signals};
    use tempfile::NamedTempFile;

    #[test]
    fn decay_curve_behaves() {
        let mut s = PersonalSignals::default();
        let start = 1_700_000_000u64;
        s = update_on_open(s, start);
        s = update_on_open(s, start + 1);
        s = update_on_open(s, start + 2);
        s = update_on_open(s, start + 3);
        s = update_on_open(s, start + 4);
        let boosted = s.open_score;
        assert!(boosted > 4.0);

        let decayed = recency_factor(start + 4, start + 4 + 604_800);
        assert!(decayed < 0.4);
    }

    #[test]
    fn normalization_is_capped() {
        assert_eq!(normalize_open_score(0.0), 0.0);
        assert!(normalize_open_score(10.0) > 0.4);
        assert_eq!(normalize_open_score(999.0), 1.0);
    }

    #[test]
    fn mark_not_relevant_clears_open_score() {
        let temp = NamedTempFile::new().expect("temp");
        let path = temp.path();
        set_personal_signals(
            path,
            PersonalSignals {
                open_score: 7.0,
                last_open_ts: 1_700_000_000,
                pinned: false,
                ignored: false,
            },
        )
        .expect("set");

        mark_not_relevant(path).expect("mark");
        let out = get_personal_signals(path).expect("get").expect("signals");
        assert!(out.ignored);
        assert_eq!(out.open_score, 0.0);
    }

    #[test]
    fn pin_and_ignore_toggle_roundtrip() {
        let temp = NamedTempFile::new().expect("temp");
        let path = temp.path();

        pin(path).expect("pin");
        let s1 = get_personal_signals(path).expect("get").expect("signals");
        assert!(s1.pinned);

        ignore(path).expect("ignore");
        let s2 = get_personal_signals(path).expect("get").expect("signals");
        assert!(s2.ignored);

        unignore(path).expect("unignore");
        unpin(path).expect("unpin");
        let s3 = get_personal_signals(path).expect("get").expect("signals");
        assert!(!s3.pinned);
        assert!(!s3.ignored);
    }
}
