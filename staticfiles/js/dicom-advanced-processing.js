/**
 * Advanced DICOM Image Processing Engine
 * Professional-grade image enhancement and analysis tools
 */

class DicomAdvancedProcessing {
    constructor() {
        this.version = '1.0.0';
        this.filters = new Map();
        this.histograms = new Map();
        this.enhancementCache = new Map();
        
        this.initializeFilters();
        console.log('🔬 Advanced DICOM Processing Engine initialized');
    }
    
    initializeFilters() {
        // Register built-in filters
        this.registerFilter('sharpen', this.sharpenFilter.bind(this));
        this.registerFilter('smooth', this.smoothFilter.bind(this));
        this.registerFilter('edge_enhance', this.edgeEnhanceFilter.bind(this));
        this.registerFilter('noise_reduction', this.noiseReductionFilter.bind(this));
        this.registerFilter('contrast_enhance', this.contrastEnhanceFilter.bind(this));
        this.registerFilter('histogram_equalize', this.histogramEqualizeFilter.bind(this));
    }
    
    registerFilter(name, filterFunction) {
        this.filters.set(name, filterFunction);
    }
    
    // ============================================================================
    // HISTOGRAM ANALYSIS
    // ============================================================================
    
    calculateHistogram(imageData) {
        const histogram = new Array(256).fill(0);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // Use grayscale value (assuming R=G=B for medical images)
            const gray = data[i];
            histogram[gray]++;
        }
        
