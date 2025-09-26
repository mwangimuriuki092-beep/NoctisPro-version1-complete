/**
 * Advanced Medical Measurements System
 * Professional measurement tools for DICOM images
 */

class AdvancedMeasurements {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.measurements = [];
        this.currentMeasurement = null;
        this.measurementType = 'distance';
        this.pixelSpacing = [1.0, 1.0]; // mm per pixel
        this.isDrawing = false;
        this.points = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadPixelSpacing();
        console.log('📏 Advanced Measurements initialized');
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }
    
    loadPixelSpacing() {
        // Try to get pixel spacing from current image metadata
        if (window.dicomCanvasFix && window.dicomCanvasFix.currentImageData) {
            const metadata = window.dicomCanvasFix.currentImageData;
            if (metadata.pixel_spacing) {
                this.pixelSpacing = Array.isArray(metadata.pixel_spacing) ? 
                    metadata.pixel_spacing : [metadata.pixel_spacing, metadata.pixel_spacing];
            }
        }
        console.log(`📐 Pixel spacing: ${this.pixelSpacing[0]} x ${this.pixelSpacing[1]} mm`);
    }
    
    setMeasurementType(type) {
        this.measurementType = type;
        this.finishCurrentMeasurement();
        console.log(`📏 Measurement type: ${type}`);
    }
    
    handleMouseDown(e) {
        if (!this.isInMeasurementMode()) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.points.push({ x, y });
        this.isDrawing = true;
        
        switch (this.measurementType) {
            case 'distance':
                this.handleDistanceMouseDown(x, y);
                break;
            case 'area':
                this.handleAreaMouseDown(x, y);
                break;
            case 'angle':
                this.handleAngleMouseDown(x, y);
                break;
            case 'hounsfield':
                this.handleHounsfieldMouseDown(x, y);
                break;
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.drawPreview(x, y);
    }
    
    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        switch (this.measurementType) {
            case 'distance':
                this.finishDistanceMeasurement(x, y);
                break;
            case 'area':
                this.continueAreaMeasurement(x, y);
                break;
            case 'angle':
                this.continueAngleMeasurement(x, y);
                break;
            case 'hounsfield':
                this.finishHounsfieldMeasurement(x, y);
                break;
        }
    }
    
    handleDoubleClick(e) {
        if (this.measurementType === 'area' && this.points.length > 2) {
            this.finishAreaMeasurement();
        }
    }
    
    // Distance measurement
    handleDistanceMouseDown(x, y) {
        if (this.points.length === 1) {
            this.currentMeasurement = {
                type: 'distance',
                points: [{ x, y }],
                id: this.generateId()
            };
        }
    }
    
    finishDistanceMeasurement(x, y) {
        if (this.currentMeasurement && this.points.length === 2) {
            this.currentMeasurement.points.push({ x, y });
            
            const distance = this.calculateDistance(this.currentMeasurement.points[0], this.currentMeasurement.points[1]);
            this.currentMeasurement.value = distance;
            this.currentMeasurement.unit = 'mm';
            
            this.measurements.push(this.currentMeasurement);
            this.drawMeasurement(this.currentMeasurement);
            this.saveMeasurement(this.currentMeasurement);
            
            this.resetMeasurement();
            console.log(`📏 Distance measured: ${distance.toFixed(2)} mm`);
        }
    }
    
    // Area measurement
    handleAreaMouseDown(x, y) {
        if (this.points.length === 1) {
            this.currentMeasurement = {
                type: 'area',
                points: [{ x, y }],
                id: this.generateId()
            };
        }
    }
    
    continueAreaMeasurement(x, y) {
        if (this.currentMeasurement) {
            this.currentMeasurement.points.push({ x, y });
        }
        this.isDrawing = false; // Allow multiple clicks
    }
    
    finishAreaMeasurement() {
        if (this.currentMeasurement && this.points.length > 2) {
            const area = this.calculateArea(this.currentMeasurement.points);
            this.currentMeasurement.value = area;
            this.currentMeasurement.unit = 'mm²';
            
            this.measurements.push(this.currentMeasurement);
            this.drawMeasurement(this.currentMeasurement);
            this.saveMeasurement(this.currentMeasurement);
            
            this.resetMeasurement();
            console.log(`📊 Area measured: ${area.toFixed(2)} mm²`);
        }
    }
    
    // Angle measurement
    handleAngleMouseDown(x, y) {
        if (this.points.length === 1) {
            this.currentMeasurement = {
                type: 'angle',
                points: [{ x, y }],
                id: this.generateId()
            };
        }
    }
    
    continueAngleMeasurement(x, y) {
        if (this.currentMeasurement) {
            this.currentMeasurement.points.push({ x, y });
            
            if (this.points.length === 3) {
                this.finishAngleMeasurement();
            }
        }
        this.isDrawing = false;
    }
    
    finishAngleMeasurement() {
        if (this.currentMeasurement && this.points.length === 3) {
            const angle = this.calculateAngle(
                this.currentMeasurement.points[0],
                this.currentMeasurement.points[1],
                this.currentMeasurement.points[2]
            );
            this.currentMeasurement.value = angle;
            this.currentMeasurement.unit = '°';
            
            this.measurements.push(this.currentMeasurement);
            this.drawMeasurement(this.currentMeasurement);
            this.saveMeasurement(this.currentMeasurement);
            
            this.resetMeasurement();
            console.log(`📐 Angle measured: ${angle.toFixed(1)}°`);
        }
    }
    
    // Hounsfield unit measurement
    handleHounsfieldMouseDown(x, y) {
        this.measureHounsfieldUnits(x, y);
    }
    
    finishHounsfieldMeasurement(x, y) {
        this.resetMeasurement();
    }
    
    async measureHounsfieldUnits(x, y) {
        try {
            const imageId = this.getCurrentImageId();
            if (!imageId) return;
            
            const response = await fetch(`/dicom-viewer/api/image/${imageId}/hounsfield/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({ x, y })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                const measurement = {
                    type: 'hounsfield',
                    points: [{ x, y }],
                    value: data.hounsfield_value,
                    unit: 'HU',
                    id: this.generateId()
                };
                
                this.measurements.push(measurement);
                this.drawMeasurement(measurement);
                this.saveMeasurement(measurement);
                
                console.log(`🏥 Hounsfield Unit: ${data.hounsfield_value} HU`);
            }
        } catch (error) {
            console.error('Failed to get Hounsfield units:', error);
        }
    }
    
    // Calculation methods
    calculateDistance(point1, point2) {
        const dx = (point2.x - point1.x) * this.pixelSpacing[0];
        const dy = (point2.y - point1.y) * this.pixelSpacing[1];
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    calculateArea(points) {
        if (points.length < 3) return 0;
        
        // Shoelace formula for polygon area
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        area = Math.abs(area) / 2;
        
        // Convert to mm²
        return area * this.pixelSpacing[0] * this.pixelSpacing[1];
    }
    
    calculateAngle(point1, vertex, point2) {
        const dx1 = point1.x - vertex.x;
        const dy1 = point1.y - vertex.y;
        const dx2 = point2.x - vertex.x;
        const dy2 = point2.y - vertex.y;
        
        const angle1 = Math.atan2(dy1, dx1);
        const angle2 = Math.atan2(dy2, dx2);
        
        let angle = Math.abs(angle2 - angle1);
        if (angle > Math.PI) {
            angle = 2 * Math.PI - angle;
        }
        
        return angle * 180 / Math.PI;
    }
    
    // Drawing methods
    drawPreview(currentX, currentY) {
        // Save current canvas state
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw preview
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        if (this.measurementType === 'distance' && this.points.length === 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            this.ctx.lineTo(currentX, currentY);
            this.ctx.stroke();
        } else if (this.measurementType === 'area' && this.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                this.ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            this.ctx.lineTo(currentX, currentY);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
        
        // Restore after a short delay to show preview
        setTimeout(() => {
            this.ctx.putImageData(imageData, 0, 0);
            this.redrawAllMeasurements();
        }, 50);
    }
    
    drawMeasurement(measurement) {
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.fillStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.font = '14px Arial';
        
        switch (measurement.type) {
            case 'distance':
                this.drawDistanceMeasurement(measurement);
                break;
            case 'area':
                this.drawAreaMeasurement(measurement);
                break;
            case 'angle':
                this.drawAngleMeasurement(measurement);
                break;
            case 'hounsfield':
                this.drawHounsfieldMeasurement(measurement);
                break;
        }
    }
    
    drawDistanceMeasurement(measurement) {
        const p1 = measurement.points[0];
        const p2 = measurement.points[1];
        
        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
        
        // Draw endpoints
        this.drawPoint(p1);
        this.drawPoint(p2);
        
        // Draw label
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const label = `${measurement.value.toFixed(2)} ${measurement.unit}`;
        
        this.drawLabel(midX, midY, label);
    }
    
    drawAreaMeasurement(measurement) {
        const points = measurement.points;
        
        // Draw polygon
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Draw points
        points.forEach(point => this.drawPoint(point));
        
        // Draw label at centroid
        const centroid = this.calculateCentroid(points);
        const label = `${measurement.value.toFixed(2)} ${measurement.unit}`;
        this.drawLabel(centroid.x, centroid.y, label);
    }
    
    drawAngleMeasurement(measurement) {
        const [p1, vertex, p2] = measurement.points;
        
        // Draw lines
        this.ctx.beginPath();
        this.ctx.moveTo(vertex.x, vertex.y);
        this.ctx.lineTo(p1.x, p1.y);
        this.ctx.moveTo(vertex.x, vertex.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
        
        // Draw arc
        const radius = 30;
        const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
        const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
        
        this.ctx.beginPath();
        this.ctx.arc(vertex.x, vertex.y, radius, angle1, angle2);
        this.ctx.stroke();
        
        // Draw points
        this.drawPoint(p1);
        this.drawPoint(vertex);
        this.drawPoint(p2);
        
        // Draw label
        const labelX = vertex.x + Math.cos((angle1 + angle2) / 2) * (radius + 20);
        const labelY = vertex.y + Math.sin((angle1 + angle2) / 2) * (radius + 20);
        const label = `${measurement.value.toFixed(1)}${measurement.unit}`;
        
        this.drawLabel(labelX, labelY, label);
    }
    
    drawHounsfieldMeasurement(measurement) {
        const point = measurement.points[0];
        
        // Draw crosshair
        this.ctx.beginPath();
        this.ctx.moveTo(point.x - 10, point.y);
        this.ctx.lineTo(point.x + 10, point.y);
        this.ctx.moveTo(point.x, point.y - 10);
        this.ctx.lineTo(point.x, point.y + 10);
        this.ctx.stroke();
        
        // Draw circle
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Draw label
        const label = `${measurement.value.toFixed(0)} ${measurement.unit}`;
        this.drawLabel(point.x + 20, point.y - 20, label);
    }
    
    drawPoint(point) {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    drawLabel(x, y, text) {
        // Draw background
        const metrics = this.ctx.measureText(text);
        const padding = 4;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(
            x - padding, 
            y - 16 - padding, 
            metrics.width + padding * 2, 
            16 + padding * 2
        );
        
        // Draw text
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText(text, x, y);
    }
    
    calculateCentroid(points) {
        const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        return { x, y };
    }
    
    redrawAllMeasurements() {
        this.measurements.forEach(measurement => {
            this.drawMeasurement(measurement);
        });
    }
    
    resetMeasurement() {
        this.currentMeasurement = null;
        this.points = [];
        this.isDrawing = false;
    }
    
    finishCurrentMeasurement() {
        if (this.currentMeasurement) {
            if (this.measurementType === 'area' && this.points.length > 2) {
                this.finishAreaMeasurement();
            } else {
                this.resetMeasurement();
            }
        }
    }
    
    deleteMeasurement(measurementId) {
        this.measurements = this.measurements.filter(m => m.id !== measurementId);
        this.redrawCanvas();
    }
    
    clearAllMeasurements() {
        this.measurements = [];
        this.resetMeasurement();
        this.redrawCanvas();
        console.log('🧹 All measurements cleared');
    }
    
    async saveMeasurement(measurement) {
        try {
            const studyId = this.getCurrentStudyId();
            if (!studyId) return;
            
            const response = await fetch(`/dicom-viewer/api/study/${studyId}/measurements/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    measurement_type: measurement.type,
                    points: measurement.points,
                    value: measurement.value,
                    unit: measurement.unit,
                    image_id: this.getCurrentImageId()
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                measurement.server_id = data.id;
                console.log(`💾 Measurement saved: ${measurement.id}`);
            }
        } catch (error) {
            console.error('Failed to save measurement:', error);
        }
    }
    
    redrawCanvas() {
        // Trigger canvas redraw
        if (window.dicomCanvasFix && window.dicomCanvasFix.currentImage) {
            window.dicomCanvasFix.displayImage(window.dicomCanvasFix.currentImage);
            
            // Redraw measurements after a short delay
            setTimeout(() => {
                this.redrawAllMeasurements();
            }, 100);
        }
    }
    
    // Utility methods
    isInMeasurementMode() {
        return ['distance', 'area', 'angle', 'hounsfield'].includes(this.measurementType);
    }
    
    generateId() {
        return 'measurement_' + Math.random().toString(36).substr(2, 9);
    }
    
    getCurrentStudyId() {
        if (window.dicomCanvasFix && window.dicomCanvasFix.currentStudy) {
            return window.dicomCanvasFix.currentStudy.id;
        }
        return null;
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
    
    // Public API
    getMeasurements() {
        return this.measurements;
    }
    
    exportMeasurements() {
        const data = {
            measurements: this.measurements,
            pixel_spacing: this.pixelSpacing,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `measurements_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('📤 Measurements exported');
    }
}

// Initialize measurements when canvas is available
let advancedMeasurements = null;

function initializeMeasurements() {
    const canvas = document.querySelector('#dicom-canvas, .dicom-canvas, #viewer-canvas');
    if (canvas && !advancedMeasurements) {
        advancedMeasurements = new AdvancedMeasurements(canvas);
        
        // Connect to component connector
        if (window.dicomConnector) {
            window.dicomConnector.measurements = advancedMeasurements;
        }
        
        console.log('📏 Advanced measurements initialized');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMeasurements);
} else {
    initializeMeasurements();
}

// Also try to initialize after a delay in case canvas loads later
setTimeout(initializeMeasurements, 1000);

// Global access
window.AdvancedMeasurements = AdvancedMeasurements;
window.advancedMeasurements = advancedMeasurements;

console.log('📏 Advanced Measurements System loaded');