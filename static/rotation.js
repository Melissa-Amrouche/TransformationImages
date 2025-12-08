// Interactive Rotation UI Script with Real-Time Preview
// Synchronize slider, input, and provide instant rotation preview

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const angleSlider = document.getElementById('angleSlider');
    const angleInput = document.getElementById('angleInput');
    const currentAngleDisplay = document.getElementById('current-angle-value');
    const resetBtn = document.getElementById('resetBtn');
    const rotate90Btn = document.getElementById('rotate90Btn');
    const rotate180Btn = document.getElementById('rotate180Btn');
    const rotate270Btn = document.getElementById('rotate270Btn');
    const previewImage = document.getElementById('preview-image');
    const originalImage = document.getElementById('original-image');
    const loadingSpinner = document.getElementById('loading-spinner');
    const formRotate = document.getElementById('form-rotate');
    const formFlip = document.getElementById('form-flip');
    const formCrop = document.getElementById('form-crop');
    const formConvert = document.getElementById('form-convert');

    // Get the image filename from the hidden input
    const imageNameInput = document.querySelector('input[name="image"]');
    const imageName = imageNameInput ? imageNameInput.value : '';

    let rotationTimeout = null;
    let currentAngle = 0;
    let currentImageSrc = null; // Track the current working image (original or temp.png)
    let hasTransformations = false; // Track if we have any transformations applied
    let needsImageReload = false; // Track if we need to reload the base image

    // Overlay image state
    let overlayImage = null;
    let overlayX = 50; // Position X in percentage
    let overlayY = 50; // Position Y in percentage
    let overlayScale = 50; // Scale in percentage
    let overlayOpacity = 100; // Opacity in percentage

    // Calculate scale factor to fit rotated image in container
    function calculateScaleForRotation(angle) {
        // No scaling - let the image rotate naturally
        // The server handles expand=True for the final image
        return 1;
    }

    // Central function to update all rotation controls and preview
    function updateRotation(angle) {
        // Parse and validate angle
        angle = parseInt(angle) || 0;
        angle = Math.max(0, Math.min(360, angle));
        currentAngle = angle;

        // Update all controls
        angleSlider.value = angle;
        angleInput.value = angle;
        currentAngleDisplay.textContent = angle;

        // Only reload the base image if needed (after flip/crop or on first load)
        if (needsImageReload) {
            // Use the base image WITHOUT rotation
            // If we have transformations (flip/crop), use temp_no_rotation.png, otherwise use original
            const baseImage = hasTransformations ? '/static/images/temp_no_rotation.png' : originalImage.src;
            previewImage.src = baseImage + '?t=' + new Date().getTime();
            needsImageReload = false;
        }

        // Calculate scale to keep image in bounds
        const scale = calculateScaleForRotation(angle);

        // Apply CSS rotation for instant visual feedback
        previewImage.style.transform = `rotate(${angle}deg) scale(${scale})`;

        // Debounce server request for actual rotation
       // clearTimeout(rotationTimeout);
       // rotationTimeout = setTimeout(function() {
        //    applyRotationToServer(angle);
        //}, 500);
    }

    // Apply rotation via AJAX without page reload
    function applyRotationToServer(angle) {
        if (angle === 0 && !hasTransformations) {
            // Reset to original image only if no other transformations
            previewImage.src = originalImage.src + '?t=' + new Date().getTime();
            previewImage.style.transform = 'rotate(0deg) scale(1)';
            return;
        }

        // Show loading spinner
        loadingSpinner.classList.remove('hidden');

        // Determine which image to use as base
        const baseImageName = hasTransformations ? 'temp.png' : imageName;

        // Create form data
        const formData = new FormData();
        formData.append('angle', angle);
        formData.append('image', baseImageName);

        // Remember the angle we're requesting
        const requestedAngle = angle;

        // Send AJAX request
        fetch('/rotate', {
            method: 'POST',
            body: formData
        })
        .then(response => response.blob())
        .then(blob => {
            // Only update if this is still the current angle we want
            if (requestedAngle === currentAngle) {
                // Update preview image with rotated version from server
                const imageUrl = URL.createObjectURL(blob);
                previewImage.src = imageUrl;
                // Remove CSS transform since the server has already rotated the image
                previewImage.style.transform = 'rotate(0deg) scale(1)';
                // Mark that we now have transformations
                hasTransformations = true;
            }
            loadingSpinner.classList.add('hidden');
        })
        .catch(error => {
            console.error('Rotation error:', error);
            loadingSpinner.classList.add('hidden');
            alert('Erreur lors de la rotation de l\'image');
        });
    }

    // Handle flip operations with AJAX
    function applyFlip(mode) {
        loadingSpinner.classList.remove('hidden');

        // Use temp.png if we already have transformations, otherwise use original
        const baseImageName = hasTransformations ? 'temp.png' : imageName;

        const formData = new FormData();
        formData.append('mode', mode);
        formData.append('image', baseImageName);

        fetch('/flip', {
            method: 'POST',
            body: formData
        })
        .then(response => response.blob())
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            previewImage.src = imageUrl;
            // Reset CSS transform since the flip is now baked into the image
            previewImage.style.transform = 'rotate(0deg) scale(1)';
            hasTransformations = true;
            needsImageReload = true; // Mark that we need to reload base image for next rotation

            // Reset rotation to 0 - flip creates a new base
            currentAngle = 0;
            angleSlider.value = 0;
            angleInput.value = 0;
            currentAngleDisplay.textContent = 0;

            loadingSpinner.classList.add('hidden');
        })
        .catch(error => {
            console.error('Flip error:', error);
            loadingSpinner.classList.add('hidden');
            alert('Erreur lors du retournement de l\'image');
        });
    }

    // Handle crop operations with AJAX
    function applyCrop(x1, y1, x2, y2) {
        loadingSpinner.classList.remove('hidden');

        // Use temp.png if we already have transformations, otherwise use original
        const baseImageName = hasTransformations ? 'temp.png' : imageName;

        const formData = new FormData();
        formData.append('x1', x1);
        formData.append('y1', y1);
        formData.append('x2', x2);
        formData.append('y2', y2);
        formData.append('image', baseImageName);

        fetch('/crop', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Crop failed');
            }
            return response.blob();
        })
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            previewImage.src = imageUrl;
            // Keep the current rotation angle - don't reset!
            // The crop is applied to the current state
            previewImage.style.transform = 'rotate(0deg) scale(1)';
            hasTransformations = true;
            needsImageReload = true; // Mark that we need to reload base image for next rotation
            currentAngle = 0; // Reset rotation after crop
            angleSlider.value = 0;
            angleInput.value = 0;
            currentAngleDisplay.textContent = 0;
            loadingSpinner.classList.add('hidden');
        })
        .catch(error => {
            console.error('Crop error:', error);
            loadingSpinner.classList.add('hidden');
            alert('Erreur lors du rognage de l\'image. Vérifiez les dimensions.');
        });
    }

    // Handle grayscale conversion with AJAX
    function applyGrayscale() {
        loadingSpinner.classList.remove('hidden');

        // Use temp.png if we already have transformations, otherwise use original
        const baseImageName = hasTransformations ? 'temp.png' : imageName;

        const formData = new FormData();
        formData.append('image', baseImageName);

        fetch('/grayscale', {
            method: 'POST',
            body: formData
        })
        .then(response => response.blob())
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            previewImage.src = imageUrl;
            // Reset CSS transform since the conversion is now baked into the image
            previewImage.style.transform = 'rotate(0deg) scale(1)';
            hasTransformations = true;
            needsImageReload = true; // Mark that we need to reload base image for next rotation

            // Reset rotation to 0 - conversion creates a new base
            currentAngle = 0;
            angleSlider.value = 0;
            angleInput.value = 0;
            currentAngleDisplay.textContent = 0;

            loadingSpinner.classList.add('hidden');
        })
        .catch(error => {
            console.error('Grayscale error:', error);
            loadingSpinner.classList.add('hidden');
            alert('Erreur lors de la conversion en niveaux de gris');
        });
    }

    // Handle black & white conversion with AJAX
    function applyBlackWhite() {
        loadingSpinner.classList.remove('hidden');

        // Use temp.png if we already have transformations, otherwise use original
        const baseImageName = hasTransformations ? 'temp.png' : imageName;

        const formData = new FormData();
        formData.append('image', baseImageName);
        formData.append('threshold', 128); // Default threshold value

        fetch('/blackwhite', {
            method: 'POST',
            body: formData
        })
        .then(response => response.blob())
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            previewImage.src = imageUrl;
            // Reset CSS transform since the conversion is now baked into the image
            previewImage.style.transform = 'rotate(0deg) scale(1)';
            hasTransformations = true;
            needsImageReload = true; // Mark that we need to reload base image for next rotation

            // Reset rotation to 0 - conversion creates a new base
            currentAngle = 0;
            angleSlider.value = 0;
            angleInput.value = 0;
            currentAngleDisplay.textContent = 0;

            loadingSpinner.classList.add('hidden');
        })
        .catch(error => {
            console.error('Black & White error:', error);
            loadingSpinner.classList.add('hidden');
            alert('Erreur lors de la conversion en noir & blanc');
        });
    }

    // Handle color restoration with AJAX
    function applyRestoreColor() {
        loadingSpinner.classList.remove('hidden');

        // Use temp.png if we already have transformations, otherwise use original
        const baseImageName = hasTransformations ? 'temp.png' : imageName;

        const formData = new FormData();
        formData.append('image', baseImageName);

        fetch('/restore-color', {
            method: 'POST',
            body: formData
        })
        .then(response => response.blob())
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            previewImage.src = imageUrl;
            // Reset CSS transform since the restoration is now baked into the image
            previewImage.style.transform = 'rotate(0deg) scale(1)';
            hasTransformations = true;
            needsImageReload = true; // Mark that we need to reload base image for next rotation

            // Reset rotation to 0 - restoration creates a new base
            currentAngle = 0;
            angleSlider.value = 0;
            angleInput.value = 0;
            currentAngleDisplay.textContent = 0;

            loadingSpinner.classList.add('hidden');
        })
        .catch(error => {
            console.error('Restore color error:', error);
            loadingSpinner.classList.add('hidden');
            alert('Erreur lors de la restauration de la couleur');
        });
    }

    // Event listeners for rotation synchronization

    // Slider input (real-time updates while dragging)
    angleSlider.addEventListener('input', function() {
        updateRotation(this.value);
    });

    // Number input (updates on value change)
    angleInput.addEventListener('input', function() {
        updateRotation(this.value);
    });

    // Quick rotation buttons
    rotate90Btn.addEventListener('click', function(e) {
        e.preventDefault();
        updateRotation(90);
    });

    rotate180Btn.addEventListener('click', function(e) {
        e.preventDefault();
        updateRotation(180);
    });

    rotate270Btn.addEventListener('click', function(e) {
        e.preventDefault();
        updateRotation(270);
    });

    // Reset button - reset rotation to 0 degrees
    resetBtn.addEventListener('click', function(e) {
        e.preventDefault();

        if (hasTransformations) {
            // We have flip/crop, show temp_no_rotation.png (without rotation)
            currentAngle = 0;
            angleSlider.value = 0;
            angleInput.value = 0;
            currentAngleDisplay.textContent = 0;

            previewImage.src = '/static/images/temp_no_rotation.png?t=' + new Date().getTime();
            previewImage.style.transform = 'rotate(0deg) scale(1)';

            // Clear any pending rotation
            clearTimeout(rotationTimeout);
            needsImageReload = false; // We just reloaded it
        } else {
            // No transformations, just update to 0
            needsImageReload = true;
            updateRotation(0);
        }
    });

    // Prevent form submission for rotation (we handle it with AJAX)
    formRotate.addEventListener('submit', function(e) {
        e.preventDefault();
        applyRotationToServer(currentAngle);
    });

    // Handle flip form with AJAX
    const flipButtons = document.querySelectorAll('#form-flip button[type="submit"]');
    flipButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const mode = this.value;
            applyFlip(mode);
        });
    });

    // Handle crop form with AJAX
    formCrop.addEventListener('submit', function(e) {
        e.preventDefault();
        const x1 = document.querySelector('input[name="x1"]').value;
        const y1 = document.querySelector('input[name="y1"]').value;
        const x2 = document.querySelector('input[name="x2"]').value;
        const y2 = document.querySelector('input[name="y2"]').value;
        applyCrop(x1, y1, x2, y2);
    });

    // Handle conversion form with AJAX
    const convertButtons = document.querySelectorAll('#form-convert button[type="submit"]');
    convertButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const mode = this.value;
            if (mode === 'grayscale') {
                applyGrayscale();
            } else if (mode === 'blackwhite') {
                applyBlackWhite();
            } else if (mode === 'color') {
                applyRestoreColor();
            }
        });
    });

    // Download button functionality
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();

        // Create a canvas to capture the image with all CSS transformations
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Get the current angle and compute rotation in radians
        const angleInRadians = (currentAngle * Math.PI) / 180;

        // Calculate the dimensions for the rotated canvas
        const imgWidth = previewImage.naturalWidth;
        const imgHeight = previewImage.naturalHeight;

        // Calculate bounding box dimensions after rotation
        const cos = Math.abs(Math.cos(angleInRadians));
        const sin = Math.abs(Math.sin(angleInRadians));
        const newWidth = Math.ceil(imgWidth * cos + imgHeight * sin);
        const newHeight = Math.ceil(imgWidth * sin + imgHeight * cos);

        // Set canvas size to fit the rotated image
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Move to center of canvas and apply rotation
        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(angleInRadians);

        // Draw the image centered
        ctx.drawImage(previewImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);

        // Convert canvas to blob and trigger download
        canvas.toBlob(function(blob) {
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');

                // Format: image_modifiee_YYYYMMDD_HHmmss.png
                const now = new Date();
                const dateStr = now.getFullYear() +
                    String(now.getMonth() + 1).padStart(2, '0') +
                    String(now.getDate()).padStart(2, '0') +
                    '_' +
                    String(now.getHours()).padStart(2, '0') +
                    String(now.getMinutes()).padStart(2, '0') +
                    String(now.getSeconds()).padStart(2, '0');

                link.href = url;
                link.download = 'image_modifiee_' + dateStr + '.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else {
                alert('Erreur lors de la création de l\'image');
            }
        }, 'image/png');
    });

    // Reset all transformations button
    const resetAllBtn = document.getElementById('reset-all-btn');
    resetAllBtn.addEventListener('click', function(e) {
        e.preventDefault();

        // Confirm reset
        if (confirm('Voulez-vous vraiment réinitialiser toutes les transformations et revenir à l\'image originale ?')) {
            // Reset to original image
            previewImage.src = originalImage.src + '?t=' + new Date().getTime();
            previewImage.style.transform = 'rotate(0deg) scale(1)';

            // Reset all state variables
            currentAngle = 0;
            hasTransformations = false;
            needsImageReload = false; // We just reloaded it

            // Reset rotation controls
            angleSlider.value = 0;
            angleInput.value = 0;
            currentAngleDisplay.textContent = 0;

            // Clear any pending rotation timeout
            clearTimeout(rotationTimeout);

            alert('Toutes les transformations ont été réinitialisées !');
        }
    });

    // Initialize with default value (0 degrees)
    needsImageReload = true; // First load needs the image
    updateRotation(0);

    // ==================== OVERLAY IMAGE FUNCTIONALITY ====================

    const overlayFilePicker = document.getElementById('overlay-file-picker');
    const overlayControls = document.getElementById('overlay-controls');
    const overlayXSlider = document.getElementById('overlay-x-slider');
    const overlayYSlider = document.getElementById('overlay-y-slider');
    const overlayScaleSlider = document.getElementById('overlay-scale-slider');
    const overlayOpacitySlider = document.getElementById('overlay-opacity-slider');
    const overlayXValue = document.getElementById('overlay-x-value');
    const overlayYValue = document.getElementById('overlay-y-value');
    const overlayScaleValue = document.getElementById('overlay-scale-value');
    const overlayOpacityValue = document.getElementById('overlay-opacity-value');
    const applyOverlayBtn = document.getElementById('apply-overlay-btn');
    const removeOverlayBtn = document.getElementById('remove-overlay-btn');

    // Handle overlay image upload
    overlayFilePicker.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.match('image.*')) {
            alert('Veuillez sélectionner une image valide (JPG, PNG)');
            return;
        }

        // Load overlay image
        const reader = new FileReader();
        reader.onload = function(event) {
            overlayImage = new Image();
            overlayImage.onload = function() {
                // Show controls
                overlayControls.classList.remove('hidden');
                // Draw overlay on canvas
                drawOverlay();
            };
            overlayImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Draw overlay on canvas with current settings
    function drawOverlay() {
        if (!overlayImage) return;

        // Get the base image dimensions
        const baseImg = previewImage;
        const baseWidth = baseImg.naturalWidth;
        const baseHeight = baseImg.naturalHeight;

        // Calculate overlay dimensions based on scale
        const overlayWidth = overlayImage.width * (overlayScale / 100);
        const overlayHeight = overlayImage.height * (overlayScale / 100);

        // Calculate position based on percentage
        const x = (baseWidth * overlayX / 100) - (overlayWidth / 2);
        const y = (baseHeight * overlayY / 100) - (overlayHeight / 2);

        // Create temporary canvas for preview
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = baseWidth;
        tempCanvas.height = baseHeight;
        const ctx = tempCanvas.getContext('2d');

        // Draw base image
        ctx.drawImage(baseImg, 0, 0, baseWidth, baseHeight);

        // Set opacity and draw overlay
        ctx.globalAlpha = overlayOpacity / 100;
        ctx.drawImage(overlayImage, x, y, overlayWidth, overlayHeight);
        ctx.globalAlpha = 1.0;

        // Update preview image with overlay
        previewImage.src = tempCanvas.toDataURL('image/png');
    }

    // Update overlay position X
    overlayXSlider.addEventListener('input', function() {
        overlayX = parseInt(this.value);
        overlayXValue.textContent = overlayX;
        drawOverlay();
    });

    // Update overlay position Y
    overlayYSlider.addEventListener('input', function() {
        overlayY = parseInt(this.value);
        overlayYValue.textContent = overlayY;
        drawOverlay();
    });

    // Update overlay scale
    overlayScaleSlider.addEventListener('input', function() {
        overlayScale = parseInt(this.value);
        overlayScaleValue.textContent = overlayScale;
        drawOverlay();
    });

    // Update overlay opacity
    overlayOpacitySlider.addEventListener('input', function() {
        overlayOpacity = parseInt(this.value);
        overlayOpacityValue.textContent = overlayOpacity;
        drawOverlay();
    });

    // Apply overlay permanently via server
    applyOverlayBtn.addEventListener('click', function(e) {
        e.preventDefault();

        if (!overlayImage) {
            alert('Aucune image de superposition chargée');
            return;
        }

        loadingSpinner.classList.remove('hidden');

        // Use temp.png if we have transformations, otherwise original
        const baseImageName = hasTransformations ? 'temp.png' : imageName;

        // Convert overlay image to base64
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = overlayImage.width;
        overlayCanvas.height = overlayImage.height;
        const overlayCtx = overlayCanvas.getContext('2d');
        overlayCtx.drawImage(overlayImage, 0, 0);
        const overlayBase64 = overlayCanvas.toDataURL('image/png').split(',')[1];

        const formData = new FormData();
        formData.append('image', baseImageName);
        formData.append('overlay_data', overlayBase64);
        formData.append('x_percent', overlayX);
        formData.append('y_percent', overlayY);
        formData.append('scale_percent', overlayScale);
        formData.append('opacity_percent', overlayOpacity);

        fetch('/overlay-blend', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Overlay blend failed');
            }
            return response.blob();
        })
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            previewImage.src = imageUrl;
            previewImage.style.transform = 'rotate(0deg) scale(1)';
            hasTransformations = true;
            needsImageReload = true;

            // Reset rotation
            currentAngle = 0;
            angleSlider.value = 0;
            angleInput.value = 0;
            currentAngleDisplay.textContent = 0;

            // Hide overlay controls and reset
            overlayControls.classList.add('hidden');
            overlayImage = null;
            overlayFilePicker.value = '';

            loadingSpinner.classList.add('hidden');
            alert('Fusion appliquée avec succès !');
        })
        .catch(error => {
            console.error('Overlay blend error:', error);
            loadingSpinner.classList.add('hidden');
            alert('Erreur lors de la fusion des images');
        });
    });

    // Remove overlay
    removeOverlayBtn.addEventListener('click', function(e) {
        e.preventDefault();

        // Reset overlay state
        overlayImage = null;
        overlayX = 50;
        overlayY = 50;
        overlayScale = 50;
        overlayOpacity = 100;

        // Reset sliders
        overlayXSlider.value = 50;
        overlayYSlider.value = 50;
        overlayScaleSlider.value = 50;
        overlayOpacitySlider.value = 100;
        overlayXValue.textContent = 50;
        overlayYValue.textContent = 50;
        overlayScaleValue.textContent = 50;
        overlayOpacityValue.textContent = 100;

        // Hide controls
        overlayControls.classList.add('hidden');

        // Reset file picker
        overlayFilePicker.value = '';

        // Restore original preview
        if (hasTransformations) {
            previewImage.src = '/static/images/temp.png?t=' + new Date().getTime();
        } else {
            previewImage.src = originalImage.src + '?t=' + new Date().getTime();
        }
    });
});
