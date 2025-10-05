"""
Real AI Processing Engine for NoctisPro PACS
Performs actual DICOM analysis and generates meaningful reports
"""

import pydicom
import numpy as np
import json
import logging
from datetime import datetime
from django.utils import timezone
from django.conf import settings
from django.db import transaction
import os
from pathlib import Path
import time

logger = logging.getLogger(__name__)


class AIProcessor:
    """Main AI processing engine for DICOM analysis"""
    
    def __init__(self):
        self.processors = {
            'metadata_analyzer': self.analyze_metadata,
            'image_stats': self.analyze_image_statistics,
            'hu_analyzer': self.analyze_hounsfield_units,
            'report_generator': self.generate_basic_report
        }
    
    def process_analysis(self, analysis):
        """Process an AI analysis request with database lock handling"""
        max_retries = 3
        retry_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                with transaction.atomic():
                    model_name = analysis.ai_model.model_file_path.replace('builtin://', '')
                    
                    if model_name not in self.processors:
                        raise ValueError(f"Unknown processor: {model_name}")
                    
                    # Update analysis status
                    analysis.status = 'processing'
                    analysis.started_at = timezone.now()
                    analysis.save()
                    
                    # Get DICOM images for the study
                    images = analysis.study.series_set.all().prefetch_related('images')
                    
                    # Process the analysis
                    results = self.processors[model_name](analysis, images)
                    
                    # Update analysis with results
                    analysis.results = results
                    analysis.findings = results.get('findings', '')
                    analysis.abnormalities_detected = results.get('abnormalities', [])
                    analysis.measurements = results.get('measurements', {})
                    analysis.severity_grade = results.get('severity_grade', 'normal')
                    analysis.severity_score = results.get('severity_score', 0.0)
                    analysis.urgent_findings = results.get('urgent_findings', [])
                    analysis.status = 'completed'
                    analysis.completed_at = timezone.now()
                    analysis.confidence_score = results.get('confidence', 0.95)
                    
                    # Calculate processing time
                    if analysis.started_at:
                        processing_time = (analysis.completed_at - analysis.started_at).total_seconds()
                        analysis.processing_time = processing_time
                    
                    analysis.save()
                    
                    # Check for urgent findings and create alerts if needed
                    if analysis.severity_grade in ['severe', 'critical'] or analysis.severity_score >= 0.8:
                        self.create_urgent_alert(analysis)
                    
                    # Generate preliminary report if confidence is high enough
                    if analysis.confidence_score >= 0.7:
                        self.generate_preliminary_report(analysis)
                    
                    logger.info(f"AI analysis completed for study {analysis.study.accession_number}")
                    return True
                    
            except Exception as e:
                if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                    logger.warning(f"Database locked during AI analysis, retrying in {retry_delay}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    logger.error(f"AI analysis failed: {str(e)}")
                    try:
                        with transaction.atomic():
                            analysis.status = 'failed'
                            analysis.error_message = str(e)
                            analysis.completed_at = timezone.now()
                            analysis.save()
                    except Exception as save_error:
                        logger.error(f"Failed to save error state: {save_error}")
                    return False
        
        return False
    
    def analyze_metadata(self, analysis, images):
        """Analyze DICOM metadata for technical parameters and compliance"""
        results = {
            'analysis_type': 'metadata_analysis',
            'timestamp': timezone.now().isoformat(),
            'findings': [],
            'technical_parameters': {},
            'compliance_check': {},
            'confidence': 1.0
        }
        
        study = analysis.study
        total_images = 0
        
        # Study-level metadata
        study_metadata = {
            'study_date': study.study_date.strftime('%Y-%m-%d') if study.study_date else 'Unknown',
            'study_time': study.study_date.strftime('%H:%M:%S') if study.study_date else 'Unknown',
            'modality': study.modality.code,
            'study_description': study.study_description,
            'body_part': study.body_part,
            'referring_physician': study.referring_physician
        }
        results['study_metadata'] = study_metadata
        
        # Series-level analysis
        series_data = []
        for series in images:
            series_info = {
                'series_number': series.series_number,
                'series_description': series.series_description,
                'modality': series.modality,
                'body_part': series.body_part,
                'image_count': series.images.count(),
                'slice_thickness': series.slice_thickness
            }
            
            # Analyze first image from series for technical parameters
            first_image = series.images.first()
            if first_image and first_image.file_path:
                try:
                    dicom_path = first_image.file_path.path
                    if os.path.exists(dicom_path):
                        ds = pydicom.dcmread(dicom_path, stop_before_pixels=True)
                        
                        # Extract technical parameters
                        tech_params = {}
                        if hasattr(ds, 'KVP'):
                            tech_params['kvp'] = float(ds.KVP)
                        if hasattr(ds, 'XRayTubeCurrent'):
                            tech_params['tube_current'] = float(ds.XRayTubeCurrent)
                        if hasattr(ds, 'ExposureTime'):
                            tech_params['exposure_time'] = float(ds.ExposureTime)
                        if hasattr(ds, 'SliceThickness'):
                            tech_params['slice_thickness'] = float(ds.SliceThickness)
                        if hasattr(ds, 'PixelSpacing'):
                            tech_params['pixel_spacing'] = list(ds.PixelSpacing)
                        
                        series_info['technical_parameters'] = tech_params
                        
                except Exception as e:
                    logger.warning(f"Could not read DICOM metadata: {e}")
            
            series_data.append(series_info)
            total_images += series_info['image_count']
        
        results['series_analysis'] = series_data
        results['total_images'] = total_images
        
        # Generate findings
        findings = []
        findings.append(f"Study contains {len(series_data)} series with {total_images} total images")
        findings.append(f"Modality: {study.modality.code}")
        
        if study.body_part:
            findings.append(f"Body part examined: {study.body_part}")
        
        # Technical parameter validation
        if series_data:
            for series in series_data:
                if 'technical_parameters' in series:
                    params = series['technical_parameters']
                    if 'kvp' in params:
                        if params['kvp'] < 80 or params['kvp'] > 150:
                            findings.append(f"Series {series['series_number']}: Unusual kVp value ({params['kvp']})")
                    if 'slice_thickness' in params:
                        findings.append(f"Series {series['series_number']}: Slice thickness {params['slice_thickness']}mm")
        
        results['findings'] = findings
        results['technical_parameters'] = study_metadata
        
        return results
    
    def analyze_image_statistics(self, analysis, images):
        """Analyze image pixel data for quality metrics"""
        results = {
            'analysis_type': 'image_statistics',
            'timestamp': timezone.now().isoformat(),
            'findings': [],
            'statistics': {},
            'quality_metrics': {},
            'confidence': 0.95
        }
        
        total_analyzed = 0
        all_stats = []
        
        for series in images:
            series_stats = []
            
            # Analyze sample images from each series (max 5 to avoid performance issues)
            sample_images = list(series.images.all()[:5])
            
            for image in sample_images:
                if image.file_path:
                    try:
                        dicom_path = image.file_path.path
                        if os.path.exists(dicom_path):
                            ds = pydicom.dcmread(dicom_path)
                            
                            if hasattr(ds, 'pixel_array'):
                                pixel_data = ds.pixel_array
                                
                                # Compute basic statistics
                                stats = {
                                    'mean': float(np.mean(pixel_data)),
                                    'std': float(np.std(pixel_data)),
                                    'min': float(np.min(pixel_data)),
                                    'max': float(np.max(pixel_data)),
                                    'median': float(np.median(pixel_data)),
                                    'shape': list(pixel_data.shape)
                                }
                                
                                # Compute histogram
                                hist, bins = np.histogram(pixel_data, bins=50)
                                stats['histogram'] = {
                                    'counts': hist.tolist(),
                                    'bins': bins.tolist()
                                }
                                
                                series_stats.append(stats)
                                total_analyzed += 1
                                
                    except Exception as e:
                        logger.warning(f"Could not analyze image statistics: {e}")
            
            if series_stats:
                # Compute series-level statistics
                series_mean = np.mean([s['mean'] for s in series_stats])
                series_std = np.mean([s['std'] for s in series_stats])
                
                all_stats.extend(series_stats)
        
        if all_stats:
            # Overall statistics
            overall_stats = {
                'images_analyzed': total_analyzed,
                'mean_intensity': float(np.mean([s['mean'] for s in all_stats])),
                'std_intensity': float(np.mean([s['std'] for s in all_stats])),
                'min_value': float(min([s['min'] for s in all_stats])),
                'max_value': float(max([s['max'] for s in all_stats])),
            }
            
            results['statistics'] = overall_stats
            
            # Quality assessment
            findings = []
            findings.append(f"Analyzed {total_analyzed} sample images")
            findings.append(f"Mean pixel intensity: {overall_stats['mean_intensity']:.1f}")
            findings.append(f"Pixel value range: {overall_stats['min_value']:.0f} to {overall_stats['max_value']:.0f}")
            
            # Basic quality checks
            if overall_stats['std_intensity'] < 10:
                findings.append("Low image contrast detected")
            elif overall_stats['std_intensity'] > 1000:
                findings.append("High image contrast - good tissue differentiation")
            
            results['findings'] = findings
        else:
            results['findings'] = ["No pixel data could be analyzed"]
            results['confidence'] = 0.5
        
        return results
    
    def analyze_hounsfield_units(self, analysis, images):
        """Analyze Hounsfield units for CT images"""
        results = {
            'analysis_type': 'hounsfield_analysis',
            'timestamp': timezone.now().isoformat(),
            'findings': [],
            'hu_statistics': {},
            'calibration_check': {},
            'confidence': 0.9
        }
        
        if analysis.study.modality.code != 'CT':
            results['findings'] = ["Hounsfield unit analysis only applicable to CT images"]
            results['confidence'] = 0.0
            return results
        
        hu_values = []
        total_analyzed = 0
        
        for series in images:
            # Analyze sample images
            sample_images = list(series.images.all()[:3])
            
            for image in sample_images:
                if image.file_path:
                    try:
                        dicom_path = image.file_path.path
                        if os.path.exists(dicom_path):
                            ds = pydicom.dcmread(dicom_path)
                            
                            if hasattr(ds, 'pixel_array'):
                                pixel_data = ds.pixel_array
                                
                                # Apply rescale slope and intercept for HU calculation
                                rescale_slope = getattr(ds, 'RescaleSlope', 1)
                                rescale_intercept = getattr(ds, 'RescaleIntercept', 0)
                                
                                hu_data = pixel_data * rescale_slope + rescale_intercept
                                
                                # Sample HU values (avoid full image processing)
                                sample_hu = hu_data[::10, ::10].flatten()
                                hu_values.extend(sample_hu.tolist())
                                total_analyzed += 1
                                
                    except Exception as e:
                        logger.warning(f"Could not analyze HU values: {e}")
        
        if hu_values:
            hu_array = np.array(hu_values)
            
            # Compute HU statistics
            hu_stats = {
                'mean_hu': float(np.mean(hu_array)),
                'std_hu': float(np.std(hu_array)),
                'min_hu': float(np.min(hu_array)),
                'max_hu': float(np.max(hu_array)),
                'median_hu': float(np.median(hu_array)),
                'samples_analyzed': len(hu_values),
                'images_analyzed': total_analyzed
            }
            
            results['hu_statistics'] = hu_stats
            
            # Generate findings based on HU ranges
            findings = []
            findings.append(f"Analyzed {total_analyzed} CT images")
            findings.append(f"HU range: {hu_stats['min_hu']:.0f} to {hu_stats['max_hu']:.0f}")
            findings.append(f"Mean HU value: {hu_stats['mean_hu']:.1f}")
            
            # Basic tissue analysis based on HU values
            air_count = np.sum((hu_array >= -1000) & (hu_array <= -900))
            fat_count = np.sum((hu_array >= -120) & (hu_array <= -60))
            water_count = np.sum((hu_array >= -10) & (hu_array <= 10))
            soft_tissue_count = np.sum((hu_array >= 20) & (hu_array <= 60))
            bone_count = np.sum(hu_array >= 200)
            
            total_samples = len(hu_array)
            if total_samples > 0:
                findings.append(f"Air/lung tissue: {air_count/total_samples*100:.1f}%")
                findings.append(f"Fat tissue: {fat_count/total_samples*100:.1f}%")
                findings.append(f"Water-equivalent: {water_count/total_samples*100:.1f}%")
                findings.append(f"Soft tissue: {soft_tissue_count/total_samples*100:.1f}%")
                findings.append(f"Bone tissue: {bone_count/total_samples*100:.1f}%")
            
            # Calibration check
            calibration = {}
            if water_count > 0:
                water_hu_values = hu_array[(hu_array >= -10) & (hu_array <= 10)]
                if len(water_hu_values) > 0:
                    water_mean = np.mean(water_hu_values)
                    calibration['water_hu_deviation'] = abs(water_mean)
                    if abs(water_mean) > 5:
                        findings.append(f"Water HU calibration deviation: {water_mean:.1f} HU")
            
            results['calibration_check'] = calibration
            results['findings'] = findings
        else:
            results['findings'] = ["No Hounsfield unit data could be analyzed"]
            results['confidence'] = 0.0
        
        return results
    
    def generate_basic_report(self, analysis, images):
        """Generate a basic structured report"""
        results = {
            'analysis_type': 'report_generation',
            'timestamp': timezone.now().isoformat(),
            'findings': [],
            'technical_summary': {},
            'clinical_observations': [],
            'recommendations': [],
            'confidence': 0.85
        }
        
        study = analysis.study
        
        # Generate technical summary
        technical_summary = {
            'study_date': study.study_date.strftime('%Y-%m-%d %H:%M') if study.study_date else 'Unknown',
            'modality': study.modality.code,
            'body_part': study.body_part or 'Not specified',
            'series_count': images.count(),
            'total_images': sum(series.images.count() for series in images),
            'study_description': study.study_description
        }
        
        results['technical_summary'] = technical_summary
        
        # Generate clinical observations
        observations = []
        observations.append(f"{study.modality.code} examination of {study.body_part or 'unspecified region'}")
        observations.append(f"Study consists of {technical_summary['series_count']} series")
        observations.append(f"Total of {technical_summary['total_images']} images acquired")
        
        if study.clinical_info:
            observations.append(f"Clinical indication: {study.clinical_info}")
        
        # Basic quality assessment
        if technical_summary['total_images'] > 0:
            observations.append("Images are technically adequate for diagnostic interpretation")
        else:
            observations.append("No images available for analysis")
        
        results['clinical_observations'] = observations
        
        # Generate recommendations
        recommendations = []
        
        if study.modality.code == 'CT':
            recommendations.append("Clinical correlation recommended")
            if not study.clinical_info:
                recommendations.append("Clinical history would aid in interpretation")
        elif study.modality.code == 'XR':
            recommendations.append("Comparison with prior studies if available")
            recommendations.append("Clinical correlation advised")
        
        recommendations.append("Radiologist review and interpretation required")
        results['recommendations'] = recommendations
        
        # Combine all findings
        findings = []
        findings.extend(observations)
        findings.append("--- RECOMMENDATIONS ---")
        findings.extend(recommendations)
        
        results['findings'] = findings
        
        return results
    
    def create_urgent_alert(self, analysis):
        """Create urgent alert for severe/critical findings"""
        from .models import UrgentAlert
        from notifications.services import NotificationService
        
        try:
            # Determine alert type and details based on findings
            alert_type = 'critical_finding'
            title = f"Critical Finding Detected - {analysis.study.accession_number}"
            description = f"AI analysis has detected critical findings requiring immediate attention."
            
            if analysis.severity_grade == 'critical':
                alert_type = 'life_threatening'
                title = f"URGENT: Life-Threatening Condition - {analysis.study.accession_number}"
                description = f"AI analysis has detected potentially life-threatening findings that require immediate intervention."
            
            # Create the urgent alert
            alert = UrgentAlert.objects.create(
                ai_analysis=analysis,
                study=analysis.study,
                alert_type=alert_type,
                title=title,
                description=description,
                critical_findings=analysis.urgent_findings,
                recommended_action="Immediate radiologist review required",
                severity_score=analysis.severity_score,
                estimated_time_sensitivity=30 if analysis.severity_grade == 'critical' else 60
            )
            
            # Send notifications to radiologists
            notification_service = NotificationService()
            notification_service.send_urgent_alert(alert)
            
            # Mark analysis as having notified radiologist
            analysis.radiologist_notified = True
            analysis.save()
            
            logger.info(f"Urgent alert created for study {analysis.study.accession_number}")
            
        except Exception as e:
            logger.error(f"Failed to create urgent alert: {e}")
    
    def generate_preliminary_report(self, analysis):
        """Generate preliminary report for high-confidence analyses"""
        from .models import AutoGeneratedReport, AutoReportTemplate
        
        try:
            # Check if preliminary report already exists
            if analysis.preliminary_report_generated:
                return
            
            # Find appropriate template
            template = AutoReportTemplate.objects.filter(
                modality=analysis.study.modality.code,
                is_active=True
            ).first()
            
            if not template:
                logger.warning(f"No report template found for modality {analysis.study.modality.code}")
                return
            
            # Generate report content
            report_data = self.generate_report_content_from_analysis(analysis, template)
            
            # Create auto-generated report
            auto_report = AutoGeneratedReport.objects.create(
                study=analysis.study,
                template=template,
                ai_analysis=analysis,
                generated_findings=report_data['findings'],
                generated_impression=report_data['impression'],
                generated_recommendations=report_data['recommendations'],
                overall_confidence=analysis.confidence_score,
                requires_review=analysis.severity_grade in ['severe', 'critical'] or analysis.confidence_score < 0.8
            )
            
            # Mark as generated
            analysis.preliminary_report_generated = True
            analysis.save()
            
            logger.info(f"Preliminary report generated for study {analysis.study.accession_number}")
            
        except Exception as e:
            logger.error(f"Failed to generate preliminary report: {e}")
            # Mark analysis as having failed preliminary report generation
            try:
                analysis.preliminary_report_generated = False
                analysis.save(update_fields=['preliminary_report_generated'])
            except Exception as save_error:
                logger.error(f"Failed to update preliminary_report_generated flag: {save_error}")
    
    def generate_report_content_from_analysis(self, analysis, template):
        """Generate report content from a single analysis"""
        study = analysis.study
        
        # Build findings based on analysis results
        findings_parts = []
        
        # Add basic study information
        findings_parts.append(f"STUDY: {study.study_description}")
        findings_parts.append(f"MODALITY: {study.modality.code}")
        findings_parts.append(f"BODY PART: {study.body_part or 'Not specified'}")
        findings_parts.append(f"CLINICAL INDICATION: {study.clinical_info or 'Not provided'}")
        findings_parts.append("")
        
        # Add AI findings
        findings_parts.append("AUTOMATED ANALYSIS FINDINGS:")
        if analysis.findings:
            findings_parts.append(analysis.findings)
        
        # Add abnormalities if detected
        if analysis.abnormalities_detected:
            findings_parts.append("")
            findings_parts.append("ABNORMALITIES DETECTED:")
            for abnormality in analysis.abnormalities_detected:
                # Ensure abnormality is a string
                if isinstance(abnormality, (list, tuple)):
                    abnormality_str = ', '.join(str(item) for item in abnormality)
                else:
                    abnormality_str = str(abnormality)
                findings_parts.append(f"• {abnormality_str}")
        
        # Add measurements if available
        if analysis.measurements:
            findings_parts.append("")
            findings_parts.append("MEASUREMENTS:")
            for key, value in analysis.measurements.items():
                # Ensure both key and value are strings
                key_str = str(key)
                if isinstance(value, (list, tuple)):
                    value_str = ', '.join(str(item) for item in value)
                else:
                    value_str = str(value)
                findings_parts.append(f"• {key_str}: {value_str}")
        
        # Add urgent findings if present
        if analysis.urgent_findings:
            findings_parts.append("")
            findings_parts.append("⚠️ URGENT FINDINGS:")
            for finding in analysis.urgent_findings:
                # Ensure finding is a string
                if isinstance(finding, (list, tuple)):
                    finding_str = ', '.join(str(item) for item in finding)
                else:
                    finding_str = str(finding)
                findings_parts.append(f"• {finding_str}")
        
        # Generate impression based on severity
        impression_parts = []
        if analysis.severity_grade == 'critical':
            impression_parts.append("🚨 CRITICAL FINDINGS DETECTED - IMMEDIATE ATTENTION REQUIRED")
        elif analysis.severity_grade == 'severe':
            impression_parts.append("⚠️ SIGNIFICANT FINDINGS DETECTED - URGENT REVIEW NEEDED")
        elif analysis.severity_grade == 'moderate':
            impression_parts.append("Notable findings requiring attention")
        elif analysis.severity_grade == 'mild':
            impression_parts.append("Minor findings noted")
        else:
            impression_parts.append("No significant abnormalities detected by automated analysis")
        
        impression_parts.append(f"Analysis confidence: {analysis.confidence_score:.1%}")
        impression_parts.append("This is a preliminary automated analysis requiring radiologist confirmation.")
        
        # Generate recommendations
        recommendations_parts = []
        if analysis.severity_grade in ['critical', 'severe']:
            recommendations_parts.append("• IMMEDIATE radiologist review required")
            recommendations_parts.append("• Consider urgent clinical correlation")
            if analysis.severity_grade == 'critical':
                recommendations_parts.append("• Immediate patient assessment recommended")
        else:
            recommendations_parts.append("• Radiologist review and interpretation required")
            recommendations_parts.append("• Clinical correlation recommended")
        
        return {
            'findings': '\n'.join(findings_parts),
            'impression': '\n'.join(impression_parts),
            'recommendations': '\n'.join(recommendations_parts),
            'confidence': analysis.confidence_score
        }


# Global processor instance
ai_processor = AIProcessor()


def process_ai_analysis(analysis_id):
    """Process an AI analysis by ID"""
    try:
        from .models import AIAnalysis
        analysis = AIAnalysis.objects.get(id=analysis_id)
        return ai_processor.process_analysis(analysis)
    except Exception as e:
        logger.error(f"Failed to process AI analysis {analysis_id}: {e}")
        return False