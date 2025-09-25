import numpy as np
import os
import tempfile
import zipfile
import json
from skimage import measure, morphology
from scipy import ndimage
import pydicom
import logging
from PIL import Image
from django.conf import settings

logger = logging.getLogger(__name__)


class BaseProcessor:
    """Base class for all reconstruction processors"""

    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()

    def load_series_volume(self, series):
        images = series.images.all().order_by('instance_number')
        if not images:
            raise ValueError("No images found in series")
        first_path = os.path.join(settings.MEDIA_ROOT, images[0].file_path.name)
        first_dicom = pydicom.dcmread(first_path)
        rows, cols = first_dicom.Rows, first_dicom.Columns
        volume = np.zeros((len(images), rows, cols), dtype=np.float32)
        spacing = []
        for i, image in enumerate(images):
            dicom_path = os.path.join(settings.MEDIA_ROOT, image.file_path.name)
            ds = pydicom.dcmread(dicom_path)
            pixel_array = ds.pixel_array.astype(np.float32)
            slope = getattr(ds, 'RescaleSlope', 1.0)
            intercept = getattr(ds, 'RescaleIntercept', 0.0)
            pixel_array = pixel_array * slope + intercept
            volume[i] = pixel_array
            if i == 0:
                pixel_spacing = getattr(ds, 'PixelSpacing', [1.0, 1.0])
                if pixel_spacing is None:
                    pixel_spacing = [1.0, 1.0]
                slice_thickness = getattr(ds, 'SliceThickness', 1.0)
                spacing = [float(slice_thickness), float(pixel_spacing[0]), float(pixel_spacing[1])]
        return volume, spacing

    def save_result(self, result_data, filename):
        result_path = os.path.join(self.temp_dir, filename)
        if isinstance(result_data, dict):
            zip_path = result_path + '.zip'
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for name, data in result_data.items():
                    if isinstance(data, np.ndarray):
                        temp_file = os.path.join(self.temp_dir, name)
                        if data.ndim == 2:
                            Image.fromarray(data.astype(np.uint8)).save(temp_file)
                        else:
                            np.save(temp_file, data)
                        zipf.write(temp_file, name)
                    else:
                        temp_file = os.path.join(self.temp_dir, name)
                        with open(temp_file, 'w') as f:
                            if isinstance(data, (dict, list)):
                                json.dump(data, f)
                            else:
                                f.write(str(data))
                        zipf.write(temp_file, name)
            return zip_path
        else:
            if isinstance(result_data, np.ndarray):
                np.save(result_path, result_data)
            else:
                with open(result_path, 'w') as f:
                    if isinstance(result_data, (dict, list)):
                        json.dump(result_data, f)
                    else:
                        f.write(str(result_data))
            return result_path


class MPRProcessor(BaseProcessor):
    def process_series(self, series, parameters):
        try:
            volume, spacing = self.load_series_volume(series)
            slice_thickness = parameters.get('slice_thickness', 1.0)
            interpolation = parameters.get('interpolation', 'linear')
            output_size = parameters.get('output_size', None)
            mpr_results = self.generate_mpr_views(volume, spacing, slice_thickness, interpolation, output_size)
            result_path = self.save_result(mpr_results, f'mpr_reconstruction_{series.id}')
            return result_path
        except Exception as e:
            logger.error(f"MPR reconstruction failed: {str(e)}")
            raise

    def generate_mpr_views(self, volume, spacing, slice_thickness, interpolation, output_size):
        depth, height, width = volume.shape
        results = {}
        axial_slices = []
        step = max(1, int(slice_thickness))
        for i in range(0, depth, step):
            axial_slices.append(self.normalize_slice(volume[i]))
        results['axial'] = np.array(axial_slices)
        sagittal_slices = []
        for i in range(0, width, step):
            sagittal_slice = volume[:, :, i]
            if interpolation == 'linear':
                sagittal_slice = ndimage.zoom(sagittal_slice, [spacing[0] / max(spacing[1], 1e-6), 1.0], order=1)
            sagittal_slices.append(self.normalize_slice(sagittal_slice))
        results['sagittal'] = np.array(sagittal_slices)
        coronal_slices = []
        for i in range(0, height, step):
            coronal_slice = volume[:, i, :]
            if interpolation == 'linear':
                coronal_slice = ndimage.zoom(coronal_slice, [spacing[0] / max(spacing[2], 1e-6), 1.0], order=1)
            coronal_slices.append(self.normalize_slice(coronal_slice))
        results['coronal'] = np.array(coronal_slices)
        results['metadata.json'] = {
            'original_spacing': spacing,
            'slice_thickness': slice_thickness,
            'interpolation': interpolation,
            'volume_shape': volume.shape,
            'axial_slices': len(axial_slices),
            'sagittal_slices': len(sagittal_slices),
            'coronal_slices': len(coronal_slices),
        }
        return results

    def normalize_slice(self, slice_data):
        min_val, max_val = np.min(slice_data), np.max(slice_data)
        if max_val > min_val:
            normalized = (slice_data - min_val) / (max_val - min_val) * 255
        else:
            normalized = slice_data
        return normalized.astype(np.uint8)


