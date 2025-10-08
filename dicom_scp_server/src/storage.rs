use crate::config::StorageConfig;
use dicom_object::InMemDicomObject;
use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

pub struct StorageHandler {
    config: StorageConfig,
}

impl StorageHandler {
    pub fn new(config: StorageConfig) -> Self {
        // Ensure base storage path exists
        fs::create_dir_all(&config.base_path).ok();
        Self { config }
    }

    /// Generate file path based on DICOM metadata
    pub fn generate_file_path(&self, obj: &InMemDicomObject) -> Result<PathBuf> {
        let base_path = Path::new(&self.config.base_path);
        let mut path = base_path.to_path_buf();

        // Organize by patient if configured
        if self.config.organize_by_patient {
            if let Ok(elem) = obj.element_by_name("PatientID") {
                if let Ok(patient_id) = elem.to_str() {
                    path.push(sanitize_filename(patient_id));
                }
            }
        }

        // Organize by study if configured
        if self.config.organize_by_study {
            if let Ok(elem) = obj.element_by_name("StudyInstanceUID") {
                if let Ok(study_uid) = elem.to_str() {
                    path.push(sanitize_filename(study_uid));
                }
            }
        }

        // Add series directory
        if let Ok(elem) = obj.element_by_name("SeriesInstanceUID") {
            if let Ok(series_uid) = elem.to_str() {
                path.push(sanitize_filename(series_uid));
            }
        }

        // Create directories if they don't exist
        fs::create_dir_all(&path)?;

        // Add filename based on SOP Instance UID
        if let Ok(elem) = obj.element_by_name("SOPInstanceUID") {
            if let Ok(sop_uid) = elem.to_str() {
                path.push(format!("{}.dcm", sanitize_filename(sop_uid)));
            }
        }

        Ok(path)
    }

    /// Store DICOM object to file system
    pub fn store_dicom(&self, obj: &InMemDicomObject) -> Result<PathBuf> {
        let file_path = self.generate_file_path(obj)?;
        
        // Save the DICOM object
        obj.write_to_file(&file_path)
            .context("Failed to write DICOM file")?;
        
        Ok(file_path)
    }

    /// Get file size
    pub fn get_file_size(&self, file_path: &Path) -> Result<u64> {
        let metadata = fs::metadata(file_path)?;
        Ok(metadata.len())
    }
}

/// Sanitize filename to remove invalid characters
fn sanitize_filename(s: &str) -> String {
    s.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("test/file:name"), "test_file_name");
        assert_eq!(sanitize_filename("1.2.3.4.5"), "1.2.3.4.5");
        assert_eq!(sanitize_filename("normal_name-123"), "normal_name-123");
    }
}