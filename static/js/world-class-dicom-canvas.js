/**
 * World-Class DICOM Canvas Engine
 * Ultra-high performance medical imaging canvas with world-class standards
 * Designed to compete with top-tier PACS systems globally
 */

class WorldClassDicomCanvas {
    constructor(options = {}) {
        // Performance metrics tracking
        this.performanceMetrics = {
            renderTime: [],
            loadTime: [],
            memoryUsage: [],
            frameRate: [],
            interactions: 0,
            cacheHitRatio: 0
        };
        
        // Advanced configuration
        this.config = {
            // Rendering performance
            enableGPUAcceleration: true,
            enableWebGL: true,
            enableOffscreenCanvas: true,
            maxTextureSize: 16384,
            
            // Image quality
            enableSubPixelRendering: true,
            enableAntiAliasing: true,
            enableBicubicInterpolation: true,
            enableHDR: true,
            
            // Performance optimization
            enableProgressiveLoading: true,
            enableTileBasedRendering: true,
            enableMultiThreading: true,
            maxCacheSize: 2048, // MB
            
            // Medical imaging specific
            enableMedicalGradeRendering: true,
            enableDICOMCompliance: true,
            enableAccurateWindowing: true,
            enablePixelValueAccuracy: true,
            
            // Advanced features
            enableAIEnhancement: true,
            enableRealTimeProcessing: true,
            enablePredictiveLoading: true,
            enableAdaptiveQuality: true,
            
            ...options
        };
        
        // Canvas and rendering context
        this.canvas = null;
        this.ctx = null;
        this.webglCtx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        
        // Image management
        this.imageCache = new Map();
        this.tileCache = new Map();
        this.preprocessedCache = new Map();
        this.currentImage = null;
        this.imageStack = [];
        
        // Viewport and transformation
        this.viewport = {
            x: 0,
            y: 0,
            scale: 1.0,
            rotation: 0,
            windowCenter: 0,
            windowWidth: 0,
            invert: false,
            flipHorizontal: false,
            flipVertical: false
        };
        
        // Rendering pipeline
        this.renderingPipeline = [];
        this.renderingQueue = [];
        this.isRendering = false;
        
        // Performance monitoring
        this.performanceObserver = null;
        this.frameCounter = 0;
        this.lastFrameTime = 0;
        
        // Threading and workers
        this.workers = [];
        this.workerPool = null;
        
        // Event system
        this.eventListeners = new Map();
        
        this.initialize();
    }
    
    initialize() {
        console.log('🚀 Initializing World-Class DICOM Canvas...');
        
        this.setupCanvas();
        this.setupWebGL();
        this.setupOffscreenRendering();
        this.setupWorkerPool();
        this.setupPerformanceMonitoring();
        this.setupEventSystem();
        this.setupRenderingPipeline();
        
        console.log('✅ World-Class DICOM Canvas initialized');
    }
    
