/**
 * Enhanced DICOM Export and Reporting System
 * Advanced export capabilities with multiple formats and PDF reporting
 */

class EnhancedExportSystem {
    constructor() {
        this.exportFormats = ['PNG', 'JPEG', 'TIFF', 'PDF', 'DICOM-SC'];
        this.reportTemplates = this.getReportTemplates();
        this.init();
    }

    init() {
        this.createExportUI();
        this.setupEventListeners();
        console.log('Enhanced Export System initialized');
    }

    getReportTemplates() {
        return {
            basic: {
                name: 'Basic Report',
                sections: ['patient_info', 'study_info', 'images', 'measurements']
            },
            radiology: {
                name: 'Radiology Report',
                sections: ['patient_info', 'study_info', 'clinical_history', 'technique', 'findings', 'impression', 'images', 'measurements']
            },
            comparison: {
                name: 'Comparison Study',
                sections: ['patient_info', 'current_study', 'prior_study', 'comparison', 'images', 'measurements']
            },
            measurement: {
                name: 'Measurement Report',
                sections: ['patient_info', 'study_info', 'measurements', 'statistics', 'images']
            },
            screening: {
                name: 'Screening Report',
                sections: ['patient_info', 'study_info', 'screening_results', 'recommendations', 'images']
            }
        };
    }

    createExportUI() {
        this.createExportDialog();
        this.addExportButton();
    }

