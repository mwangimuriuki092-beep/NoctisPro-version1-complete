#!/usr/bin/env python3
"""
Automated Template Updater for DICOM SCP Integration
Updates frontend templates to include DICOM SCP status monitoring
"""

import os
import re
from pathlib import Path

# Template updates configuration
TEMPLATES_TO_UPDATE = {
    'templates/worklist/dashboard.html': {
        'marker': '<!-- Statistics Cards -->',
        'content': '''
        <!-- DICOM SCP Status Card (Auto-added) -->
        <div class="col-md-3">
            <div class="card stat-card">
                <div class="card-body">
                    <h6 class="text-muted">DICOM SCP Status</h6>
                    <div id="dicom-scp-status-widget"></div>
                </div>
            </div>
        </div>
        '''
    },
    'templates/worklist/upload.html': {
        'marker': '{% block content %}',
        'content': '''
<!-- DICOM SCP Status Alert (Auto-added) -->
<div class="alert alert-info mb-3">
    <h5><i class="fas fa-info-circle"></i> DICOM Upload Methods</h5>
    <p><strong>Method 1:</strong> Send directly from modality to <code>port 11112</code></p>
    <p><strong>Method 2:</strong> Upload via web interface (below)</p>
    <div id="dicom-scp-status-widget"></div>
</div>
        '''
    },
    'templates/admin_panel/dashboard.html': {
        'marker': '<!-- Quick Actions -->',
        'content': '''
        <!-- DICOM Services Status (Auto-added) -->
        <div class="col-md-6 mb-4">
            <div class="card">
                <div class="card-header">
                    <h5><i class="fas fa-hospital"></i> DICOM Services</h5>
                </div>
                <div class="card-body">
                    <div id="dicom-scp-status-widget"></div>
                </div>
            </div>
        </div>
        '''
    },
}

# JavaScript include to add to bottom of templates
JS_INCLUDE = '''
{% load static %}
<script src="{% static 'js/dicom-scp-status.js' %}"></script>
'''

def backup_file(file_path):
    """Create a backup of the file before modifying"""
    backup_path = file_path + '.bak'
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Backup created: {backup_path}")
        return True
    return False

def check_if_already_updated(content):
    """Check if template was already updated"""
    return 'dicom-scp-status-widget' in content or 'Auto-added' in content

def update_template(file_path, marker, new_content):
    """Update a template file with new content"""
    if not os.path.exists(file_path):
        print(f"  ⚠ File not found: {file_path}")
        return False
    
    # Read current content
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already updated
    if check_if_already_updated(content):
        print(f"  ℹ Already updated: {file_path}")
        return False
    
    # Backup file
    backup_file(file_path)
    
    # Add new content after marker
    if marker in content:
        parts = content.split(marker, 1)
        updated_content = parts[0] + marker + new_content + parts[1]
    else:
        # If marker not found, append to end
        print(f"  ⚠ Marker not found in {file_path}, adding to end")
        updated_content = content + '\n' + new_content
    
    # Add JavaScript include if not already present
    if 'dicom-scp-status.js' not in updated_content:
        # Add before {% endblock %}
        if '{% endblock %}' in updated_content:
            updated_content = updated_content.replace('{% endblock %}', JS_INCLUDE + '\n{% endblock %}')
        else:
            updated_content += '\n' + JS_INCLUDE
    
    # Write updated content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print(f"  ✓ Updated: {file_path}")
    return True

def main():
    """Main function to update all templates"""
    print("=" * 60)
    print("DICOM SCP Template Updater")
    print("=" * 60)
    print()
    
    # Get workspace directory
    workspace_dir = Path(__file__).parent
    print(f"Workspace: {workspace_dir}")
    print()
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    # Update each template
    for template_path, config in TEMPLATES_TO_UPDATE.items():
        full_path = workspace_dir / template_path
        print(f"Processing: {template_path}")
        
        try:
            if update_template(str(full_path), config['marker'], config['content']):
                updated_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")
            error_count += 1
        
        print()
    
    # Summary
    print("=" * 60)
    print("Summary:")
    print(f"  Updated:  {updated_count}")
    print(f"  Skipped:  {skipped_count}")
    print(f"  Errors:   {error_count}")
    print("=" * 60)
    print()
    
    if updated_count > 0:
        print("✅ Templates updated successfully!")
        print()
        print("Next steps:")
        print("  1. Review the changes in updated files")
        print("  2. Check .bak files if you need to revert")
        print("  3. Test the updated templates in your browser")
        print("  4. Delete .bak files once you're satisfied")
    else:
        print("ℹ No templates needed updating (already up to date)")
    
    print()

if __name__ == '__main__':
    main()