use crate::config::Config;
use crate::database::Database;
use crate::storage::StorageHandler;
use dicom_object::InMemDicomObject;
use dicom_ul::pdu::Pdu;
use dicom_ul::association::server::{ServerAssociationOptions};
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tracing::{info, error, warn};
use anyhow::Result;

pub struct DicomScpServer {
    config: Arc<Config>,
    database: Arc<Database>,
    storage: Arc<StorageHandler>,
}

impl DicomScpServer {
    pub fn new(config: Config, database: Database, storage: StorageHandler) -> Self {
        Self {
            config: Arc::new(config),
            database: Arc::new(database),
            storage: Arc::new(storage),
        }
    }

    pub async fn start(&self) -> Result<()> {
        let bind_addr = format!("{}:{}", self.config.server.host, self.config.server.port);
        
        info!("Starting DICOM SCP Server");
        info!("AE Title: {}", self.config.server.ae_title);
        info!("Listening on: {}", bind_addr);

        let listener = TcpListener::bind(&bind_addr).await?;
        info!("Server started successfully!");

        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    info!("New connection from: {}", addr);
                    let config = Arc::clone(&self.config);
                    let database = Arc::clone(&self.database);
                    let storage = Arc::clone(&self.storage);

                    tokio::spawn(async move {
                        if let Err(e) = handle_association(stream, config, database, storage).await {
                            error!("Error handling association from {}: {}", addr, e);
                        }
                    });
                }
                Err(e) => {
                    error!("Failed to accept connection: {}", e);
                }
            }
        }
    }
}

async fn handle_association(
    mut stream: TcpStream,
    config: Arc<Config>,
    database: Arc<Database>,
    storage: Arc<StorageHandler>,
) -> Result<()> {
    // Create association options with supported presentation contexts
    let mut options = ServerAssociationOptions::new()
        .ae_title(&config.server.ae_title)
        .max_pdu_length(config.server.max_pdu_length);

    // Add verification SOP class
    options = options
        .with_abstract_syntax("1.2.840.10008.1.1") // Verification
        .with_transfer_syntax("1.2.840.10008.1.2"); // Implicit VR Little Endian

    // Add common storage SOP classes
    let storage_sops = vec![
        "1.2.840.10008.5.1.4.1.1.2",   // CT Image Storage
        "1.2.840.10008.5.1.4.1.1.4",   // MR Image Storage
        "1.2.840.10008.5.1.4.1.1.1",   // CR Image Storage
        "1.2.840.10008.5.1.4.1.1.7",   // Secondary Capture
        "1.2.840.10008.5.1.4.1.1.1.1", // Digital X-Ray
        "1.2.840.10008.5.1.4.1.1.12.1", // X-Ray Angiographic
        "1.2.840.10008.5.1.4.1.1.20",  // Nuclear Medicine
        "1.2.840.10008.5.1.4.1.1.128", // PET
        "1.2.840.10008.5.1.4.1.1.481.1", // RT Image
    ];

    let transfer_syntaxes = vec![
        "1.2.840.10008.1.2",         // Implicit VR Little Endian
        "1.2.840.10008.1.2.1",       // Explicit VR Little Endian
        "1.2.840.10008.1.2.2",       // Explicit VR Big Endian
        "1.2.840.10008.1.2.4.50",    // JPEG Baseline
        "1.2.840.10008.1.2.4.70",    // JPEG Lossless
        "1.2.840.10008.1.2.4.90",    // JPEG 2000
    ];

    for sop in &storage_sops {
        for ts in &transfer_syntaxes {
            options = options
                .with_abstract_syntax(sop)
                .with_transfer_syntax(ts);
        }
    }

    // Accept association
    use dicom_ul::association::server::ServerAssociation;
    let mut scu = match ServerAssociation::accept(stream, options).await {
        Ok(scu) => {
            info!("Association accepted from: {}", scu.client_ae_title());
            scu
        }
        Err(e) => {
            error!("Failed to accept association: {}", e);
            return Err(e.into());
        }
    };

    // Handle incoming messages
    loop {
        match scu.receive().await {
            Ok(pdu) => {
                match pdu {
                    Pdu::PData { data } => {
                        // Handle C-STORE or C-ECHO
                        for pdata_value in data {
                            if let Err(e) = handle_pdata(
                                &mut scu,
                                pdata_value,
                                &database,
                                &storage,
                            ).await {
                                error!("Error handling P-DATA: {}", e);
                            }
                        }
                    }
                    Pdu::ReleaseRQ => {
                        info!("Release requested by client");
                        scu.send(&Pdu::ReleaseRP).await?;
                        break;
                    }
                    Pdu::AbortRQ { source, reason } => {
                        warn!("Association aborted - Source: {:?}, Reason: {:?}", source, reason);
                        break;
                    }
                    _ => {
                        // Handle other PDUs
                    }
                }
            }
            Err(e) => {
                error!("Error receiving PDU: {}", e);
                break;
            }
        }
    }

    info!("Association closed");
    Ok(())
}

async fn handle_pdata(
    scu: &mut dicom_ul::association::server::ServerAssociation,
    pdata: dicom_ul::pdu::PDataValue,
    database: &Database,
    storage: &StorageHandler,
) -> Result<()> {
    use dicom_ul::pdu::ValueType;

    match pdata.value_type {
        ValueType::Command => {
            // Handle DIMSE command (simplified - just acknowledge)
            info!("Received DIMSE command");
        }
        ValueType::Data => {
            // This is DICOM dataset - try to parse and store
            match InMemDicomObject::read_dataset(&pdata.data[..]) {
                Ok(obj) => {
                    info!("Received DICOM object");
                    
                    // Store to filesystem
                    match storage.store_dicom(&obj) {
                        Ok(file_path) => {
                            info!("Stored DICOM file: {:?}", file_path);
                            
                            // Get file size
                            let file_size = storage.get_file_size(&file_path)
                                .unwrap_or(0) as i64;
                            
                            // Store metadata to database
                            match database.store_dicom_metadata(
                                &obj,
                                file_path.to_str().unwrap_or(""),
                                file_size
                            ).await {
                                Ok(_) => {
                                    info!("Stored DICOM metadata to database");
                                }
                                Err(e) => {
                                    error!("Failed to store metadata: {}", e);
                                }
                            }
                        }
                        Err(e) => {
                            error!("Failed to store DICOM file: {}", e);
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to parse DICOM object: {}", e);
                }
            }
        }
    }

    Ok(())
}