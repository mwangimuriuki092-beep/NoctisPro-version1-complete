/**
 * Enhanced DICOM Measurement System
 * Advanced measurement tools for medical imaging
 */

class EnhancedMeasurementSystem {
    constructor() {
        this.measurements = [];
        this.annotations = [];
        this.currentMeasurement = null;
        this.currentTool = 'length';
        this.isDrawing = false;
        this.pixelSpacing = { x: 1, y: 1 }; // Default pixel spacing
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createMeasurementUI();
        console.log('Enhanced Measurement System initialized');
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('dicomCanvas');
            if (canvas) {
                this.attachCanvasEvents(canvas);
            }
        });

        // Listen for pixel spacing updates
        document.addEventListener('pixelSpacingUpdate', (e) => {
            this.pixelSpacing = e.detail;
        });
    }

    attachCanvasEvents(canvas) {
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    }

    createMeasurementUI() {
        // Add enhanced measurement tools to toolbar
        const toolbar = document.querySelector('.toolbar .tool-group');
        if (toolbar) {
            const measurementGroup = document.createElement('div');
            measurementGroup.className = 'tool-group measurement-tools';
            measurementGroup.innerHTML = `
                <button class="tool" data-tool="length" onclick="enhancedMeasurements.setTool('length')" title="Length Measurement">
                    <i class="fas fa-ruler"></i>
                    <span>Length</span>
                </button>
                <button class="tool" data-tool="angle" onclick="enhancedMeasurements.setTool('angle')" title="Angle Measurement">
                    <i class="fas fa-angle-left"></i>
                    <span>Angle</span>
                </button>
                <button class="tool" data-tool="area" onclick="enhancedMeasurements.setTool('area')" title="Area Measurement">
                    <i class="fas fa-draw-polygon"></i>
                    <span>Area</span>
                </button>
                <button class="tool" data-tool="ellipse" onclick="enhancedMeasurements.setTool('ellipse')" title="Elliptical ROI">
                    <i class="fas fa-circle"></i>
                    <span>Ellipse</span>
                </button>
                <button class="tool" data-tool="rectangle" onclick="enhancedMeasurements.setTool('rectangle')" title="Rectangular ROI">
                    <i class="fas fa-square"></i>
                    <span>Rectangle</span>
                </button>
            `;
            toolbar.appendChild(measurementGroup);
        }
    }

    setTool(tool) {
        this.currentTool = tool;
        this.finishCurrentMeasurement();
        
        // Update UI
        document.querySelectorAll('.measurement-tools .tool').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
        
        // Update cursor
        const canvas = document.getElementById('dicomCanvas');
        if (canvas) {
            canvas.style.cursor = 'crosshair';
        }
        
        this.showToolInstructions(tool);
    }

    showToolInstructions(tool) {
        const instructions = {
            'length': 'Click and drag to measure distance',
            'angle': 'Click three points to measure angle',
            'area': 'Click points to define area, double-click to close',
            'ellipse': 'Click and drag to create elliptical ROI',
            'rectangle': 'Click and drag to create rectangular ROI'
        };
        
        if (instructions[tool] && window.showToast) {
            window.showToast(instructions[tool], 'info');
        }
    }

    getCanvasPosition(event) {
        const canvas = event.target;
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    handleMouseDown(event) {
        if (!this.isActiveTool()) return;
        
        const pos = this.getCanvasPosition(event);
        this.isDrawing = true;
        
        switch (this.currentTool) {
            case 'length':
                this.startLengthMeasurement(pos);
                break;
            case 'angle':
                this.addAnglePoint(pos);
                break;
            case 'area':
                this.addAreaPoint(pos);
                break;
            case 'ellipse':
                this.startEllipseMeasurement(pos);
                break;
            case 'rectangle':
                this.startRectangleMeasurement(pos);
                break;
        }
    }

    handleMouseMove(event) {
        if (!this.isDrawing || !this.currentMeasurement) return;
        
        const pos = this.getCanvasPosition(event);
        
        switch (this.currentTool) {
            case 'length':
                this.updateLengthMeasurement(pos);
                break;
            case 'ellipse':
                this.updateEllipseMeasurement(pos);
                break;
            case 'rectangle':
                this.updateRectangleMeasurement(pos);
                break;
        }
        
        this.updateOverlay();
    }

    handleMouseUp(event) {
        if (!this.isDrawing) return;
        
        switch (this.currentTool) {
            case 'length':
                this.finishLengthMeasurement();
                break;
            case 'ellipse':
                this.finishEllipseMeasurement();
                break;
            case 'rectangle':
                this.finishRectangleMeasurement();
                break;
        }
        
        this.isDrawing = false;
    }

    handleDoubleClick(event) {
        if (this.currentTool === 'area' && this.currentMeasurement) {
            this.finishAreaMeasurement();
        }
    }

    // Length Measurement
    startLengthMeasurement(pos) {
        this.currentMeasurement = {
            type: 'length',
            id: Date.now(),
            start: pos,
            end: pos,
            imageId: this.getCurrentImageId()
        };
    }

    updateLengthMeasurement(pos) {
        if (this.currentMeasurement && this.currentMeasurement.type === 'length') {
            this.currentMeasurement.end = pos;
        }
    }

    finishLengthMeasurement() {
        if (this.currentMeasurement && this.currentMeasurement.type === 'length') {
            const distance = this.calculateDistance(this.currentMeasurement.start, this.currentMeasurement.end);
            this.currentMeasurement.distance = distance;
            this.measurements.push(this.currentMeasurement);
            this.currentMeasurement = null;
            this.updateMeasurementsList();
            this.updateOverlay();
        }
    }

    // Angle Measurement
    addAnglePoint(pos) {
        if (!this.currentMeasurement || this.currentMeasurement.type !== 'angle') {
            this.currentMeasurement = {
                type: 'angle',
                id: Date.now(),
                points: [pos],
                imageId: this.getCurrentImageId()
            };
        } else if (this.currentMeasurement.points.length < 3) {
            this.currentMeasurement.points.push(pos);
            
            if (this.currentMeasurement.points.length === 3) {
                this.finishAngleMeasurement();
            }
        }
        this.updateOverlay();
    }

    finishAngleMeasurement() {
        if (this.currentMeasurement && this.currentMeasurement.points.length === 3) {
            const angle = this.calculateAngle(
                this.currentMeasurement.points[0],
                this.currentMeasurement.points[1],
                this.currentMeasurement.points[2]
            );
            this.currentMeasurement.angle = angle;
            this.measurements.push(this.currentMeasurement);
            this.currentMeasurement = null;
            this.updateMeasurementsList();
            this.updateOverlay();
        }
    }

    // Area Measurement
    addAreaPoint(pos) {
        if (!this.currentMeasurement || this.currentMeasurement.type !== 'area') {
            this.currentMeasurement = {
                type: 'area',
                id: Date.now(),
                points: [pos],
                imageId: this.getCurrentImageId()
            };
        } else {
            this.currentMeasurement.points.push(pos);
        }
        this.updateOverlay();
    }

    finishAreaMeasurement() {
        if (this.currentMeasurement && this.currentMeasurement.points.length >= 3) {
            const area = this.calculatePolygonArea(this.currentMeasurement.points);
            this.currentMeasurement.area = area;
            this.measurements.push(this.currentMeasurement);
            this.currentMeasurement = null;
            this.updateMeasurementsList();
            this.updateOverlay();
        }
    }

    // Ellipse ROI
    startEllipseMeasurement(pos) {
        this.currentMeasurement = {
            type: 'ellipse',
            id: Date.now(),
            center: pos,
            radiusX: 0,
            radiusY: 0,
            imageId: this.getCurrentImageId()
        };
    }

    updateEllipseMeasurement(pos) {
        if (this.currentMeasurement && this.currentMeasurement.type === 'ellipse') {
            const dx = Math.abs(pos.x - this.currentMeasurement.center.x);
            const dy = Math.abs(pos.y - this.currentMeasurement.center.y);
            this.currentMeasurement.radiusX = dx;
            this.currentMeasurement.radiusY = dy;
        }
    }

    finishEllipseMeasurement() {
        if (this.currentMeasurement && this.currentMeasurement.type === 'ellipse') {
            const area = this.calculateEllipseArea(this.currentMeasurement.radiusX, this.currentMeasurement.radiusY);
            this.currentMeasurement.area = area;
            this.measurements.push(this.currentMeasurement);
            this.currentMeasurement = null;
            this.updateMeasurementsList();
            this.updateOverlay();
        }
    }

    // Rectangle ROI
    startRectangleMeasurement(pos) {
        this.currentMeasurement = {
            type: 'rectangle',
            id: Date.now(),
            start: pos,
            end: pos,
            imageId: this.getCurrentImageId()
        };
    }

    updateRectangleMeasurement(pos) {
        if (this.currentMeasurement && this.currentMeasurement.type === 'rectangle') {
            this.currentMeasurement.end = pos;
        }
    }

    finishRectangleMeasurement() {
        if (this.currentMeasurement && this.currentMeasurement.type === 'rectangle') {
            const width = Math.abs(this.currentMeasurement.end.x - this.currentMeasurement.start.x);
            const height = Math.abs(this.currentMeasurement.end.y - this.currentMeasurement.start.y);
            const area = this.calculateRectangleArea(width, height);
            this.currentMeasurement.area = area;
            this.currentMeasurement.width = width;
            this.currentMeasurement.height = height;
            this.measurements.push(this.currentMeasurement);
            this.currentMeasurement = null;
            this.updateMeasurementsList();
            this.updateOverlay();
        }
    }

    // Calculation Methods
    calculateDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const pixels = Math.sqrt(dx * dx + dy * dy);
        
        const mmX = pixels * this.pixelSpacing.x;
        const mmY = pixels * this.pixelSpacing.y;
        const mm = Math.sqrt(mmX * mmX + mmY * mmY);
        
        return {
            pixels: Math.round(pixels * 100) / 100,
            mm: Math.round(mm * 100) / 100,
            cm: Math.round(mm / 10 * 100) / 100
        };
    }

    calculateAngle(p1, p2, p3) {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        const cosAngle = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
        
        return Math.round(angle * 100) / 100;
    }

    calculatePolygonArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        area = Math.abs(area) / 2;
        
        const areaPixels = area;
        const areaMm2 = area * this.pixelSpacing.x * this.pixelSpacing.y;
        const areaCm2 = areaMm2 / 100;
        
        return {
            pixels: Math.round(areaPixels * 100) / 100,
            mm2: Math.round(areaMm2 * 100) / 100,
            cm2: Math.round(areaCm2 * 100) / 100
        };
    }

    calculateEllipseArea(radiusX, radiusY) {
        const areaPixels = Math.PI * radiusX * radiusY;
        const areaMm2 = areaPixels * this.pixelSpacing.x * this.pixelSpacing.y;
        const areaCm2 = areaMm2 / 100;
        
        return {
            pixels: Math.round(areaPixels * 100) / 100,
            mm2: Math.round(areaMm2 * 100) / 100,
            cm2: Math.round(areaCm2 * 100) / 100
        };
    }

    calculateRectangleArea(width, height) {
        const areaPixels = width * height;
        const areaMm2 = areaPixels * this.pixelSpacing.x * this.pixelSpacing.y;
        const areaCm2 = areaMm2 / 100;
        
        return {
            pixels: Math.round(areaPixels * 100) / 100,
            mm2: Math.round(areaMm2 * 100) / 100,
            cm2: Math.round(areaCm2 * 100) / 100
        };
    }

    // Rendering Methods
    updateOverlay() {
        const overlay = document.getElementById('measurementOverlay');
        if (!overlay) return;
        
        // Clear existing measurements
        overlay.innerHTML = '';
        
        // Draw completed measurements
        this.measurements.forEach((measurement, index) => {
            if (measurement.imageId === this.getCurrentImageId()) {
                this.drawMeasurement(overlay, measurement, false, index);
            }
        });
        
        // Draw current measurement being created
        if (this.currentMeasurement) {
            this.drawMeasurement(overlay, this.currentMeasurement, true);
        }
    }

    drawMeasurement(overlay, measurement, isTemp = false, index = -1) {
        switch (measurement.type) {
            case 'length':
                this.drawLengthMeasurement(overlay, measurement, isTemp, index);
                break;
            case 'angle':
                this.drawAngleMeasurement(overlay, measurement, isTemp, index);
                break;
            case 'area':
                this.drawAreaMeasurement(overlay, measurement, isTemp, index);
                break;
            case 'ellipse':
                this.drawEllipseMeasurement(overlay, measurement, isTemp, index);
                break;
            case 'rectangle':
                this.drawRectangleMeasurement(overlay, measurement, isTemp, index);
                break;
        }
    }

    drawLengthMeasurement(overlay, measurement, isTemp, index) {
        const line = document.createElement('div');
        line.className = `measurement-line ${isTemp ? 'temp' : ''}`;
        
        const dx = measurement.end.x - measurement.start.x;
        const dy = measurement.end.y - measurement.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        line.style.cssText = `
            position: absolute;
            left: ${measurement.start.x}px;
            top: ${measurement.start.y}px;
            width: ${length}px;
            height: 2px;
            background: ${isTemp ? '#ffaa00' : '#00d4ff'};
            transform-origin: 0 50%;
            transform: rotate(${angle}deg);
            pointer-events: none;
            z-index: 1000;
        `;
        
        overlay.appendChild(line);
        
        // Add measurement label
        const label = document.createElement('div');
        label.className = `measurement-label ${isTemp ? 'temp' : ''}`;
        
        let labelText = '';
        if (measurement.distance) {
            labelText = measurement.distance.mm !== undefined ? 
                `${measurement.distance.mm} mm` : 
                `${measurement.distance.pixels} px`;
        }
        
        label.style.cssText = `
            position: absolute;
            left: ${(measurement.start.x + measurement.end.x) / 2}px;
            top: ${(measurement.start.y + measurement.end.y) / 2 - 20}px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1001;
            transform: translate(-50%, 0);
        `;
        label.textContent = labelText;
        
        overlay.appendChild(label);
    }

    drawAngleMeasurement(overlay, measurement, isTemp, index) {
        if (measurement.points.length < 2) return;
        
        // Draw lines
        for (let i = 0; i < measurement.points.length - 1; i++) {
            const line = document.createElement('div');
            line.className = `measurement-line ${isTemp ? 'temp' : ''}`;
            
            const start = measurement.points[i];
            const end = measurement.points[i + 1];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            line.style.cssText = `
                position: absolute;
                left: ${start.x}px;
                top: ${start.y}px;
                width: ${length}px;
                height: 2px;
                background: ${isTemp ? '#ffaa00' : '#00d4ff'};
                transform-origin: 0 50%;
                transform: rotate(${angle}deg);
                pointer-events: none;
                z-index: 1000;
            `;
            
            overlay.appendChild(line);
        }
        
        // Draw points
        measurement.points.forEach((point, i) => {
            const dot = document.createElement('div');
            dot.className = `measurement-point ${isTemp ? 'temp' : ''}`;
            dot.style.cssText = `
                position: absolute;
                left: ${point.x - 3}px;
                top: ${point.y - 3}px;
                width: 6px;
                height: 6px;
                background: ${isTemp ? '#ffaa00' : '#00d4ff'};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1001;
            `;
            overlay.appendChild(dot);
        });
        
        // Add angle label if measurement is complete
        if (measurement.angle !== undefined && measurement.points.length === 3) {
            const label = document.createElement('div');
            label.className = `measurement-label ${isTemp ? 'temp' : ''}`;
            label.style.cssText = `
                position: absolute;
                left: ${measurement.points[1].x}px;
                top: ${measurement.points[1].y - 25}px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1001;
                transform: translate(-50%, 0);
            `;
            label.textContent = `${measurement.angle}°`;
            overlay.appendChild(label);
        }
    }

    drawAreaMeasurement(overlay, measurement, isTemp, index) {
        if (measurement.points.length < 2) return;
        
        // Create SVG for polygon
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const points = measurement.points.map(p => `${p.x},${p.y}`).join(' ');
        polygon.setAttribute('points', points);
        polygon.setAttribute('fill', isTemp ? 'rgba(255, 170, 0, 0.2)' : 'rgba(0, 212, 255, 0.2)');
        polygon.setAttribute('stroke', isTemp ? '#ffaa00' : '#00d4ff');
        polygon.setAttribute('stroke-width', '2');
        
        svg.appendChild(polygon);
        overlay.appendChild(svg);
        
        // Add area label
        if (measurement.area !== undefined) {
            const centerX = measurement.points.reduce((sum, p) => sum + p.x, 0) / measurement.points.length;
            const centerY = measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length;
            
            const label = document.createElement('div');
            label.className = `measurement-label ${isTemp ? 'temp' : ''}`;
            label.style.cssText = `
                position: absolute;
                left: ${centerX}px;
                top: ${centerY}px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1001;
                transform: translate(-50%, -50%);
            `;
            
            let labelText = '';
            if (measurement.area.mm2 !== undefined) {
                labelText = measurement.area.mm2 > 100 ? 
                    `${measurement.area.cm2} cm²` : 
                    `${measurement.area.mm2} mm²`;
            } else {
                labelText = `${measurement.area.pixels} px²`;
            }
            label.textContent = labelText;
            
            overlay.appendChild(label);
        }
    }

    drawEllipseMeasurement(overlay, measurement, isTemp, index) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        
        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.setAttribute('cx', measurement.center.x);
        ellipse.setAttribute('cy', measurement.center.y);
        ellipse.setAttribute('rx', measurement.radiusX);
        ellipse.setAttribute('ry', measurement.radiusY);
        ellipse.setAttribute('fill', isTemp ? 'rgba(255, 170, 0, 0.2)' : 'rgba(0, 212, 255, 0.2)');
        ellipse.setAttribute('stroke', isTemp ? '#ffaa00' : '#00d4ff');
        ellipse.setAttribute('stroke-width', '2');
        
        svg.appendChild(ellipse);
        overlay.appendChild(svg);
        
        // Add area label
        if (measurement.area !== undefined) {
            const label = document.createElement('div');
            label.className = `measurement-label ${isTemp ? 'temp' : ''}`;
            label.style.cssText = `
                position: absolute;
                left: ${measurement.center.x}px;
                top: ${measurement.center.y}px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1001;
                transform: translate(-50%, -50%);
            `;
            
            let labelText = '';
            if (measurement.area.mm2 !== undefined) {
                labelText = measurement.area.mm2 > 100 ? 
                    `${measurement.area.cm2} cm²` : 
                    `${measurement.area.mm2} mm²`;
            } else {
                labelText = `${measurement.area.pixels} px²`;
            }
            label.textContent = labelText;
            
            overlay.appendChild(label);
        }
    }

    drawRectangleMeasurement(overlay, measurement, isTemp, index) {
        const rect = document.createElement('div');
        rect.className = `measurement-rectangle ${isTemp ? 'temp' : ''}`;
        
        const left = Math.min(measurement.start.x, measurement.end.x);
        const top = Math.min(measurement.start.y, measurement.end.y);
        const width = Math.abs(measurement.end.x - measurement.start.x);
        const height = Math.abs(measurement.end.y - measurement.start.y);
        
        rect.style.cssText = `
            position: absolute;
            left: ${left}px;
            top: ${top}px;
            width: ${width}px;
            height: ${height}px;
            border: 2px solid ${isTemp ? '#ffaa00' : '#00d4ff'};
            background: ${isTemp ? 'rgba(255, 170, 0, 0.2)' : 'rgba(0, 212, 255, 0.2)'};
            pointer-events: none;
            z-index: 1000;
        `;
        
        overlay.appendChild(rect);
        
        // Add area label
        if (measurement.area !== undefined) {
            const label = document.createElement('div');
            label.className = `measurement-label ${isTemp ? 'temp' : ''}`;
            label.style.cssText = `
                position: absolute;
                left: ${left + width / 2}px;
                top: ${top + height / 2}px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1001;
                transform: translate(-50%, -50%);
            `;
            
            let labelText = '';
            if (measurement.area.mm2 !== undefined) {
                labelText = measurement.area.mm2 > 100 ? 
                    `${measurement.area.cm2} cm²` : 
                    `${measurement.area.mm2} mm²`;
            } else {
                labelText = `${measurement.area.pixels} px²`;
            }
            label.textContent = labelText;
            
            overlay.appendChild(label);
        }
    }

    // UI Methods
    updateMeasurementsList() {
        const list = document.getElementById('measurementsList');
        if (!list) return;
        
        list.innerHTML = '';
        
        this.measurements.forEach((measurement, index) => {
            const item = document.createElement('div');
            item.className = 'measurement-item';
            
            let displayText = '';
            switch (measurement.type) {
                case 'length':
                    displayText = measurement.distance ? 
                        (measurement.distance.mm ? `${measurement.distance.mm} mm` : `${measurement.distance.pixels} px`) :
                        'Length';
                    break;
                case 'angle':
                    displayText = measurement.angle ? `${measurement.angle}°` : 'Angle';
                    break;
                case 'area':
                case 'ellipse':
                case 'rectangle':
                    if (measurement.area) {
                        displayText = measurement.area.mm2 ? 
                            (measurement.area.mm2 > 100 ? `${measurement.area.cm2} cm²` : `${measurement.area.mm2} mm²`) :
                            `${measurement.area.pixels} px²`;
                    } else {
                        displayText = measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1);
                    }
                    break;
            }
            
            item.innerHTML = `
                <div>
                    <div>${measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1)} ${index + 1}</div>
                    <div class="measurement-value">${displayText}</div>
                </div>
                <button class="measurement-delete" onclick="enhancedMeasurements.deleteMeasurement(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            list.appendChild(item);
        });
    }

    // Utility Methods
    isActiveTool() {
        return ['length', 'angle', 'area', 'ellipse', 'rectangle'].includes(this.currentTool);
    }

    getCurrentImageId() {
        // Get current image ID from global state or return default
        return window.currentImageId || window.images?.[window.currentImageIndex]?.id || 'default';
    }

    finishCurrentMeasurement() {
        if (this.currentMeasurement) {
            this.currentMeasurement = null;
            this.isDrawing = false;
            this.updateOverlay();
        }
    }

    deleteMeasurement(index) {
        this.measurements.splice(index, 1);
        this.updateMeasurementsList();
        this.updateOverlay();
        
        if (window.showToast) {
            window.showToast('Measurement deleted', 'success');
        }
    }

    clearAll() {
        this.measurements = [];
        this.annotations = [];
        this.currentMeasurement = null;
        this.isDrawing = false;
        this.updateMeasurementsList();
        this.updateOverlay();
        
        if (window.showToast) {
            window.showToast('All measurements cleared', 'success');
        }
    }

    exportMeasurements() {
        const data = {
            measurements: this.measurements,
            annotations: this.annotations,
            pixelSpacing: this.pixelSpacing,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `measurements_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.showToast) {
            window.showToast('Measurements exported', 'success');
        }
    }
}

// Initialize enhanced measurement system
const enhancedMeasurements = new EnhancedMeasurementSystem();

// Export for global access
window.enhancedMeasurements = enhancedMeasurements;
window.EnhancedMeasurementSystem = EnhancedMeasurementSystem;

console.log('Enhanced DICOM Measurement System loaded successfully');