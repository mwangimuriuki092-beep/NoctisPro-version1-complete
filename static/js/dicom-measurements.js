/**
 * Professional DICOM Measurement System
 * Implements real-world medical imaging measurement tools
 */

class DICOMMeasurements {
    constructor(canvas, pixelSpacing = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.pixelSpacing = pixelSpacing; // [row_spacing, col_spacing] in mm
        this.measurements = [];
        this.currentMeasurement = null;
        this.activeTool = 'none';
        this.isDrawing = false;
        
        // Measurement styles
        this.styles = {
            active: {
                strokeStyle: '#ffff00',
                fillStyle: '#ffff00',
                lineWidth: 2,
                font: '12px Arial',
                lineDash: [5, 5]
            },
            completed: {
                strokeStyle: '#ff0000',
                fillStyle: '#ff0000',
                lineWidth: 2,
                font: '12px Arial',
                lineDash: []
            },
            selected: {
                strokeStyle: '#00ff00',
                fillStyle: '#00ff00',
                lineWidth: 3,
                font: '12px Arial',
                lineDash: []
            }
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    }
    
    setPixelSpacing(spacing) {
        this.pixelSpacing = spacing;
        // Recalculate all measurements
        this.measurements.forEach(m => this.calculateMeasurementValue(m));
        this.updateMeasurementsList();
    }
    
    setActiveTool(tool) {
        this.activeTool = tool;
        this.canvas.style.cursor = tool === 'none' ? 'default' : 'crosshair';
        this.currentMeasurement = null;
        this.isDrawing = false;
    }
    
    handleMouseDown(event) {
        if (this.activeTool === 'none') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (event.button === 0) { // Left click
            this.startMeasurement(x, y);
        }
    }
    
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.isDrawing && this.currentMeasurement) {
            this.updateCurrentMeasurement(x, y);
            this.redraw();
        }
    }
    
    handleMouseUp(event) {
        if (this.isDrawing && event.button === 0) {
            this.finalizeMeasurement();
        }
    }
    
    handleContextMenu(event) {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const measurementIndex = this.findMeasurementAtPoint(x, y);
        if (measurementIndex >= 0) {
            this.showContextMenu(event.clientX, event.clientY, measurementIndex);
        }
    }
    
    startMeasurement(x, y) {
        this.isDrawing = true;
        
        switch (this.activeTool) {
            case 'length':
                this.currentMeasurement = {
                    type: 'length',
                    points: [{x, y}, {x, y}],
                    id: Date.now()
                };
                break;
                
            case 'area':
                this.currentMeasurement = {
                    type: 'area',
                    points: [{x, y}],
                    closed: false,
                    id: Date.now()
                };
                break;
                
            case 'angle':
                this.currentMeasurement = {
                    type: 'angle',
                    points: [{x, y}],
                    id: Date.now()
                };
                break;
                
            case 'ellipse':
                this.currentMeasurement = {
                    type: 'ellipse',
                    center: {x, y},
                    radiusX: 0,
                    radiusY: 0,
                    id: Date.now()
                };
                break;
                
            case 'rectangle':
                this.currentMeasurement = {
                    type: 'rectangle',
                    startX: x,
                    startY: y,
                    endX: x,
                    endY: y,
                    id: Date.now()
                };
                break;
        }
    }
    
    updateCurrentMeasurement(x, y) {
        if (!this.currentMeasurement) return;
        
        switch (this.currentMeasurement.type) {
            case 'length':
                this.currentMeasurement.points[1] = {x, y};
                break;
                
            case 'area':
                if (this.currentMeasurement.points.length < 10) { // Max 10 points
                    this.currentMeasurement.points[this.currentMeasurement.points.length - 1] = {x, y};
                }
                break;
                
            case 'angle':
                if (this.currentMeasurement.points.length === 1) {
                    this.currentMeasurement.points.push({x, y});
                } else if (this.currentMeasurement.points.length === 2) {
                    this.currentMeasurement.points[1] = {x, y};
                }
                break;
                
            case 'ellipse':
                const dx = x - this.currentMeasurement.center.x;
                const dy = y - this.currentMeasurement.center.y;
                this.currentMeasurement.radiusX = Math.abs(dx);
                this.currentMeasurement.radiusY = Math.abs(dy);
                break;
                
            case 'rectangle':
                this.currentMeasurement.endX = x;
                this.currentMeasurement.endY = y;
                break;
        }
    }
    
    finalizeMeasurement() {
        if (!this.currentMeasurement) return;
        
        // Special handling for angle measurements (need 3 points)
        if (this.currentMeasurement.type === 'angle' && this.currentMeasurement.points.length < 3) {
            return; // Continue drawing
        }
        
        // Special handling for area measurements (need at least 3 points)
        if (this.currentMeasurement.type === 'area' && this.currentMeasurement.points.length < 3) {
            return; // Continue drawing
        }
        
        this.calculateMeasurementValue(this.currentMeasurement);
        this.measurements.push(this.currentMeasurement);
        this.currentMeasurement = null;
        this.isDrawing = false;
        
        this.updateMeasurementsList();
        this.saveMeasurementToServer();
        this.redraw();
        
        // Reset tool to pan after measurement
        this.setActiveTool('none');
        if (window.setActiveTool) {
            window.setActiveTool('windowing');
        }
    }
    
    calculateMeasurementValue(measurement) {
        switch (measurement.type) {
            case 'length':
                this.calculateLength(measurement);
                break;
            case 'area':
                this.calculateArea(measurement);
                break;
            case 'angle':
                this.calculateAngle(measurement);
                break;
            case 'ellipse':
                this.calculateEllipseArea(measurement);
                break;
            case 'rectangle':
                this.calculateRectangleArea(measurement);
                break;
        }
    }
    
    calculateLength(measurement) {
        const p1 = measurement.points[0];
        const p2 = measurement.points[1];
        const pixelDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        
        if (this.pixelSpacing) {
            const mmDistance = pixelDistance * this.pixelSpacing[0]; // Assume square pixels
            measurement.value = mmDistance.toFixed(2);
            measurement.unit = 'mm';
            measurement.displayText = `${measurement.value} mm`;
        } else {
            measurement.value = pixelDistance.toFixed(1);
            measurement.unit = 'px';
            measurement.displayText = `${measurement.value} px`;
        }
    }
    
    calculateArea(measurement) {
        if (measurement.points.length < 3) return;
        
        // Calculate polygon area using shoelace formula
        let area = 0;
        const points = measurement.points;
        
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        
        area = Math.abs(area) / 2;
        
        if (this.pixelSpacing) {
            const mmArea = area * this.pixelSpacing[0] * this.pixelSpacing[1];
            if (mmArea > 100) {
                measurement.value = (mmArea / 100).toFixed(2);
                measurement.unit = 'cm²';
                measurement.displayText = `${measurement.value} cm²`;
            } else {
                measurement.value = mmArea.toFixed(2);
                measurement.unit = 'mm²';
                measurement.displayText = `${measurement.value} mm²`;
            }
        } else {
            measurement.value = area.toFixed(1);
            measurement.unit = 'px²';
            measurement.displayText = `${measurement.value} px²`;
        }
    }
    
    calculateAngle(measurement) {
        if (measurement.points.length < 3) return;
        
        const p1 = measurement.points[0];
        const vertex = measurement.points[1];
        const p2 = measurement.points[2];
        
        const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
        const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
        
        let angle = Math.abs(angle1 - angle2) * (180 / Math.PI);
        if (angle > 180) angle = 360 - angle;
        
        measurement.value = angle.toFixed(1);
        measurement.unit = '°';
        measurement.displayText = `${measurement.value}°`;
    }
    
    calculateEllipseArea(measurement) {
        const area = Math.PI * measurement.radiusX * measurement.radiusY;
        
        if (this.pixelSpacing) {
            const mmArea = area * this.pixelSpacing[0] * this.pixelSpacing[1];
            if (mmArea > 100) {
                measurement.value = (mmArea / 100).toFixed(2);
                measurement.unit = 'cm²';
                measurement.displayText = `${measurement.value} cm²`;
            } else {
                measurement.value = mmArea.toFixed(2);
                measurement.unit = 'mm²';
                measurement.displayText = `${measurement.value} mm²`;
            }
        } else {
            measurement.value = area.toFixed(1);
            measurement.unit = 'px²';
            measurement.displayText = `${measurement.value} px²`;
        }
    }
    
    calculateRectangleArea(measurement) {
        const width = Math.abs(measurement.endX - measurement.startX);
        const height = Math.abs(measurement.endY - measurement.startY);
        const area = width * height;
        
        if (this.pixelSpacing) {
            const mmArea = area * this.pixelSpacing[0] * this.pixelSpacing[1];
            if (mmArea > 100) {
                measurement.value = (mmArea / 100).toFixed(2);
                measurement.unit = 'cm²';
                measurement.displayText = `${measurement.value} cm²`;
            } else {
                measurement.value = mmArea.toFixed(2);
                measurement.unit = 'mm²';
                measurement.displayText = `${measurement.value} mm²`;
            }
        } else {
            measurement.value = area.toFixed(1);
            measurement.unit = 'px²';
            measurement.displayText = `${measurement.value} px²`;
        }
    }
    
    draw() {
        // Draw completed measurements
        this.measurements.forEach(measurement => {
            this.drawMeasurement(measurement, this.styles.completed);
        });
        
        // Draw current measurement being created
        if (this.currentMeasurement) {
            this.drawMeasurement(this.currentMeasurement, this.styles.active);
        }
    }
    
    drawMeasurement(measurement, style) {
        this.ctx.save();
        this.ctx.strokeStyle = style.strokeStyle;
        this.ctx.fillStyle = style.fillStyle;
        this.ctx.lineWidth = style.lineWidth;
        this.ctx.setLineDash(style.lineDash);
        this.ctx.font = style.font;
        
        switch (measurement.type) {
            case 'length':
                this.drawLength(measurement);
                break;
            case 'area':
                this.drawArea(measurement);
                break;
            case 'angle':
                this.drawAngle(measurement);
                break;
            case 'ellipse':
                this.drawEllipse(measurement);
                break;
            case 'rectangle':
                this.drawRectangle(measurement);
                break;
        }
        
        this.ctx.restore();
    }
    
    drawLength(measurement) {
        const p1 = measurement.points[0];
        const p2 = measurement.points[1];
        
        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
        
        // Draw endpoints
        this.ctx.fillRect(p1.x - 3, p1.y - 3, 6, 6);
        this.ctx.fillRect(p2.x - 3, p2.y - 3, 6, 6);
        
        // Draw measurement text
        if (measurement.displayText) {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(midX - 30, midY - 10, 60, 20);
            this.ctx.fillStyle = this.ctx.strokeStyle;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(measurement.displayText, midX, midY + 4);
        }
    }
    
    drawArea(measurement) {
        if (measurement.points.length < 2) return;
        
        // Draw polygon
        this.ctx.beginPath();
        this.ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
        
        for (let i = 1; i < measurement.points.length; i++) {
            this.ctx.lineTo(measurement.points[i].x, measurement.points[i].y);
        }
        
        if (measurement.closed || measurement.points.length > 2) {
            this.ctx.closePath();
        }
        
        this.ctx.stroke();
        
        // Draw points
        measurement.points.forEach(point => {
            this.ctx.fillRect(point.x - 3, point.y - 3, 6, 6);
        });
        
        // Draw measurement text
        if (measurement.displayText && measurement.points.length > 2) {
            const centerX = measurement.points.reduce((sum, p) => sum + p.x, 0) / measurement.points.length;
            const centerY = measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length;
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(centerX - 30, centerY - 10, 60, 20);
            this.ctx.fillStyle = this.ctx.strokeStyle;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(measurement.displayText, centerX, centerY + 4);
        }
    }
    
    drawAngle(measurement) {
        if (measurement.points.length < 2) return;
        
        const p1 = measurement.points[0];
        const vertex = measurement.points[1];
        const p2 = measurement.points[2];
        
        // Draw lines
        this.ctx.beginPath();
        this.ctx.moveTo(vertex.x, vertex.y);
        this.ctx.lineTo(p1.x, p1.y);
        this.ctx.moveTo(vertex.x, vertex.y);
        if (p2) this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
        
        // Draw points
        this.ctx.fillRect(p1.x - 3, p1.y - 3, 6, 6);
        this.ctx.fillRect(vertex.x - 4, vertex.y - 4, 8, 8);
        if (p2) this.ctx.fillRect(p2.x - 3, p2.y - 3, 6, 6);
        
        // Draw arc and text
        if (p2 && measurement.displayText) {
            const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
            const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
            
            this.ctx.beginPath();
            this.ctx.arc(vertex.x, vertex.y, 30, angle1, angle2);
            this.ctx.stroke();
            
            const textAngle = (angle1 + angle2) / 2;
            const textX = vertex.x + Math.cos(textAngle) * 40;
            const textY = vertex.y + Math.sin(textAngle) * 40;
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(textX - 20, textY - 10, 40, 20);
            this.ctx.fillStyle = this.ctx.strokeStyle;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(measurement.displayText, textX, textY + 4);
        }
    }
    
    drawEllipse(measurement) {
        this.ctx.beginPath();
        this.ctx.ellipse(measurement.center.x, measurement.center.y, 
                        measurement.radiusX, measurement.radiusY, 0, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Draw center point
        this.ctx.fillRect(measurement.center.x - 3, measurement.center.y - 3, 6, 6);
        
        // Draw measurement text
        if (measurement.displayText) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(measurement.center.x - 30, measurement.center.y - 10, 60, 20);
            this.ctx.fillStyle = this.ctx.strokeStyle;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(measurement.displayText, measurement.center.x, measurement.center.y + 4);
        }
    }
    
    drawRectangle(measurement) {
        const x = Math.min(measurement.startX, measurement.endX);
        const y = Math.min(measurement.startY, measurement.endY);
        const width = Math.abs(measurement.endX - measurement.startX);
        const height = Math.abs(measurement.endY - measurement.startY);
        
        this.ctx.strokeRect(x, y, width, height);
        
        // Draw corner points
        this.ctx.fillRect(measurement.startX - 3, measurement.startY - 3, 6, 6);
        this.ctx.fillRect(measurement.endX - 3, measurement.endY - 3, 6, 6);
        
        // Draw measurement text
        if (measurement.displayText) {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(centerX - 30, centerY - 10, 60, 20);
            this.ctx.fillStyle = this.ctx.strokeStyle;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(measurement.displayText, centerX, centerY + 4);
        }
    }
    
    findMeasurementAtPoint(x, y) {
        for (let i = this.measurements.length - 1; i >= 0; i--) {
            if (this.isPointInMeasurement(x, y, this.measurements[i])) {
                return i;
            }
        }
        return -1;
    }
    
    isPointInMeasurement(x, y, measurement) {
        const tolerance = 10;
        
        switch (measurement.type) {
            case 'length':
                return this.pointToLineDistance(x, y, measurement.points[0], measurement.points[1]) < tolerance;
            case 'area':
                return this.pointInPolygon(x, y, measurement.points);
            case 'angle':
                return measurement.points.some(p => 
                    Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2)) < tolerance
                );
            case 'ellipse':
                const dx = (x - measurement.center.x) / measurement.radiusX;
                const dy = (y - measurement.center.y) / measurement.radiusY;
                return dx * dx + dy * dy <= 1;
            case 'rectangle':
                const minX = Math.min(measurement.startX, measurement.endX);
                const maxX = Math.max(measurement.startX, measurement.endX);
                const minY = Math.min(measurement.startY, measurement.endY);
                const maxY = Math.max(measurement.startY, measurement.endY);
                return x >= minX && x <= maxX && y >= minY && y <= maxY;
        }
        return false;
    }
    
    pointToLineDistance(px, py, p1, p2) {
        const A = px - p1.x;
        const B = py - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        
        if (param < 0) {
            return Math.sqrt(A * A + B * B);
        } else if (param > 1) {
            return Math.sqrt((px - p2.x) * (px - p2.x) + (py - p2.y) * (py - p2.y));
        } else {
            const projX = p1.x + param * C;
            const projY = p1.y + param * D;
            return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
        }
    }
    
    pointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            if (((points[i].y > y) !== (points[j].y > y)) &&
                (x < (points[j].x - points[i].x) * (y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    updateMeasurementsList() {
        const container = document.getElementById('measurementsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.measurements.length === 0) {
            container.innerHTML = '<div class="measurement-item">No measurements yet. Select a measurement tool.</div>';
            return;
        }
        
        this.measurements.forEach((measurement, index) => {
            const item = document.createElement('div');
            item.className = 'measurement-item';
            item.innerHTML = `
                <div class="measurement-type">${measurement.type.toUpperCase()}</div>
                <div class="measurement-value">${measurement.displayText || 'Calculating...'}</div>
                <div class="measurement-actions">
                    <button onclick="measurementSystem.deleteMeasurement(${index})" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button onclick="measurementSystem.copyValue(${index})" class="copy-btn">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    deleteMeasurement(index) {
        if (index >= 0 && index < this.measurements.length) {
            this.measurements.splice(index, 1);
            this.updateMeasurementsList();
            this.redraw();
            if (window.showToast) {
                window.showToast('Measurement deleted', 'success');
            }
        }
    }
    
    copyValue(index) {
        if (index >= 0 && index < this.measurements.length) {
            const measurement = this.measurements[index];
            if (measurement.displayText) {
                navigator.clipboard.writeText(measurement.displayText).then(() => {
                    if (window.showToast) {
                        window.showToast('Measurement copied to clipboard', 'success');
                    }
                });
            }
        }
    }
    
    clearAll() {
        this.measurements = [];
        this.currentMeasurement = null;
        this.isDrawing = false;
        this.updateMeasurementsList();
        this.redraw();
        if (window.showToast) {
            window.showToast('All measurements cleared', 'success');
        }
    }
    
    redraw() {
        if (window.redrawCurrentImage) {
            window.redrawCurrentImage();
        }
    }
    
    async saveMeasurementToServer() {
        if (!window.currentSeries) return;
        
        try {
            const response = await fetch('/dicom-viewer/measurements/save/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    series_id: window.currentSeries.id,
                    image_index: window.currentImageIndex,
                    measurements: this.measurements
                })
            });
            
            if (!response.ok) {
                console.warn('Failed to save measurement to server');
            }
        } catch (error) {
            console.warn('Error saving measurement:', error);
        }
    }
    
    showContextMenu(x, y, measurementIndex) {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'measurement-context-menu';
        contextMenu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 8px 0;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        const measurement = this.measurements[measurementIndex];
        contextMenu.innerHTML = `
            <div class="context-menu-item" onclick="measurementSystem.copyValue(${measurementIndex})">
                <i class="fas fa-copy"></i> Copy Value
            </div>
            <div class="context-menu-item" onclick="measurementSystem.deleteMeasurement(${measurementIndex})">
                <i class="fas fa-trash"></i> Delete
            </div>
        `;
        
        document.body.appendChild(contextMenu);
        
        // Remove context menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                if (contextMenu.parentNode) {
                    contextMenu.parentNode.removeChild(contextMenu);
                }
                document.removeEventListener('click', removeMenu);
            });
        }, 100);
    }
}

// Global measurement system instance
window.measurementSystem = null;