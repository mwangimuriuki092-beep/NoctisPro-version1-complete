"""
Management command to set up automatic AI analysis system
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from ai_analysis.models import AIModel, AutoReportTemplate
from ai_analysis.signals import setup_automatic_ai_models
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Set up automatic AI analysis system with default models and templates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset existing models and templates',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Setting up automatic AI analysis system...'))
        
        if options['reset']:
            self.stdout.write('Resetting existing models and templates...')
            AIModel.objects.filter(model_file_path__startswith='builtin://').delete()
            AutoReportTemplate.objects.all().delete()
        
        # Set up AI models
        self.stdout.write('Creating automatic AI models...')
        setup_automatic_ai_models()
        
        # Set up report templates
        self.stdout.write('Creating report templates...')
        self.setup_report_templates()
        
        self.stdout.write(self.style.SUCCESS('Automatic AI analysis system setup completed!'))

    def setup_report_templates(self):
        """Set up default report templates"""
        templates = [
            {
                'name': 'CT Automatic Report',
                'modality': 'CT',
                'body_part': 'Head',
                'findings_template': '''AUTOMATED CT ANALYSIS REPORT

STUDY INFORMATION:
Study Date: {study_date}
Modality: {modality}
Body Part: {body_part}
Clinical Indication: {clinical_info}

TECHNICAL ASSESSMENT:
{technical_findings}

AI ANALYSIS FINDINGS:
{ai_findings}

QUALITY METRICS:
{quality_metrics}

SEVERITY ASSESSMENT:
Severity Grade: {severity_grade}
Confidence Level: {confidence_level}

{urgent_findings}''',
                'impression_template': '''{ai_impression}

This is a preliminary automated analysis. Radiologist review and interpretation is required for final diagnosis.''',
                'recommendations_template': '''{ai_recommendations}

• Clinical correlation recommended
• Radiologist review required for final interpretation''',
                'confidence_threshold': 0.7,
                'requires_human_review': True
            },
            {
                'name': 'MR Automatic Report',
                'modality': 'MR',
                'body_part': 'Brain',
                'findings_template': '''AUTOMATED MR ANALYSIS REPORT

STUDY INFORMATION:
Study Date: {study_date}
Modality: {modality}
Body Part: {body_part}
Clinical Indication: {clinical_info}

TECHNICAL ASSESSMENT:
{technical_findings}

AI ANALYSIS FINDINGS:
{ai_findings}

QUALITY METRICS:
{quality_metrics}

SEVERITY ASSESSMENT:
Severity Grade: {severity_grade}
Confidence Level: {confidence_level}

{urgent_findings}''',
                'impression_template': '''{ai_impression}

This is a preliminary automated analysis. Radiologist review and interpretation is required for final diagnosis.''',
                'recommendations_template': '''{ai_recommendations}

• Clinical correlation recommended
• Radiologist review required for final interpretation''',
                'confidence_threshold': 0.7,
                'requires_human_review': True
            },
            {
                'name': 'X-Ray Automatic Report',
                'modality': 'XR',
                'body_part': 'Chest',
                'findings_template': '''AUTOMATED X-RAY ANALYSIS REPORT

STUDY INFORMATION:
Study Date: {study_date}
Modality: {modality}
Body Part: {body_part}
Clinical Indication: {clinical_info}

TECHNICAL ASSESSMENT:
{technical_findings}

AI ANALYSIS FINDINGS:
{ai_findings}

QUALITY METRICS:
{quality_metrics}

SEVERITY ASSESSMENT:
Severity Grade: {severity_grade}
Confidence Level: {confidence_level}

{urgent_findings}''',
                'impression_template': '''{ai_impression}

This is a preliminary automated analysis. Radiologist review and interpretation is required for final diagnosis.''',
                'recommendations_template': '''{ai_recommendations}

• Clinical correlation recommended
• Radiologist review required for final interpretation''',
                'confidence_threshold': 0.7,
                'requires_human_review': True
            },
            {
                'name': 'Universal Automatic Report',
                'modality': 'ALL',
                'body_part': 'Any',
                'findings_template': '''AUTOMATED ANALYSIS REPORT

STUDY INFORMATION:
Study Date: {study_date}
Modality: {modality}
Body Part: {body_part}
Clinical Indication: {clinical_info}

TECHNICAL ASSESSMENT:
{technical_findings}

AI ANALYSIS FINDINGS:
{ai_findings}

QUALITY METRICS:
{quality_metrics}

SEVERITY ASSESSMENT:
Severity Grade: {severity_grade}
Confidence Level: {confidence_level}

{urgent_findings}''',
                'impression_template': '''{ai_impression}

This is a preliminary automated analysis. Radiologist review and interpretation is required for final diagnosis.''',
                'recommendations_template': '''{ai_recommendations}

• Clinical correlation recommended
• Radiologist review required for final interpretation''',
                'confidence_threshold': 0.7,
                'requires_human_review': True
            }
        ]
        
        for template_data in templates:
            template, created = AutoReportTemplate.objects.get_or_create(
                name=template_data['name'],
                modality=template_data['modality'],
                defaults=template_data
            )
            
            if created:
                self.stdout.write(f'  Created template: {template.name}')
                
                # Associate with AI models
                ai_models = AIModel.objects.filter(
                    modality__in=[template_data['modality'], 'ALL'],
                    is_active=True
                )
                template.ai_models.set(ai_models)
            else:
                self.stdout.write(f'  Template already exists: {template.name}')
        
        self.stdout.write(self.style.SUCCESS('Report templates setup completed'))