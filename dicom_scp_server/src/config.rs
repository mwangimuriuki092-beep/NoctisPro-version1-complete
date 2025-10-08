use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub storage: StorageConfig,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub ae_title: String,
    pub max_pdu_length: u32,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct StorageConfig {
    pub base_path: String,
    pub organize_by_patient: bool,
    pub organize_by_study: bool,
}

impl Config {
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self, Box<dyn std::error::Error>> {
        let contents = fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&contents)?;
        Ok(config)
    }

    pub fn default() -> Self {
        Config {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 11112,
                ae_title: "RUST_SCP".to_string(),
                max_pdu_length: 16384,
            },
            database: DatabaseConfig {
                url: std::env::var("DATABASE_URL")
                    .unwrap_or_else(|_| "postgresql://pacs_user:pacs_password@localhost:5432/pacs_db".to_string()),
                max_connections: 10,
            },
            storage: StorageConfig {
                base_path: std::env::var("DICOM_STORAGE_PATH")
                    .unwrap_or_else(|_| "/var/pacs/storage".to_string()),
                organize_by_patient: true,
                organize_by_study: true,
            },
        }
    }
}