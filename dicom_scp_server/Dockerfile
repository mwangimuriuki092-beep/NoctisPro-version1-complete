# Build stage
FROM rust:1.75 as builder

WORKDIR /usr/src/app

# Copy manifests
COPY Cargo.toml ./

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /usr/src/app/target/release/dicom_scp_server .
COPY config.json .

# Create storage directory
RUN mkdir -p /var/pacs/storage

# Expose DICOM port
EXPOSE 11112

# Set environment variables
ENV RUST_LOG=info

# Run the application
CMD ["./dicom_scp_server"]