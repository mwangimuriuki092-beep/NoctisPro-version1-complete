# Generated migration for UserPreferences model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserPreferences',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('dicom_viewer_preferences', models.JSONField(blank=True, default=dict)),
                ('dashboard_preferences', models.JSONField(blank=True, default=dict)),
                ('ui_preferences', models.JSONField(blank=True, default=dict)),
                ('notification_preferences', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='preferences', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Preferences',
                'verbose_name_plural': 'User Preferences',
            },
        ),
    ]