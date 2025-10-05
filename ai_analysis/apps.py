from django.apps import AppConfig


class AiAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_analysis'
    
    def ready(self):
        """Import signal handlers when the app is ready"""
        import ai_analysis.signals