        return histogram;
    }
    
    analyzeHistogram(histogram) {
        const totalPixels = histogram.reduce((sum, count) => sum + count, 0);
        
        // Calculate statistics
        let mean = 0;
        let variance = 0;
        
        for (let i = 0; i < histogram.length; i++) {
            mean += (i * histogram[i]) / totalPixels;
        }
        
        for (let i = 0; i < histogram.length; i++) {
            variance += Math.pow(i - mean, 2) * histogram[i] / totalPixels;
        }
        
        const stdDev = Math.sqrt(variance);
        
        // Find peaks for multimodal analysis
        const peaks = this.findHistogramPeaks(histogram);
        
        return {
            mean: mean,
            variance: variance,
            standardDeviation: stdDev,
            peaks: peaks,
            entropy: this.calculateEntropy(histogram),
            contrast: this.calculateContrast(histogram)
        };
    }
    
    findHistogramPeaks(histogram) {
        const peaks = [];
        const smoothed = this.smoothHistogram(histogram);
        
        for (let i = 1; i < smoothed.length - 1; i++) {
            if (smoothed[i] > smoothed[i-1] && smoothed[i] > smoothed[i+1]) {
                if (smoothed[i] > smoothed.reduce((max, val) => Math.max(max, val)) * 0.1) {
                    peaks.push({
                        intensity: i,
                        count: smoothed[i],
                        prominence: this.calculatePeakProminence(smoothed, i)
                    });
                }
            }
        }
        
        return peaks.sort((a, b) => b.prominence - a.prominence);
    }
    
    smoothHistogram(histogram) {
        const smoothed = new Array(histogram.length);
        const kernel = [0.25, 0.5, 0.25]; // Gaussian-like kernel
        
        for (let i = 0; i < histogram.length; i++) {
            let sum = 0;
            let weightSum = 0;
            
            for (let j = -1; j <= 1; j++) {
                const idx = i + j;
                if (idx >= 0 && idx < histogram.length) {
                    sum += histogram[idx] * kernel[j + 1];
                    weightSum += kernel[j + 1];
                }
            }
            
            smoothed[i] = sum / weightSum;
        }
        
        return smoothed;
    }
    
    calculatePeakProminence(histogram, peakIndex) {
        const peakValue = histogram[peakIndex];
        let leftMin = peakValue;
        let rightMin = peakValue;
        
        // Find minimum to the left
        for (let i = peakIndex - 1; i >= 0; i--) {
            leftMin = Math.min(leftMin, histogram[i]);
            if (histogram[i] > peakValue) break;
        }
        
        // Find minimum to the right
        for (let i = peakIndex + 1; i < histogram.length; i++) {
            rightMin = Math.min(rightMin, histogram[i]);
            if (histogram[i] > peakValue) break;
        }
        
        return peakValue - Math.max(leftMin, rightMin);
    }
    
    calculateEntropy(histogram) {
        const totalPixels = histogram.reduce((sum, count) => sum + count, 0);
        let entropy = 0;
        
        for (let count of histogram) {
            if (count > 0) {
                const probability = count / totalPixels;
                entropy -= probability * Math.log2(probability);
            }
        }
        
        return entropy;
    }
    
    calculateContrast(histogram) {
        const totalPixels = histogram.reduce((sum, count) => sum + count, 0);
        let contrast = 0;
        
        for (let i = 0; i < histogram.length; i++) {
            for (let j = 0; j < histogram.length; j++) {
                const probability = (histogram[i] * histogram[j]) / (totalPixels * totalPixels);
                contrast += probability * Math.pow(i - j, 2);
            }
        }
        
        return contrast;
    }
    
    // ============================================================================
    // IMAGE ENHANCEMENT FILTERS
    // ============================================================================
    
    sharpenFilter(imageData, strength = 1.0) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        // Sharpening kernel
        const kernel = [
            0, -1 * strength, 0,
            -1 * strength, 4 * strength + 1, -1 * strength,
            0, -1 * strength, 0
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += data[idx] * kernel[kernelIdx];
                    }
                }
                
                const outputIdx = (y * width + x) * 4;
                const value = Math.max(0, Math.min(255, sum));
                output[outputIdx] = value;
                output[outputIdx + 1] = value;
                output[outputIdx + 2] = value;
            }
        }
        
        return new ImageData(output, width, height);
    }
    
    smoothFilter(imageData, radius = 1) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let sum = 0;
                let count = 0;
                
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        sum += data[idx];
                        count++;
                    }
                }
                
                const outputIdx = (y * width + x) * 4;
                const value = sum / count;
                output[outputIdx] = value;
                output[outputIdx + 1] = value;
                output[outputIdx + 2] = value;
            }
        }
        
        return new ImageData(output, width, height);
    }
    
    edgeEnhanceFilter(imageData, strength = 1.0) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        // Sobel edge detection
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        
                        gx += data[idx] * sobelX[kernelIdx];
                        gy += data[idx] * sobelY[kernelIdx];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const outputIdx = (y * width + x) * 4;
                
                // Enhance edges while preserving original image
                const original = data[outputIdx];
                const enhanced = Math.min(255, original + magnitude * strength);
                
                output[outputIdx] = enhanced;
                output[outputIdx + 1] = enhanced;
                output[outputIdx + 2] = enhanced;
            }
        }
        
        return new ImageData(output, width, height);
    }
    
    noiseReductionFilter(imageData, strength = 1.0) {
        // Bilateral filter for noise reduction while preserving edges
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        const spatialSigma = 2.0 * strength;
        const intensitySigma = 30.0 * strength;
        const radius = Math.ceil(spatialSigma * 2);
        
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let weightSum = 0;
                let valueSum = 0;
                const centerIdx = (y * width + x) * 4;
                const centerValue = data[centerIdx];
                
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const neighborIdx = ((y + ky) * width + (x + kx)) * 4;
                        const neighborValue = data[neighborIdx];
                        
                        // Spatial weight
                        const spatialWeight = Math.exp(-(kx * kx + ky * ky) / (2 * spatialSigma * spatialSigma));
                        
                        // Intensity weight
                        const intensityDiff = centerValue - neighborValue;
                        const intensityWeight = Math.exp(-(intensityDiff * intensityDiff) / (2 * intensitySigma * intensitySigma));
                        
                        const weight = spatialWeight * intensityWeight;
                        weightSum += weight;
                        valueSum += neighborValue * weight;
                    }
                }
                
                const filteredValue = valueSum / weightSum;
                output[centerIdx] = filteredValue;
                output[centerIdx + 1] = filteredValue;
                output[centerIdx + 2] = filteredValue;
            }
        }
        
        return new ImageData(output, width, height);
    }
    
    contrastEnhanceFilter(imageData, strength = 1.0) {
        const data = imageData.data;
        const output = new Uint8ClampedArray(data);
        
        // Calculate histogram
        const histogram = this.calculateHistogram(imageData);
        const stats = this.analyzeHistogram(histogram);
        
        // Adaptive contrast enhancement
        const alpha = 1.0 + strength;
        const beta = -strength * stats.mean;
        
        for (let i = 0; i < data.length; i += 4) {
            const original = data[i];
            const enhanced = Math.max(0, Math.min(255, alpha * original + beta));
            
            output[i] = enhanced;
            output[i + 1] = enhanced;
            output[i + 2] = enhanced;
            output[i + 3] = data[i + 3]; // Preserve alpha
        }
        
        return new ImageData(output, imageData.width, imageData.height);
    }
    
    histogramEqualizeFilter(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);
        
        // Calculate histogram
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++;
        }
        
        // Calculate cumulative distribution function
        const cdf = new Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i];
        }
        
        // Normalize CDF
        const totalPixels = width * height;
        const minCdf = cdf.find(val => val > 0);
        
        for (let i = 0; i < data.length; i += 4) {
            const original = data[i];
            const equalized = Math.round(((cdf[original] - minCdf) / (totalPixels - minCdf)) * 255);
            
            output[i] = equalized;
            output[i + 1] = equalized;
            output[i + 2] = equalized;
            output[i + 3] = data[i + 3];
        }
        
        return new ImageData(output, width, height);
    }
    
    // ============================================================================
    // MEDICAL-SPECIFIC ENHANCEMENTS
    // ============================================================================
    
    enhanceXRayImage(imageData, options = {}) {
        const {
            contrastBoost = 1.2,
            edgeEnhancement = 0.5,
            noiseReduction = 0.3
        } = options;
        
        console.log('📡 Applying X-ray specific enhancements...');
        
        // Apply noise reduction first
        let enhanced = this.noiseReductionFilter(imageData, noiseReduction);
        
        // Enhance contrast for better bone/soft tissue differentiation
        enhanced = this.contrastEnhanceFilter(enhanced, contrastBoost);
        
        // Enhance edges for better structure visibility
        enhanced = this.edgeEnhanceFilter(enhanced, edgeEnhancement);
        
        return enhanced;
    }
    
    enhanceCTImage(imageData, options = {}) {
        const {
            windowOptimization = true,
            noiseReduction = 0.4,
            sharpening = 0.3
        } = options;
        
        console.log('🏥 Applying CT specific enhancements...');
        
        let enhanced = imageData;
        
        // Apply noise reduction for cleaner images
        enhanced = this.noiseReductionFilter(enhanced, noiseReduction);
        
        // Apply subtle sharpening for better detail
        enhanced = this.sharpenFilter(enhanced, sharpening);
        
        // Optimize histogram if requested
        if (windowOptimization) {
            enhanced = this.histogramEqualizeFilter(enhanced);
        }
        
        return enhanced;
    }
    
    enhanceMRImage(imageData, options = {}) {
        const {
            contrastEnhancement = 0.8,
            edgePreservation = true,
            noiseReduction = 0.5
        } = options;
        
        console.log('🧲 Applying MR specific enhancements...');
        
        let enhanced = imageData;
        
        // Strong noise reduction for MR images
        enhanced = this.noiseReductionFilter(enhanced, noiseReduction);
        
        // Enhance contrast while preserving tissue boundaries
        enhanced = this.contrastEnhanceFilter(enhanced, contrastEnhancement);
        
        if (edgePreservation) {
            enhanced = this.edgeEnhanceFilter(enhanced, 0.3);
        }
        
        return enhanced;
    }
    
    // ============================================================================
    // BATCH PROCESSING
    // ============================================================================
    
    async processImageStack(imageDataArray, filterName, options = {}) {
        console.log(`🔄 Processing ${imageDataArray.length} images with ${filterName} filter...`);
        
        const results = [];
        const filter = this.filters.get(filterName);
        
        if (!filter) {
            throw new Error(`Unknown filter: ${filterName}`);
        }
        
        for (let i = 0; i < imageDataArray.length; i++) {
            const processed = filter(imageDataArray[i], options);
            results.push(processed);
            
            // Yield control periodically to prevent UI blocking
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        console.log(`✅ Processed ${results.length} images successfully`);
        return results;
    }
    
    // ============================================================================
    // QUALITY ASSESSMENT
    // ============================================================================
    
    assessImageQuality(imageData) {
        const histogram = this.calculateHistogram(imageData);
        const stats = this.analyzeHistogram(histogram);
        
        // Calculate quality metrics
        const dynamicRange = this.calculateDynamicRange(histogram);
        const sharpness = this.calculateSharpness(imageData);
        const snr = this.estimateSignalToNoiseRatio(imageData);
        
        return {
            contrast: stats.contrast,
            sharpness: sharpness,
            dynamicRange: dynamicRange,
            signalToNoiseRatio: snr,
            entropy: stats.entropy,
            overallQuality: this.calculateOverallQuality(stats.contrast, sharpness, dynamicRange, snr)
        };
    }
    
    calculateDynamicRange(histogram) {
        let min = -1, max = -1;
        
        for (let i = 0; i < histogram.length; i++) {
            if (histogram[i] > 0) {
                if (min === -1) min = i;
                max = i;
            }
        }
        
        return max - min;
    }
    
    calculateSharpness(imageData) {
        // Use Laplacian variance as sharpness measure
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let variance = 0;
        let mean = 0;
        let count = 0;
        
        // Laplacian kernel
        const kernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += data[idx] * kernel[kernelIdx];
                    }
                }
                
                mean += Math.abs(sum);
                count++;
            }
        }
        
        mean /= count;
        
        // Calculate variance
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += data[idx] * kernel[kernelIdx];
                    }
                }
                
                variance += Math.pow(Math.abs(sum) - mean, 2);
            }
        }
        
        return variance / count;
    }
    
    estimateSignalToNoiseRatio(imageData) {
        const histogram = this.calculateHistogram(imageData);
        const stats = this.analyzeHistogram(histogram);
        
        // Simple SNR estimation based on histogram statistics
        return stats.mean / (stats.standardDeviation || 1);
    }
    
    calculateOverallQuality(contrast, sharpness, dynamicRange, snr) {
        // Weighted combination of quality metrics
        const weights = {
            contrast: 0.3,
            sharpness: 0.3,
            dynamicRange: 0.2,
            snr: 0.2
        };
        
        // Normalize metrics to 0-1 range
        const normalizedContrast = Math.min(1, contrast / 1000);
        const normalizedSharpness = Math.min(1, sharpness / 100);
        const normalizedDynamicRange = Math.min(1, dynamicRange / 255);
        const normalizedSNR = Math.min(1, snr / 50);
        
        return (
            normalizedContrast * weights.contrast +
            normalizedSharpness * weights.sharpness +
            normalizedDynamicRange * weights.dynamicRange +
            normalizedSNR * weights.snr
        ) * 100; // Convert to percentage
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DicomAdvancedProcessing = DicomAdvancedProcessing;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DicomAdvancedProcessing;
}

console.log('🔬 Advanced DICOM Processing Engine loaded successfully');