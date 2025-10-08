mod config;
mod database;
mod storage;
mod scp;

use config::Config;
use database::Database;
use storage::StorageHandler;
use scp::DicomScpServer;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,dicom_scp_server=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = if let Ok(config_path) = std::env::var("CONFIG_PATH") {
        tracing::info!("Loading configuration from: {}", config_path);
        Config::from_file(&config_path)?
    } else {
        tracing::info!("Using default configuration");
        Config::default()
    };

    // Connect to database
    tracing::info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(config.database.max_connections)
        .connect(&config.database.url)
        .await?;

    tracing::info!("Database connected successfully");

    let database = Database::new(pool);
    let storage = StorageHandler::new(config.storage.clone());

    // Create and start server
    let server = DicomScpServer::new(config, database, storage);

    // Setup graceful shutdown
    let (tx, rx) = tokio::sync::oneshot::channel();

    tokio::spawn(async move {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to listen for ctrl-c");
        tracing::info!("Received shutdown signal");
        let _ = tx.send(());
    });

    // Start server
    tokio::select! {
        result = server.start() => {
            if let Err(e) = result {
                tracing::error!("Server error: {}", e);
            }
        }
        _ = rx => {
            tracing::info!("Shutting down gracefully...");
        }
    }

    Ok(())
}