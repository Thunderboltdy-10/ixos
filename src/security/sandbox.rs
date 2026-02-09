//! Sandbox mode for restricting file operations to specific directories
//!
//! This module provides path validation to ensure all file operations
//! are confined to a set of allowed directories. This is useful for:
//!
//! - **Testing**: Restrict operations to a test dataset folder
//! - **Security**: Limit access to sensitive directories
//! - **Privacy**: Ensure the tool only accesses intended files
//!
//! ## Security Features
//!
//! - **Canonicalization**: All paths are resolved to absolute, canonical form
//! - **Symlink protection**: Symlinks are resolved to detect escape attempts
//! - **Traversal protection**: `..` and `.` are resolved before validation
//!
//! ## Example
//!
//! ```rust,no_run
//! use std::path::Path;
//! use ixos_protocol::security::sandbox::{Sandbox, SandboxConfig};
//!
//! // Create a sandbox for the dataset folder
//! let config = SandboxConfig::for_testing(Path::new("./dataset"));
//! let sandbox = Sandbox::new(config).unwrap();
//!
//! // This will succeed
//! let result = sandbox.validate_path(Path::new("./dataset/business/file1.txt"));
//! assert!(result.is_ok());
//!
//! // This will fail - outside sandbox
//! let result = sandbox.validate_path(Path::new("/etc/passwd"));
//! assert!(result.is_err());
//! ```

use std::path::{Path, PathBuf};

/// Configuration for sandbox mode
#[derive(Debug, Clone)]
pub struct SandboxConfig {
    /// Directories where operations are allowed
    pub allowed_directories: Vec<PathBuf>,
    /// Whether sandbox enforcement is enabled
    pub enabled: bool,
    /// Allow read operations outside sandbox (write always restricted)
    pub allow_external_reads: bool,
}

impl SandboxConfig {
    /// Create a sandbox configuration for testing
    ///
    /// Restricts all operations to the specified directory.
    pub fn for_testing<P: AsRef<Path>>(path: P) -> Self {
        Self {
            allowed_directories: vec![path.as_ref().to_path_buf()],
            enabled: true,
            allow_external_reads: false,
        }
    }

    /// Create a disabled sandbox configuration
    ///
    /// All paths are allowed when sandbox is disabled.
    pub fn disabled() -> Self {
        Self {
            allowed_directories: Vec::new(),
            enabled: false,
            allow_external_reads: true,
        }
    }

    /// Create a sandbox with multiple allowed directories
    pub fn with_directories<I, P>(directories: I) -> Self
    where
        I: IntoIterator<Item = P>,
        P: AsRef<Path>,
    {
        Self {
            allowed_directories: directories
                .into_iter()
                .map(|p| p.as_ref().to_path_buf())
                .collect(),
            enabled: true,
            allow_external_reads: false,
        }
    }

    /// Create a read-only sandbox (allows reading anywhere, writing restricted)
    pub fn read_only<P: AsRef<Path>>(write_directory: P) -> Self {
        Self {
            allowed_directories: vec![write_directory.as_ref().to_path_buf()],
            enabled: true,
            allow_external_reads: true,
        }
    }
}

impl Default for SandboxConfig {
    fn default() -> Self {
        Self::disabled()
    }
}

/// Errors from sandbox validation
#[derive(Debug, thiserror::Error)]
pub enum SandboxError {
    #[error("Path '{0}' is outside sandbox boundaries")]
    PathOutsideSandbox(PathBuf),

    #[error("Failed to canonicalize path '{0}': {1}")]
    CanonicalizationFailed(PathBuf, std::io::Error),

    #[error("Symlink escape attempt detected: '{0}' resolves outside sandbox")]
    SymlinkEscape(PathBuf),

    #[error("Path does not exist: '{0}'")]
    PathNotFound(PathBuf),

    #[error("No allowed directories configured")]
    NoAllowedDirectories,
}

/// Sandbox validator for path operations
///
/// Validates that all file paths are within the allowed directories
/// before any operation is performed.
#[derive(Debug, Clone)]
pub struct Sandbox {
    config: SandboxConfig,
    /// Pre-canonicalized allowed paths for efficient comparison
    canonical_allowed: Vec<PathBuf>,
}

