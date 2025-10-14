#!/bin/bash
# Quick test to verify all DICOM viewer buttons are configured

echo "=================================="
echo "Testing DICOM Viewer Button Configuration"
echo "=================================="

VIEWER_JS="/workspace/static/js/dicom-viewer-professional.js"

if [ ! -f "$VIEWER_JS" ]; then
    echo "❌ Viewer JavaScript not found!"
    exit 1
fi

echo ""
echo "✓ Found viewer JavaScript"
echo ""
echo "Checking button functions:"
echo ""

# Array of button functions to check
declare -a buttons=(
    "handleToolClick:Tool Selection"
    "applyWindowLevel:Window/Level"
    "resetView:Reset Button"
    "toggleInvert:Invert Button"
    "rotateImage:Rotate Button"
    "flipImage:Flip Button"
    "zoomIn:Zoom In"
    "zoomOut:Zoom Out"
    "panImage:Pan Tool"
    "measureDistance:Measure Tool"
    "addAnnotation:Annotation Tool"
    "clearMeasurements:Clear Button"
    "generateMPRViews:MPR Button"
    "generate3D:3D Button"
    "generateMIPView:MIP Button"
    "exportImage:Export Button"
    "printImage:Print Button"
)

passed=0
failed=0

for button in "${buttons[@]}"; do
    IFS=':' read -r func desc <<< "$button"
    if grep -q "$func" "$VIEWER_JS"; then
        echo "  ✓ $desc ($func)"
        ((passed++))
    else
        echo "  ✗ $desc ($func) - MISSING"
        ((failed++))
    fi
done

echo ""
echo "=================================="
echo "Results: $passed passed, $failed failed"
echo "=================================="

if [ $failed -eq 0 ]; then
    echo "✓ All buttons are configured!"
    exit 0
else
    echo "⚠ Some buttons are missing"
    exit 1
fi
