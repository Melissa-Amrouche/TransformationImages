// Interactive Rotation UI Script
// Synchronize slider, input, preview icon, and quick buttons

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const angleSlider = document.getElementById('angleSlider');
    const angleInput = document.getElementById('angleInput');
    const resetBtn = document.getElementById('resetBtn');
    const rotate90Btn = document.getElementById('rotate90Btn');
    const rotate180Btn = document.getElementById('rotate180Btn');
    const rotate270Btn = document.getElementById('rotate270Btn');

    // Central function to update all rotation controls
    function updateRotation(angle) {
        // Parse and validate angle
        angle = parseInt(angle) || 0;
        angle = Math.max(0, Math.min(360, angle));

        // Update all controls
        angleSlider.value = angle;
        angleInput.value = angle;
    }

    // Event listeners for synchronization

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

    // Initialize with default value (0 degrees)
    updateRotation(0);
});
