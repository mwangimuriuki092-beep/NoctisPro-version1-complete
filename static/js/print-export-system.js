/**
 * Print and Export System for DICOM Images
 * Professional printing and export capabilities
 */

class PrintExportSystem {
    constructor() {
        this.printSettings = {
            layout: 'single',
            includeInfo: true,
            includeMeasurements: true,
            includeAnnotations: true,
            paperSize: 'A4',
            orientation: 'portrait'
        };
        
        this.exportFormats = ['PNG', 'JPEG', 'PDF', 'DICOM'];
        this.init();
    }
    
    init() {
        this.createPrintDialog();
        this.createExportDialog();
        console.log('🖨️ Print/Export System initialized');
    }
    
    createPrintDialog() {
        const dialogHTML = `
            <div id="print-dialog" class="modal-dialog" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Print DICOM Image</h3>
                        <button class="close-btn" onclick="closePrintDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="print-options">
                            <div class="option-group">
                                <label>Layout:</label>
                                <select id="print-layout">
                                    <option value="single">Single Image</option>
                                    <option value="2x2">2x2 Grid</option>
                                    <option value="3x3">3x3 Grid</option>
                                    <option value="4x4">4x4 Grid</option>
                                </select>
                            </div>
                            
                            <div class="option-group">
                                <label>Paper Size:</label>
                                <select id="print-paper">
                                    <option value="A4">A4</option>
                                    <option value="A3">A3</option>
                                    <option value="Letter">Letter</option>
                                    <option value="Legal">Legal</option>
                                </select>
                            </div>
                            
                            <div class="option-group">
                                <label>Orientation:</label>
                                <select id="print-orientation">
                                    <option value="portrait">Portrait</option>
                                    <option value="landscape">Landscape</option>
                                </select>
                            </div>
                            
                            <div class="option-group checkboxes">
                                <label><input type="checkbox" id="include-info" checked> Include Patient Info</label>
                                <label><input type="checkbox" id="include-measurements" checked> Include Measurements</label>
                                <label><input type="checkbox" id="include-annotations" checked> Include Annotations</label>
                                <label><input type="checkbox" id="include-timestamp" checked> Include Timestamp</label>
                            </div>
                        </div>
                        
                        <div class="print-preview" id="print-preview">
                            <canvas id="print-preview-canvas" width="400" height="300"></canvas>
                        </div>
                        
                        <div class="print-actions">
                            <button class="btn btn-primary" onclick="executePrint()">Print</button>
                            <button class="btn btn-secondary" onclick="updatePrintPreview()">Update Preview</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
    }
    
    createExportDialog() {
        const dialogHTML = `
            <div id="export-dialog" class="modal-dialog" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Export DICOM Image</h3>
                        <button class="close-btn" onclick="closeExportDialog()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="export-options">
                            <div class="option-group">
                                <label>Format:</label>
                                <select id="export-format">
                                    <option value="PNG">PNG (Lossless)</option>
                                    <option value="JPEG">JPEG (Compressed)</option>
                                    <option value="PDF">PDF (Report)</option>
                                    <option value="DICOM">DICOM (Original)</option>
                                </select>
                            </div>
                            
                            <div class="option-group">
                                <label>Quality:</label>
                                <select id="export-quality">
                                    <option value="high">High Quality</option>
                                    <option value="medium">Medium Quality</option>
                                    <option value="low">Low Quality (Smaller file)</option>
                                </select>
                            </div>
                            
                            <div class="option-group">
                                <label>Resolution:</label>
                                <select id="export-resolution">
                                    <option value="original">Original Resolution</option>
                                    <option value="1024">1024x1024</option>
                                    <option value="2048">2048x2048</option>
                                    <option value="4096">4096x4096</option>
                                </select>
                            </div>
                            
                            <div class="option-group checkboxes">
                                <label><input type="checkbox" id="export-include-overlays" checked> Include Overlays</label>
                                <label><input type="checkbox" id="export-include-measurements" checked> Include Measurements</label>
                                <label><input type="checkbox" id="export-include-metadata"> Include Metadata</label>
                                <label><input type="checkbox" id="export-anonymize"> Anonymize Patient Data</label>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button class="btn btn-primary" onclick="executeExport()">Export</button>
                            <button class="btn btn-secondary" onclick="exportToClipboard()">Copy to Clipboard</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
    }
    