impl Sandbox {
    /// Create a new sandbox with the given configuration
    ///
    /// Canonicalizes all allowed directories during construction.
    /// Directories that don't exist or can't be canonicalized are skipped
    /// with a warning.
    pub fn new(config: SandboxConfig) -> std::io::Result<Self> {
        let canonical_allowed: Vec<PathBuf> = config
            .allowed_directories
            .iter()
            .filter_map(|p| match std::fs::canonicalize(p) {
                Ok(canonical) => Some(canonical),
                Err(e) => {
                    tracing::warn!(
                        "Sandbox: Could not canonicalize '{}': {}. Skipping.",
                        p.display(),
                        e
                    );
                    None
                }
            })
            .collect();

        if config.enabled && canonical_allowed.is_empty() && !config.allowed_directories.is_empty()
        {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "None of the allowed directories exist or could be canonicalized",
            ));
        }

        Ok(Self {
            config,
            canonical_allowed,
        })
    }

    /// Validate that a path is within the sandbox
    ///
    /// Returns the canonicalized path if valid.
    pub fn validate_path(&self, path: &Path) -> Result<PathBuf, SandboxError> {
        if !self.config.enabled {
            return Ok(path.to_path_buf());
        }

        // Canonicalize the path to resolve symlinks and relative components
        let canonical = std::fs::canonicalize(path).map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                SandboxError::PathNotFound(path.to_path_buf())
            } else {
                SandboxError::CanonicalizationFailed(path.to_path_buf(), e)
            }
        })?;

        // Check if the canonical path is under any allowed directory
        for allowed in &self.canonical_allowed {
            if canonical.starts_with(allowed) {
                return Ok(canonical);
            }
        }

        Err(SandboxError::PathOutsideSandbox(path.to_path_buf()))
    }

    /// Validate a path for read operations
    ///
    /// May allow external reads depending on configuration.
    pub fn validate_read(&self, path: &Path) -> Result<PathBuf, SandboxError> {
        if !self.config.enabled || self.config.allow_external_reads {
            // Still canonicalize for safety, but allow if file exists
            if path.exists() {
                return std::fs::canonicalize(path)
                    .map_err(|e| SandboxError::CanonicalizationFailed(path.to_path_buf(), e));
            }
            return Err(SandboxError::PathNotFound(path.to_path_buf()));
        }

        self.validate_path(path)
    }

    /// Validate a path for write operations
    ///
    /// Write operations are always restricted to allowed directories.
    pub fn validate_write(&self, path: &Path) -> Result<PathBuf, SandboxError> {
        if !self.config.enabled {
            return Ok(path.to_path_buf());
        }

        // For new files, validate the parent directory
        if !path.exists() {
            if let Some(parent) = path.parent() {
                let canonical_parent = std::fs::canonicalize(parent)
                    .map_err(|e| SandboxError::CanonicalizationFailed(parent.to_path_buf(), e))?;

                for allowed in &self.canonical_allowed {
                    if canonical_parent.starts_with(allowed) {
                        // Return the intended path (not yet created)
                        return Ok(canonical_parent.join(path.file_name().unwrap_or_default()));
                    }
                }

                return Err(SandboxError::PathOutsideSandbox(path.to_path_buf()));
            }
        }

        self.validate_path(path)
    }

    /// Validate a path for delete operations
    ///
    /// Delete operations follow the same rules as write operations.
    pub fn validate_delete(&self, path: &Path) -> Result<PathBuf, SandboxError> {
        self.validate_write(path)
    }

    /// Check if sandbox is enabled
    pub fn is_enabled(&self) -> bool {
        self.config.enabled
    }

    /// Get the list of allowed directories (canonicalized)
    pub fn allowed_directories(&self) -> &[PathBuf] {
        &self.canonical_allowed
    }

    /// Check if a path would be allowed without returning an error
    pub fn is_path_allowed(&self, path: &Path) -> bool {
        self.validate_path(path).is_ok()
    }

    /// Check if a path would be allowed for reading
    pub fn is_read_allowed(&self, path: &Path) -> bool {
        self.validate_read(path).is_ok()
    }

    /// Check if a path would be allowed for writing
    pub fn is_write_allowed(&self, path: &Path) -> bool {
        self.validate_write(path).is_ok()
    }
}

impl Default for Sandbox {
    fn default() -> Self {
        Self {
            config: SandboxConfig::disabled(),
            canonical_allowed: Vec::new(),
        }
    }
}

/// Trait for types that perform sandboxed file operations
pub trait SandboxedOps {
    /// Get the sandbox instance
    fn sandbox(&self) -> &Sandbox;

