#!/usr/bin/env python3
"""
Advanced MPR (Multi-Planar Reconstruction) Engine for NoctisPro PACS
World-class 3D medical imaging reconstruction with real-time visualization
"""

import os
import sys
import time
import numpy as np
import logging
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import threading
from concurrent.futures import ThreadPoolExecutor
import asyncio
from pathlib import Path

# Medical imaging imports
try:
    import SimpleITK as sitk
    import pydicom
    import cv2
    from skimage import measure, morphology, filters, transform
    from scipy import ndimage
    from scipy.interpolate import RegularGridInterpolator
    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d import Axes3D
    import vtk
    from vtk.util import numpy_support
    import nibabel as nib
except ImportError as e:
    logging.warning(f"Some MPR dependencies not available: {e}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('advanced_mpr_engine')

class ReconstructionType(Enum):
    """Types of 3D reconstruction"""
    MPR = "multiplanar_reconstruction"
    VR = "volume_rendering"
    MIP = "maximum_intensity_projection"
    MINIP = "minimum_intensity_projection"
    SSD = "shaded_surface_display"
    CURVED_MPR = "curved_multiplanar_reconstruction"
    THICK_SLAB = "thick_slab_reconstruction"
    CINEMATIC_RENDERING = "cinematic_rendering"

class InterpolationMethod(Enum):
    """Interpolation methods for reconstruction"""
    NEAREST = "nearest"
    LINEAR = "linear"
    CUBIC = "cubic"
    LANCZOS = "lanczos"
    SINC = "sinc"

@dataclass
class MPRConfig:
    """Advanced MPR configuration"""
    # Reconstruction parameters
    reconstruction_type: ReconstructionType = ReconstructionType.MPR
    interpolation_method: InterpolationMethod = InterpolationMethod.LINEAR
    
    # Quality settings
    output_resolution: Tuple[int, int] = (512, 512)
    slice_thickness_mm: float = 1.0
    reconstruction_quality: str = "high"  # low, medium, high, ultra
    
    # Performance settings
    use_gpu_acceleration: bool = True
    enable_multiprocessing: bool = True
    max_memory_gb: float = 8.0
    cache_reconstructions: bool = True
    
    # Advanced features
    enable_ai_enhancement: bool = True
    enable_noise_reduction: bool = True
    enable_edge_enhancement: bool = True
    enable_contrast_optimization: bool = True
    
    # Rendering settings
    window_level: Optional[float] = None
    window_width: Optional[float] = None
    color_map: str = "gray"
    opacity_function: Optional[List[Tuple[float, float]]] = None
    
    # Animation settings
    enable_cine_mode: bool = False
    animation_fps: int = 30
    rotation_speed: float = 1.0

@dataclass
class MPRResult:
    """MPR reconstruction result"""
    reconstruction_id: str
    reconstruction_type: ReconstructionType
    
    # Output data
    reconstructed_images: List[np.ndarray]
    metadata: Dict[str, Any]
    
    # Quality metrics
    reconstruction_time_seconds: float
    quality_score: float
    resolution: Tuple[int, int]
    
    # Visualization data
    visualization_data: Dict[str, Any] = field(default_factory=dict)
    animation_frames: List[np.ndarray] = field(default_factory=list)
    
    # Processing metadata
    timestamp: str = field(default_factory=lambda: time.strftime('%Y-%m-%d %H:%M:%S'))
    processing_parameters: Dict[str, Any] = field(default_factory=dict)

class AdvancedMPRProcessor:
    """Advanced MPR processor with world-class capabilities"""
    
    def __init__(self, config: MPRConfig = None):
        self.config = config or MPRConfig()
        
        # Processing cache and optimization
        self.volume_cache = {}
        self.reconstruction_cache = {}
        self.preprocessing_cache = {}
        
        # Threading and performance
        self.executor = ThreadPoolExecutor(max_workers=8)
        self.processing_active = False
        
        # VTK pipeline components
        self.vtk_reader = None
        self.vtk_volume_mapper = None
        self.vtk_renderer = None
        
        # Performance monitoring
        self.performance_metrics = {
            'reconstructions_completed': 0,
            'total_processing_time': 0.0,
            'average_quality_score': 0.0,
            'cache_hit_ratio': 0.0
        }
        
        # Initialize MPR engine
        self._initialize_vtk_pipeline()
        self._setup_gpu_acceleration()
        
        logger.info("🔄 Advanced MPR Engine initialized")
    
    def _initialize_vtk_pipeline(self):
        """Initialize VTK rendering pipeline"""
        try:
            # Create VTK components
            self.vtk_renderer = vtk.vtkRenderer()
            self.vtk_render_window = vtk.vtkRenderWindow()
            self.vtk_render_window.AddRenderer(self.vtk_renderer)
            
            # Volume mapper for 3D rendering
            self.vtk_volume_mapper = vtk.vtkGPUVolumeRayCastMapper()
            
            # Transfer functions
            self.color_transfer_function = vtk.vtkColorTransferFunction()
            self.opacity_transfer_function = vtk.vtkPiecewiseFunction()
            
            logger.info("✅ VTK pipeline initialized")
            
        except Exception as e:
            logger.warning(f"⚠️ VTK initialization failed: {e}")
    
    def _setup_gpu_acceleration(self):
        """Setup GPU acceleration for MPR processing"""
        if self.config.use_gpu_acceleration:
            try:
                # Enable GPU-based volume rendering
                if self.vtk_volume_mapper:
                    self.vtk_volume_mapper.SetUseJittering(True)
                    self.vtk_volume_mapper.SetSampleDistance(0.5)
                
                logger.info("🎮 GPU acceleration enabled for MPR")
                
            except Exception as e:
                logger.warning(f"⚠️ GPU acceleration setup failed: {e}")
    
    async def reconstruct_volume(self, 
                               dicom_series: List[str],
                               reconstruction_types: List[ReconstructionType] = None,
                               custom_params: Dict[str, Any] = None) -> MPRResult:
        """Reconstruct 3D volume from DICOM series"""
        start_time = time.time()
        reconstruction_id = f"mpr_{int(time.time() * 1000)}"
        
        logger.info(f"🔄 Starting MPR reconstruction: {reconstruction_id}")
        
        try:
            # Load and preprocess DICOM series
            volume_data = await self._load_dicom_series(dicom_series)
            
            # Apply preprocessing
            preprocessed_volume = await self._preprocess_volume(volume_data)
            
            # Determine reconstruction types
            if reconstruction_types is None:
                reconstruction_types = [ReconstructionType.MPR, ReconstructionType.VR]
            
            # Perform reconstructions
            reconstructions = {}
            for recon_type in reconstruction_types:
                recon_result = await self._perform_reconstruction(
                    preprocessed_volume, recon_type, custom_params
                )
                reconstructions[recon_type.value] = recon_result
            
            # Generate visualization data
            visualization_data = await self._generate_visualization_data(
                preprocessed_volume, reconstructions
            )
            
            # Create animation frames if requested
            animation_frames = []
            if self.config.enable_cine_mode:
                animation_frames = await self._generate_animation_frames(
                    preprocessed_volume, reconstructions
                )
            
            # Calculate quality metrics
            quality_score = self._calculate_reconstruction_quality(
                preprocessed_volume, reconstructions
            )
            
            # Create result
            processing_time = time.time() - start_time
            
            result = MPRResult(
                reconstruction_id=reconstruction_id,
                reconstruction_type=reconstruction_types[0],  # Primary type
                reconstructed_images=[recon['images'] for recon in reconstructions.values()],
                metadata={
                    'original_series_count': len(dicom_series),
                    'volume_dimensions': preprocessed_volume.shape,
                    'spacing': volume_data.get('spacing', [1.0, 1.0, 1.0]),
                    'origin': volume_data.get('origin', [0.0, 0.0, 0.0])
                },
                reconstruction_time_seconds=processing_time,
                quality_score=quality_score,
                resolution=self.config.output_resolution,
                visualization_data=visualization_data,
                animation_frames=animation_frames,
                processing_parameters={
                    'reconstruction_types': [rt.value for rt in reconstruction_types],
                    'interpolation_method': self.config.interpolation_method.value,
                    'quality_setting': self.config.reconstruction_quality
                }
            )
            
            # Update performance metrics
            self._update_performance_metrics(processing_time, quality_score)
            
            # Cache result if enabled
            if self.config.cache_reconstructions:
                self.reconstruction_cache[reconstruction_id] = result
            
            logger.info(f"✅ MPR reconstruction completed: {reconstruction_id} ({processing_time:.2f}s)")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ MPR reconstruction failed: {reconstruction_id} - {e}")
            raise
    
    async def _load_dicom_series(self, dicom_files: List[str]) -> Dict[str, Any]:
        """Load and organize DICOM series"""
        logger.info(f"📂 Loading {len(dicom_files)} DICOM files...")
        
        try:
            # Read DICOM series using SimpleITK
            reader = sitk.ImageSeriesReader()
            reader.SetFileNames(dicom_files)
            
            # Load volume
            volume_sitk = reader.Execute()
            volume_array = sitk.GetArrayFromImage(volume_sitk)
            
            # Extract metadata
            spacing = volume_sitk.GetSpacing()
            origin = volume_sitk.GetOrigin()
            direction = volume_sitk.GetDirection()
            
            # Get additional DICOM metadata
            sample_dicom = pydicom.dcmread(dicom_files[0])
            
            volume_data = {
                'volume': volume_array,
                'spacing': spacing,
                'origin': origin,
                'direction': direction,
                'modality': getattr(sample_dicom, 'Modality', 'Unknown'),
                'patient_position': getattr(sample_dicom, 'PatientPosition', 'Unknown'),
                'slice_thickness': getattr(sample_dicom, 'SliceThickness', 1.0),
                'pixel_spacing': getattr(sample_dicom, 'PixelSpacing', [1.0, 1.0])
            }
            
            logger.info(f"✅ Loaded volume: {volume_array.shape} with spacing {spacing}")
            
            return volume_data
            
        except Exception as e:
            logger.error(f"❌ Failed to load DICOM series: {e}")
            raise
    
    async def _preprocess_volume(self, volume_data: Dict[str, Any]) -> np.ndarray:
        """Advanced volume preprocessing"""
        volume = volume_data['volume']
        
        logger.info("🔄 Preprocessing volume...")
        
        try:
            # Apply noise reduction if enabled
            if self.config.enable_noise_reduction:
                volume = self._apply_noise_reduction(volume)
            
            # Apply edge enhancement if enabled
            if self.config.enable_edge_enhancement:
                volume = self._apply_edge_enhancement(volume)
            
            # Apply contrast optimization if enabled
            if self.config.enable_contrast_optimization:
                volume = self._apply_contrast_optimization(volume)
            
            # Normalize volume
            volume = self._normalize_volume(volume)
            
            logger.info("✅ Volume preprocessing completed")
            
            return volume
            
        except Exception as e:
            logger.error(f"❌ Volume preprocessing failed: {e}")
            raise
    
    def _apply_noise_reduction(self, volume: np.ndarray) -> np.ndarray:
        """Apply advanced noise reduction"""
        # Use bilateral filter for edge-preserving denoising
        filtered_volume = np.zeros_like(volume)
        
        for i in range(volume.shape[0]):
            filtered_volume[i] = cv2.bilateralFilter(
                volume[i].astype(np.float32), 
                d=5, 
                sigmaColor=50, 
                sigmaSpace=50
            )
        
        return filtered_volume
    
    def _apply_edge_enhancement(self, volume: np.ndarray) -> np.ndarray:
        """Apply edge enhancement"""
        # Use unsharp masking for edge enhancement
        enhanced_volume = np.zeros_like(volume)
        
        for i in range(volume.shape[0]):
            # Create Gaussian blur
            blurred = cv2.GaussianBlur(volume[i], (5, 5), 1.0)
            
            # Apply unsharp mask
            enhanced_volume[i] = volume[i] + 0.5 * (volume[i] - blurred)
        
        return enhanced_volume
    
    def _apply_contrast_optimization(self, volume: np.ndarray) -> np.ndarray:
        """Apply adaptive contrast optimization"""
        # Use CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        
        optimized_volume = np.zeros_like(volume)
        
        for i in range(volume.shape[0]):
            # Convert to uint8 for CLAHE
            slice_8bit = cv2.convertScaleAbs(volume[i])
            
            # Apply CLAHE
            enhanced_slice = clahe.apply(slice_8bit)
            
            # Convert back to original data type
            optimized_volume[i] = enhanced_slice.astype(volume.dtype)
        
        return optimized_volume
    
    def _normalize_volume(self, volume: np.ndarray) -> np.ndarray:
        """Normalize volume intensities"""
        # Normalize to 0-1 range
        vol_min = np.min(volume)
        vol_max = np.max(volume)
        
        if vol_max > vol_min:
            normalized = (volume - vol_min) / (vol_max - vol_min)
        else:
            normalized = volume
        
        return normalized
    
    async def _perform_reconstruction(self, 
                                    volume: np.ndarray,
                                    recon_type: ReconstructionType,
                                    custom_params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform specific type of reconstruction"""
        
        logger.info(f"🔄 Performing {recon_type.value} reconstruction...")
        
        try:
            if recon_type == ReconstructionType.MPR:
                return await self._perform_mpr(volume, custom_params)
            elif recon_type == ReconstructionType.VR:
                return await self._perform_volume_rendering(volume, custom_params)
            elif recon_type == ReconstructionType.MIP:
                return await self._perform_mip(volume, custom_params)
            elif recon_type == ReconstructionType.MINIP:
                return await self._perform_minip(volume, custom_params)
            elif recon_type == ReconstructionType.SSD:
                return await self._perform_ssd(volume, custom_params)
            elif recon_type == ReconstructionType.CURVED_MPR:
                return await self._perform_curved_mpr(volume, custom_params)
            elif recon_type == ReconstructionType.THICK_SLAB:
                return await self._perform_thick_slab(volume, custom_params)
            elif recon_type == ReconstructionType.CINEMATIC_RENDERING:
                return await self._perform_cinematic_rendering(volume, custom_params)
            else:
                raise ValueError(f"Unsupported reconstruction type: {recon_type}")
                
        except Exception as e:
            logger.error(f"❌ {recon_type.value} reconstruction failed: {e}")
            raise
    
    async def _perform_mpr(self, volume: np.ndarray, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform Multi-Planar Reconstruction"""
        
        # Generate orthogonal planes
        sagittal_plane = volume[:, volume.shape[1]//2, :]
        coronal_plane = volume[:, :, volume.shape[2]//2]
        axial_plane = volume[volume.shape[0]//2, :, :]
        
        # Apply interpolation for smooth reconstruction
        if self.config.interpolation_method == InterpolationMethod.LINEAR:
            sagittal_plane = self._apply_linear_interpolation(sagittal_plane)
            coronal_plane = self._apply_linear_interpolation(coronal_plane)
            axial_plane = self._apply_linear_interpolation(axial_plane)
        
        return {
            'images': [sagittal_plane, coronal_plane, axial_plane],
            'plane_names': ['sagittal', 'coronal', 'axial'],
            'reconstruction_type': 'mpr'
        }
    
    async def _perform_volume_rendering(self, volume: np.ndarray, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform Volume Rendering"""
        
        # Create volume rendering using ray casting
        rendered_images = []
        
        # Generate multiple viewing angles
        angles = np.linspace(0, 360, 36)  # 36 views
        
        for angle in angles:
            rendered_view = self._ray_cast_volume(volume, angle)
            rendered_images.append(rendered_view)
        
        return {
            'images': rendered_images,
            'viewing_angles': angles.tolist(),
            'reconstruction_type': 'volume_rendering'
        }
    
    async def _perform_mip(self, volume: np.ndarray, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform Maximum Intensity Projection"""
        
        # MIP along different axes
        mip_x = np.max(volume, axis=0)
        mip_y = np.max(volume, axis=1)
        mip_z = np.max(volume, axis=2)
        
        return {
            'images': [mip_x, mip_y, mip_z],
            'projection_axes': ['x', 'y', 'z'],
            'reconstruction_type': 'mip'
        }
    
    async def _perform_minip(self, volume: np.ndarray, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform Minimum Intensity Projection"""
        
        # MinIP along different axes
        minip_x = np.min(volume, axis=0)
        minip_y = np.min(volume, axis=1)
        minip_z = np.min(volume, axis=2)
        
        return {
            'images': [minip_x, minip_y, minip_z],
            'projection_axes': ['x', 'y', 'z'],
            'reconstruction_type': 'minip'
        }
    
    async def _perform_ssd(self, volume: np.ndarray, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform Shaded Surface Display"""
        
        # Extract isosurfaces using marching cubes
        threshold = np.mean(volume) + np.std(volume)
        
        try:
            vertices, faces, normals, _ = measure.marching_cubes(volume, threshold)
            
            # Create surface rendering
            surface_images = self._render_surface(vertices, faces, normals)
            
            return {
                'images': surface_images,
                'vertices': vertices,
                'faces': faces,
                'normals': normals,
                'reconstruction_type': 'ssd'
            }
            
        except Exception as e:
            logger.warning(f"⚠️ SSD reconstruction failed: {e}")
            # Return empty result
            return {
                'images': [np.zeros(self.config.output_resolution)],
                'reconstruction_type': 'ssd'
            }
    
    async def _perform_curved_mpr(self, volume: np.ndarray, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform Curved Multi-Planar Reconstruction"""
        
        # Define curved path (example: sinusoidal curve)
        curve_length = min(volume.shape)
        t = np.linspace(0, 1, curve_length)
        
        # Create curved path through volume
        x_curve = (volume.shape[0] // 2) * (1 + 0.3 * np.sin(4 * np.pi * t))
        y_curve = t * volume.shape[1]
        z_curve = (volume.shape[2] // 2) * np.ones_like(t)
        
        # Sample along curve
        curved_reconstruction = self._sample_along_curve(volume, x_curve, y_curve, z_curve)
        
        return {
            'images': [curved_reconstruction],
            'curve_path': {'x': x_curve, 'y': y_curve, 'z': z_curve},
            'reconstruction_type': 'curved_mpr'
        }
    
    async def _perform_thick_slab(self, volume: np.ndarray, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform Thick Slab Reconstruction"""
        
        slab_thickness = params.get('slab_thickness', 10) if params else 10
        
        thick_slabs = []
        
        # Generate thick slabs by averaging multiple slices
        for i in range(0, volume.shape[0] - slab_thickness, slab_thickness // 2):
            slab = np.mean(volume[i:i+slab_thickness], axis=0)
            thick_slabs.append(slab)
        
        return {
            'images': thick_slabs,
            'slab_thickness': slab_thickness,
            'reconstruction_type': 'thick_slab'
        }
    
    async def _perform_cinematic_rendering(self, volume: np.ndarray, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Perform Cinematic Rendering (advanced lighting and shading)"""
        
        # Apply advanced lighting model
        cinematic_images = []
        
        # Multiple lighting configurations
        light_configs = [
            {'direction': [1, 1, 1], 'intensity': 0.8},
            {'direction': [-1, 1, 1], 'intensity': 0.6},
            {'direction': [0, -1, 1], 'intensity': 0.4}
        ]
        
        for light_config in light_configs:
            rendered_image = self._apply_cinematic_lighting(volume, light_config)
            cinematic_images.append(rendered_image)
        
        return {
            'images': cinematic_images,
            'lighting_configs': light_configs,
            'reconstruction_type': 'cinematic_rendering'
        }
    
    def _apply_linear_interpolation(self, image: np.ndarray) -> np.ndarray:
        """Apply linear interpolation to smooth image"""
        from scipy.interpolate import interp2d
        
        # Create interpolation function
        x = np.arange(image.shape[1])
        y = np.arange(image.shape[0])
        
        # Interpolate to higher resolution
        new_x = np.linspace(0, image.shape[1]-1, self.config.output_resolution[1])
        new_y = np.linspace(0, image.shape[0]-1, self.config.output_resolution[0])
        
        f = interp2d(x, y, image, kind='linear')
        interpolated = f(new_x, new_y)
        
        return interpolated
    
    def _ray_cast_volume(self, volume: np.ndarray, viewing_angle: float) -> np.ndarray:
        """Perform ray casting for volume rendering"""
        
        # Simplified ray casting implementation
        # In production, this would use advanced GPU-based ray casting
        
        # Rotate volume
        rotated_volume = ndimage.rotate(volume, viewing_angle, axes=(1, 2), reshape=False)
        
        # Project along depth axis
        projection = np.max(rotated_volume, axis=0)
        
        # Resize to output resolution
        resized = cv2.resize(projection, self.config.output_resolution)
        
        return resized
    
    def _render_surface(self, vertices: np.ndarray, faces: np.ndarray, normals: np.ndarray) -> List[np.ndarray]:
        """Render 3D surface from mesh data"""
        
        # Simplified surface rendering
        # In production, this would use VTK or similar for advanced rendering
        
        rendered_images = []
        
        # Generate views from different angles
        for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
            # Project 3D points to 2D
            projected_image = self._project_surface_to_2d(vertices, faces, angle)
            rendered_images.append(projected_image)
        
        return rendered_images
    
    def _project_surface_to_2d(self, vertices: np.ndarray, faces: np.ndarray, angle: float) -> np.ndarray:
        """Project 3D surface to 2D image"""
        
        # Simple orthographic projection
        cos_a = np.cos(np.radians(angle))
        sin_a = np.sin(np.radians(angle))
        
        # Rotation matrix
        rotation_matrix = np.array([
            [cos_a, -sin_a, 0],
            [sin_a, cos_a, 0],
            [0, 0, 1]
        ])
        
        # Rotate vertices
        rotated_vertices = vertices @ rotation_matrix.T
        
        # Project to 2D
        x_proj = rotated_vertices[:, 0]
        y_proj = rotated_vertices[:, 1]
        
        # Create 2D image
        image = np.zeros(self.config.output_resolution)
        
        # Normalize coordinates to image size
        x_norm = ((x_proj - x_proj.min()) / (x_proj.max() - x_proj.min()) * (self.config.output_resolution[1] - 1)).astype(int)
        y_norm = ((y_proj - y_proj.min()) / (y_proj.max() - y_proj.min()) * (self.config.output_resolution[0] - 1)).astype(int)
        
        # Draw points
        for x, y in zip(x_norm, y_norm):
            if 0 <= x < self.config.output_resolution[1] and 0 <= y < self.config.output_resolution[0]:
                image[y, x] = 1.0
        
        return image
    
    def _sample_along_curve(self, volume: np.ndarray, x_curve: np.ndarray, y_curve: np.ndarray, z_curve: np.ndarray) -> np.ndarray:
        """Sample volume along curved path"""
        
        # Create interpolator
        coords = np.array([np.arange(volume.shape[0]), 
                          np.arange(volume.shape[1]), 
                          np.arange(volume.shape[2])])
        
        interpolator = RegularGridInterpolator(coords, volume, method='linear', bounds_error=False, fill_value=0)
        
        # Sample along curve
        curve_points = np.column_stack([x_curve, y_curve, z_curve])
        sampled_values = interpolator(curve_points)
        
        # Reshape to 2D image
        curved_image = sampled_values.reshape(len(sampled_values), 1)
        curved_image = np.tile(curved_image, (1, 50))  # Make it wider for visualization
        
        return curved_image
    
    def _apply_cinematic_lighting(self, volume: np.ndarray, light_config: Dict[str, Any]) -> np.ndarray:
        """Apply cinematic lighting to volume"""
        
        # Calculate gradients for surface normals
        grad_x, grad_y, grad_z = np.gradient(volume)
        
        # Normalize gradients
        gradient_magnitude = np.sqrt(grad_x**2 + grad_y**2 + grad_z**2)
        gradient_magnitude[gradient_magnitude == 0] = 1  # Avoid division by zero
        
        normal_x = grad_x / gradient_magnitude
        normal_y = grad_y / gradient_magnitude
        normal_z = grad_z / gradient_magnitude
        
        # Light direction
        light_dir = np.array(light_config['direction'])
        light_dir = light_dir / np.linalg.norm(light_dir)
        
        # Calculate lighting
        lighting = (normal_x * light_dir[0] + 
                   normal_y * light_dir[1] + 
                   normal_z * light_dir[2])
        
        # Apply lighting intensity
        lighting = np.clip(lighting * light_config['intensity'], 0, 1)
        
        # Combine with original volume
        lit_volume = volume * lighting
        
        # Project to 2D
        projection = np.max(lit_volume, axis=0)
        
        # Resize to output resolution
        resized = cv2.resize(projection, self.config.output_resolution)
        
        return resized
    
    async def _generate_visualization_data(self, volume: np.ndarray, reconstructions: Dict[str, Any]) -> Dict[str, Any]:
        """Generate data for interactive visualization"""
        
        visualization_data = {
            'volume_statistics': {
                'min_value': float(np.min(volume)),
                'max_value': float(np.max(volume)),
                'mean_value': float(np.mean(volume)),
                'std_value': float(np.std(volume)),
                'volume_shape': volume.shape
            },
            'reconstruction_info': {},
            'interactive_controls': {
                'window_level_range': [float(np.min(volume)), float(np.max(volume))],
                'window_width_range': [1.0, float(np.max(volume) - np.min(volume))],
                'available_color_maps': ['gray', 'hot', 'jet', 'bone', 'cool'],
                'rotation_angles': list(range(0, 360, 15))
            }
        }
        
        # Add reconstruction-specific info
        for recon_type, recon_data in reconstructions.items():
            visualization_data['reconstruction_info'][recon_type] = {
                'num_images': len(recon_data['images']),
                'image_shapes': [img.shape for img in recon_data['images']],
                'reconstruction_type': recon_data['reconstruction_type']
            }
        
        return visualization_data
    
    async def _generate_animation_frames(self, volume: np.ndarray, reconstructions: Dict[str, Any]) -> List[np.ndarray]:
        """Generate animation frames for cine mode"""
        
        animation_frames = []
        
        # Create rotation animation
        for angle in range(0, 360, 360 // (self.config.animation_fps * 2)):  # 2 second rotation
            frame = self._ray_cast_volume(volume, angle)
            animation_frames.append(frame)
        
        return animation_frames
    
    def _calculate_reconstruction_quality(self, volume: np.ndarray, reconstructions: Dict[str, Any]) -> float:
        """Calculate reconstruction quality score"""
        
        # Calculate quality based on various metrics
        quality_metrics = []
        
        # Sharpness metric
        for recon_type, recon_data in reconstructions.items():
            for image in recon_data['images']:
                if isinstance(image, np.ndarray) and image.size > 0:
                    # Calculate Laplacian variance (sharpness)
                    laplacian_var = cv2.Laplacian(image.astype(np.float32), cv2.CV_64F).var()
                    quality_metrics.append(laplacian_var)
        
        # Overall quality score
        if quality_metrics:
            quality_score = np.mean(quality_metrics) / 1000.0  # Normalize
            quality_score = np.clip(quality_score, 0.0, 1.0)
        else:
            quality_score = 0.5  # Default score
        
        return float(quality_score)
    
    def _update_performance_metrics(self, processing_time: float, quality_score: float):
        """Update performance metrics"""
        self.performance_metrics['reconstructions_completed'] += 1
        self.performance_metrics['total_processing_time'] += processing_time
        
        # Update average quality score
        total_recons = self.performance_metrics['reconstructions_completed']
        current_avg = self.performance_metrics['average_quality_score']
        self.performance_metrics['average_quality_score'] = (
            (current_avg * (total_recons - 1) + quality_score) / total_recons
        )
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics"""
        metrics = self.performance_metrics.copy()
        
        # Calculate derived metrics
        if metrics['reconstructions_completed'] > 0:
            metrics['average_processing_time'] = (
                metrics['total_processing_time'] / metrics['reconstructions_completed']
            )
        else:
            metrics['average_processing_time'] = 0.0
        
        # Cache metrics
        metrics['cache_size'] = len(self.reconstruction_cache)
        metrics['volume_cache_size'] = len(self.volume_cache)
        
        return metrics
    
    def clear_cache(self):
        """Clear reconstruction cache"""
        self.reconstruction_cache.clear()
        self.volume_cache.clear()
        self.preprocessing_cache.clear()
        logger.info("🧹 MPR cache cleared")

# Factory functions
def create_advanced_mpr_processor(config: MPRConfig = None) -> AdvancedMPRProcessor:
    """Create advanced MPR processor"""
    return AdvancedMPRProcessor(config)

def create_high_quality_config() -> MPRConfig:
    """Create high-quality MPR configuration"""
    return MPRConfig(
        reconstruction_type=ReconstructionType.MPR,
        interpolation_method=InterpolationMethod.LINEAR,
        output_resolution=(1024, 1024),
        slice_thickness_mm=0.5,
        reconstruction_quality="ultra",
        use_gpu_acceleration=True,
        enable_multiprocessing=True,
        enable_ai_enhancement=True,
        enable_noise_reduction=True,
        enable_edge_enhancement=True,
        enable_contrast_optimization=True,
        enable_cine_mode=True,
        animation_fps=30
    )

# Example usage and testing
async def main():
    """Example usage of advanced MPR engine"""
    print("🚀 Initializing Advanced MPR Engine...")
    
    # Create high-quality configuration
    config = create_high_quality_config()
    
    # Create MPR processor
    mpr_processor = create_advanced_mpr_processor(config)
    
    # Example DICOM files (would be real paths in production)
    dicom_files = [f"series_{i:03d}.dcm" for i in range(100)]
    
    print("🔄 Running MPR reconstruction...")
    
    try:
        # Run reconstruction
        result = await mpr_processor.reconstruct_volume(
            dicom_files,
            reconstruction_types=[
                ReconstructionType.MPR,
                ReconstructionType.VR,
                ReconstructionType.MIP
            ]
        )
        
        print(f"✅ Reconstruction completed: {result.reconstruction_id}")
        print(f"📊 Processing time: {result.reconstruction_time_seconds:.2f}s")
        print(f"🎯 Quality score: {result.quality_score:.3f}")
        print(f"📐 Resolution: {result.resolution}")
        
        # Get performance metrics
        metrics = mpr_processor.get_performance_metrics()
        print(f"📈 Performance metrics: {metrics}")
        
    except Exception as e:
        print(f"❌ Example failed (expected without real DICOM files): {e}")

if __name__ == "__main__":
    asyncio.run(main())