    createExportDialog() {
        const exportDialog = document.createElement('div');
        exportDialog.id = 'exportDialog';
        exportDialog.className = 'modal export-dialog';
        exportDialog.style.display = 'none';
        
        exportDialog.innerHTML = `
            <div class="modal-content export-modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> Export & Reporting</h3>
                    <button class="modal-close" onclick="enhancedExport.closeDialog()">×</button>
                </div>
                
                <div class="modal-body export-modal-body">
                    <!-- Export Type Tabs -->
                    <div class="export-tabs">
                        <button class="export-tab active" data-tab="image" onclick="enhancedExport.switchTab('image')">
                            <i class="fas fa-image"></i> Image Export
                        </button>
                        <button class="export-tab" data-tab="report" onclick="enhancedExport.switchTab('report')">
                            <i class="fas fa-file-alt"></i> PDF Report
                        </button>
                        <button class="export-tab" data-tab="data" onclick="enhancedExport.switchTab('data')">
                            <i class="fas fa-database"></i> Data Export
                        </button>
                        <button class="export-tab" data-tab="print" onclick="enhancedExport.switchTab('print')">
                            <i class="fas fa-print"></i> Print
                        </button>
                    </div>

                    <!-- Image Export Tab -->
                    <div class="export-tab-content" id="imageExportTab">
                        <div class="export-section">
                            <h4>Image Export Options</h4>
                            
                            <div class="export-options">
                                <div class="option-group">
                                    <label>Format:</label>
                                    <select id="imageFormat" class="select-control">
                                        <option value="png">PNG (Lossless)</option>
                                        <option value="jpeg">JPEG (Compressed)</option>
                                        <option value="tiff">TIFF (Medical Grade)</option>
                                        <option value="dicom-sc">DICOM Secondary Capture</option>
                                    </select>
                                </div>

                                <div class="option-group">
                                    <label>Quality:</label>
                                    <select id="imageQuality" class="select-control">
                                        <option value="low">Low (Fast)</option>
                                        <option value="medium" selected>Medium</option>
                                        <option value="high">High</option>
                                        <option value="ultra">Ultra (Slow)</option>
                                    </select>
                                </div>

                                <div class="option-group">
                                    <label>Resolution:</label>
                                    <select id="imageResolution" class="select-control">
                                        <option value="screen">Screen Resolution</option>
                                        <option value="print">Print Resolution (300 DPI)</option>
                                        <option value="original" selected>Original Resolution</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>

                                <div class="option-group custom-resolution" style="display: none;">
                                    <label>Custom Size:</label>
                                    <div class="size-inputs">
                                        <input type="number" id="customWidth" placeholder="Width" value="1920">
                                        <span>×</span>
                                        <input type="number" id="customHeight" placeholder="Height" value="1080">
                                    </div>
                                </div>

                                <div class="option-group">
                                    <label>Include:</label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="includeMeasurements" checked>
                                            <span>Measurements</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="includeAnnotations" checked>
                                            <span>Annotations</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="includeOverlays" checked>
                                            <span>Overlays</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="includePatientInfo">
                                            <span>Patient Information</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="includeStudyInfo">
                                            <span>Study Information</span>
                                        </label>
                                    </div>
                                </div>

                                <div class="option-group">
                                    <label>Export Scope:</label>
                                    <div class="radio-group">
                                        <label class="radio-label">
                                            <input type="radio" name="exportScope" value="current" checked>
                                            <span>Current Image</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="exportScope" value="series">
                                            <span>Entire Series</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="exportScope" value="study">
                                            <span>Entire Study</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="exportScope" value="key">
                                            <span>Key Images Only</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div class="export-preview" id="imagePreview">
                                <h5>Preview</h5>
                                <canvas id="exportPreviewCanvas" width="300" height="200"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- PDF Report Tab -->
                    <div class="export-tab-content" id="reportExportTab" style="display: none;">
                        <div class="export-section">
                            <h4>PDF Report Generation</h4>
                            
                            <div class="export-options">
                                <div class="option-group">
                                    <label>Template:</label>
                                    <select id="reportTemplate" class="select-control">
                                        <option value="basic">Basic Report</option>
                                        <option value="radiology">Radiology Report</option>
                                        <option value="comparison">Comparison Study</option>
                                        <option value="measurement">Measurement Report</option>
                                        <option value="screening">Screening Report</option>
                                    </select>
                                </div>

                                <div class="option-group">
                                    <label>Page Size:</label>
                                    <select id="pageSize" class="select-control">
                                        <option value="letter" selected>Letter (8.5" × 11")</option>
                                        <option value="a4">A4 (210mm × 297mm)</option>
                                        <option value="legal">Legal (8.5" × 14")</option>
                                        <option value="tabloid">Tabloid (11" × 17")</option>
                                    </select>
                                </div>

                                <div class="option-group">
                                    <label>Orientation:</label>
                                    <div class="radio-group">
                                        <label class="radio-label">
                                            <input type="radio" name="orientation" value="portrait" checked>
                                            <span>Portrait</span>
                                        </label>
                                        <label class="radio-label">
                                            <input type="radio" name="orientation" value="landscape">
                                            <span>Landscape</span>
                                        </label>
                                    </div>
                                </div>

                                <div class="report-sections">
                                    <h5>Report Sections</h5>
                                    <div id="reportSections" class="checkbox-group">
                                        <!-- Dynamically populated based on template -->
                                    </div>
                                </div>

                                <div class="report-content">
                                    <h5>Report Content</h5>
                                    <div class="content-inputs">
                                        <div class="input-group">
                                            <label>Clinical History:</label>
                                            <textarea id="clinicalHistory" rows="3" placeholder="Enter clinical history..."></textarea>
                                        </div>
                                        <div class="input-group">
                                            <label>Findings:</label>
                                            <textarea id="findings" rows="4" placeholder="Enter findings..."></textarea>
                                        </div>
                                        <div class="input-group">
                                            <label>Impression:</label>
                                            <textarea id="impression" rows="3" placeholder="Enter impression..."></textarea>
                                        </div>
                                        <div class="input-group">
                                            <label>Recommendations:</label>
                                            <textarea id="recommendations" rows="2" placeholder="Enter recommendations..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Export Tab -->
                    <div class="export-tab-content" id="dataExportTab" style="display: none;">
                        <div class="export-section">
                            <h4>Data Export Options</h4>
                            
                            <div class="export-options">
                                <div class="option-group">
                                    <label>Format:</label>
                                    <select id="dataFormat" class="select-control">
                                        <option value="json">JSON</option>
                                        <option value="csv">CSV</option>
                                        <option value="xml">XML</option>
                                        <option value="excel">Excel (XLSX)</option>
                                    </select>
                                </div>

                                <div class="option-group">
                                    <label>Include Data:</label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="exportMeasurements" checked>
                                            <span>Measurements (${window.enhancedMeasurements?.measurements?.length || 0} items)</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="exportAnnotations" checked>
                                            <span>Annotations (${window.enhancedMeasurements?.annotations?.length || 0} items)</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="exportStudyInfo" checked>
                                            <span>Study Information</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="exportImageInfo">
                                            <span>Image Metadata</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="exportWindowSettings">
                                            <span>Window/Level Settings</span>
                                        </label>
                                    </div>
                                </div>

                                <div class="data-preview">
                                    <h5>Data Preview</h5>
                                    <pre id="dataPreview" class="data-preview-content">Select data to export...</pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Print Tab -->
                    <div class="export-tab-content" id="printExportTab" style="display: none;">
                        <div class="export-section">
                            <h4>Print Options</h4>
                            
                            <div class="export-options">
                                <div class="option-group">
                                    <label>Layout:</label>
                                    <select id="printLayout" class="select-control">
                                        <option value="single">Single Image</option>
                                        <option value="grid2x2">2×2 Grid</option>
                                        <option value="grid3x3">3×3 Grid</option>
                                        <option value="comparison">Side-by-Side Comparison</option>
                                        <option value="report">Full Report</option>
                                    </select>
                                </div>

                                <div class="option-group">
                                    <label>Paper Size:</label>
                                    <select id="printPaperSize" class="select-control">
                                        <option value="letter" selected>Letter</option>
                                        <option value="a4">A4</option>
                                        <option value="legal">Legal</option>
                                        <option value="tabloid">Tabloid</option>
                                    </select>
                                </div>

                                <div class="option-group">
                                    <label>Print Quality:</label>
                                    <select id="printQuality" class="select-control">
                                        <option value="draft">Draft</option>
                                        <option value="normal" selected>Normal</option>
                                        <option value="high">High Quality</option>
                                    </select>
                                </div>

                                <div class="option-group">
                                    <label>Include:</label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="printPatientInfo" checked>
                                            <span>Patient Information</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="printStudyInfo" checked>
                                            <span>Study Information</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="printMeasurements" checked>
                                            <span>Measurements</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="printTimestamp" checked>
                                            <span>Timestamp</span>
                                        </label>
                                    </div>
                                </div>

                                <div class="print-preview">
                                    <h5>Print Preview</h5>
                                    <div id="printPreview" class="print-preview-container">
                                        <div class="print-page-preview">
                                            <div class="page-content">Preview will appear here</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer export-modal-footer">
                    <div class="export-progress" id="exportProgress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <span id="progressText">Preparing export...</span>
                    </div>
                    
                    <div class="export-actions">
                        <button class="btn" onclick="enhancedExport.closeDialog()">Cancel</button>
                        <button class="btn btn-primary" onclick="enhancedExport.executeExport()" id="exportButton">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(exportDialog);
        this.setupExportDialogEvents();
    }

    addExportButton() {
        // Add export button to toolbar if not already present
        const toolbar = document.querySelector('.toolbar');
        if (toolbar && !document.getElementById('exportToolbarBtn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'exportToolbarBtn';
            exportBtn.className = 'tool';
            exportBtn.innerHTML = `
                <i class="fas fa-download"></i>
                <span>Export</span>
            `;
            exportBtn.title = 'Export & Reporting';
            exportBtn.onclick = () => this.showDialog();
            
            const toolGroup = toolbar.querySelector('.tool-group:last-child');
            if (toolGroup) {
                toolGroup.appendChild(exportBtn);
            }
        }
    }

    setupExportDialogEvents() {
        // Image resolution change
        const resolutionSelect = document.getElementById('imageResolution');
        if (resolutionSelect) {
            resolutionSelect.addEventListener('change', (e) => {
                const customGroup = document.querySelector('.custom-resolution');
                if (customGroup) {
                    customGroup.style.display = e.target.value === 'custom' ? 'flex' : 'none';
                }
                this.updateImagePreview();
            });
        }

        // Report template change
        const templateSelect = document.getElementById('reportTemplate');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                this.updateReportSections(e.target.value);
            });
        }

        // Data format change
        const dataFormatSelect = document.getElementById('dataFormat');
        if (dataFormatSelect) {
            dataFormatSelect.addEventListener('change', () => {
                this.updateDataPreview();
            });
        }

        // Data checkboxes
        const dataCheckboxes = document.querySelectorAll('#dataExportTab input[type="checkbox"]');
        dataCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateDataPreview();
            });
        });

        // Print layout change
        const printLayoutSelect = document.getElementById('printLayout');
        if (printLayoutSelect) {
            printLayoutSelect.addEventListener('change', () => {
                this.updatePrintPreview();
            });
        }

        // Update previews on various changes
        ['imageFormat', 'imageQuality', 'customWidth', 'customHeight'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateImagePreview());
            }
        });
    }

    setupEventListeners() {
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.showDialog();
            }
        });
    }

    // Dialog Management
    showDialog() {
        const dialog = document.getElementById('exportDialog');
        if (dialog) {
            dialog.style.display = 'flex';
            this.updateImagePreview();
            this.updateReportSections('basic');
            this.updateDataPreview();
            this.updatePrintPreview();
        }
    }

    closeDialog() {
        const dialog = document.getElementById('exportDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.export-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.export-tab-content').forEach(content => {
            content.style.display = 'none';
        });

        const activeTab = document.getElementById(`${tabName}ExportTab`);
        if (activeTab) {
            activeTab.style.display = 'block';
        }

        // Update export button text
        const exportButton = document.getElementById('exportButton');
        if (exportButton) {
            const buttonTexts = {
                image: '<i class="fas fa-image"></i> Export Image',
                report: '<i class="fas fa-file-pdf"></i> Generate Report',
                data: '<i class="fas fa-download"></i> Export Data',
                print: '<i class="fas fa-print"></i> Print'
            };
            exportButton.innerHTML = buttonTexts[tabName] || '<i class="fas fa-download"></i> Export';
        }
    }

    // Preview Updates
    updateImagePreview() {
        const canvas = document.getElementById('exportPreviewCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Get current DICOM canvas
        const sourceCanvas = document.getElementById('dicomCanvas');
        if (sourceCanvas) {
            // Create a scaled preview
            const scale = Math.min(canvas.width / sourceCanvas.width, canvas.height / sourceCanvas.height);
            const scaledWidth = sourceCanvas.width * scale;
            const scaledHeight = sourceCanvas.height * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(sourceCanvas, x, y, scaledWidth, scaledHeight);

            // Add preview overlay information
            ctx.fillStyle = '#00d4ff';
            ctx.font = '12px Arial';
            ctx.fillText('Preview', 10, 20);
            
            const format = document.getElementById('imageFormat')?.value.toUpperCase() || 'PNG';
            ctx.fillText(`Format: ${format}`, 10, canvas.height - 10);
        }
    }

    updateReportSections(templateName) {
        const sectionsContainer = document.getElementById('reportSections');
        if (!sectionsContainer) return;

        const template = this.reportTemplates[templateName];
        if (!template) return;

        sectionsContainer.innerHTML = '';

        const sectionNames = {
            patient_info: 'Patient Information',
            study_info: 'Study Information',
            clinical_history: 'Clinical History',
            technique: 'Technique',
            findings: 'Findings',
            impression: 'Impression',
            comparison: 'Comparison',
            current_study: 'Current Study',
            prior_study: 'Prior Study',
            measurements: 'Measurements',
            statistics: 'Statistics',
            images: 'Images',
            screening_results: 'Screening Results',
            recommendations: 'Recommendations'
        };

        template.sections.forEach(sectionKey => {
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.innerHTML = `
                <input type="checkbox" id="section_${sectionKey}" checked>
                <span>${sectionNames[sectionKey] || sectionKey}</span>
            `;
            sectionsContainer.appendChild(label);
        });
    }

    updateDataPreview() {
        const preview = document.getElementById('dataPreview');
        if (!preview) return;

        const format = document.getElementById('dataFormat')?.value || 'json';
        const data = this.collectExportData();

        let previewText = '';
        
        switch (format) {
            case 'json':
                previewText = JSON.stringify(data, null, 2);
                break;
            case 'csv':
                previewText = this.convertToCSV(data);
                break;
            case 'xml':
                previewText = this.convertToXML(data);
                break;
            case 'excel':
                previewText = 'Excel format preview not available\nData will be exported as XLSX file';
                break;
        }

        preview.textContent = previewText.length > 1000 ? 
            previewText.substring(0, 1000) + '\n... (truncated)' : 
            previewText;
    }

    updatePrintPreview() {
        const preview = document.getElementById('printPreview');
        if (!preview) return;

        const layout = document.getElementById('printLayout')?.value || 'single';
        
        let previewHTML = '';
        switch (layout) {
            case 'single':
                previewHTML = '<div class="print-image-placeholder">Single Image Layout</div>';
                break;
            case 'grid2x2':
                previewHTML = '<div class="print-grid-2x2">2×2 Grid Layout</div>';
                break;
            case 'grid3x3':
                previewHTML = '<div class="print-grid-3x3">3×3 Grid Layout</div>';
                break;
            case 'comparison':
                previewHTML = '<div class="print-comparison">Side-by-Side Comparison</div>';
                break;
            case 'report':
                previewHTML = '<div class="print-report">Full Report Layout</div>';
                break;
        }

        preview.innerHTML = `<div class="print-page-preview"><div class="page-content">${previewHTML}</div></div>`;
    }

    // Export Execution
    async executeExport() {
        const activeTab = document.querySelector('.export-tab.active')?.dataset.tab;
        
        this.showProgress(true);
        
        try {
            switch (activeTab) {
                case 'image':
                    await this.exportImage();
                    break;
                case 'report':
                    await this.generateReport();
                    break;
                case 'data':
                    await this.exportData();
                    break;
                case 'print':
                    await this.printDocument();
                    break;
            }
            
            if (window.showToast) {
                window.showToast('Export completed successfully', 'success');
            }
            
        } catch (error) {
            console.error('Export failed:', error);
            if (window.showToast) {
                window.showToast('Export failed: ' + error.message, 'error');
            }
        } finally {
            this.showProgress(false);
        }
    }

    async exportImage() {
        const format = document.getElementById('imageFormat')?.value || 'png';
        const quality = document.getElementById('imageQuality')?.value || 'medium';
        const resolution = document.getElementById('imageResolution')?.value || 'original';
        const scope = document.querySelector('input[name="exportScope"]:checked')?.value || 'current';

        this.updateProgress(10, 'Preparing image export...');

        // Get source canvas
        const sourceCanvas = document.getElementById('dicomCanvas');
        if (!sourceCanvas) {
            throw new Error('No image available for export');
        }

        this.updateProgress(30, 'Processing image...');

        // Create export canvas with desired resolution
        const exportCanvas = document.createElement('canvas');
        const ctx = exportCanvas.getContext('2d');

        // Set resolution
        let { width, height } = this.getExportDimensions(sourceCanvas, resolution);
        exportCanvas.width = width;
        exportCanvas.height = height;

        // Draw image
        ctx.drawImage(sourceCanvas, 0, 0, width, height);

        this.updateProgress(50, 'Adding overlays...');

        // Add overlays if requested
        if (document.getElementById('includeMeasurements')?.checked) {
            await this.addMeasurementsToCanvas(ctx, width, height);
        }

        if (document.getElementById('includeAnnotations')?.checked) {
            await this.addAnnotationsToCanvas(ctx, width, height);
        }

        if (document.getElementById('includePatientInfo')?.checked) {
            await this.addPatientInfoToCanvas(ctx, width, height);
        }

        this.updateProgress(80, 'Generating file...');

        // Export based on scope
        if (scope === 'current') {
            await this.downloadCanvas(exportCanvas, format, quality);
        } else {
            await this.exportMultipleImages(scope, format, quality, resolution);
        }

        this.updateProgress(100, 'Export complete!');
    }

    async generateReport() {
        const template = document.getElementById('reportTemplate')?.value || 'basic';
        const pageSize = document.getElementById('pageSize')?.value || 'letter';
        const orientation = document.querySelector('input[name="orientation"]:checked')?.value || 'portrait';

        this.updateProgress(10, 'Initializing PDF generator...');

        // Use jsPDF for PDF generation
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            throw new Error('PDF library not loaded');
        }

        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: pageSize
        });

        this.updateProgress(30, 'Adding content to report...');

        // Add report content based on selected sections
        let yPosition = 20;
        
        // Title
        pdf.setFontSize(18);
        pdf.text('Medical Imaging Report', 20, yPosition);
        yPosition += 15;

        // Patient Information
        if (document.getElementById('section_patient_info')?.checked) {
            yPosition = await this.addPatientInfoToPDF(pdf, yPosition);
        }

        this.updateProgress(50, 'Adding images...');

        // Study Information
        if (document.getElementById('section_study_info')?.checked) {
            yPosition = await this.addStudyInfoToPDF(pdf, yPosition);
        }

        // Clinical content
        const clinicalHistory = document.getElementById('clinicalHistory')?.value;
        if (clinicalHistory && document.getElementById('section_clinical_history')?.checked) {
            yPosition = await this.addTextSectionToPDF(pdf, 'Clinical History', clinicalHistory, yPosition);
        }

        const findings = document.getElementById('findings')?.value;
        if (findings && document.getElementById('section_findings')?.checked) {
            yPosition = await this.addTextSectionToPDF(pdf, 'Findings', findings, yPosition);
        }

        const impression = document.getElementById('impression')?.value;
        if (impression && document.getElementById('section_impression')?.checked) {
            yPosition = await this.addTextSectionToPDF(pdf, 'Impression', impression, yPosition);
        }

        this.updateProgress(70, 'Adding measurements...');

        // Measurements
        if (document.getElementById('section_measurements')?.checked) {
            yPosition = await this.addMeasurementsToPDF(pdf, yPosition);
        }

        this.updateProgress(90, 'Adding images to report...');

        // Images
        if (document.getElementById('section_images')?.checked) {
            await this.addImagesToPDF(pdf);
        }

        this.updateProgress(100, 'Saving report...');

        // Save PDF
        const filename = `medical_report_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);
    }

    async exportData() {
        const format = document.getElementById('dataFormat')?.value || 'json';
        
        this.updateProgress(20, 'Collecting data...');
        
        const data = this.collectExportData();
        
        this.updateProgress(60, 'Converting data...');
        
        let content, mimeType, extension;
        
        switch (format) {
            case 'json':
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                extension = 'json';
                break;
            case 'csv':
                content = this.convertToCSV(data);
                mimeType = 'text/csv';
                extension = 'csv';
                break;
            case 'xml':
                content = this.convertToXML(data);
                mimeType = 'application/xml';
                extension = 'xml';
                break;
            case 'excel':
                await this.exportToExcel(data);
                return;
        }
        
        this.updateProgress(90, 'Preparing download...');
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dicom_data_${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateProgress(100, 'Export complete!');
    }

    async printDocument() {
        const layout = document.getElementById('printLayout')?.value || 'single';
        
        this.updateProgress(20, 'Preparing print layout...');
        
        // Create print window
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            throw new Error('Could not open print window. Please allow popups.');
        }
        
        this.updateProgress(50, 'Generating print content...');
        
        const printContent = await this.generatePrintContent(layout);
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Medical Image Print</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                    .print-header { text-align: center; margin-bottom: 20px; }
                    .print-content { page-break-inside: avoid; }
                    .print-image { max-width: 100%; height: auto; }
                    .print-grid { display: grid; gap: 10px; }
                    .grid-2x2 { grid-template-columns: 1fr 1fr; }
                    .grid-3x3 { grid-template-columns: 1fr 1fr 1fr; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${printContent}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        this.updateProgress(100, 'Print dialog opened!');
    }

    // Helper Methods
    getExportDimensions(sourceCanvas, resolution) {
        let width = sourceCanvas.width;
        let height = sourceCanvas.height;

        switch (resolution) {
            case 'screen':
                width = Math.min(1920, width);
                height = Math.min(1080, height);
                break;
            case 'print':
                // 300 DPI for print
                const printScale = 300 / 96; // 96 DPI is screen default
                width *= printScale;
                height *= printScale;
                break;
            case 'custom':
                width = parseInt(document.getElementById('customWidth')?.value) || width;
                height = parseInt(document.getElementById('customHeight')?.value) || height;
                break;
            // 'original' uses source dimensions
        }

        return { width, height };
    }

    async addMeasurementsToCanvas(ctx, width, height) {
        if (!window.enhancedMeasurements) return;

        const measurements = window.enhancedMeasurements.measurements;
        const scaleX = width / ctx.canvas.width;
        const scaleY = height / ctx.canvas.height;

        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.font = '14px Arial';
        ctx.fillStyle = '#00d4ff';

        measurements.forEach(measurement => {
            // Scale and draw measurements based on type
            switch (measurement.type) {
                case 'length':
                    if (measurement.start && measurement.end) {
                        ctx.beginPath();
                        ctx.moveTo(measurement.start.x * scaleX, measurement.start.y * scaleY);
                        ctx.lineTo(measurement.end.x * scaleX, measurement.end.y * scaleY);
                        ctx.stroke();
                    }
                    break;
                // Add other measurement types as needed
            }
        });
    }

    async addAnnotationsToCanvas(ctx, width, height) {
        if (!window.enhancedMeasurements) return;

        const annotations = window.enhancedMeasurements.annotations;
        const scaleX = width / ctx.canvas.width;
        const scaleY = height / ctx.canvas.height;

        ctx.fillStyle = '#ffaa00';
        ctx.font = '12px Arial';

        annotations.forEach(annotation => {
            if (annotation.x && annotation.y && annotation.text) {
                ctx.fillText(annotation.text, annotation.x * scaleX, annotation.y * scaleY);
            }
        });
    }

    async addPatientInfoToCanvas(ctx, width, height) {
        // Add patient information overlay
        const patientInfo = this.getPatientInfo();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 300, 80);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(`Patient: ${patientInfo.name}`, 20, 30);
        ctx.fillText(`ID: ${patientInfo.id}`, 20, 50);
        ctx.fillText(`Study Date: ${patientInfo.studyDate}`, 20, 70);
    }

    async downloadCanvas(canvas, format, quality) {
        let mimeType, extension;
        
        switch (format) {
            case 'png':
                mimeType = 'image/png';
                extension = 'png';
                break;
            case 'jpeg':
                mimeType = 'image/jpeg';
                extension = 'jpg';
                break;
            case 'tiff':
                // Note: Browser support for TIFF is limited
                mimeType = 'image/tiff';
                extension = 'tiff';
                break;
            case 'dicom-sc':
                // This would require DICOM library integration
                throw new Error('DICOM Secondary Capture export not yet implemented');
        }

        const qualityValue = {
            low: 0.6,
            medium: 0.8,
            high: 0.95,
            ultra: 1.0
        }[quality] || 0.8;

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dicom_image_${new Date().toISOString().split('T')[0]}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, mimeType, qualityValue);
    }

    collectExportData() {
        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        if (document.getElementById('exportMeasurements')?.checked && window.enhancedMeasurements) {
            data.measurements = window.enhancedMeasurements.measurements;
        }

        if (document.getElementById('exportAnnotations')?.checked && window.enhancedMeasurements) {
            data.annotations = window.enhancedMeasurements.annotations;
        }

        if (document.getElementById('exportStudyInfo')?.checked) {
            data.studyInfo = this.getStudyInfo();
        }

        if (document.getElementById('exportImageInfo')?.checked) {
            data.imageInfo = this.getImageInfo();
        }

        if (document.getElementById('exportWindowSettings')?.checked) {
            data.windowSettings = this.getWindowSettings();
        }

        return data;
    }

    convertToCSV(data) {
        if (!data.measurements || data.measurements.length === 0) {
            return 'No measurement data available';
        }

        const headers = ['Type', 'Value', 'Unit', 'Image ID', 'Created'];
        const rows = data.measurements.map(m => [
            m.type,
            m.distance?.mm || m.area?.mm2 || m.angle || 'N/A',
            m.distance ? 'mm' : m.area ? 'mm²' : m.angle ? '°' : '',
            m.imageId || '',
            m.created || ''
        ]);

        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    convertToXML(data) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<dicom_export>\n';
        
        if (data.measurements) {
            xml += '  <measurements>\n';
            data.measurements.forEach(m => {
                xml += `    <measurement type="${m.type}" imageId="${m.imageId || ''}">\n`;
                if (m.distance) xml += `      <distance unit="mm">${m.distance.mm}</distance>\n`;
                if (m.area) xml += `      <area unit="mm2">${m.area.mm2}</area>\n`;
                if (m.angle) xml += `      <angle unit="degrees">${m.angle}</angle>\n`;
                xml += '    </measurement>\n';
            });
            xml += '  </measurements>\n';
        }
        
        xml += '</dicom_export>';
        return xml;
    }

    async exportToExcel(data) {
        // This would require a library like SheetJS
        throw new Error('Excel export requires additional library');
    }

    getPatientInfo() {
        return {
            name: window.currentPatient?.name || 'Unknown Patient',
            id: window.currentPatient?.id || 'Unknown ID',
            studyDate: window.currentStudy?.date || new Date().toISOString().split('T')[0]
        };
    }

    getStudyInfo() {
        return {
            studyId: window.currentStudy?.id,
            modality: window.currentStudy?.modality,
            studyDate: window.currentStudy?.date,
            description: window.currentStudy?.description
        };
    }

    getImageInfo() {
        return {
            imageId: window.currentImageId,
            dimensions: window.currentImage ? {
                width: window.currentImage.width,
                height: window.currentImage.height
            } : null
        };
    }

    getWindowSettings() {
        return {
            windowWidth: window.windowWidth || window.enhancedWindowing?.currentWindowWidth,
            windowLevel: window.windowLevel || window.enhancedWindowing?.currentWindowLevel,
            zoom: window.zoomFactor || window.zoom
        };
    }

    // Progress Management
    showProgress(show) {
        const progress = document.getElementById('exportProgress');
        const actions = document.querySelector('.export-actions');
        
        if (progress && actions) {
            progress.style.display = show ? 'block' : 'none';
            actions.style.display = show ? 'none' : 'flex';
        }
    }

    updateProgress(percent, text) {
        const fill = document.getElementById('progressFill');
        const textElement = document.getElementById('progressText');
        
        if (fill) fill.style.width = percent + '%';
        if (textElement) textElement.textContent = text;
    }

    // PDF Generation Helpers
    async addPatientInfoToPDF(pdf, yPosition) {
        const patientInfo = this.getPatientInfo();
        
        pdf.setFontSize(14);
        pdf.text('Patient Information', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.text(`Name: ${patientInfo.name}`, 25, yPosition);
        yPosition += 6;
        pdf.text(`ID: ${patientInfo.id}`, 25, yPosition);
        yPosition += 6;
        pdf.text(`Study Date: ${patientInfo.studyDate}`, 25, yPosition);
        yPosition += 15;
        
        return yPosition;
    }

    async addStudyInfoToPDF(pdf, yPosition) {
        const studyInfo = this.getStudyInfo();
        
        pdf.setFontSize(14);
        pdf.text('Study Information', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        if (studyInfo.modality) {
            pdf.text(`Modality: ${studyInfo.modality}`, 25, yPosition);
            yPosition += 6;
        }
        if (studyInfo.description) {
            pdf.text(`Description: ${studyInfo.description}`, 25, yPosition);
            yPosition += 6;
        }
        yPosition += 10;
        
        return yPosition;
    }

    async addTextSectionToPDF(pdf, title, content, yPosition) {
        pdf.setFontSize(14);
        pdf.text(title, 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(content, 170);
        pdf.text(lines, 25, yPosition);
        yPosition += lines.length * 6 + 10;
        
        return yPosition;
    }

    async addMeasurementsToPDF(pdf, yPosition) {
        if (!window.enhancedMeasurements?.measurements?.length) return yPosition;
        
        pdf.setFontSize(14);
        pdf.text('Measurements', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        window.enhancedMeasurements.measurements.forEach((measurement, index) => {
            let measurementText = `${index + 1}. ${measurement.type}: `;
            
            if (measurement.distance?.mm) {
                measurementText += `${measurement.distance.mm} mm`;
            } else if (measurement.area?.mm2) {
                measurementText += `${measurement.area.mm2} mm²`;
            } else if (measurement.angle) {
                measurementText += `${measurement.angle}°`;
            }
            
            pdf.text(measurementText, 25, yPosition);
            yPosition += 6;
        });
        
        yPosition += 10;
        return yPosition;
    }

    async addImagesToPDF(pdf) {
        const canvas = document.getElementById('dicomCanvas');
        if (canvas) {
            pdf.addPage();
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            pdf.addImage(imgData, 'JPEG', 10, 10, 190, 0);
        }
    }

    async generatePrintContent(layout) {
        const patientInfo = this.getPatientInfo();
        const canvas = document.getElementById('dicomCanvas');
        
        let content = `
            <div class="print-header">
                <h2>Medical Imaging Report</h2>
                <p>Patient: ${patientInfo.name} | ID: ${patientInfo.id} | Date: ${patientInfo.studyDate}</p>
            </div>
        `;
        
        if (canvas) {
            const imageData = canvas.toDataURL('image/png');
            
            switch (layout) {
                case 'single':
                    content += `<div class="print-content"><img src="${imageData}" class="print-image"></div>`;
                    break;
                case 'grid2x2':
                    content += `<div class="print-content print-grid grid-2x2">`;
                    for (let i = 0; i < 4; i++) {
                        content += `<img src="${imageData}" class="print-image">`;
                    }
                    content += `</div>`;
                    break;
                // Add other layouts as needed
                default:
                    content += `<div class="print-content"><img src="${imageData}" class="print-image"></div>`;
            }
        }
        
        return content;
    }
}

// Add CSS for export dialog
const exportCSS = `
<style>
.export-dialog .modal-content {
    width: 90%;
    max-width: 900px;
    height: 90%;
    max-height: 700px;
    display: flex;
    flex-direction: column;
}

.export-modal-body {
    flex: 1;
    overflow: auto;
    padding: 0;
}

.export-tabs {
    display: flex;
    border-bottom: 1px solid #404040;
    background: #333;
}

.export-tab {
    padding: 12px 20px;
    background: none;
    border: none;
    color: #ccc;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    display: flex;
    align-items: center;
    gap: 8px;
}

.export-tab.active {
    color: #00d4ff;
    border-bottom-color: #00d4ff;
}

.export-tab-content {
    padding: 20px;
}

.export-section h4 {
    color: #00d4ff;
    margin: 0 0 15px 0;
}

.export-options {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.option-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.option-group label {
    min-width: 100px;
    font-size: 13px;
}

.checkbox-group, .radio-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.checkbox-label, .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    min-width: auto !important;
}

.size-inputs {
    display: flex;
    align-items: center;
    gap: 10px;
}

.size-inputs input {
    width: 80px;
    padding: 4px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 3px;
}

.export-preview {
    margin-top: 20px;
    padding: 15px;
    background: #1a1a1a;
    border-radius: 4px;
    border: 1px solid #404040;
}

.export-preview h5 {
    color: #00d4ff;
    margin: 0 0 10px 0;
}

#exportPreviewCanvas {
    border: 1px solid #404040;
    background: #000;
    width: 100%;
    height: auto;
}

.data-preview-content {
    background: #000;
    color: #0f0;
    padding: 10px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 11px;
    max-height: 200px;
    overflow: auto;
    white-space: pre-wrap;
}

.content-inputs {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.input-group label {
    font-size: 12px;
    color: #ccc;
}

.input-group textarea {
    background: #333;
    border: 1px solid #404040;
    color: white;
    padding: 8px;
    border-radius: 3px;
    resize: vertical;
    font-family: Arial, sans-serif;
}

.print-preview-container {
    border: 1px solid #404040;
    background: #fff;
    padding: 10px;
    border-radius: 3px;
}

.print-page-preview {
    background: white;
    color: black;
    padding: 20px;
    min-height: 200px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.export-modal-footer {
    border-top: 1px solid #404040;
    padding: 15px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.export-progress {
    flex: 1;
    margin-right: 20px;
}

.progress-bar {
    width: 100%;
    height: 6px;
    background: #333;
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: #00d4ff;
    transition: width 0.3s ease;
    width: 0%;
}

.export-actions {
    display: flex;
    gap: 10px;
}

#progressText {
    font-size: 12px;
    color: #ccc;
    margin-top: 5px;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', exportCSS);

// Initialize enhanced export system
const enhancedExport = new EnhancedExportSystem();

// Export for global access
window.enhancedExport = enhancedExport;
window.EnhancedExportSystem = EnhancedExportSystem;

console.log('Enhanced DICOM Export and Reporting System loaded successfully');