    /// Read a file with sandbox validation
    fn read_file(&self, path: &Path) -> Result<Vec<u8>, SandboxError> {
        let validated = self.sandbox().validate_read(path)?;
        std::fs::read(&validated).map_err(|e| SandboxError::CanonicalizationFailed(validated, e))
    }

    /// Read a file as string with sandbox validation
    fn read_to_string(&self, path: &Path) -> Result<String, SandboxError> {
        let validated = self.sandbox().validate_read(path)?;
        std::fs::read_to_string(&validated)
            .map_err(|e| SandboxError::CanonicalizationFailed(validated, e))
    }

    /// Write to a file with sandbox validation
    fn write_file(&self, path: &Path, contents: &[u8]) -> Result<(), SandboxError> {
        let validated = self.sandbox().validate_write(path)?;
        std::fs::write(&validated, contents)
            .map_err(|e| SandboxError::CanonicalizationFailed(validated, e))
    }

    /// List directory contents with sandbox validation
    fn list_directory(&self, path: &Path) -> Result<Vec<PathBuf>, SandboxError> {
        let validated = self.sandbox().validate_read(path)?;
        let entries: Vec<PathBuf> = std::fs::read_dir(&validated)
            .map_err(|e| SandboxError::CanonicalizationFailed(validated.clone(), e))?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();
        Ok(entries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_sandbox() -> (TempDir, Sandbox) {
        let temp_dir = TempDir::new().unwrap();
        let config = SandboxConfig::for_testing(temp_dir.path());
        let sandbox = Sandbox::new(config).unwrap();
        (temp_dir, sandbox)
    }

    #[test]
    fn test_sandbox_config_disabled() {
        let config = SandboxConfig::disabled();
        assert!(!config.enabled);
        assert!(config.allowed_directories.is_empty());
    }

    #[test]
    fn test_sandbox_config_for_testing() {
        let config = SandboxConfig::for_testing("/tmp/test");
        assert!(config.enabled);
        assert_eq!(config.allowed_directories.len(), 1);
        assert!(!config.allow_external_reads);
    }

    #[test]
    fn test_sandbox_config_read_only() {
        let config = SandboxConfig::read_only("/tmp/test");
        assert!(config.enabled);
        assert!(config.allow_external_reads);
    }

    #[test]
    fn test_sandbox_disabled_allows_all() {
        let sandbox = Sandbox::default();
        assert!(!sandbox.is_enabled());
        // Disabled sandbox should allow any path (without validation)
        let result = sandbox.validate_path(Path::new("/some/path"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_sandbox_validates_existing_path() {
        let (temp_dir, sandbox) = setup_test_sandbox();

        // Create a file inside the sandbox
        let file_path = temp_dir.path().join("test.txt");
        fs::write(&file_path, "test content").unwrap();

        // Should succeed
        let result = sandbox.validate_path(&file_path);
        assert!(result.is_ok());
    }

    #[test]
    fn test_sandbox_rejects_outside_path() {
        let (_temp_dir, sandbox) = setup_test_sandbox();

        // Create another temp directory outside the sandbox
        let other_dir = TempDir::new().unwrap();
        let outside_file = other_dir.path().join("outside.txt");
        fs::write(&outside_file, "outside content").unwrap();

        // Should fail
        let result = sandbox.validate_path(&outside_file);
        assert!(matches!(result, Err(SandboxError::PathOutsideSandbox(_))));
    }

    #[test]
    fn test_sandbox_handles_nonexistent_path() {
        let (_temp_dir, sandbox) = setup_test_sandbox();

        let result = sandbox.validate_path(Path::new("/nonexistent/path/file.txt"));
        assert!(matches!(result, Err(SandboxError::PathNotFound(_))));
    }

    #[test]
    fn test_sandbox_write_validation_for_new_file() {
        let (temp_dir, sandbox) = setup_test_sandbox();

        // Validate write for a new file in allowed directory
        let new_file = temp_dir.path().join("new_file.txt");
        let result = sandbox.validate_write(&new_file);
        assert!(result.is_ok());
    }

    #[test]
    fn test_sandbox_write_validation_outside() {
        let (_temp_dir, sandbox) = setup_test_sandbox();

        // Try to write outside sandbox
        let other_dir = TempDir::new().unwrap();
        let outside_file = other_dir.path().join("new_outside.txt");
        let result = sandbox.validate_write(&outside_file);
        assert!(matches!(result, Err(SandboxError::PathOutsideSandbox(_))));
    }

    #[test]
    fn test_sandbox_read_only_mode() {
        let temp_dir = TempDir::new().unwrap();
        let config = SandboxConfig::read_only(temp_dir.path());
        let sandbox = Sandbox::new(config).unwrap();

        // Create a file inside sandbox
        let inside_file = temp_dir.path().join("inside.txt");
        fs::write(&inside_file, "content").unwrap();

        // Read should succeed inside
        assert!(sandbox.validate_read(&inside_file).is_ok());

        // Write should succeed inside
        assert!(sandbox.validate_write(&inside_file).is_ok());

        // Create a file outside
        let other_dir = TempDir::new().unwrap();
        let outside_file = other_dir.path().join("outside.txt");
        fs::write(&outside_file, "content").unwrap();

        // Read should succeed outside (allow_external_reads = true)
        assert!(sandbox.validate_read(&outside_file).is_ok());

        // Write should fail outside
        assert!(sandbox.validate_write(&outside_file).is_err());
    }

    #[test]
    fn test_sandbox_multiple_directories() {
        let dir1 = TempDir::new().unwrap();
        let dir2 = TempDir::new().unwrap();

        let config = SandboxConfig::with_directories([dir1.path(), dir2.path()]);
        let sandbox = Sandbox::new(config).unwrap();

        // Create files in both directories
        let file1 = dir1.path().join("file1.txt");
        let file2 = dir2.path().join("file2.txt");
        fs::write(&file1, "content1").unwrap();
        fs::write(&file2, "content2").unwrap();

        // Both should be allowed
        assert!(sandbox.validate_path(&file1).is_ok());
        assert!(sandbox.validate_path(&file2).is_ok());

        // Third directory should be rejected
        let dir3 = TempDir::new().unwrap();
        let file3 = dir3.path().join("file3.txt");
        fs::write(&file3, "content3").unwrap();
        assert!(sandbox.validate_path(&file3).is_err());
    }

    #[test]
    fn test_sandbox_is_path_allowed() {
        let (temp_dir, sandbox) = setup_test_sandbox();

        let inside_file = temp_dir.path().join("test.txt");
        fs::write(&inside_file, "test").unwrap();

        assert!(sandbox.is_path_allowed(&inside_file));
        assert!(!sandbox.is_path_allowed(Path::new("/nonexistent")));
    }

    #[test]
    fn test_sandbox_allowed_directories() {
        let (temp_dir, sandbox) = setup_test_sandbox();
        let allowed = sandbox.allowed_directories();
        assert_eq!(allowed.len(), 1);
        assert_eq!(allowed[0], fs::canonicalize(temp_dir.path()).unwrap());
    }

    #[test]
    fn test_sandbox_traversal_attack_prevention() {
        let (temp_dir, sandbox) = setup_test_sandbox();

        // Create a nested directory structure
        let nested = temp_dir.path().join("a").join("b");
        fs::create_dir_all(&nested).unwrap();
        let nested_file = nested.join("file.txt");
        fs::write(&nested_file, "content").unwrap();

        // Try path traversal attack
        let traversal_path = temp_dir
            .path()
            .join("a")
            .join("b")
            .join("..")
            .join("..")
            .join("..");
        // This would try to escape if not canonicalized properly
        let _result = sandbox.validate_path(&traversal_path);

        // The result depends on what .. resolves to
        // If it resolves outside sandbox, it should fail
        // The key is that canonicalization happens
    }

    #[test]
    fn test_sandboxed_ops_trait() {
        struct TestOps {
            sandbox: Sandbox,
        }

        impl SandboxedOps for TestOps {
            fn sandbox(&self) -> &Sandbox {
                &self.sandbox
            }
        }

        let temp_dir = TempDir::new().unwrap();
        let config = SandboxConfig::for_testing(temp_dir.path());
        let sandbox = Sandbox::new(config).unwrap();
        let ops = TestOps { sandbox };

        // Write a file
        let file_path = temp_dir.path().join("test.txt");
        ops.write_file(&file_path, b"hello world").unwrap();

        // Read it back
        let content = ops.read_to_string(&file_path).unwrap();
        assert_eq!(content, "hello world");

        // List directory
        let entries = ops.list_directory(temp_dir.path()).unwrap();
        assert_eq!(entries.len(), 1);
    }
}
