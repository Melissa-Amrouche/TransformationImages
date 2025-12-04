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

    // Get the image filename from the hidden input
    const imageNameInput = document.querySelector('input[name="image"]');
    const imageName = imageNameInput ? imageNameInput.value : '';

    let rotationTimeout = null;
    let currentAngle = 0;
    let currentImageSrc = null; // Track the current working image (original or temp.png)
    let hasTransformations = false; // Track if we have any transformations applied
    let needsImageReload = false; // Track if we need to reload the base image

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
        clearTimeout(rotationTimeout);
        rotationTimeout = setTimeout(function() {
            applyRotationToServer(angle);
        }, 500);
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

    // Download button functionality
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();

        // Get the current preview image source
        const previewImageSrc = previewImage.src;

        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');

        // If the image is from a blob URL (after transformation)
        if (previewImageSrc.startsWith('blob:')) {
            fetch(previewImageSrc)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    link.href = url;
                    link.download = 'image_transformee_' + new Date().getTime() + '.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                })
                .catch(error => {
                    console.error('Download error:', error);
                    alert('Erreur lors du téléchargement de l\'image');
                });
        } else {
            // If it's a regular URL (original image or temp.png)
            fetch(previewImageSrc)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    link.href = url;
                    link.download = 'image_transformee_' + new Date().getTime() + '.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                })
                .catch(error => {
                    console.error('Download error:', error);
                    alert('Erreur lors du téléchargement de l\'image');
                });
        }
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
});