    showPrintDialog() {
        document.getElementById('print-dialog').style.display = 'flex';
        this.updatePrintPreview();
    }
    
    showExportDialog() {
        document.getElementById('export-dialog').style.display = 'flex';
    }
    
    updatePrintPreview() {
        const previewCanvas = document.getElementById('print-preview-canvas');
        if (!previewCanvas) return;
        
        const previewCtx = previewCanvas.getContext('2d');
        const mainCanvas = document.querySelector('#dicom-canvas, .dicom-canvas');
        
        if (mainCanvas) {
            // Scale main canvas to preview size
            previewCtx.fillStyle = '#fff';
            previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
            
            const scale = Math.min(
                previewCanvas.width / mainCanvas.width,
                previewCanvas.height / mainCanvas.height
            ) * 0.8;
            
            const x = (previewCanvas.width - mainCanvas.width * scale) / 2;
            const y = (previewCanvas.height - mainCanvas.height * scale) / 2;
            
            previewCtx.drawImage(mainCanvas, x, y, mainCanvas.width * scale, mainCanvas.height * scale);
            
            // Add print info if enabled
            if (document.getElementById('include-info').checked) {
                this.addPrintInfo(previewCtx, previewCanvas);
            }
        }
    }
    
    addPrintInfo(ctx, canvas) {
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        
        const info = [
            `Study: ${this.getCurrentStudyInfo()}`,
            `Date: ${new Date().toLocaleDateString()}`,
            `Time: ${new Date().toLocaleTimeString()}`
        ];
        
        info.forEach((text, index) => {
            ctx.fillText(text, 10, canvas.height - 30 + index * 15);
        });
    }
    
    executePrint() {
        const mainCanvas = document.querySelector('#dicom-canvas, .dicom-canvas');
        if (!mainCanvas) return;
        
        // Create print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>DICOM Image Print</title>
                <style>
                    body { margin: 0; padding: 20px; }
                    .print-container { text-align: center; }
                    .print-image { max-width: 100%; height: auto; }
                    .print-info { margin-top: 20px; font-family: Arial; font-size: 12px; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <img class="print-image" src="${mainCanvas.toDataURL()}" alt="DICOM Image">
                    <div class="print-info">
                        <p>Study: ${this.getCurrentStudyInfo()}</p>
                        <p>Printed: ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
        
        this.closePrintDialog();
        console.log('🖨️ Print executed');
    }
    
    executeExport() {
        const format = document.getElementById('export-format').value;
        const quality = document.getElementById('export-quality').value;
        const resolution = document.getElementById('export-resolution').value;
        
        const mainCanvas = document.querySelector('#dicom-canvas, .dicom-canvas');
        if (!mainCanvas) return;
        
        switch (format) {
            case 'PNG':
                this.exportAsPNG(mainCanvas, quality, resolution);
                break;
            case 'JPEG':
                this.exportAsJPEG(mainCanvas, quality, resolution);
                break;
            case 'PDF':
                this.exportAsPDF(mainCanvas, quality);
                break;
            case 'DICOM':
                this.exportAsDICOM();
                break;
        }
        
        this.closeExportDialog();
    }
    
    exportAsPNG(canvas, quality, resolution) {
        let exportCanvas = canvas;
        
        // Create high-resolution canvas if needed
        if (resolution !== 'original') {
            const size = parseInt(resolution);
            exportCanvas = document.createElement('canvas');
            exportCanvas.width = size;
            exportCanvas.height = size;
            
            const ctx = exportCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, 0, size, size);
        }
        
        const dataURL = exportCanvas.toDataURL('image/png');
        this.downloadFile(dataURL, `dicom_export_${Date.now()}.png`);
        
        console.log('📤 Exported as PNG');
    }
    
    exportAsJPEG(canvas, quality, resolution) {
        let exportCanvas = canvas;
        
        if (resolution !== 'original') {
            const size = parseInt(resolution);
            exportCanvas = document.createElement('canvas');
            exportCanvas.width = size;
            exportCanvas.height = size;
            
            const ctx = exportCanvas.getContext('2d');
            ctx.fillStyle = '#fff'; // White background for JPEG
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(canvas, 0, 0, size, size);
        }
        
        const qualityValue = quality === 'high' ? 0.95 : quality === 'medium' ? 0.8 : 0.6;
        const dataURL = exportCanvas.toDataURL('image/jpeg', qualityValue);
        this.downloadFile(dataURL, `dicom_export_${Date.now()}.jpg`);
        
        console.log('📤 Exported as JPEG');
    }
    
