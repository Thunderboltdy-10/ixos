//! Performance optimization for Ixos
//!
//! Auto-detects system specs and configures optimal settings.
//!
//! Uses the `sysinfo` crate for accurate RAM and CPU detection.

use serde::{Deserialize, Serialize};
use sysinfo::System;

/// System specifications detected at runtime
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSpecs {
    /// Number of CPU cores
    pub cpu_cores: usize,
    /// Available RAM in GB
    pub available_ram_gb: f32,
    /// Whether running on SSD (heuristic)
    pub likely_ssd: bool,
}

impl SystemSpecs {
    /// Detect system specifications using sysinfo
    pub fn detect() -> Self {
        let cpu_cores = std::thread::available_parallelism()
            .map(|p| p.get())
            .unwrap_or(2);

        // Use sysinfo for accurate RAM detection
        let available_ram_gb = Self::detect_available_ram();

        // Assume SSD for modern systems (could check disk type on Linux)
        let likely_ssd = true;

        tracing::debug!(
            "Detected system: {} cores, {:.1}GB RAM, SSD: {}",
            cpu_cores,
            available_ram_gb,
            likely_ssd
        );

        Self {
            cpu_cores,
            available_ram_gb,
            likely_ssd,
        }
    }

    /// Detect available RAM using sysinfo crate
    fn detect_available_ram() -> f32 {
        // Override with environment variable if set (for testing or containers)
        if let Ok(ram_str) = std::env::var("IXOS_RAM_GB") {
            if let Ok(ram) = ram_str.parse::<f32>() {
                return ram;
            }
        }

        // Use sysinfo for accurate detection
        let mut sys = System::new_all();
        sys.refresh_memory();

        let total_memory_bytes = sys.total_memory();
        let total_memory_gb = total_memory_bytes as f64 / 1024.0 / 1024.0 / 1024.0;

        total_memory_gb as f32
    }
}

/// Performance profiles based on system capabilities
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PerformanceProfile {
    /// Low spec: 4GB RAM, 2 cores
    LowSpec,
    /// Mid spec: 8GB RAM, 4 cores
    MidSpec,
    /// High spec: 16GB+ RAM, 8+ cores
    HighSpec,
}

impl PerformanceProfile {
    /// Determine profile from system specs
    pub fn from_specs(specs: &SystemSpecs) -> Self {
        match (specs.available_ram_gb, specs.cpu_cores) {
            (ram, _) if ram < 4.0 => Self::LowSpec,
            (ram, cores) if ram < 8.0 || cores < 4 => Self::MidSpec,
            _ => Self::HighSpec,
        }
    }
}

/// Optimized settings for the application
#[derive(Debug, Clone)]
pub struct OptimizedSettings {
    /// Batch size for embedding operations
    pub batch_size: usize,
    /// Maximum concurrent embedding operations
    pub max_concurrent_embeds: usize,
    /// Whether to warm cache on startup
    pub cache_warming: bool,
    /// Maximum files to keep in memory cache
    pub memory_cache_limit: usize,
    /// Minimum processing time floor (for constant-time security)
    pub min_processing_time_ms: u64,
}

impl OptimizedSettings {
    /// Get optimized settings for a profile
    pub fn for_profile(profile: PerformanceProfile) -> Self {
        match profile {
            PerformanceProfile::LowSpec => Self {
                batch_size: 10,
                max_concurrent_embeds: 1,
                cache_warming: false,
                memory_cache_limit: 100,
                min_processing_time_ms: 100,
            },
            PerformanceProfile::MidSpec => Self {
                batch_size: 50,
                max_concurrent_embeds: 2,
                cache_warming: false,
                memory_cache_limit: 500,
                min_processing_time_ms: 100,
            },
            PerformanceProfile::HighSpec => Self {
                batch_size: 100,
                max_concurrent_embeds: 4,
                cache_warming: true,
                memory_cache_limit: 2000,
                min_processing_time_ms: 100,
            },
        }
    }
}

/// Performance optimizer that auto-configures based on system
pub struct PerformanceOptimizer {
    pub specs: SystemSpecs,
    pub profile: PerformanceProfile,
    pub settings: OptimizedSettings,
}

impl PerformanceOptimizer {
    /// Detect system and create optimized configuration
    pub fn auto_configure() -> Self {
        let specs = SystemSpecs::detect();
        let profile = PerformanceProfile::from_specs(&specs);
        let settings = OptimizedSettings::for_profile(profile);

        tracing::info!(
            "Performance profile: {:?} ({}GB RAM, {} cores)",
            profile,
            specs.available_ram_gb,
            specs.cpu_cores
        );

        Self {
            specs,
            profile,
            settings,
        }
    }

    /// Get the optimized settings
    pub fn settings(&self) -> &OptimizedSettings {
        &self.settings
    }
}

impl Default for PerformanceOptimizer {
    fn default() -> Self {
        Self::auto_configure()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_specs_detect() {
        let specs = SystemSpecs::detect();
        assert!(specs.cpu_cores > 0);
        assert!(specs.available_ram_gb > 0.0);
    }

    #[test]
    fn test_system_specs_env_override() {
        // Test that environment variable override works
        std::env::set_var("IXOS_RAM_GB", "4.0");
        let ram = SystemSpecs::detect_available_ram();
        assert!((ram - 4.0).abs() < 0.01);
        std::env::remove_var("IXOS_RAM_GB");
    }

    #[test]
    fn test_profile_from_specs() {
        let low = SystemSpecs {
            cpu_cores: 2,
            available_ram_gb: 2.0,
            likely_ssd: false,
        };
        assert_eq!(
            PerformanceProfile::from_specs(&low),
            PerformanceProfile::LowSpec
        );

        let mid = SystemSpecs {
            cpu_cores: 4,
            available_ram_gb: 6.0,
            likely_ssd: true,
        };
        assert_eq!(
            PerformanceProfile::from_specs(&mid),
            PerformanceProfile::MidSpec
        );

        let high = SystemSpecs {
            cpu_cores: 8,
            available_ram_gb: 16.0,
            likely_ssd: true,
        };
        assert_eq!(
            PerformanceProfile::from_specs(&high),
            PerformanceProfile::HighSpec
        );
    }

    #[test]
    fn test_optimized_settings() {
        let low = OptimizedSettings::for_profile(PerformanceProfile::LowSpec);
        assert_eq!(low.batch_size, 10);
        assert_eq!(low.max_concurrent_embeds, 1);

        let high = OptimizedSettings::for_profile(PerformanceProfile::HighSpec);
        assert_eq!(high.batch_size, 100);
        assert_eq!(high.max_concurrent_embeds, 4);
    }

    #[test]
    fn test_performance_optimizer() {
        let optimizer = PerformanceOptimizer::auto_configure();
        assert!(optimizer.specs.cpu_cores > 0);
        assert!(optimizer.specs.available_ram_gb > 0.0);
        // Settings should be valid
        assert!(optimizer.settings.batch_size > 0);
        assert!(optimizer.settings.max_concurrent_embeds > 0);
    }
}
