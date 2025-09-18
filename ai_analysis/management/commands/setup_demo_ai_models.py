from django.core.management.base import BaseCommand
from ai_analysis.models import AIModel, AutoReportTemplate
from accounts.models import User


class Command(BaseCommand):
    help = 'Set up demo AI models and report templates for testing'

    def handle(self, *args, **options):
        self.stdout.write('Setting up demo AI models and templates...')
        
        # Get or create admin user
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.filter(role='admin').first()
        
        # Create demo AI models
        models_data = [
            {
                'name': 'ChestXR Pathology Detector',
                'version': '1.0',
                'model_type': 'classification',
                'modality': 'XR',
                'body_part': 'CHEST',
                'description': 'AI model for detecting common chest pathologies in X-ray images',
                'model_file_path': '/models/chest_xr_classifier.onnx',
                'accuracy_metrics': {'accuracy': 0.92, 'sensitivity': 0.89, 'specificity': 0.94},
                'is_trained': True
            },
            {
                'name': 'CT Brain Hemorrhage Detector',
                'version': '2.1',
                'model_type': 'detection',
                'modality': 'CT',
                'body_part': 'HEAD',
                'description': 'Advanced AI model for detecting intracranial hemorrhage in CT scans',
                'model_file_path': '/models/ct_brain_hemorrhage.onnx',
                'accuracy_metrics': {'accuracy': 0.95, 'sensitivity': 0.93, 'specificity': 0.97},
                'is_trained': True
            },
            {
                'name': 'Lung Nodule Detector',
                'version': '1.5',
                'model_type': 'detection',
                'modality': 'CT',
                'body_part': 'CHEST',
                'description': 'AI model for detecting and characterizing lung nodules in chest CT',
                'model_file_path': '/models/lung_nodule_detector.onnx',
                'accuracy_metrics': {'accuracy': 0.88, 'sensitivity': 0.85, 'specificity': 0.91},
                'is_trained': True
            },
            {
                'name': 'Universal Report Generator',
                'version': '1.0',
                'model_type': 'report_generation',
                'modality': 'CT',
                'body_part': '',
                'description': 'General purpose AI report generation model for CT studies',
                'model_file_path': '/models/report_generator.onnx',
                'accuracy_metrics': {'bleu_score': 0.78, 'rouge_score': 0.82},
                'is_trained': True
            }
        ]
        
        created_count = 0
        for model_data in models_data:
            ai_model, created = AIModel.objects.get_or_create(
                name=model_data['name'],
                version=model_data['version'],
                defaults={
                    **model_data,
                    'created_by': admin_user,
                    'total_analyses': 0,
                    'avg_processing_time': 2.5,
                    'success_rate': 95.0
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f'  ✓ Created AI model: {ai_model.name}')
            else:
                self.stdout.write(f'  - AI model already exists: {ai_model.name}')
        
        # Create demo report templates
        templates_data = [
            {
                'name': 'Chest X-Ray Report Template',
                'modality': 'XR',
                'body_part': 'CHEST',
                'template_content': '''
CLINICAL HISTORY: {clinical_info}

FINDINGS:
{ai_findings}

Heart size and mediastinal contours are within normal limits.
Lungs are clear bilaterally with no evidence of consolidation, effusion, or pneumothorax.
Osseous structures appear intact.

IMPRESSION:
{ai_impression}

RECOMMENDATIONS:
{ai_recommendations}
''',
                'confidence_threshold': 0.8,
                'requires_radiologist_review': True
            },
            {
                'name': 'CT Brain Report Template',
                'modality': 'CT',
                'body_part': 'HEAD',
                'template_content': '''
CLINICAL HISTORY: {clinical_info}

TECHNIQUE: Non-contrast CT of the head

FINDINGS:
{ai_findings}

No evidence of acute intracranial hemorrhage.
Ventricular system is normal in size and configuration.
No mass effect or midline shift.
Osseous structures are intact.

IMPRESSION:
{ai_impression}

RECOMMENDATIONS:
{ai_recommendations}
''',
                'confidence_threshold': 0.85,
                'requires_radiologist_review': True
            },
            {
                'name': 'CT Chest Report Template',
                'modality': 'CT',
                'body_part': 'CHEST',
                'template_content': '''
CLINICAL HISTORY: {clinical_info}

TECHNIQUE: Contrast-enhanced CT of the chest

FINDINGS:
{ai_findings}

Lungs: No focal consolidation, mass, or nodule identified.
Pleura: No pleural effusion or pneumothorax.
Mediastinum: Mediastinal and hilar lymph nodes are not enlarged.
Heart: Heart size is normal.

IMPRESSION:
{ai_impression}

RECOMMENDATIONS:
{ai_recommendations}
''',
                'confidence_threshold': 0.8,
                'requires_radiologist_review': True
            }
        ]
        
        template_count = 0
        for template_data in templates_data:
            template, created = AutoReportTemplate.objects.get_or_create(
                name=template_data['name'],
                modality=template_data['modality'],
                body_part=template_data['body_part'],
                defaults={
                    **template_data,
                    'created_by': admin_user
                }
            )
            if created:
                template_count += 1
                self.stdout.write(f'  ✓ Created report template: {template.name}')
            else:
                self.stdout.write(f'  - Report template already exists: {template.name}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Setup complete! Created {created_count} AI models and {template_count} report templates.'
            )
        )
        
        if created_count > 0 or template_count > 0:
            self.stdout.write('\n🤖 AI Analysis Features:')
            self.stdout.write('  • Automatic AI analysis will now trigger on new uploads')
            self.stdout.write('  • AI reports can be generated from completed analyses')
            self.stdout.write('  • Visit /ai/ to manage AI models and view analyses')
            self.stdout.write('\n📋 Next Steps:')
            self.stdout.write('  1. Upload some DICOM studies to test AI analysis')
            self.stdout.write('  2. Check the AI dashboard at /ai/')
            self.stdout.write('  3. Generate reports from completed analyses')