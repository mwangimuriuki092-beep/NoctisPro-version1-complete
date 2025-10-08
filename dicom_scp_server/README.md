# DICOM SCP Server (Rust)

A high-performance DICOM SCP (Service Class Provider) server written in Rust that receives DICOM images via C-STORE and stores them in PostgreSQL with organized file storage.

## Features

- **C-STORE Support**: Receive DICOM images from any DICOM SCU
- **Multiple Transfer Syntaxes**: Supports Implicit/Explicit VR, JPEG, JPEG 2000
- **Automatic Metadata Extraction**: Extracts and stores DICOM tags in PostgreSQL
- **Organized Storage**: Files organized by Patient/Study/Series
- **High Performance**: Built with Rust and Tokio for concurrent connections
- **Database Integration**: Seamlessly integrates with Django backend

## Supported SOP Classes

- CT Image Storage
- MR Image Storage  
- CR Image Storage
- Secondary Capture
- Digital X-Ray
- PET
- Nuclear Medicine
- RT Images
- And more...

## Quick Start

### Development

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials

# Run the server
cargo run
```

### Production with Docker

```bash
# Build the Docker image
docker build -t dicom-scp-server .

# Run the container
docker run -d \
  -p 11112:11112 \
  -v /path/to/storage:/var/pacs/storage \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  dicom-scp-server
```

## Configuration

Edit `config.json`:

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 11112,
    "ae_title": "RUST_SCP",
    "max_pdu_length": 16384
  },
  "database": {
    "url": "postgresql://postgres:postgres@localhost:5432/noctis_pro",
    "max_connections": 10
  },
  "storage": {
    "base_path": "/var/pacs/storage",
    "organize_by_patient": true,
    "organize_by_study": true
  }
}
```

## Testing

Send a DICOM file using dcmtk tools:

```bash
# Install dcmtk
sudo apt-get install dcmtk

# Send DICOM file
storescu -v localhost 11112 -aec RUST_SCP /path/to/file.dcm
```

## Integration with Django

The server automatically stores DICOM metadata in the Django database using these tables:
- `worklist_patient`
- `worklist_study`
- `worklist_series`
- `worklist_dicomimage`

Files are stored in the media directory and can be accessed via the Django web interface.

## Logging

Set log level via environment variable:

```bash
RUST_LOG=debug cargo run
```

Levels: `error`, `warn`, `info`, `debug`, `trace`

## Performance

- Handles multiple concurrent associations
- Async I/O with Tokio
- Connection pooling for database
- Optimized file storage

## License

MIT