    exportAsPDF(canvas, quality) {
        // Simple PDF export using canvas
        const dataURL = canvas.toDataURL('image/png');
        
        // Create a simple PDF-like HTML page
        const pdfWindow = window.open('', '_blank');
        pdfWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>DICOM Export PDF</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: Arial; }
                    .pdf-header { text-align: center; margin-bottom: 20px; }
                    .pdf-image { max-width: 100%; height: auto; display: block; margin: 0 auto; }
                    .pdf-footer { margin-top: 20px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="pdf-header">
                    <h2>DICOM Medical Image Export</h2>
                    <p>Study: ${this.getCurrentStudyInfo()}</p>
                    <p>Exported: ${new Date().toLocaleString()}</p>
                </div>
                <img class="pdf-image" src="${dataURL}" alt="DICOM Image">
                <div class="pdf-footer">
                    <p>Generated by NoctisPro PACS</p>
                </div>
            </body>
            </html>
        `);
        
        pdfWindow.document.close();
        pdfWindow.focus();
        
        console.log('📄 PDF export window opened');
    }
    
    async exportAsDICOM() {
        try {
            const imageId = this.getCurrentImageId();
            if (!imageId) return;
            
            const response = await fetch(`/dicom-viewer/api/export/image/${imageId}/`, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': this.getCSRFToken()
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                this.downloadFile(url, `dicom_export_${imageId}.dcm`);
                URL.revokeObjectURL(url);
                
                console.log('📤 Exported as DICOM');
            }
        } catch (error) {
            console.error('DICOM export failed:', error);
        }
    }
    
    exportToClipboard() {
        const mainCanvas = document.querySelector('#dicom-canvas, .dicom-canvas');
        if (!mainCanvas) return;
        
        mainCanvas.toBlob(blob => {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                console.log('📋 Image copied to clipboard');
                this.showToast('Image copied to clipboard', 'success');
            }).catch(error => {
                console.error('Clipboard copy failed:', error);
                this.showToast('Clipboard copy failed', 'error');
            });
        });
    }
    
    downloadFile(dataURL, filename) {
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    getCurrentStudyInfo() {
        if (window.dicomCanvasFix && window.dicomCanvasFix.currentStudy) {
            const study = window.dicomCanvasFix.currentStudy;
            return `${study.patient_name || 'Unknown'} - ${study.study_date || 'Unknown Date'}`;
        }
        return 'Unknown Study';
    }
    
    getCurrentImageId() {
        if (window.dicomCanvasFix && window.dicomCanvasFix.currentImage) {
            return window.dicomCanvasFix.currentImage.id;
        }
        return null;
    }
    
    getCSRFToken() {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) return metaToken.getAttribute('content');
        
        const cookieToken = document.cookie.split(';')
            .find(row => row.startsWith('csrftoken='));
        if (cookieToken) return cookieToken.split('=')[1];
        
        return '';
    }
    
    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#00d4ff'};
            color: #000;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 10001;
            font-size: 14px;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }
}

// Global functions
window.showPrintDialog = function() {
    if (!window.printExportSystem) {
        window.printExportSystem = new PrintExportSystem();
    }
    window.printExportSystem.showPrintDialog();
};

window.showExportDialog = function() {
    if (!window.printExportSystem) {
        window.printExportSystem = new PrintExportSystem();
    }
    window.printExportSystem.showExportDialog();
};

window.closePrintDialog = function() {
    document.getElementById('print-dialog').style.display = 'none';
};

window.closeExportDialog = function() {
    document.getElementById('export-dialog').style.display = 'none';
};

window.executePrint = function() {
    if (window.printExportSystem) {
        window.printExportSystem.executePrint();
    }
};

window.executeExport = function() {
    if (window.printExportSystem) {
        window.printExportSystem.executeExport();
    }
};

window.updatePrintPreview = function() {
    if (window.printExportSystem) {
        window.printExportSystem.updatePrintPreview();
    }
};

window.exportToClipboard = function() {
    if (window.printExportSystem) {
        window.printExportSystem.exportToClipboard();
    }
};

// Initialize
window.printExportSystem = new PrintExportSystem();

console.log('🖨️ Print/Export System loaded');