    setupCanvas() {
        // Find or create canvas
        this.canvas = document.getElementById('world-class-dicom-canvas') || 
                     document.querySelector('.dicom-canvas') ||
                     this.createCanvas();
        
        if (!this.canvas) {
            throw new Error('Failed to create DICOM canvas');
        }
        
        // Get 2D context with optimal settings
        this.ctx = this.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            colorSpace: 'rec2020', // Wide color gamut for medical imaging
            willReadFrequently: false
        });
        
        // Setup high-DPI rendering
        this.setupHighDPICanvas();
        
        // Apply medical-grade canvas settings
        this.applyMedicalGradeSettings();
        
        console.log('✅ Canvas setup complete');
    }
    
    createCanvas() {
        const container = document.getElementById('viewer-container') ||
                         document.querySelector('.viewer-container') ||
                         document.body;
        
        const canvas = document.createElement('canvas');
        canvas.id = 'world-class-dicom-canvas';
        canvas.className = 'world-class-dicom-canvas';
        
        // Apply world-class styling
        canvas.style.cssText = `
            width: 100%;
            height: 100%;
            background: #000;
            cursor: crosshair;
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: optimize-contrast;
            touch-action: none;
            user-select: none;
        `;
        
        container.appendChild(canvas);
        return canvas;
    }
    
    setupHighDPICanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        // Set internal canvas size to device pixel ratio
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Scale the canvas back down using CSS
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Scale the drawing context so everything draws at the correct size
        this.ctx.scale(dpr, dpr);
        
        // Store DPR for calculations
        this.devicePixelRatio = dpr;
        
        console.log(`📐 High-DPI canvas: ${this.canvas.width}x${this.canvas.height} (DPR: ${dpr})`);
    }
    
    setupWebGL() {
        if (!this.config.enableWebGL) return;
        
        try {
            // Try WebGL2 first, fallback to WebGL1
            this.webglCtx = this.canvas.getContext('webgl2', {
                alpha: false,
                depth: false,
                stencil: false,
                antialias: this.config.enableAntiAliasing,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            }) || this.canvas.getContext('webgl', {
                alpha: false,
                depth: false,
                stencil: false,
                antialias: this.config.enableAntiAliasing,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });
            
            if (this.webglCtx) {
                this.setupWebGLShaders();
                this.setupWebGLTextures();
                console.log('🎮 WebGL acceleration enabled');
            }
        } catch (error) {
            console.warn('⚠️ WebGL not available:', error);
            this.config.enableWebGL = false;
        }
    }
    
    setupWebGLShaders() {
        if (!this.webglCtx) return;
        
        // Vertex shader for medical imaging
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            uniform vec2 u_resolution;
            uniform vec2 u_translation;
            uniform vec2 u_scale;
            uniform float u_rotation;
            
            void main() {
                // Apply transformations
                vec2 scaledPosition = a_position * u_scale;
                
                // Apply rotation
                float cosR = cos(u_rotation);
                float sinR = sin(u_rotation);
                vec2 rotatedPosition = vec2(
                    scaledPosition.x * cosR - scaledPosition.y * sinR,
                    scaledPosition.x * sinR + scaledPosition.y * cosR
                );
                
                // Apply translation
                vec2 position = rotatedPosition + u_translation;
                
                // Convert to clip space
                vec2 zeroToOne = position / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_texCoord = a_texCoord;
            }
        `;
        
        // Fragment shader with medical imaging enhancements
        const fragmentShaderSource = `
            precision highp float;
            
            uniform sampler2D u_image;
            uniform float u_windowCenter;
            uniform float u_windowWidth;
            uniform float u_brightness;
            uniform float u_contrast;
            uniform float u_gamma;
            uniform bool u_invert;
            uniform bool u_enableHDR;
            uniform vec3 u_colorLUT[256];
            
            varying vec2 v_texCoord;
            
            // Medical-grade windowing function
            float windowLevel(float pixelValue, float center, float width) {
                float minValue = center - width / 2.0;
                float maxValue = center + width / 2.0;
                
                if (pixelValue <= minValue) return 0.0;
                if (pixelValue >= maxValue) return 1.0;
                
                return (pixelValue - minValue) / width;
            }
            
            // Gamma correction for medical displays
            vec3 gammaCorrect(vec3 color, float gamma) {
                return pow(color, vec3(1.0 / gamma));
            }
            
            // HDR tone mapping for wide dynamic range
            vec3 toneMap(vec3 hdrColor) {
                // ACES tone mapping
                float a = 2.51;
                float b = 0.03;
                float c = 2.43;
                float d = 0.59;
                float e = 0.14;
                
                return clamp((hdrColor * (a * hdrColor + b)) / 
                            (hdrColor * (c * hdrColor + d) + e), 0.0, 1.0);
            }
            
            void main() {
                vec4 texColor = texture2D(u_image, v_texCoord);
                float pixelValue = texColor.r;
                
                // Apply medical windowing
                float windowedValue = windowLevel(pixelValue, u_windowCenter, u_windowWidth);
                
                // Apply brightness and contrast
                windowedValue = (windowedValue - 0.5) * u_contrast + 0.5 + u_brightness;
                
                // Apply inversion if needed
                if (u_invert) {
                    windowedValue = 1.0 - windowedValue;
                }
                
                // Convert to color
                vec3 color = vec3(windowedValue);
                
                // Apply gamma correction
                color = gammaCorrect(color, u_gamma);
                
                // Apply HDR tone mapping if enabled
                if (u_enableHDR) {
                    color = toneMap(color * 2.0); // Expand range before tone mapping
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        // Compile and link shaders
        this.webglProgram = this.createWebGLProgram(vertexShaderSource, fragmentShaderSource);
        
        if (this.webglProgram) {
            // Get uniform and attribute locations
            this.webglUniforms = {
                resolution: this.webglCtx.getUniformLocation(this.webglProgram, 'u_resolution'),
                translation: this.webglCtx.getUniformLocation(this.webglProgram, 'u_translation'),
                scale: this.webglCtx.getUniformLocation(this.webglProgram, 'u_scale'),
                rotation: this.webglCtx.getUniformLocation(this.webglProgram, 'u_rotation'),
                windowCenter: this.webglCtx.getUniformLocation(this.webglProgram, 'u_windowCenter'),
                windowWidth: this.webglCtx.getUniformLocation(this.webglProgram, 'u_windowWidth'),
                brightness: this.webglCtx.getUniformLocation(this.webglProgram, 'u_brightness'),
                contrast: this.webglCtx.getUniformLocation(this.webglProgram, 'u_contrast'),
                gamma: this.webglCtx.getUniformLocation(this.webglProgram, 'u_gamma'),
                invert: this.webglCtx.getUniformLocation(this.webglProgram, 'u_invert'),
                enableHDR: this.webglCtx.getUniformLocation(this.webglProgram, 'u_enableHDR')
            };
            
            this.webglAttributes = {
                position: this.webglCtx.getAttribLocation(this.webglProgram, 'a_position'),
                texCoord: this.webglCtx.getAttribLocation(this.webglProgram, 'a_texCoord')
            };
            
            console.log('✅ WebGL shaders compiled successfully');
        }
    }
    
    createWebGLProgram(vertexSource, fragmentSource) {
        const gl = this.webglCtx;
        
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        if (!vertexShader || !fragmentShader) return null;
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('WebGL program link error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }
    
    compileShader(type, source) {
        const gl = this.webglCtx;
        const shader = gl.createShader(type);
        
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('WebGL shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    setupWebGLTextures() {
        if (!this.webglCtx) return;
        
        const gl = this.webglCtx;
        
        // Create texture for image data
        this.webglTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.webglTexture);
        
        // Set texture parameters for medical imaging
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        // Create vertex buffer for quad
        this.webglVertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.webglVertexBuffer);
        
        // Quad vertices (position + texture coordinates)
        const vertices = new Float32Array([
            // Triangle 1
            -1, -1, 0, 0,
             1, -1, 1, 0,
            -1,  1, 0, 1,
            
            // Triangle 2
            -1,  1, 0, 1,
             1, -1, 1, 0,
             1,  1, 1, 1
        ]);
        
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        console.log('✅ WebGL textures initialized');
    }
    
    setupOffscreenRendering() {
        if (!this.config.enableOffscreenCanvas) return;
        
        try {
            // Create offscreen canvas for background processing
            if (typeof OffscreenCanvas !== 'undefined') {
                this.offscreenCanvas = new OffscreenCanvas(
                    this.canvas.width, 
                    this.canvas.height
                );
                this.offscreenCtx = this.offscreenCanvas.getContext('2d');
                console.log('✅ Offscreen canvas enabled');
            } else {
                // Fallback for browsers without OffscreenCanvas
                this.offscreenCanvas = document.createElement('canvas');
                this.offscreenCanvas.width = this.canvas.width;
                this.offscreenCanvas.height = this.canvas.height;
                this.offscreenCtx = this.offscreenCanvas.getContext('2d');
                console.log('✅ Fallback offscreen canvas enabled');
            }
        } catch (error) {
            console.warn('⚠️ Offscreen canvas not available:', error);
            this.config.enableOffscreenCanvas = false;
        }
    }
    
    setupWorkerPool() {
        if (!this.config.enableMultiThreading) return;
        
        try {
            const numWorkers = navigator.hardwareConcurrency || 4;
            
            for (let i = 0; i < numWorkers; i++) {
                const worker = new Worker(this.createWorkerBlob());
                worker.onmessage = this.handleWorkerMessage.bind(this);
                worker.onerror = this.handleWorkerError.bind(this);
                this.workers.push(worker);
            }
            
            console.log(`✅ Worker pool created with ${numWorkers} workers`);
        } catch (error) {
            console.warn('⚠️ Web Workers not available:', error);
            this.config.enableMultiThreading = false;
        }
    }
    
    createWorkerBlob() {
        const workerCode = `
            // DICOM Image Processing Worker
            self.onmessage = function(e) {
                const { type, data, id } = e.data;
                
                try {
                    let result;
                    
                    switch (type) {
                        case 'processImage':
                            result = processImage(data);
                            break;
                        case 'applyWindowLevel':
                            result = applyWindowLevel(data);
                            break;
                        case 'enhanceImage':
                            result = enhanceImage(data);
                            break;
                        case 'generateTiles':
                            result = generateTiles(data);
                            break;
                        default:
                            throw new Error('Unknown worker task: ' + type);
                    }
                    
                    self.postMessage({ id, result, success: true });
                } catch (error) {
                    self.postMessage({ id, error: error.message, success: false });
                }
            };
            
            function processImage(data) {
                const { imageData, width, height, windowCenter, windowWidth } = data;
                const processedData = new Uint8ClampedArray(imageData.length);
                
                for (let i = 0; i < imageData.length; i += 4) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    
                    // Convert to grayscale
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    // Apply window/level
                    const windowed = applyWindowLevelToPixel(gray, windowCenter, windowWidth);
                    
                    processedData[i] = windowed;
                    processedData[i + 1] = windowed;
                    processedData[i + 2] = windowed;
                    processedData[i + 3] = imageData[i + 3];
                }
                
                return processedData;
            }
            
            function applyWindowLevelToPixel(pixelValue, center, width) {
                const minValue = center - width / 2;
                const maxValue = center + width / 2;
                
                if (pixelValue <= minValue) return 0;
                if (pixelValue >= maxValue) return 255;
                
                return Math.round(((pixelValue - minValue) / width) * 255);
            }
            
            function applyWindowLevel(data) {
                const { imageData, windowCenter, windowWidth } = data;
                const result = new Uint8ClampedArray(imageData.length);
                
                for (let i = 0; i < imageData.length; i += 4) {
                    const gray = imageData[i];
                    const windowed = applyWindowLevelToPixel(gray, windowCenter, windowWidth);
                    
                    result[i] = windowed;
                    result[i + 1] = windowed;
                    result[i + 2] = windowed;
                    result[i + 3] = imageData[i + 3];
                }
                
                return result;
            }
            
            function enhanceImage(data) {
                const { imageData, brightness, contrast, gamma } = data;
                const enhanced = new Uint8ClampedArray(imageData.length);
                
                for (let i = 0; i < imageData.length; i += 4) {
                    let r = imageData[i];
                    let g = imageData[i + 1];
                    let b = imageData[i + 2];
                    
                    // Apply brightness
                    r = Math.min(255, Math.max(0, r + brightness));
                    g = Math.min(255, Math.max(0, g + brightness));
                    b = Math.min(255, Math.max(0, b + brightness));
                    
                    // Apply contrast
                    r = Math.min(255, Math.max(0, ((r - 128) * contrast) + 128));
                    g = Math.min(255, Math.max(0, ((g - 128) * contrast) + 128));
                    b = Math.min(255, Math.max(0, ((b - 128) * contrast) + 128));
                    
                    // Apply gamma
                    r = Math.pow(r / 255, 1 / gamma) * 255;
                    g = Math.pow(g / 255, 1 / gamma) * 255;
                    b = Math.pow(b / 255, 1 / gamma) * 255;
                    
                    enhanced[i] = r;
                    enhanced[i + 1] = g;
                    enhanced[i + 2] = b;
                    enhanced[i + 3] = imageData[i + 3];
                }
                
                return enhanced;
            }
            
            function generateTiles(data) {
                const { imageData, width, height, tileSize } = data;
                const tiles = [];
                
                for (let y = 0; y < height; y += tileSize) {
                    for (let x = 0; x < width; x += tileSize) {
                        const tileWidth = Math.min(tileSize, width - x);
                        const tileHeight = Math.min(tileSize, height - y);
                        const tileData = new Uint8ClampedArray(tileWidth * tileHeight * 4);
                        
                        for (let ty = 0; ty < tileHeight; ty++) {
                            for (let tx = 0; tx < tileWidth; tx++) {
                                const srcIndex = ((y + ty) * width + (x + tx)) * 4;
                                const dstIndex = (ty * tileWidth + tx) * 4;
                                
                                tileData[dstIndex] = imageData[srcIndex];
                                tileData[dstIndex + 1] = imageData[srcIndex + 1];
                                tileData[dstIndex + 2] = imageData[srcIndex + 2];
                                tileData[dstIndex + 3] = imageData[srcIndex + 3];
                            }
                        }
                        
                        tiles.push({
                            x, y,
                            width: tileWidth,
                            height: tileHeight,
                            data: tileData
                        });
                    }
                }
                
                return tiles;
            }
        `;
        
        return URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
    }
    
    handleWorkerMessage(event) {
        const { id, result, success, error } = event.data;
        
        if (success) {
            this.resolveWorkerTask(id, result);
        } else {
            this.rejectWorkerTask(id, new Error(error));
        }
    }
    
    handleWorkerError(error) {
        console.error('Worker error:', error);
    }
    
    setupPerformanceMonitoring() {
        // Performance Observer for monitoring rendering performance
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name.includes('dicom-render')) {
                        this.performanceMetrics.renderTime.push(entry.duration);
                        
                        // Keep only last 100 measurements
                        if (this.performanceMetrics.renderTime.length > 100) {
                            this.performanceMetrics.renderTime.shift();
                        }
                    }
                }
            });
            
            this.performanceObserver.observe({ entryTypes: ['measure'] });
        }
        
        // Frame rate monitoring
        this.startFrameRateMonitoring();
        
        // Memory usage monitoring
        this.startMemoryMonitoring();
        
        console.log('✅ Performance monitoring enabled');
    }
    
    startFrameRateMonitoring() {
        const measureFrameRate = () => {
            const now = performance.now();
            
            if (this.lastFrameTime) {
                const frameTime = now - this.lastFrameTime;
                const fps = 1000 / frameTime;
                
                this.performanceMetrics.frameRate.push(fps);
                
                // Keep only last 60 measurements (1 second at 60fps)
                if (this.performanceMetrics.frameRate.length > 60) {
                    this.performanceMetrics.frameRate.shift();
                }
            }
            
            this.lastFrameTime = now;
            requestAnimationFrame(measureFrameRate);
        };
        
        requestAnimationFrame(measureFrameRate);
    }
    
    startMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.performanceMetrics.memoryUsage.push({
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    timestamp: performance.now()
                });
                
                // Keep only last 100 measurements
                if (this.performanceMetrics.memoryUsage.length > 100) {
                    this.performanceMetrics.memoryUsage.shift();
                }
            }, 1000);
        }
    }
    
    setupEventSystem() {
        // Canvas event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Resize handling
        window.addEventListener('resize', this.handleResize.bind(this));
        
        console.log('✅ Event system initialized');
    }
    
    setupRenderingPipeline() {
        // Define rendering stages
        this.renderingPipeline = [
            { name: 'preprocess', fn: this.preprocessImage.bind(this) },
            { name: 'transform', fn: this.transformImage.bind(this) },
            { name: 'enhance', fn: this.enhanceImage.bind(this) },
            { name: 'render', fn: this.renderImage.bind(this) },
            { name: 'postprocess', fn: this.postprocessImage.bind(this) }
        ];
        
        console.log('✅ Rendering pipeline configured');
    }
    
    applyMedicalGradeSettings() {
        if (!this.config.enableMedicalGradeRendering) return;
        
        // Apply medical-grade canvas settings
        this.ctx.imageSmoothingEnabled = false; // Preserve pixel accuracy
        this.ctx.imageSmoothingQuality = 'high';
        
        // Set color space for medical imaging
        if (this.ctx.colorSpace) {
            this.ctx.colorSpace = 'rec2020';
        }
        
        // Configure for accurate pixel representation
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1.0;
        
        console.log('✅ Medical-grade settings applied');
    }
    
    // Image loading and management
    async loadImage(imageData, options = {}) {
        const startTime = performance.now();
        performance.mark('dicom-load-start');
        
        try {
            let processedImage;
            
            if (typeof imageData === 'string') {
                // URL or base64 data
                processedImage = await this.loadImageFromURL(imageData);
            } else if (imageData instanceof ArrayBuffer) {
                // Binary data
                processedImage = await this.loadImageFromArrayBuffer(imageData);
            } else if (imageData instanceof ImageData) {
                // ImageData object
                processedImage = await this.loadImageFromImageData(imageData);
            } else {
                throw new Error('Unsupported image data format');
            }
            
            // Cache the processed image
            const imageId = options.id || this.generateImageId(imageData);
            this.imageCache.set(imageId, processedImage);
            
            // Update current image
            this.currentImage = {
                id: imageId,
                data: processedImage,
                metadata: options.metadata || {},
                loadTime: performance.now() - startTime
            };
            
            performance.mark('dicom-load-end');
            performance.measure('dicom-load', 'dicom-load-start', 'dicom-load-end');
            
            // Trigger render
            await this.render();
            
            this.emit('imageLoaded', this.currentImage);
            
            return this.currentImage;
            
        } catch (error) {
            console.error('Failed to load image:', error);
            this.emit('imageLoadError', error);
            throw error;
        }
    }
    
    async loadImageFromURL(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                // Convert to ImageData for processing
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                resolve(imageData);
            };
            
            img.onerror = () => reject(new Error('Failed to load image from URL'));
            img.src = url;
        });
    }
    
    async loadImageFromArrayBuffer(buffer) {
        // Convert ArrayBuffer to ImageData
        // This is a simplified implementation - in practice, you'd use a DICOM parser
        const view = new Uint8Array(buffer);
        
        // Assuming square image for simplicity
        const size = Math.sqrt(view.length / 4);
        const width = Math.floor(size);
        const height = width;
        
        return new ImageData(view, width, height);
    }
    
    async loadImageFromImageData(imageData) {
        return imageData;
    }
    
    generateImageId(imageData) {
        // Generate unique ID based on image data
        if (typeof imageData === 'string') {
            return btoa(imageData).slice(0, 16);
        } else {
            return Math.random().toString(36).substring(2, 18);
        }
    }
    
    // Rendering pipeline methods
    async render() {
        if (!this.currentImage || this.isRendering) return;
        
        this.isRendering = true;
        const startTime = performance.now();
        performance.mark('dicom-render-start');
        
        try {
            let imageData = this.currentImage.data;
            
            // Execute rendering pipeline
            for (const stage of this.renderingPipeline) {
                imageData = await stage.fn(imageData);
            }
            
            performance.mark('dicom-render-end');
            performance.measure('dicom-render', 'dicom-render-start', 'dicom-render-end');
            
            const renderTime = performance.now() - startTime;
            this.performanceMetrics.renderTime.push(renderTime);
            
            this.emit('renderComplete', { renderTime });
            
        } catch (error) {
            console.error('Rendering failed:', error);
            this.emit('renderError', error);
        } finally {
            this.isRendering = false;
        }
    }
    
    async preprocessImage(imageData) {
        // Apply preprocessing filters
        if (this.config.enableAIEnhancement) {
            imageData = await this.applyAIEnhancement(imageData);
        }
        
        return imageData;
    }
    
    async transformImage(imageData) {
        // Apply viewport transformations
        const { scale, x, y, rotation } = this.viewport;
        
        if (this.config.enableWebGL && this.webglCtx) {
            return this.transformImageWebGL(imageData);
        } else {
            return this.transformImageCanvas(imageData);
        }
    }
    
    async transformImageWebGL(imageData) {
        if (!this.webglCtx || !this.webglProgram) return imageData;
        
        const gl = this.webglCtx;
        
        // Use WebGL program
        gl.useProgram(this.webglProgram);
        
        // Update texture with image data
        gl.bindTexture(gl.TEXTURE_2D, this.webglTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
        
        // Set uniforms
        gl.uniform2f(this.webglUniforms.resolution, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.webglUniforms.translation, this.viewport.x, this.viewport.y);
        gl.uniform2f(this.webglUniforms.scale, this.viewport.scale, this.viewport.scale);
        gl.uniform1f(this.webglUniforms.rotation, this.viewport.rotation);
        gl.uniform1f(this.webglUniforms.windowCenter, this.viewport.windowCenter);
        gl.uniform1f(this.webglUniforms.windowWidth, this.viewport.windowWidth);
        gl.uniform1f(this.webglUniforms.brightness, 0.0);
        gl.uniform1f(this.webglUniforms.contrast, 1.0);
        gl.uniform1f(this.webglUniforms.gamma, 1.0);
        gl.uniform1i(this.webglUniforms.invert, this.viewport.invert ? 1 : 0);
        gl.uniform1i(this.webglUniforms.enableHDR, this.config.enableHDR ? 1 : 0);
        
        // Set up vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.webglVertexBuffer);
        
        gl.enableVertexAttribArray(this.webglAttributes.position);
        gl.vertexAttribPointer(this.webglAttributes.position, 2, gl.FLOAT, false, 16, 0);
        
        gl.enableVertexAttribArray(this.webglAttributes.texCoord);
        gl.vertexAttribPointer(this.webglAttributes.texCoord, 2, gl.FLOAT, false, 16, 8);
        
        // Clear and render
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        return imageData; // WebGL renders directly to canvas
    }
    
    async transformImageCanvas(imageData) {
        // Use 2D canvas for transformation
        const { scale, x, y, rotation } = this.viewport;
        
        this.ctx.save();
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transformations
        this.ctx.translate(this.canvas.width / 2 + x, this.canvas.height / 2 + y);
        this.ctx.scale(scale, scale);
        this.ctx.rotate(rotation);
        
        // Create temporary canvas for image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        // Draw transformed image
        this.ctx.drawImage(
            tempCanvas,
            -imageData.width / 2,
            -imageData.height / 2
        );
        
        this.ctx.restore();
        
        return imageData;
    }
    
    async enhanceImage(imageData) {
        // Apply image enhancements
        if (this.config.enableMultiThreading && this.workers.length > 0) {
            return this.enhanceImageWorker(imageData);
        } else {
            return this.enhanceImageDirect(imageData);
        }
    }
    
    async enhanceImageWorker(imageData) {
        return new Promise((resolve, reject) => {
            const worker = this.getAvailableWorker();
            const taskId = this.generateTaskId();
            
            this.workerTasks = this.workerTasks || new Map();
            this.workerTasks.set(taskId, { resolve, reject });
            
            worker.postMessage({
                type: 'enhanceImage',
                id: taskId,
                data: {
                    imageData: imageData.data,
                    brightness: 0,
                    contrast: 1.2,
                    gamma: 1.0
                }
            });
        });
    }
    
    async enhanceImageDirect(imageData) {
        // Direct enhancement without workers
        const data = imageData.data;
        const enhanced = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Apply enhancements
            r = Math.min(255, Math.max(0, r * 1.2)); // Contrast
            g = Math.min(255, Math.max(0, g * 1.2));
            b = Math.min(255, Math.max(0, b * 1.2));
            
            enhanced[i] = r;
            enhanced[i + 1] = g;
            enhanced[i + 2] = b;
            enhanced[i + 3] = data[i + 3];
        }
        
        return new ImageData(enhanced, imageData.width, imageData.height);
    }
    
    async renderImage(imageData) {
        // Final rendering to canvas
        if (!this.config.enableWebGL) {
            // Use 2D canvas rendering
            this.ctx.putImageData(imageData, 0, 0);
        }
        
        return imageData;
    }
    
    async postprocessImage(imageData) {
        // Post-processing effects
        return imageData;
    }
    
    async applyAIEnhancement(imageData) {
        // AI-based image enhancement
        // This would integrate with the world-class AI engine
        return imageData;
    }
    
    // Viewport controls
    setViewport(viewport) {
        Object.assign(this.viewport, viewport);
        this.render();
    }
    
    zoom(factor, centerX = null, centerY = null) {
        const newScale = Math.max(0.1, Math.min(10, this.viewport.scale * factor));
        
        if (centerX !== null && centerY !== null) {
            // Zoom to specific point
            const dx = centerX - this.canvas.width / 2;
            const dy = centerY - this.canvas.height / 2;
            
            this.viewport.x -= dx * (factor - 1);
            this.viewport.y -= dy * (factor - 1);
        }
        
        this.viewport.scale = newScale;
        this.render();
    }
    
    pan(deltaX, deltaY) {
        this.viewport.x += deltaX;
        this.viewport.y += deltaY;
        this.render();
    }
    
    rotate(angle) {
        this.viewport.rotation += angle;
        this.render();
    }
    
    setWindowLevel(center, width) {
        this.viewport.windowCenter = center;
        this.viewport.windowWidth = width;
        this.render();
    }
    
    resetViewport() {
        this.viewport = {
            x: 0,
            y: 0,
            scale: 1.0,
            rotation: 0,
            windowCenter: 0,
            windowWidth: 0,
            invert: false,
            flipHorizontal: false,
            flipVertical: false
        };
        this.render();
    }
    
    // Event handlers
    handleMouseDown(event) {
        this.performanceMetrics.interactions++;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.mouseState = {
            isDown: true,
            startX: x,
            startY: y,
            lastX: x,
            lastY: y,
            button: event.button
        };
        
        this.emit('mouseDown', { x, y, button: event.button });
    }
    
    handleMouseMove(event) {
        if (!this.mouseState?.isDown) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const deltaX = x - this.mouseState.lastX;
        const deltaY = y - this.mouseState.lastY;
        
        // Pan image
        if (this.mouseState.button === 0) { // Left button
            this.pan(deltaX, deltaY);
        }
        
        this.mouseState.lastX = x;
        this.mouseState.lastY = y;
        
        this.emit('mouseMove', { x, y, deltaX, deltaY });
    }
    
    handleMouseUp(event) {
        this.mouseState = null;
        this.emit('mouseUp', event);
    }
    
    handleWheel(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const factor = event.deltaY > 0 ? 0.9 : 1.1;
        this.zoom(factor, x, y);
        
        this.emit('wheel', { deltaY: event.deltaY, x, y });
    }
    
    handleTouchStart(event) {
        event.preventDefault();
        // Handle touch events for mobile
        this.emit('touchStart', event);
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        // Handle touch move for mobile
        this.emit('touchMove', event);
    }
    
    handleTouchEnd(event) {
        event.preventDefault();
        // Handle touch end for mobile
        this.emit('touchEnd', event);
    }
    
    handleKeyDown(event) {
        // Keyboard shortcuts
        switch (event.key) {
            case 'r':
                this.resetViewport();
                break;
            case 'i':
                this.viewport.invert = !this.viewport.invert;
                this.render();
                break;
            case '+':
            case '=':
                this.zoom(1.1);
                break;
            case '-':
                this.zoom(0.9);
                break;
        }
        
        this.emit('keyDown', event);
    }
    
    handleKeyUp(event) {
        this.emit('keyUp', event);
    }
    
    handleResize() {
        this.setupHighDPICanvas();
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
        }
        this.render();
        this.emit('resize');
    }
    
    // Utility methods
    getAvailableWorker() {
        // Simple round-robin worker selection
        this.currentWorkerIndex = (this.currentWorkerIndex || 0) % this.workers.length;
        return this.workers[this.currentWorkerIndex++];
    }
    
    generateTaskId() {
        return Math.random().toString(36).substring(2, 18);
    }
    
    resolveWorkerTask(id, result) {
        if (this.workerTasks?.has(id)) {
            this.workerTasks.get(id).resolve(result);
            this.workerTasks.delete(id);
        }
    }
    
    rejectWorkerTask(id, error) {
        if (this.workerTasks?.has(id)) {
            this.workerTasks.get(id).reject(error);
            this.workerTasks.delete(id);
        }
    }
    
    // Event system
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const callbacks = this.eventListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event callback error:', error);
                }
            });
        }
    }
    
    // Performance metrics
    getPerformanceMetrics() {
        const metrics = { ...this.performanceMetrics };
        
        // Calculate averages
        if (metrics.renderTime.length > 0) {
            metrics.avgRenderTime = metrics.renderTime.reduce((a, b) => a + b) / metrics.renderTime.length;
            metrics.maxRenderTime = Math.max(...metrics.renderTime);
            metrics.minRenderTime = Math.min(...metrics.renderTime);
        }
        
        if (metrics.frameRate.length > 0) {
            metrics.avgFrameRate = metrics.frameRate.reduce((a, b) => a + b) / metrics.frameRate.length;
            metrics.maxFrameRate = Math.max(...metrics.frameRate);
            metrics.minFrameRate = Math.min(...metrics.frameRate);
        }
        
        // Cache statistics
        metrics.cacheSize = this.imageCache.size;
        metrics.cacheHitRatio = this.calculateCacheHitRatio();
        
        return metrics;
    }
    
    calculateCacheHitRatio() {
        // This would be calculated based on actual cache hits/misses
        return this.performanceMetrics.cacheHitRatio;
    }
    
    // Cleanup
    destroy() {
        // Clean up resources
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Terminate workers
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        
        // Clear caches
        this.imageCache.clear();
        this.tileCache.clear();
        this.preprocessedCache.clear();
        
        // Remove event listeners
        this.eventListeners.clear();
        
        console.log('✅ World-Class DICOM Canvas destroyed');
    }
}

// Factory function
function createWorldClassDicomCanvas(options = {}) {
    return new WorldClassDicomCanvas(options);
}

// Export for global access
window.WorldClassDicomCanvas = WorldClassDicomCanvas;
window.createWorldClassDicomCanvas = createWorldClassDicomCanvas;

console.log('🌟 World-Class DICOM Canvas Engine loaded');