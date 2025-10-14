# Quick Test Guide for DICOM Viewer Fix

## What Was Fixed
The DICOM viewer now displays images correctly by rendering raw pixel data directly to canvas instead of waiting for image element loading.

## Quick Test Steps

### 1. Start the Application
```bash
# If using Docker
docker-compose up

# Or if running directly
python manage.py runserver
```

### 2. Access the Viewer
Navigate to: `http://localhost:8000/dicom-viewer/viewer/`

### 3. Load a Study
1. Click "Load Studies" button in the top bar
2. Select a study from the dropdown
3. A series should load automatically

### 4. Verify Image Display
**Expected Result:** Image appears immediately in the canvas area

**Check Console (F12 → Console tab):**
```
✓ "Pixel data loaded for HTML-style rendering: { pixelCount: ..., columns: ..., rows: ... }"
✓ "Rendering pixel data directly to canvas..."
✓ "DICOM image rendered using HTML-style direct pixel manipulation"
```

**If you see these messages, the fix is working!**

### 5. Test Window/Level Controls
1. Move the "Window Width" slider
   - **Expected:** Image brightness/contrast updates in real-time
2. Move the "Window Level" slider
   - **Expected:** Image brightness shifts in real-time
3. Click preset buttons (Lung, Bone, Soft Tissue, Brain)
   - **Expected:** Image adjusts to show preset window/level

### 6. Test Image Navigation
1. Use the Slice slider to move between images
   - **Expected:** Each slice loads and displays immediately
2. Use mouse wheel on canvas
   - **Expected:** Navigate through slices smoothly

### 7. Test Tools
1. Click "Zoom" tool, then drag on image
   - **Expected:** Image zooms in/out
2. Click "Pan" tool, then drag on image
   - **Expected:** Image moves around
3. Click "Measure" tool, draw a line
   - **Expected:** Measurement line appears with distance
4. Click "Invert" tool
   - **Expected:** Image colors invert (black↔white)

## Troubleshooting

### Problem: Image doesn't appear

**Check 1: Browser Console**
- Press F12 to open Developer Tools
- Go to Console tab
- Look for errors (red text)
- Copy any error messages

**Check 2: Network Tab**
- In Developer Tools, go to Network tab
- Reload the page
- Find request to `/dicom-viewer/api/image/<id>/data/`
- Click on it, go to "Response" tab
- Verify it has:
  - `"pixel_data": [...]` (array of numbers)
  - `"columns": <number>`
  - `"rows": <number>`
  - `"window_width": <number>`
  - `"window_center": <number>`

**Check 3: Canvas Element**
- In Console tab, type:
  ```javascript
  document.getElementById('dicomCanvas')
  ```
- Should return: `<canvas class="dicom-canvas" id="dicomCanvas">`
- If it returns `null`, the canvas doesn't exist

**Check 4: Pixel Data Loading**
- In Console tab, type:
  ```javascript
  currentImageData
  ```
- Should show an object with `pixel_data` array
- If `undefined`, pixel data didn't load

**Check 5: Manual API Test**
- Get an image ID from a loaded series
- In Console tab, run:
  ```javascript
  fetch('/dicom-viewer/api/image/1/data/')  // Replace 1 with actual image ID
    .then(r => r.json())
    .then(data => console.log(data));
  ```
- Check if `pixel_data` exists in response

### Problem: Window/Level doesn't work

**Check:**
```javascript
// In Console:
windowWidth   // Should show a number like 400
windowLevel   // Should show a number like 40
```

**Test:**
```javascript
// Try manual update:
updateWindowWidth(800);
updateWindowLevel(100);
```

### Problem: Images load but appear very dark/bright

**Try:**
1. Reset window/level: Click any preset button (Lung, Bone, etc.)
2. Manual adjustment:
   ```javascript
   windowWidth = 400;
   windowLevel = 40;
   renderDicomImageData(currentImageData, document.getElementById('dicomCanvas'));
   ```

## Expected Console Output (Success)

When everything works correctly, you should see:
```
Loading series: 123
Series data received: {series: {...}, images: Array(50)}
Loaded 50 images for series
Loading first image...
Pixel data loaded for HTML-style rendering: {pixelCount: 262144, columns: 512, rows: 512, windowWidth: 400, windowLevel: 40}
Rendering pixel data directly to canvas...
Rendering image to canvas: {naturalWidth: 0, naturalHeight: 0, modality: "CT"}
Using DICOM pixel data rendering with 262144 pixels
DICOM image rendered using HTML-style direct pixel manipulation
```

## Manual Test Script

Copy and paste this into the browser console to test the rendering:

```javascript
// Test if all required functions exist
console.log('Testing DICOM Viewer Functions...');
console.log('✓ renderDicomImageData:', typeof renderDicomImageData);
console.log('✓ applyWindowing:', typeof applyWindowing);
console.log('✓ updateImageDisplay:', typeof updateImageDisplay);
console.log('✓ updateWindowWidth:', typeof updateWindowWidth);
console.log('✓ updateWindowLevel:', typeof updateWindowLevel);

// Test if canvas exists
const canvas = document.getElementById('dicomCanvas');
console.log('✓ Canvas element:', !!canvas);

// Test if we have image data
console.log('✓ Has current image data:', !!currentImageData);
console.log('✓ Has pixel data:', !!(currentImageData && currentImageData.pixel_data));

// If we have image data, test rendering
if (currentImageData && currentImageData.pixel_data && canvas) {
    console.log('Attempting manual render...');
    renderDicomImageData(currentImageData, canvas);
    console.log('✓ Render complete!');
} else {
    console.warn('Cannot test render - missing data or canvas');
}
```

## Success Criteria

✅ Image appears on canvas within 1-2 seconds of loading
✅ Window/Level sliders work smoothly
✅ All preset buttons (Lung, Bone, etc.) work
✅ Slice navigation works
✅ Zoom and Pan work
✅ Measurements can be drawn
✅ No console errors
✅ Console shows "DICOM image rendered using HTML-style direct pixel manipulation"

## Files to Check if Issues Persist

1. `/workspace/dicom_viewer/views.py` (line 6336-6435)
   - Check `api_image_data` function
   
2. `/workspace/templates/dicom_viewer/viewer.html`
   - Lines 1867-1919: Image loading
   - Lines 2671-2750: renderDicomImageData function
   - Lines 2753-2766: applyWindowing function

3. Database
   - Check if DicomImage records have valid file_path
   - Check if files exist at those paths

4. DICOM Files
   - Ensure files are readable by pydicom
   - Ensure files contain pixel data (not just metadata)

## Getting Help

If issues persist, provide:
1. Browser console output (copy all text)
2. Network tab screenshot showing the data/ endpoint response
3. Result of the "Manual Test Script" above
4. Browser and version (Chrome 120, Firefox 121, etc.)
5. Any error messages from Django logs