class MIPProcessor(BaseProcessor):
    def process_series(self, series, parameters):
        try:
            volume, spacing = self.load_series_volume(series)
            projection_type = parameters.get('projection_type', 'maximum')
            slab_thickness = parameters.get('slab_thickness', None)
            angle_step = parameters.get('angle_step', 10)
            mip_results = self.generate_mip_views(volume, spacing, projection_type, slab_thickness, angle_step)
            result_path = self.save_result(mip_results, f'mip_reconstruction_{series.id}')
            return result_path
        except Exception as e:
            logger.error(f"MIP reconstruction failed: {str(e)}")
            raise

    def generate_mip_views(self, volume, spacing, projection_type, slab_thickness, angle_step):
        results = {}
        if projection_type == 'maximum':
            proj_func = np.max
        elif projection_type == 'minimum':
            proj_func = np.min
        else:
            proj_func = np.mean
        axial_mip = proj_func(volume, axis=0)
        results['axial_mip'] = self.normalize_slice(axial_mip)
        sagittal_mip = proj_func(volume, axis=2)
        results['sagittal_mip'] = self.normalize_slice(sagittal_mip)
        coronal_mip = proj_func(volume, axis=1)
        results['coronal_mip'] = self.normalize_slice(coronal_mip)
        if angle_step and angle_step > 0:
            results.update(self.generate_rotating_mip(volume, angle_step, proj_func))
        if slab_thickness:
            results.update(self.generate_slab_mip(volume, slab_thickness, proj_func))
        results['metadata.json'] = {
            'projection_type': projection_type,
            'slab_thickness': slab_thickness,
            'angle_step': angle_step,
            'volume_shape': volume.shape,
            'spacing': spacing,
        }
        return results

    def generate_rotating_mip(self, volume, angle_step, proj_func):
        results = {}
        for angle in range(0, 360, angle_step):
            rotated_volume = ndimage.rotate(volume, angle, axes=(1, 2), reshape=False)
            mip = proj_func(rotated_volume, axis=2)
            results[f'rotating_mip_{angle:03d}'] = self.normalize_slice(mip)
        return results

    def generate_slab_mip(self, volume, slab_thickness, proj_func):
        results = {}
        depth = volume.shape[0]
        step = max(1, slab_thickness // 2)
        for i in range(0, depth - slab_thickness + 1, step):
            slab = volume[i:i + slab_thickness]
            slab_mip = proj_func(slab, axis=0)
            results[f'slab_mip_{i:03d}'] = self.normalize_slice(slab_mip)
        return results

    def normalize_slice(self, slice_data):
        min_val, max_val = np.min(slice_data), np.max(slice_data)
        if max_val > min_val:
            normalized = (slice_data - min_val) / (max_val - min_val) * 255
        else:
            normalized = slice_data
        return normalized.astype(np.uint8)


class Bone3DProcessor(BaseProcessor):
    def process_series(self, series, parameters):
        try:
            volume, spacing = self.load_series_volume(series)
            threshold = parameters.get('threshold', 200)
            smoothing = parameters.get('smoothing', True)
            decimation = parameters.get('decimation', 0.8)
            bone_results = self.generate_bone_reconstruction(volume, spacing, threshold, smoothing, decimation)
            result_path = self.save_result(bone_results, f'bone_3d_reconstruction_{series.id}')
            return result_path
        except Exception as e:
            logger.error(f"Bone 3D reconstruction failed: {str(e)}")
            raise

    def generate_bone_reconstruction(self, volume, spacing, threshold, smoothing, decimation):
        results = {}
        
        # Enhanced bone segmentation with adaptive thresholding
        if threshold == 200:  # Default threshold, use adaptive
            # Calculate adaptive threshold based on volume statistics
            volume_mean = np.mean(volume)
            volume_std = np.std(volume)
            threshold = max(volume_mean + 1.5 * volume_std, 150)
            logger.info(f"Using adaptive bone threshold: {threshold}")
        
        bone_mask = volume > threshold
        
        # Enhanced morphological operations for better bone extraction
        if smoothing:
            # Use larger structuring elements for better connectivity
            bone_mask = morphology.binary_closing(bone_mask, morphology.ball(3))
            bone_mask = morphology.binary_opening(bone_mask, morphology.ball(2))
            # Fill small holes in bone structures
            bone_mask = morphology.binary_fill_holes(bone_mask)
        
        # Remove small disconnected components
        bone_mask = morphology.remove_small_objects(bone_mask, min_size=1000)
        
        try:
            # Enhanced marching cubes with better parameters
            verts, faces, normals, values = measure.marching_cubes(
                bone_mask.astype(np.float32), 
                level=0.5, 
                spacing=spacing,
                step_size=1,  # Higher quality mesh
                allow_degenerate=False
            )
            
            if len(verts) == 0:
                raise ValueError("No vertices generated from marching cubes")
            
            logger.info(f"Generated mesh: {len(verts)} vertices, {len(faces)} faces")
            
            if decimation < 1.0 and len(faces) > 10000:  # Only decimate large meshes
                original_faces = len(faces)
                verts, faces = self.decimate_mesh(verts, faces, decimation)
                logger.info(f"Decimated mesh: {original_faces} -> {len(faces)} faces")
            
            results['vertices.npy'] = verts
            results['faces.npy'] = faces
            results['normals.npy'] = normals
            results['bone_mesh.vtk'] = self.create_vtk_mesh(verts, faces, normals)
            results.update(self.generate_preview_images(bone_mask))
            
            # Generate additional visualization formats
            results['bone_mesh.obj'] = self.create_obj_mesh(verts, faces, normals)
            results.update(self.generate_cross_sections(bone_mask, spacing))
            
        except Exception as e:
            logger.error(f"Marching cubes failed: {str(e)}")
            # Enhanced fallback volume rendering
            results.update(self.generate_enhanced_volume_rendering(bone_mask, spacing))
            results['reconstruction_method'] = 'volume_rendering'
        
        results['metadata.json'] = {
            'threshold': threshold,
            'smoothing': smoothing,
            'decimation': decimation,
            'volume_shape': volume.shape,
            'spacing': spacing,
            'num_vertices': int(len(results.get('vertices.npy', []))),
            'num_faces': int(len(results.get('faces.npy', []))),
            'reconstruction_quality': 'enhanced',
        }
        return results

    def decimate_mesh(self, vertices, faces, reduction_factor):
        num_faces_keep = int(len(faces) * reduction_factor)
        if num_faces_keep <= 0:
            return vertices, faces
        keep_indices = np.random.choice(len(faces), num_faces_keep, replace=False)
        decimated_faces = faces[keep_indices]
        unique_verts = np.unique(decimated_faces.flatten())
        vertex_map = {old_idx: new_idx for new_idx, old_idx in enumerate(unique_verts)}
        decimated_vertices = vertices[unique_verts]
        for i in range(len(decimated_faces)):
            for j in range(3):
                decimated_faces[i, j] = vertex_map[decimated_faces[i, j]]
        return decimated_vertices, decimated_faces

    def create_vtk_mesh(self, vertices, faces, normals):
        vtk_content = "# vtk DataFile Version 3.0\n"
        vtk_content += "Bone 3D Reconstruction\n"
        vtk_content += "ASCII\n"
        vtk_content += "DATASET POLYDATA\n"
        vtk_content += f"POINTS {len(vertices)} float\n"
        for vertex in vertices:
            vtk_content += f"{vertex[0]} {vertex[1]} {vertex[2]}\n"
        vtk_content += f"POLYGONS {len(faces)} {len(faces) * 4}\n"
        for face in faces:
            vtk_content += f"3 {face[0]} {face[1]} {face[2]}\n"
        if normals is not None and len(normals) == len(vertices):
            vtk_content += f"POINT_DATA {len(vertices)}\n"
            vtk_content += "NORMALS normals float\n"
            for normal in normals:
                vtk_content += f"{normal[0]} {normal[1]} {normal[2]}\n"
        return vtk_content

    def generate_preview_images(self, bone_mask):
        results = {}
        axial_proj = np.max(bone_mask, axis=0) * 255
        results['bone_axial_preview'] = axial_proj.astype(np.uint8)
        sagittal_proj = np.max(bone_mask, axis=2) * 255
        results['bone_sagittal_preview'] = sagittal_proj.astype(np.uint8)
        coronal_proj = np.max(bone_mask, axis=1) * 255
        results['bone_coronal_preview'] = coronal_proj.astype(np.uint8)
        return results

    def generate_volume_rendering(self, volume_mask):
        renderings = {}
        for angle in [0, 45, 90, 135]:
            rotated = ndimage.rotate(volume_mask.astype(np.float32), angle, axes=(0, 2), reshape=False)
            rendering = np.max(rotated, axis=0) * 255
            renderings[f'volume_render_{angle}'] = rendering.astype(np.uint8)
        return renderings

    def generate_enhanced_volume_rendering(self, volume_mask, spacing):
        """Enhanced volume rendering with multiple projections and better quality"""
        renderings = {}
        
        # Generate high-quality volume renderings from multiple angles
        angles = [0, 30, 45, 60, 90, 120, 135, 150, 180]
        for angle in angles:
            try:
                # Apply spacing-aware rotation
                rotated = ndimage.rotate(volume_mask.astype(np.float32), angle, axes=(0, 2), reshape=False)
                
                # Enhanced projection with depth information
                projection = np.max(rotated, axis=0)
                depth_map = np.argmax(rotated, axis=0) / rotated.shape[0]
                
                # Combine intensity and depth for better visualization
                enhanced_projection = projection * (1 + 0.3 * depth_map)
                rendering = np.clip(enhanced_projection * 255, 0, 255)
                
                renderings[f'enhanced_volume_render_{angle}'] = rendering.astype(np.uint8)
            except Exception as e:
                logger.warning(f"Failed to generate volume rendering at angle {angle}: {e}")
        
        # Generate orthogonal projections
        renderings['volume_axial'] = (np.max(volume_mask, axis=0) * 255).astype(np.uint8)
        renderings['volume_sagittal'] = (np.max(volume_mask, axis=2) * 255).astype(np.uint8)
        renderings['volume_coronal'] = (np.max(volume_mask, axis=1) * 255).astype(np.uint8)
        
        return renderings

    def create_obj_mesh(self, vertices, faces, normals):
        """Create OBJ format mesh file"""
        obj_content = "# Bone 3D Reconstruction OBJ File\n"
        obj_content += f"# {len(vertices)} vertices, {len(faces)} faces\n\n"
        
        # Write vertices
        for vertex in vertices:
            obj_content += f"v {vertex[0]} {vertex[1]} {vertex[2]}\n"
        
        # Write normals if available
        if normals is not None and len(normals) == len(vertices):
            for normal in normals:
                obj_content += f"vn {normal[0]} {normal[1]} {normal[2]}\n"
        
        # Write faces (OBJ uses 1-based indexing)
        for face in faces:
            if normals is not None and len(normals) == len(vertices):
                obj_content += f"f {face[0]+1}//{face[0]+1} {face[1]+1}//{face[1]+1} {face[2]+1}//{face[2]+1}\n"
            else:
                obj_content += f"f {face[0]+1} {face[1]+1} {face[2]+1}\n"
        
        return obj_content

    def generate_cross_sections(self, volume_mask, spacing):
        """Generate cross-sectional views of the 3D reconstruction"""
        results = {}
        depth, height, width = volume_mask.shape
        
        # Generate cross-sections at regular intervals
        for i, plane in enumerate(['axial', 'sagittal', 'coronal']):
            sections = []
            
            if plane == 'axial':
                for z in range(0, depth, max(1, depth // 10)):
                    section = volume_mask[z, :, :] * 255
                    sections.append(section.astype(np.uint8))
            elif plane == 'sagittal':
                for x in range(0, width, max(1, width // 10)):
                    section = volume_mask[:, :, x] * 255
                    sections.append(section.astype(np.uint8))
            elif plane == 'coronal':
                for y in range(0, height, max(1, height // 10)):
                    section = volume_mask[:, y, :] * 255
                    sections.append(section.astype(np.uint8))
            
            results[f'{plane}_cross_sections'] = np.array(sections)
        
        return results


class MRI3DProcessor(BaseProcessor):
    def process_series(self, series, parameters):
        try:
            volume, spacing = self.load_series_volume(series)
            segmentation_method = parameters.get('segmentation_method', 'threshold')
            tissue_type = parameters.get('tissue_type', 'brain')
            smoothing = parameters.get('smoothing', True)
            mri_results = self.generate_mri_reconstruction(volume, spacing, segmentation_method, tissue_type, smoothing)
            result_path = self.save_result(mri_results, f'mri_3d_reconstruction_{series.id}')
            return result_path
        except Exception as e:
            logger.error(f"MRI 3D reconstruction failed: {str(e)}")
            raise

    def generate_mri_reconstruction(self, volume, spacing, segmentation_method, tissue_type, smoothing):
        results = {}
        if tissue_type == 'brain':
            tissue_mask = self.segment_brain_tissue(volume, segmentation_method)
        elif tissue_type == 'soft_tissue':
            tissue_mask = self.segment_soft_tissue(volume, segmentation_method)
        else:
            tissue_mask = self.segment_generic_tissue(volume, segmentation_method)
        if smoothing:
            tissue_mask = ndimage.gaussian_filter(tissue_mask.astype(np.float32), sigma=1.0)
            tissue_mask = tissue_mask > 0.5
        try:
            verts, faces, normals, values = measure.marching_cubes(
                tissue_mask.astype(np.float32), level=0.5, spacing=spacing
            )
            results['vertices.npy'] = verts
            results['faces.npy'] = faces
            results['normals.npy'] = normals
            results['mri_mesh.vtk'] = self.create_vtk_mesh(verts, faces, normals)
        except Exception as e:
            logger.error(f"MRI mesh generation failed: {str(e)}")
        results.update(self.generate_contrast_views(volume, tissue_mask))
        results.update(self.generate_preview_images(tissue_mask, volume))
        results['metadata.json'] = {
            'segmentation_method': segmentation_method,
            'tissue_type': tissue_type,
            'smoothing': smoothing,
            'volume_shape': volume.shape,
            'spacing': spacing,
            'num_vertices': int(len(results.get('vertices.npy', []))),
            'num_faces': int(len(results.get('faces.npy', []))),
        }
        return results

    def segment_brain_tissue(self, volume, method):
        if method == 'threshold':
            mean_intensity = np.mean(volume)
            std_intensity = np.std(volume)
            threshold = mean_intensity + 0.5 * std_intensity
            return volume > threshold
        elif method == 'otsu':
            from skimage.filters import threshold_otsu
            threshold = threshold_otsu(volume)
            return volume > threshold
        elif method == 'watershed':
            from skimage.segmentation import watershed
            from skimage.feature import peak_local_max
            local_maxima = peak_local_max(volume, min_distance=10, threshold_abs=0.3 * np.max(volume))
            markers = np.zeros(volume.shape, dtype=np.int32)
            for i, coords in enumerate(local_maxima):
                markers[tuple(coords)] = i + 1
            segmented = watershed(-volume, markers, mask=volume > 0.1 * np.max(volume))
            return segmented > 0
        else:
            return volume > 0.3 * np.max(volume)

    def segment_soft_tissue(self, volume, method):
        if method == 'threshold':
            min_threshold = 0.2 * np.max(volume)
            max_threshold = 0.8 * np.max(volume)
            return (volume > min_threshold) & (volume < max_threshold)
        else:
            return (volume > 0.2 * np.max(volume)) & (volume < 0.8 * np.max(volume))

    def segment_generic_tissue(self, volume, method):
        if method == 'threshold':
            threshold = 0.3 * np.max(volume)
            return volume > threshold
        else:
            return volume > 0.3 * np.max(volume)

    def generate_contrast_views(self, volume, tissue_mask):
        results = {}
        t1_sim = volume.copy()
        t1_sim[tissue_mask] = t1_sim[tissue_mask] * 1.2
        results['t1_simulation'] = self.normalize_volume(t1_sim)
        t2_sim = volume.copy()
        t2_sim = np.max(volume) - t2_sim
        t2_sim[tissue_mask] = t2_sim[tissue_mask] * 0.8
        results['t2_simulation'] = self.normalize_volume(t2_sim)
        flair_sim = volume.copy()
        high_intensity_mask = volume > 0.8 * np.max(volume)
        flair_sim[high_intensity_mask] = flair_sim[high_intensity_mask] * 0.3
        results['flair_simulation'] = self.normalize_volume(flair_sim)
        return results

    def generate_preview_images(self, tissue_mask, original_volume):
        results = {}
        depth, height, width = tissue_mask.shape
        mid_axial = depth // 2
        mid_sagittal = width // 2
        mid_coronal = height // 2
        axial_overlay = self.create_overlay(original_volume[mid_axial], tissue_mask[mid_axial])
        sagittal_overlay = self.create_overlay(original_volume[:, :, mid_sagittal], tissue_mask[:, :, mid_sagittal])
        coronal_overlay = self.create_overlay(original_volume[:, mid_coronal, :], tissue_mask[:, mid_coronal, :])
        results['axial_overlay'] = axial_overlay
        results['sagittal_overlay'] = sagittal_overlay
        results['coronal_overlay'] = coronal_overlay
        results['tissue_axial_projection'] = (np.max(tissue_mask, axis=0) * 255).astype(np.uint8)
        results['tissue_sagittal_projection'] = (np.max(tissue_mask, axis=2) * 255).astype(np.uint8)
        results['tissue_coronal_projection'] = (np.max(tissue_mask, axis=1) * 255).astype(np.uint8)
        return results

    def create_overlay(self, background, mask):
        bg_norm = self.normalize_slice(background)
        overlay = np.stack([bg_norm, bg_norm, bg_norm], axis=-1)
        mask_norm = (mask > 0).astype(np.float32)
        overlay[:, :, 0] = np.minimum(255, overlay[:, :, 0] + mask_norm * 100)
        return overlay.astype(np.uint8)

    def normalize_slice(self, slice_data):
        min_val, max_val = np.min(slice_data), np.max(slice_data)
        if max_val > min_val:
            normalized = (slice_data - min_val) / (max_val - min_val) * 255
        else:
            normalized = slice_data
        return normalized.astype(np.uint8)

    def normalize_volume(self, volume):
        min_val, max_val = np.min(volume), np.max(volume)
        if max_val > min_val:
            normalized = (volume - min_val) / (max_val - min_val) * 255
        else:
            normalized = volume
        return normalized.astype(np.uint8)

    def create_vtk_mesh(self, vertices, faces, normals):
        vtk_content = "# vtk DataFile Version 3.0\n"
        vtk_content += "MRI 3D Reconstruction\n"
        vtk_content += "ASCII\n"
        vtk_content += "DATASET POLYDATA\n"
        vtk_content += f"POINTS {len(vertices)} float\n"
        for vertex in vertices:
            vtk_content += f"{vertex[0]} {vertex[1]} {vertex[2]}\n"
        vtk_content += f"POLYGONS {len(faces)} {len(faces) * 4}\n"
        for face in faces:
            vtk_content += f"3 {face[0]} {face[1]} {face[2]}\n"
        if normals is not None and len(normals) == len(vertices):
            vtk_content += f"POINT_DATA {len(vertices)}\n"
            vtk_content += "NORMALS normals float\n"
            for normal in normals:
                vtk_content += f"{normal[0]} {normal[1]} {normal[2]}\n"
        return vtk_content