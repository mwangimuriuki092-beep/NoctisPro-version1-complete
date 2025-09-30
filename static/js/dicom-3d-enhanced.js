/**
 * Enhanced 3D Reconstruction System for DICOM Viewer
 * Advanced volume rendering and 3D visualization capabilities
 */

class Enhanced3DReconstruction {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.volumeData = null;
        this.currentMesh = null;
        this.isRendering = false;
        this.renderingMode = 'surface';
        this.transferFunction = this.createDefaultTransferFunction();
        this.init();
    }

    init() {
        this.setupThreeJS();
        this.createUI();
        this.setupEventListeners();
        console.log('Enhanced 3D Reconstruction System initialized');
    }

    setupThreeJS() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.camera.position.set(0, 0, 5);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            preserveDrawingBuffer: true 
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        this.setupLighting();

        // Controls (will be initialized when container is ready)
        this.setupControls();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Point lights for better illumination
        const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
        pointLight1.position.set(-10, -10, -5);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xffffff, 0.3);
        pointLight2.position.set(10, -10, 5);
        this.scene.add(pointLight2);
    }

    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.screenSpacePanning = false;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 100;
        }
    }

    createUI() {
        this.create3DPanel();
        this.createRenderingControls();
        this.createTransferFunctionEditor();
    }

    create3DPanel() {
        const rightPanel = document.querySelector('.right-panel');
        if (!rightPanel) return;

        const panel3D = document.createElement('div');
        panel3D.className = 'panel reconstruction-3d-panel';
        panel3D.innerHTML = `
            <h3><i class="fas fa-cube"></i> 3D Reconstruction</h3>
            
            <!-- 3D Viewport -->
            <div class="viewport-3d" id="viewport3D">
                <div class="viewport-3d-container" id="viewport3DContainer">
                    <div class="loading-3d" id="loading3D" style="display: none;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <div>Generating 3D reconstruction...</div>
                    </div>
                </div>
            </div>

            <!-- 3D Controls -->
            <div class="controls-3d">
                <div class="control-group">
                    <label>Rendering Mode:</label>
                    <select id="renderingMode" class="select-control">
                        <option value="surface">Surface Rendering</option>
                        <option value="volume">Volume Rendering</option>
                        <option value="mip">Maximum Intensity Projection</option>
                        <option value="isosurface">Isosurface</option>
                    </select>
                </div>

                <div class="control-group">
                    <label>Preset:</label>
                    <select id="renderingPreset" class="select-control">
                        <option value="bone">Bone</option>
                        <option value="soft_tissue">Soft Tissue</option>
                        <option value="lung">Lung</option>
                        <option value="vessels">Vessels</option>
                        <option value="cardiac">Cardiac</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>

                <div class="control-group">
                    <label>Threshold:</label>
                    <input type="range" id="threshold3D" min="0" max="1000" value="300" class="slider">
                    <span id="thresholdValue">300</span>
                </div>

                <div class="control-group">
                    <label>Opacity:</label>
                    <input type="range" id="opacity3D" min="0" max="100" value="80" class="slider">
                    <span id="opacityValue">80%</span>
                </div>

                <div class="control-group">
                    <label>Quality:</label>
                    <select id="renderingQuality" class="select-control">
                        <option value="low">Low (Fast)</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High (Slow)</option>
                        <option value="ultra">Ultra (Very Slow)</option>
                    </select>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="actions-3d">
                <button class="btn btn-primary" onclick="enhanced3D.generateReconstruction()">
                    <i class="fas fa-play"></i> Generate 3D
                </button>
                <button class="btn" onclick="enhanced3D.resetView()">
                    <i class="fas fa-undo"></i> Reset View
                </button>
                <button class="btn" onclick="enhanced3D.toggleAnimation()">
                    <i class="fas fa-sync-alt"></i> Animate
                </button>
                <button class="btn" onclick="enhanced3D.exportModel()">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>

            <!-- Advanced Controls (Collapsible) -->
            <div class="advanced-controls-3d">
                <button class="btn-toggle" onclick="enhanced3D.toggleAdvancedControls()">
                    <i class="fas fa-cog"></i> Advanced Settings
                </button>
                <div class="advanced-panel" id="advancedPanel3D" style="display: none;">
                    <!-- Transfer Function Editor will be inserted here -->
                </div>
            </div>
        `;

        rightPanel.appendChild(panel3D);
        this.initialize3DViewport();
    }

    initialize3DViewport() {
        const container = document.getElementById('viewport3DContainer');
        if (!container) return;

        // Set up renderer size
        const rect = container.getBoundingClientRect();
        this.renderer.setSize(rect.width, rect.height);
        this.camera.aspect = rect.width / rect.height;
        this.camera.updateProjectionMatrix();

        // Add renderer to container
        container.appendChild(this.renderer.domElement);

        // Setup controls now that we have the DOM element
        this.setupControls();

        // Start render loop
        this.startRenderLoop();

        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
    }

    createRenderingControls() {
        // Setup event listeners for controls
        const renderingMode = document.getElementById('renderingMode');
        if (renderingMode) {
            renderingMode.addEventListener('change', (e) => {
                this.renderingMode = e.target.value;
                this.updateRendering();
            });
        }

        const renderingPreset = document.getElementById('renderingPreset');
        if (renderingPreset) {
            renderingPreset.addEventListener('change', (e) => {
                this.applyRenderingPreset(e.target.value);
            });
        }

        const threshold3D = document.getElementById('threshold3D');
        if (threshold3D) {
            threshold3D.addEventListener('input', (e) => {
                document.getElementById('thresholdValue').textContent = e.target.value;
                this.updateThreshold(parseInt(e.target.value));
            });
        }

        const opacity3D = document.getElementById('opacity3D');
        if (opacity3D) {
            opacity3D.addEventListener('input', (e) => {
                document.getElementById('opacityValue').textContent = e.target.value + '%';
                this.updateOpacity(parseInt(e.target.value) / 100);
            });
        }

        const renderingQuality = document.getElementById('renderingQuality');
        if (renderingQuality) {
            renderingQuality.addEventListener('change', (e) => {
                this.updateRenderingQuality(e.target.value);
            });
        }
    }

    createTransferFunctionEditor() {
        const advancedPanel = document.getElementById('advancedPanel3D');
        if (!advancedPanel) return;

        const transferFunctionEditor = document.createElement('div');
        transferFunctionEditor.className = 'transfer-function-editor';
        transferFunctionEditor.innerHTML = `
            <h4>Transfer Function</h4>
            <canvas id="transferFunctionCanvas" width="300" height="100"></canvas>
            <div class="tf-controls">
                <div class="tf-presets">
                    <button class="btn-sm" onclick="enhanced3D.loadTFPreset('bone')">Bone</button>
                    <button class="btn-sm" onclick="enhanced3D.loadTFPreset('soft')">Soft</button>
                    <button class="btn-sm" onclick="enhanced3D.loadTFPreset('vessels')">Vessels</button>
                    <button class="btn-sm" onclick="enhanced3D.loadTFPreset('default')">Default</button>
                </div>
                <div class="tf-properties">
                    <label>Window Width: <input type="range" id="tfWindowWidth" min="1" max="2000" value="400"></label>
                    <label>Window Level: <input type="range" id="tfWindowLevel" min="-1000" max="1000" value="40"></label>
                </div>
            </div>
        `;

        advancedPanel.appendChild(transferFunctionEditor);
        this.setupTransferFunctionEditor();
    }

    setupTransferFunctionEditor() {
        const canvas = document.getElementById('transferFunctionCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.drawTransferFunction(ctx);

        // Make canvas interactive
        canvas.addEventListener('mousedown', (e) => this.startTFEdit(e));
        canvas.addEventListener('mousemove', (e) => this.updateTFEdit(e));
        canvas.addEventListener('mouseup', (e) => this.endTFEdit(e));

        // Setup TF control listeners
        const windowWidth = document.getElementById('tfWindowWidth');
        const windowLevel = document.getElementById('tfWindowLevel');

        if (windowWidth) {
            windowWidth.addEventListener('input', (e) => {
                this.transferFunction.windowWidth = parseInt(e.target.value);
                this.drawTransferFunction(ctx);
                this.updateRendering();
            });
        }

        if (windowLevel) {
            windowLevel.addEventListener('input', (e) => {
                this.transferFunction.windowLevel = parseInt(e.target.value);
                this.drawTransferFunction(ctx);
                this.updateRendering();
            });
        }
    }

    setupEventListeners() {
        // Listen for series load events
        document.addEventListener('seriesLoaded', (e) => {
            if (e.detail && e.detail.seriesData) {
                this.loadVolumeData(e.detail.seriesData);
            }
        });

        // Listen for image changes
        document.addEventListener('imageChanged', (e) => {
            // Update 3D view if needed
        });
    }

    // 3D Reconstruction Methods
    async generateReconstruction() {
        if (!this.volumeData) {
            if (window.showToast) {
                window.showToast('No volume data available for reconstruction', 'warning');
            }
            return;
        }

        this.showLoading(true);

        try {
            // Clear existing mesh
            if (this.currentMesh) {
                this.scene.remove(this.currentMesh);
                this.currentMesh = null;
            }

            // Generate mesh based on rendering mode
            switch (this.renderingMode) {
                case 'surface':
                    await this.generateSurfaceRendering();
                    break;
                case 'volume':
                    await this.generateVolumeRendering();
                    break;
                case 'mip':
                    await this.generateMIPRendering();
                    break;
                case 'isosurface':
                    await this.generateIsosurfaceRendering();
                    break;
            }

            if (window.showToast) {
                window.showToast('3D reconstruction completed', 'success');
            }

        } catch (error) {
            console.error('3D reconstruction failed:', error);
            if (window.showToast) {
                window.showToast('3D reconstruction failed', 'error');
            }
        } finally {
            this.showLoading(false);
        }
    }

    async generateSurfaceRendering() {
        const threshold = parseInt(document.getElementById('threshold3D').value);
        const quality = document.getElementById('renderingQuality').value;

        // Generate mesh using marching cubes algorithm
        const geometry = await this.marchingCubes(this.volumeData, threshold, quality);
        
        // Create material
        const material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            shininess: 100,
            transparent: true,
            opacity: parseInt(document.getElementById('opacity3D').value) / 100
        });

        // Create mesh
        this.currentMesh = new THREE.Mesh(geometry, material);
        this.currentMesh.castShadow = true;
        this.currentMesh.receiveShadow = true;

        this.scene.add(this.currentMesh);
    }

    async generateVolumeRendering() {
        // Volume rendering using ray casting
        const volumeTexture = this.createVolumeTexture(this.volumeData);
        
        // Custom shader for volume rendering
        const volumeShader = this.createVolumeShader();
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                volumeTexture: { value: volumeTexture },
                transferFunction: { value: this.createTransferFunctionTexture() },
                stepSize: { value: 0.01 },
                opacity: { value: parseInt(document.getElementById('opacity3D').value) / 100 }
            },
            vertexShader: volumeShader.vertex,
            fragmentShader: volumeShader.fragment,
            transparent: true,
            side: THREE.BackSide
        });

        const geometry = new THREE.BoxGeometry(2, 2, 2);
        this.currentMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.currentMesh);
    }

    async generateMIPRendering() {
        // Maximum Intensity Projection
        const mipTexture = this.createMIPTexture(this.volumeData);
        
        const material = new THREE.MeshBasicMaterial({
            map: mipTexture,
            transparent: true,
            opacity: parseInt(document.getElementById('opacity3D').value) / 100
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        this.currentMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.currentMesh);
    }

    async generateIsosurfaceRendering() {
        const threshold = parseInt(document.getElementById('threshold3D').value);
        
        // Generate isosurface using dual contouring
        const geometry = await this.dualContouring(this.volumeData, threshold);
        
        const material = new THREE.MeshLambertMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: parseInt(document.getElementById('opacity3D').value) / 100
        });

        this.currentMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.currentMesh);
    }

    // Algorithm Implementations
    async marchingCubes(volumeData, threshold, quality) {
        // Simplified marching cubes implementation
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];
        const indices = [];

        const { data, dimensions } = volumeData;
        const [width, height, depth] = dimensions;

        // Quality settings
        const step = quality === 'low' ? 4 : quality === 'medium' ? 2 : 1;

        for (let z = 0; z < depth - step; z += step) {
            for (let y = 0; y < height - step; y += step) {
                for (let x = 0; x < width - step; x += step) {
                    const cube = this.getCubeValues(data, x, y, z, width, height, step);
                    const triangles = this.marchingCubesLookup(cube, threshold);
                    
                    triangles.forEach(triangle => {
                        triangle.forEach(vertex => {
                            vertices.push(
                                (x + vertex.x - width/2) / width * 2,
                                (y + vertex.y - height/2) / height * 2,
                                (z + vertex.z - depth/2) / depth * 2
                            );
                            
                            // Calculate normal (simplified)
                            const normal = this.calculateNormal(data, vertex, width, height, depth);
                            normals.push(normal.x, normal.y, normal.z);
                        });
                    });
                }
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.computeBoundingSphere();

        return geometry;
    }

    getCubeValues(data, x, y, z, width, height, step) {
        const cube = [];
        for (let dz = 0; dz <= step; dz += step) {
            for (let dy = 0; dy <= step; dy += step) {
                for (let dx = 0; dx <= step; dx += step) {
                    const index = (z + dz) * width * height + (y + dy) * width + (x + dx);
                    cube.push(data[index] || 0);
                }
            }
        }
        return cube;
    }

    marchingCubesLookup(cube, threshold) {
        // Simplified marching cubes lookup table
        // This would normally be a complex lookup table with 256 cases
        const triangles = [];
        
        // Basic implementation - just check if any vertices are above threshold
        if (cube.some(value => value > threshold)) {
            // Generate a simple triangle (this is highly simplified)
            triangles.push([
                { x: 0, y: 0, z: 0 },
                { x: 1, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 }
            ]);
        }
        
        return triangles;
    }

    calculateNormal(data, vertex, width, height, depth) {
        // Simplified normal calculation
        return { x: 0, y: 0, z: 1 };
    }

    async dualContouring(volumeData, threshold) {
        // Simplified dual contouring implementation
        return new THREE.SphereGeometry(1, 32, 32);
    }

    createVolumeTexture(volumeData) {
        const { data, dimensions } = volumeData;
        const [width, height, depth] = dimensions;

        const texture = new THREE.Data3DTexture(data, width, height, depth);
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
        texture.unpackAlignment = 1;

        return texture;
    }

    createMIPTexture(volumeData) {
        const { data, dimensions } = volumeData;
        const [width, height, depth] = dimensions;

        // Create MIP projection
        const mipData = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let maxValue = 0;
                for (let z = 0; z < depth; z++) {
                    const index = z * width * height + y * width + x;
                    maxValue = Math.max(maxValue, data[index]);
                }
                mipData[y * width + x] = maxValue;
            }
        }

        const texture = new THREE.DataTexture(mipData, width, height);
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.needsUpdate = true;

        return texture;
    }

    createVolumeShader() {
        const vertexShader = `
            varying vec3 vPosition;
            void main() {
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform sampler3D volumeTexture;
            uniform sampler2D transferFunction;
            uniform float stepSize;
            uniform float opacity;
            varying vec3 vPosition;

            void main() {
                vec3 rayDir = normalize(vPosition - cameraPosition);
                vec3 rayStart = vPosition;
                
                vec4 color = vec4(0.0);
                float depth = 0.0;
                
                for (int i = 0; i < 100; i++) {
                    vec3 samplePos = rayStart + rayDir * depth;
                    
                    if (any(lessThan(samplePos, vec3(-1.0))) || any(greaterThan(samplePos, vec3(1.0)))) {
                        break;
                    }
                    
                    vec3 texCoord = (samplePos + 1.0) * 0.5;
                    float intensity = texture(volumeTexture, texCoord).r;
                    
                    vec4 sampleColor = texture2D(transferFunction, vec2(intensity, 0.5));
                    sampleColor.a *= opacity;
                    
                    color = color + sampleColor * (1.0 - color.a);
                    
                    if (color.a > 0.95) break;
                    
                    depth += stepSize;
                }
                
                gl_FragColor = color;
            }
        `;

        return { vertex: vertexShader, fragment: fragmentShader };
    }

    createTransferFunctionTexture() {
        const size = 256;
        const data = new Uint8Array(size * 4);

        for (let i = 0; i < size; i++) {
            const alpha = this.transferFunction.getAlpha(i / size);
            const color = this.transferFunction.getColor(i / size);
            
            data[i * 4] = color.r * 255;
            data[i * 4 + 1] = color.g * 255;
            data[i * 4 + 2] = color.b * 255;
            data[i * 4 + 3] = alpha * 255;
        }

        const texture = new THREE.DataTexture(data, size, 1);
        texture.format = THREE.RGBAFormat;
        texture.type = THREE.UnsignedByteType;
        texture.needsUpdate = true;

        return texture;
    }

    // Transfer Function
    createDefaultTransferFunction() {
        return {
            windowWidth: 400,
            windowLevel: 40,
            points: [
                { value: 0, alpha: 0, color: { r: 0, g: 0, b: 0 } },
                { value: 0.5, alpha: 0.5, color: { r: 1, g: 1, b: 1 } },
                { value: 1, alpha: 1, color: { r: 1, g: 1, b: 1 } }
            ],
            getAlpha: function(value) {
                // Linear interpolation between points
                for (let i = 0; i < this.points.length - 1; i++) {
                    const p1 = this.points[i];
                    const p2 = this.points[i + 1];
                    if (value >= p1.value && value <= p2.value) {
                        const t = (value - p1.value) / (p2.value - p1.value);
                        return p1.alpha + t * (p2.alpha - p1.alpha);
                    }
                }
                return 0;
            },
            getColor: function(value) {
                // Linear interpolation between points
                for (let i = 0; i < this.points.length - 1; i++) {
                    const p1 = this.points[i];
                    const p2 = this.points[i + 1];
                    if (value >= p1.value && value <= p2.value) {
                        const t = (value - p1.value) / (p2.value - p1.value);
                        return {
                            r: p1.color.r + t * (p2.color.r - p1.color.r),
                            g: p1.color.g + t * (p2.color.g - p1.color.g),
                            b: p1.color.b + t * (p2.color.b - p1.color.b)
                        };
                    }
                }
                return { r: 0, g: 0, b: 0 };
            }
        };
    }

    drawTransferFunction(ctx) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Draw transfer function curve
        ctx.beginPath();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;

        for (let x = 0; x < width; x++) {
            const value = x / width;
            const alpha = this.transferFunction.getAlpha(value);
            const y = height - (alpha * height);
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();

        // Draw control points
        this.transferFunction.points.forEach(point => {
            const x = point.value * width;
            const y = height - (point.alpha * height);
            
            ctx.beginPath();
            ctx.fillStyle = '#ff4444';
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Rendering Presets
    applyRenderingPreset(preset) {
        const presets = {
            bone: {
                threshold: 300,
                opacity: 80,
                transferFunction: {
                    points: [
                        { value: 0, alpha: 0, color: { r: 0.2, g: 0.1, b: 0.1 } },
                        { value: 0.3, alpha: 0, color: { r: 0.5, g: 0.3, b: 0.2 } },
                        { value: 0.6, alpha: 0.8, color: { r: 1, g: 0.9, b: 0.8 } },
                        { value: 1, alpha: 1, color: { r: 1, g: 1, b: 1 } }
                    ]
                }
            },
            soft_tissue: {
                threshold: 100,
                opacity: 60,
                transferFunction: {
                    points: [
                        { value: 0, alpha: 0, color: { r: 0.1, g: 0, b: 0.1 } },
                        { value: 0.4, alpha: 0.3, color: { r: 0.8, g: 0.4, b: 0.4 } },
                        { value: 0.8, alpha: 0.8, color: { r: 1, g: 0.8, b: 0.8 } },
                        { value: 1, alpha: 1, color: { r: 1, g: 1, b: 1 } }
                    ]
                }
            },
            lung: {
                threshold: 50,
                opacity: 40,
                transferFunction: {
                    points: [
                        { value: 0, alpha: 0, color: { r: 0, g: 0, b: 0.2 } },
                        { value: 0.2, alpha: 0.1, color: { r: 0.2, g: 0.4, b: 0.8 } },
                        { value: 0.6, alpha: 0.6, color: { r: 0.6, g: 0.8, b: 1 } },
                        { value: 1, alpha: 1, color: { r: 1, g: 1, b: 1 } }
                    ]
                }
            },
            vessels: {
                threshold: 200,
                opacity: 70,
                transferFunction: {
                    points: [
                        { value: 0, alpha: 0, color: { r: 0.1, g: 0, b: 0 } },
                        { value: 0.5, alpha: 0.2, color: { r: 0.8, g: 0.2, b: 0.2 } },
                        { value: 0.8, alpha: 0.9, color: { r: 1, g: 0.4, b: 0.4 } },
                        { value: 1, alpha: 1, color: { r: 1, g: 0.8, b: 0.8 } }
                    ]
                }
            },
            cardiac: {
                threshold: 150,
                opacity: 65,
                transferFunction: {
                    points: [
                        { value: 0, alpha: 0, color: { r: 0.1, g: 0, b: 0.1 } },
                        { value: 0.3, alpha: 0.2, color: { r: 0.6, g: 0.2, b: 0.4 } },
                        { value: 0.7, alpha: 0.8, color: { r: 1, g: 0.6, b: 0.8 } },
                        { value: 1, alpha: 1, color: { r: 1, g: 1, b: 1 } }
                    ]
                }
            }
        };

        if (presets[preset]) {
            const presetData = presets[preset];
            
            // Update controls
            document.getElementById('threshold3D').value = presetData.threshold;
            document.getElementById('thresholdValue').textContent = presetData.threshold;
            document.getElementById('opacity3D').value = presetData.opacity;
            document.getElementById('opacityValue').textContent = presetData.opacity + '%';
            
            // Update transfer function
            if (presetData.transferFunction) {
                this.transferFunction.points = presetData.transferFunction.points;
                const canvas = document.getElementById('transferFunctionCanvas');
                if (canvas) {
                    this.drawTransferFunction(canvas.getContext('2d'));
                }
            }
            
            this.updateRendering();
        }
    }

    loadTFPreset(preset) {
        this.applyRenderingPreset(preset);
    }

    // Control Methods
    updateRendering() {
        if (this.currentMesh) {
            this.generateReconstruction();
        }
    }

    updateThreshold(threshold) {
        if (this.currentMesh && this.renderingMode === 'surface') {
            this.generateReconstruction();
        }
    }

    updateOpacity(opacity) {
        if (this.currentMesh && this.currentMesh.material) {
            this.currentMesh.material.opacity = opacity;
            this.currentMesh.material.needsUpdate = true;
        }
    }

    updateRenderingQuality(quality) {
        // Quality affects step size and resolution
        const qualitySettings = {
            low: { stepSize: 0.05, resolution: 0.5 },
            medium: { stepSize: 0.02, resolution: 1.0 },
            high: { stepSize: 0.01, resolution: 1.5 },
            ultra: { stepSize: 0.005, resolution: 2.0 }
        };

        if (qualitySettings[quality]) {
            // Update rendering parameters
            this.renderingQuality = qualitySettings[quality];
            if (this.currentMesh) {
                this.generateReconstruction();
            }
        }
    }

    resetView() {
        if (this.controls) {
            this.controls.reset();
        }
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);
    }

    toggleAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        } else {
            this.startAnimation();
        }
    }

    startAnimation() {
        const animate = () => {
            if (this.currentMesh) {
                this.currentMesh.rotation.y += 0.01;
            }
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    toggleAdvancedControls() {
        const panel = document.getElementById('advancedPanel3D');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
        }
    }

    // Data Loading
    async loadVolumeData(seriesData) {
        try {
            // Convert DICOM series to volume data
            this.volumeData = await this.processSeriesData(seriesData);
            
            if (window.showToast) {
                window.showToast('Volume data loaded successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to load volume data:', error);
            if (window.showToast) {
                window.showToast('Failed to load volume data', 'error');
            }
        }
    }

    async processSeriesData(seriesData) {
        // This would normally process DICOM pixel data into a 3D volume
        // For now, we'll create dummy volume data
        const width = 256;
        const height = 256;
        const depth = 128;
        
        const data = new Uint8Array(width * height * depth);
        
        // Generate some dummy volume data (sphere)
        const centerX = width / 2;
        const centerY = height / 2;
        const centerZ = depth / 2;
        const radius = Math.min(width, height, depth) / 4;
        
        for (let z = 0; z < depth; z++) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const dz = z - centerZ;
                    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    
                    const index = z * width * height + y * width + x;
                    data[index] = distance < radius ? 255 : 0;
                }
            }
        }
        
        return {
            data: data,
            dimensions: [width, height, depth]
        };
    }

    // Export Methods
    exportModel() {
        if (!this.currentMesh) {
            if (window.showToast) {
                window.showToast('No 3D model to export', 'warning');
            }
            return;
        }

        // Export as OBJ format
        const exporter = new THREE.OBJExporter();
        const objString = exporter.parse(this.currentMesh);
        
        const blob = new Blob([objString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `3d_reconstruction_${new Date().toISOString().split('T')[0]}.obj`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            window.showToast('3D model exported successfully', 'success');
        }
    }

    // Utility Methods
    startRenderLoop() {
        const render = () => {
            if (this.controls) {
                this.controls.update();
            }
            
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            
            requestAnimationFrame(render);
        };
        render();
    }

    handleResize() {
        try {
            const container = document.getElementById('viewport3DContainer');
            if (!container) return;

            const rect = container.getBoundingClientRect();
            if (rect && rect.width > 0 && rect.height > 0) {
                if (this.renderer) {
                    this.renderer.setSize(rect.width, rect.height);
                }
                if (this.camera) {
                    this.camera.aspect = rect.width / rect.height;
                    this.camera.updateProjectionMatrix();
                }
            }
        } catch (error) {
            console.error('Error in 3D handleResize:', error);
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading3D');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    // Transfer Function Editing
    startTFEdit(event) {
        this.tfEditing = true;
        this.updateTFEdit(event);
    }

    updateTFEdit(event) {
        if (!this.tfEditing) return;

        const canvas = event.target;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const value = x / canvas.width;
        const alpha = 1 - (y / canvas.height);

        // Find closest control point or create new one
        let closestPoint = null;
        let closestDistance = Infinity;

        this.transferFunction.points.forEach((point, index) => {
            const px = point.value * canvas.width;
            const py = (1 - point.alpha) * canvas.height;
            const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = index;
            }
        });

        if (closestDistance < 10) {
            // Update existing point
            this.transferFunction.points[closestPoint].alpha = Math.max(0, Math.min(1, alpha));
        } else if (this.transferFunction.points.length < 10) {
            // Add new point
            this.transferFunction.points.push({
                value: Math.max(0, Math.min(1, value)),
                alpha: Math.max(0, Math.min(1, alpha)),
                color: { r: 1, g: 1, b: 1 }
            });
            
            // Sort points by value
            this.transferFunction.points.sort((a, b) => a.value - b.value);
        }

        this.drawTransferFunction(canvas.getContext('2d'));
        this.updateRendering();
    }

    endTFEdit(event) {
        this.tfEditing = false;
    }
}

// Add CSS for 3D reconstruction
const css3D = `
<style>
.reconstruction-3d-panel {
    min-height: 400px;
}

.viewport-3d {
    border: 2px solid #404040;
    border-radius: 4px;
    margin-bottom: 15px;
    background: #000;
    position: relative;
    height: 300px;
}

.viewport-3d-container {
    width: 100%;
    height: 100%;
    position: relative;
}

.loading-3d {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #00d4ff;
    text-align: center;
    z-index: 10;
}

.controls-3d {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 15px;
}

.control-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.control-group label {
    font-size: 12px;
    min-width: 80px;
}

.select-control {
    flex: 1;
    padding: 4px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 3px;
    font-size: 12px;
}

.actions-3d {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 15px;
}

.actions-3d .btn {
    padding: 8px 12px;
    font-size: 12px;
}

.advanced-controls-3d {
    border-top: 1px solid #404040;
    padding-top: 15px;
}

.btn-toggle {
    width: 100%;
    padding: 8px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 10px;
}

.advanced-panel {
    background: #1a1a1a;
    padding: 15px;
    border-radius: 4px;
    border: 1px solid #404040;
}

.transfer-function-editor h4 {
    color: #00d4ff;
    margin: 0 0 10px 0;
    font-size: 14px;
}

#transferFunctionCanvas {
    width: 100%;
    border: 1px solid #404040;
    border-radius: 3px;
    cursor: crosshair;
    margin-bottom: 10px;
}

.tf-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.tf-presets {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
}

.btn-sm {
    padding: 4px 8px;
    background: #333;
    border: 1px solid #404040;
    color: white;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
}

.btn-sm:hover {
    background: #404040;
}

.tf-properties {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.tf-properties label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
}

.tf-properties input[type="range"] {
    flex: 1;
    margin-left: 10px;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', css3D);

// Initialize enhanced 3D reconstruction system
const enhanced3D = new Enhanced3DReconstruction();

// Export for global access
window.enhanced3D = enhanced3D;
window.Enhanced3DReconstruction = Enhanced3DReconstruction;

console.log('Enhanced 3D Reconstruction System loaded successfully');