// Interactive Rotation UI Script with Real-Time Preview
// Synchronize slider, input, and provide instant rotation preview

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const angleSlider = document.getElementById('angleSlider');
    const angleInput = document.getElementById('angleInput');
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

    // Calculate scale factor to fit rotated image in container
    function calculateScaleForRotation(angle) {
        // Convert angle to radians
        const radians = (angle * Math.PI) / 180;

        // Calculate the scale factor needed to fit the rotated image
        // Using the bounding box calculation
        const absSin = Math.abs(Math.sin(radians));
        const absCos = Math.abs(Math.cos(radians));

        // Scale down if needed to fit in container
        const scale = 1 / (absSin + absCos);

        // Don't scale up, only scale down if needed
        return Math.min(1, scale);
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

        // Calculate scale to keep image in bounds
        const scale = calculateScaleForRotation(angle);

        // Apply CSS rotation and scale for instant visual feedback
        previewImage.style.transform = `rotate(${angle}deg) scale(${scale})`;

        // Debounce server request for actual rotation
        clearTimeout(rotationTimeout);
        rotationTimeout = setTimeout(function() {
            applyRotationToServer(angle);
        }, 500);
    }

    // Apply rotation via AJAX without page reload
    function applyRotationToServer(angle) {
        if (angle === 0) {
            // Reset to original image
            previewImage.src = originalImage.src + '?t=' + new Date().getTime();
            previewImage.style.transform = 'rotate(0deg)';
            return;
        }

        // Show loading spinner
        loadingSpinner.classList.remove('hidden');

        // Create form data
        const formData = new FormData();
        formData.append('angle', angle);
        formData.append('image', imageName);

        // Send AJAX request
        fetch('/rotate', {
            method: 'POST',
            body: formData
        })
        .then(response => response.blob())
        .then(blob => {
            // Update preview image with rotated version
            const imageUrl = URL.createObjectURL(blob);
            previewImage.src = imageUrl;
            // Keep the CSS rotation and scale to maintain the current angle display
            const scale = calculateScaleForRotation(currentAngle);
            previewImage.style.transform = `rotate(${currentAngle}deg) scale(${scale})`;
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

        const formData = new FormData();
        formData.append('mode', mode);
        formData.append('image', imageName);

        fetch('/flip', {
            method: 'POST',
            body: formData
        })
        .then(response => response.blob())
        .then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            previewImage.src = imageUrl;
            // Reset rotation after flip
            currentAngle = 0;
            angleSlider.value = 0;
            angleInput.value = 0;
            previewImage.style.transform = 'rotate(0deg) scale(1)';
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

        const formData = new FormData();
        formData.append('x1', x1);
        formData.append('y1', y1);
        formData.append('x2', x2);
        formData.append('y2', y2);
        formData.append('image', imageName);

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
            // Reset rotation after crop
            currentAngle = 0;
            angleSlider.value = 0;
            angleInput.value = 0;
            previewImage.style.transform = 'rotate(0deg) scale(1)';
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

    // Reset button
    resetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        updateRotation(0);
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

    // Initialize with default value (0 degrees)
    updateRotation(0);
});
