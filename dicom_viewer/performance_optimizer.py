"""
DICOM Viewer Performance Optimizer
Real backend performance optimization for faster image loading and processing
"""

import os
import time
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import hashlib
from django.core.cache import cache
from django.conf import settings
import numpy as np

logger = logging.getLogger(__name__)

class DicomPerformanceOptimizer:
    """Optimizes DICOM processing performance in real-time"""
    
    def __init__(self):
        self.image_cache = {}
        self.processing_stats = {
            'images_processed': 0,
            'total_processing_time': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
        self.thread_pool = ThreadPoolExecutor(max_workers=4)
        self.optimization_active = True
        
    @lru_cache(maxsize=100)
    def get_optimized_image_data(self, image_path, window_center=None, window_width=None):
        """Get optimized image data with caching"""
        start_time = time.time()
        
        try:
            # Create cache key
            cache_key = self._create_cache_key(image_path, window_center, window_width)
            
            # Check cache first
            cached_data = cache.get(cache_key)
            if cached_data:
                self.processing_stats['cache_hits'] += 1
                logger.debug(f"Cache hit for {image_path}")
                return cached_data
            
            self.processing_stats['cache_misses'] += 1
            
            # Process image
            image_data = self._process_dicom_image(image_path, window_center, window_width)
            
            # Cache result
            cache.set(cache_key, image_data, timeout=3600)  # Cache for 1 hour
            
            # Update stats
            processing_time = time.time() - start_time
            self.processing_stats['images_processed'] += 1
            self.processing_stats['total_processing_time'] += processing_time
            
            logger.debug(f"Processed {image_path} in {processing_time:.3f}s")
            
            return image_data
            
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {e}")
            return None
    
    def _create_cache_key(self, image_path, window_center, window_width):
        """Create unique cache key for image processing parameters"""
        key_data = f"{image_path}_{window_center}_{window_width}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _process_dicom_image(self, image_path, window_center=None, window_width=None):
        """Optimized DICOM image processing"""
        import pydicom
        from PIL import Image
        import base64
        from io import BytesIO
        
        try:
            # Read DICOM with optimizations
            ds = pydicom.dcmread(image_path, stop_before_pixels=False)
            
            if not hasattr(ds, 'pixel_array'):
                return None
            
            # Get pixel data
            pixel_array = ds.pixel_array
            
            # Apply rescale slope and intercept
            if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                pixel_array = pixel_array * ds.RescaleSlope + ds.RescaleIntercept
            
            # Apply window/level if provided
            if window_center is not None and window_width is not None:
                pixel_array = self._apply_window_level(pixel_array, window_center, window_width)
            else:
                # Auto window/level
                pixel_array = self._auto_window_level(pixel_array)
            
            # Convert to 8-bit for display
            pixel_array = self._normalize_to_8bit(pixel_array)
            
            # Convert to PIL Image
            if len(pixel_array.shape) == 2:
                pil_image = Image.fromarray(pixel_array, mode='L')
            else:
                pil_image = Image.fromarray(pixel_array)
            
            # Convert to base64 with optimization
            buffer = BytesIO()
            pil_image.save(buffer, format='PNG', optimize=True, compress_level=6)
            buffer.seek(0)
            
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return {
                'image_data': f'data:image/png;base64,{image_base64}',
                'width': int(pixel_array.shape[1]) if len(pixel_array.shape) > 1 else int(pixel_array.shape[0]),
                'height': int(pixel_array.shape[0]),
                'window_center': window_center or self._calculate_window_center(ds),
                'window_width': window_width or self._calculate_window_width(ds),
                'processing_time': time.time() - time.time()  # Will be updated by caller
            }
            
        except Exception as e:
            logger.error(f"Error in _process_dicom_image: {e}")
            return None
    
    def _apply_window_level(self, pixel_array, center, width):
        """Apply window/level transformation"""
        min_val = center - width / 2
        max_val = center + width / 2
        
        # Clip values to window range
        windowed = np.clip(pixel_array, min_val, max_val)
        
        # Normalize to 0-1 range
        if max_val > min_val:
            windowed = (windowed - min_val) / (max_val - min_val)
        
        return windowed
    
    def _auto_window_level(self, pixel_array):
        """Automatic window/level calculation"""
        # Use percentile-based auto windowing
        p1 = np.percentile(pixel_array, 1)
        p99 = np.percentile(pixel_array, 99)
        
        center = (p1 + p99) / 2
        width = p99 - p1
        
        return self._apply_window_level(pixel_array, center, width)
    
    def _normalize_to_8bit(self, pixel_array):
        """Normalize pixel array to 8-bit range"""
        # Normalize to 0-255 range
        pixel_min = np.min(pixel_array)
        pixel_max = np.max(pixel_array)
        
        if pixel_max > pixel_min:
            normalized = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
        else:
            normalized = np.zeros_like(pixel_array, dtype=np.uint8)
        
        return normalized
    
    def _calculate_window_center(self, ds):
        """Calculate appropriate window center from DICOM metadata"""
        if hasattr(ds, 'WindowCenter'):
            wc = ds.WindowCenter
            return wc[0] if isinstance(wc, (list, tuple)) else wc
        return 127  # Default
    
    def _calculate_window_width(self, ds):
        """Calculate appropriate window width from DICOM metadata"""
        if hasattr(ds, 'WindowWidth'):
            ww = ds.WindowWidth
            return ww[0] if isinstance(ww, (list, tuple)) else ww
        return 256  # Default
    
    def optimize_mpr_processing(self, series_images):
        """Optimize MPR volume processing"""
        start_time = time.time()
        
        try:
            # Use parallel processing for volume building
            volume_slices = []
            
            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = []
                
                for image in series_images:
                    future = executor.submit(self._load_dicom_slice, image.file_path.path)
                    futures.append(future)
                
                # Collect results
                for future in futures:
                    try:
                        slice_data = future.result(timeout=10)
                        if slice_data is not None:
                            volume_slices.append(slice_data)
                    except Exception as e:
                        logger.warning(f"Failed to load slice: {e}")
                        continue
            
            if not volume_slices:
                return None
            
            # Build volume
            volume = np.stack(volume_slices, axis=0)
            
            processing_time = time.time() - start_time
            logger.info(f"MPR volume built in {processing_time:.3f}s ({len(volume_slices)} slices)")
            
            return volume
            
        except Exception as e:
            logger.error(f"MPR optimization failed: {e}")
            return None
    
    def _load_dicom_slice(self, file_path):
        """Load single DICOM slice optimized"""
        try:
            import pydicom
            
            ds = pydicom.dcmread(file_path, stop_before_pixels=False)
            pixel_array = ds.pixel_array.astype(np.float32)
            
            # Apply rescale
            if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                pixel_array = pixel_array * ds.RescaleSlope + ds.RescaleIntercept
            
            return pixel_array
            
        except Exception as e:
            logger.warning(f"Failed to load DICOM slice {file_path}: {e}")
            return None
    
    def get_performance_stats(self):
        """Get current performance statistics"""
        stats = self.processing_stats.copy()
        
        if stats['images_processed'] > 0:
            stats['avg_processing_time'] = stats['total_processing_time'] / stats['images_processed']
            stats['cache_hit_ratio'] = stats['cache_hits'] / (stats['cache_hits'] + stats['cache_misses'])
        else:
            stats['avg_processing_time'] = 0
            stats['cache_hit_ratio'] = 0
        
        return stats
    
    def clear_cache(self):
        """Clear processing cache"""
        cache.clear()
        self.image_cache.clear()
        self.get_optimized_image_data.cache_clear()
        
        logger.info("Performance cache cleared")

# Global instance
performance_optimizer = DicomPerformanceOptimizer()

def get_performance_optimizer():
    """Get the global performance optimizer instance"""
    return performance_optimizer