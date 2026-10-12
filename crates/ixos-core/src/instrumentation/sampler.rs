//! Lightweight resource sampler for benchmarks and profiling.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use sysinfo::{Pid, ProcessesToUpdate, System};

/// Snapshot of resource usage during a sampled interval.
#[derive(Debug, Clone, Copy, Default)]
pub struct ResourceSample {
    pub peak_ram_mb: u64,
    pub avg_cpu_percent: f32,
    pub samples: usize,
    pub duration_ms: u64,
}

/// Background resource sampler for the current process.
pub struct ResourceSampler {
    stop: Arc<AtomicBool>,
    handle: Option<thread::JoinHandle<ResourceSample>>,
}

impl ResourceSampler {
    /// Start sampling the current process at a fixed interval.
    pub fn start(sample_interval: Duration) -> Self {
        let stop = Arc::new(AtomicBool::new(false));
        let stop_flag = Arc::clone(&stop);
        let pid = std::process::id();

        let handle = thread::spawn(move || {
            let start = Instant::now();
            let mut sys = System::new();
            let mut peak_ram_mb: u64 = 0;
            let mut cpu_sum: f32 = 0.0;
            let mut samples: usize = 0;

            loop {
                if stop_flag.load(Ordering::Relaxed) {
                    break;
                }

                sys.refresh_processes(ProcessesToUpdate::All, true);
                if let Some(process) = sys.process(Pid::from_u32(pid)) {
                    let mem_bytes = process.memory();
                    let mem_mb = (mem_bytes / (1024 * 1024)) as u64;
                    if mem_mb > peak_ram_mb {
                        peak_ram_mb = mem_mb;
                    }
                    cpu_sum += process.cpu_usage();
                    samples += 1;
                }

                thread::sleep(sample_interval);
            }

            let duration_ms = start.elapsed().as_millis() as u64;
            let avg_cpu_percent = if samples == 0 {
                0.0
            } else {
                cpu_sum / samples as f32
            };

            ResourceSample {
                peak_ram_mb,
                avg_cpu_percent,
                samples,
                duration_ms,
            }
        });

        Self {
            stop,
            handle: Some(handle),
        }
    }

    /// Stop sampling and return the summary.
    pub fn stop(mut self) -> ResourceSample {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(handle) = self.handle.take() {
            return handle.join().unwrap_or_default();
        }
        ResourceSample::default()
    }
}

impl Default for ResourceSampler {
    fn default() -> Self {
        Self::start(Duration::from_millis(50))
    }
}
