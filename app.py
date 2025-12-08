# web-app for API image manipulation

from flask import Flask, request, render_template, send_from_directory
import os
from PIL import Image

app = Flask(__name__)

APP_ROOT = os.path.dirname(os.path.abspath(__file__))


# default access page
@app.route("/")
def main():
    return render_template('index.html')


# upload selected image and forward to processing page
@app.route("/upload", methods=["POST"])
def upload():
    target = os.path.join(APP_ROOT, 'static/images/')

    # create image directory if not found
    if not os.path.isdir(target):
        os.mkdir(target)

    # retrieve file from html file-picker
    upload = request.files.getlist("file")[0]
    print("File name: {}".format(upload.filename))
    filename = upload.filename

    # file support verification
    ext = os.path.splitext(filename)[1]
    if (ext == ".jpg") or (ext == ".png") or (ext == ".bmp"):
        print("File accepted")
    else:
        return render_template("error.html", message="The selected file is not supported"), 400

    # save file
    destination = "/".join([target, filename])
    print("File saved to to:", destination)
    upload.save(destination)

    # CRITICAL: Create temp_geometry.png immediately to preserve original colors
    # This allows color conversions to work even without geometric transformations first
    img = Image.open(destination)

    # IMPORTANT: Ensure image is in RGB mode for consistent processing
    if img.mode == 'RGBA':
        # Create white background for transparency
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    temp_geometry = "/".join([target, 'temp_geometry.png'])
    if os.path.isfile(temp_geometry):
        os.remove(temp_geometry)
    img.save(temp_geometry)
    print("Created temp_geometry.png for color preservation")

    # forward to processing page
    return render_template("processing.html", image_name=filename)


# rotate filename the specified degrees
@app.route("/rotate", methods=["POST"])
def rotate():
    # retrieve parameters from html form
    angle = int(request.form['angle'])
    filename = request.form['image']

    # validate angle (0-360 degrees)
    if not 0 <= angle <= 360:
        return render_template("error.html", message="L'angle doit être entre 0 et 360 degrés"), 400

    # open and process image
    target = os.path.join(APP_ROOT, 'static/images')

    # Check if we have a base image without rotation (after flip/crop)
    # This allows rotation reset to work properly
    base_no_rotation = "/".join([target, 'temp_no_rotation.png'])
    if filename == 'temp.png' and os.path.isfile(base_no_rotation):
        # Use the base image without rotation
        destination = base_no_rotation
    else:
        # Use the specified filename
        destination = "/".join([target, filename])

    img = Image.open(destination)

    # rotate counter-clockwise (negative for clockwise rotation in Pillow)
    # expand=True ensures the entire rotated image is visible (no cropping)
    img = img.rotate(-1 * angle, expand=True, fillcolor='white')

    # save and return image (only temp.png, keep temp_no_rotation.png unchanged)
    destination = "/".join([target, 'temp.png'])
    if os.path.isfile(destination):
        os.remove(destination)
    img.save(destination)

    return send_image('temp.png')


# flip filename 'vertical' or 'horizontal'
@app.route("/flip", methods=["POST"])
def flip():

    # retrieve parameters from html form
    if 'horizontal' in request.form['mode']:
        mode = 'horizontal'
    elif 'vertical' in request.form['mode']:
        mode = 'vertical'
    else:
        return render_template("error.html", message="Mode not supported (vertical - horizontal)"), 400
    filename = request.form['image']

    # open and process image
    target = os.path.join(APP_ROOT, 'static/images')
    destination = "/".join([target, filename])

    img = Image.open(destination)

    if mode == 'horizontal':
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    else:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)

    # save and return image
    # Save as temp.png, temp_no_rotation.png, AND temp_geometry.png (for color conversions)
    destination = "/".join([target, 'temp.png'])
    destination_no_rot = "/".join([target, 'temp_no_rotation.png'])
    destination_geometry = "/".join([target, 'temp_geometry.png'])

    if os.path.isfile(destination):
        os.remove(destination)
    if os.path.isfile(destination_no_rot):
        os.remove(destination_no_rot)
    if os.path.isfile(destination_geometry):
        os.remove(destination_geometry)

    img.save(destination)
    img.save(destination_no_rot)
    img.save(destination_geometry)  # Update geometry base with flip

    return send_image('temp.png')


# crop filename from (x1,y1) to (x2,y2)
@app.route("/crop", methods=["POST"])
def crop():
    # retrieve parameters from html form
    x1 = int(request.form['x1'])
    y1 = int(request.form['y1'])
    x2 = int(request.form['x2'])
    y2 = int(request.form['y2'])
    filename = request.form['image']

    # open image
    target = os.path.join(APP_ROOT, 'static/images')
    destination = "/".join([target, filename])

    img = Image.open(destination)

    # check for valid crop parameters
    width = img.size[0]
    height = img.size[1]

    crop_possible = True
    if not 0 <= x1 < width:
        crop_possible = False
    if not 0 < x2 <= width:
        crop_possible = False
    if not 0 <= y1 < height:
        crop_possible = False
    if not 0 < y2 <= height:
        crop_possible = False
    if not x1 < x2:
        crop_possible = False
    if not y1 < y2:
        crop_possible = False

    # crop image and show
    if crop_possible:
        img = img.crop((x1, y1, x2, y2))

        # save and return image
        # Save as temp.png, temp_no_rotation.png, AND temp_geometry.png (for color conversions)
        destination = "/".join([target, 'temp.png'])
        destination_no_rot = "/".join([target, 'temp_no_rotation.png'])
        destination_geometry = "/".join([target, 'temp_geometry.png'])

        if os.path.isfile(destination):
            os.remove(destination)
        if os.path.isfile(destination_no_rot):
            os.remove(destination_no_rot)
        if os.path.isfile(destination_geometry):
            os.remove(destination_geometry)

        img.save(destination)
        img.save(destination_no_rot)
        img.save(destination_geometry)  # Update geometry base with crop
        return send_image('temp.png')
    else:
        return render_template("error.html", message="Crop dimensions not valid"), 400
    return '', 204


# blend filename with stock photo and alpha parameter
@app.route("/blend", methods=["POST"])
def blend():
    # retrieve parameters from html form
    alpha = request.form['alpha']
    filename1 = request.form['image']

    # open images
    target = os.path.join(APP_ROOT, 'static/images')
    filename2 = 'blend.jpg'
    destination1 = "/".join([target, filename1])
    destination2 = "/".join([target, filename2])

    img1 = Image.open(destination1)
    img2 = Image.open(destination2)

    # resize images to max dimensions
    width = max(img1.size[0], img2.size[0])
    height = max(img1.size[1], img2.size[1])

    img1 = img1.resize((width, height), Image.ANTIALIAS)
    img2 = img2.resize((width, height), Image.ANTIALIAS)

    # if image in gray scale, convert stock image to monochrome
    if len(img1.mode) < 3:
        img2 = img2.convert('L')

    # blend and show image
    img = Image.blend(img1, img2, float(alpha)/100)

     # save and return image
    destination = "/".join([target, 'temp.png'])
    if os.path.isfile(destination):
        os.remove(destination)
    img.save(destination)

    return send_image('temp.png')


# convert image to grayscale (256 shades of gray)
# ALWAYS use temp_geometry.png as source (preserves original colors + geometric transformations)
@app.route("/grayscale", methods=["POST"])
def grayscale():
    # retrieve parameters from html form
    filename = request.form['image']

    # open and process image
    target = os.path.join(APP_ROOT, 'static/images')

    # CRITICAL: Use temp_geometry.png if it exists (has original colors + geometric transforms)
    # This ensures we can convert N&B → Gris or Gris → N&B by always starting from color
    geometry_file = "/".join([target, 'temp_geometry.png'])
    if os.path.isfile(geometry_file):
        destination = geometry_file
    else:
        destination = "/".join([target, filename])

    img = Image.open(destination)

    # IMPORTANT: Handle transparency before grayscale conversion
    if img.mode == 'RGBA':
        # Create white background for transparency
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
        img = background
    elif img.mode == 'P':
        img = img.convert('RGB')

    # convert to grayscale using Pillow's built-in method
    # This uses the standard luminosity formula: 0.299*R + 0.587*G + 0.114*B
    img = img.convert('L')

    # IMPORTANT: Convert back to RGB for browser compatibility
    # Some browsers have issues displaying grayscale PNG (mode 'L')
    img = img.convert('RGB')

    # save and return image
    # Save as both temp.png and temp_no_rotation.png (base for future rotations)
    destination = "/".join([target, 'temp.png'])
    destination_no_rot = "/".join([target, 'temp_no_rotation.png'])

    if os.path.isfile(destination):
        os.remove(destination)
    if os.path.isfile(destination_no_rot):
        os.remove(destination_no_rot)

    img.save(destination)
    img.save(destination_no_rot)

    return send_image('temp.png')


# convert image to black and white (binary threshold)
# ALWAYS use temp_geometry.png as source (preserves original colors + geometric transformations)
@app.route("/blackwhite", methods=["POST"])
def blackwhite():
    # retrieve parameters from html form
    filename = request.form['image']
    threshold = int(request.form.get('threshold', 128))  # default threshold: 128

    # validate threshold (0-255)
    if not 0 <= threshold <= 255:
        threshold = 128

    # open and process image
    target = os.path.join(APP_ROOT, 'static/images')

    # CRITICAL: Use temp_geometry.png if it exists (has original colors + geometric transforms)
    # This ensures we can convert Gris → N&B by always starting from color
    geometry_file = "/".join([target, 'temp_geometry.png'])
    if os.path.isfile(geometry_file):
        destination = geometry_file
    else:
        destination = "/".join([target, filename])

    img = Image.open(destination)

    # IMPORTANT: Handle transparency before grayscale conversion
    if img.mode == 'RGBA':
        # Create white background for transparency
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
        img = background
    elif img.mode == 'P':
        img = img.convert('RGB')

    # convert to grayscale first
    img = img.convert('L')

    # apply binary threshold: pixels > threshold become white (255), others black (0)
    img = img.point(lambda pixel: 255 if pixel > threshold else 0)

    # IMPORTANT: Convert back to RGB for browser compatibility
    # Some browsers have issues displaying grayscale PNG (mode 'L')
    img = img.convert('RGB')

    # save and return image
    # Save as both temp.png and temp_no_rotation.png (base for future rotations)
    destination = "/".join([target, 'temp.png'])
    destination_no_rot = "/".join([target, 'temp_no_rotation.png'])

    if os.path.isfile(destination):
        os.remove(destination)
    if os.path.isfile(destination_no_rot):
        os.remove(destination_no_rot)

    img.save(destination)
    img.save(destination_no_rot)

    return send_image('temp.png')


# restore original colors (use temp_geometry.png which has original colors + geometric transforms)
@app.route("/restore-color", methods=["POST"])
def restore_color():
    # retrieve parameters from html form
    filename = request.form['image']

    # open and process image
    target = os.path.join(APP_ROOT, 'static/images')

    # CRITICAL: Use temp_geometry.png (has geometric transformations with original colors)
    # If it doesn't exist, use the original filename
    geometry_file = "/".join([target, 'temp_geometry.png'])
    if os.path.isfile(geometry_file):
        source = geometry_file
    else:
        source = "/".join([target, filename])

    img = Image.open(source)

    # IMPORTANT: Ensure image is in RGB mode for browser compatibility
    # Convert RGBA → RGB, P → RGB, L → RGB, etc.
    if img.mode == 'RGBA':
        # Create white background for transparency
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # save and return image (restore original colors)
    # Save as both temp.png and temp_no_rotation.png
    destination = "/".join([target, 'temp.png'])
    destination_no_rot = "/".join([target, 'temp_no_rotation.png'])

    if os.path.isfile(destination):
        os.remove(destination)
    if os.path.isfile(destination_no_rot):
        os.remove(destination_no_rot)

    img.save(destination)
    img.save(destination_no_rot)

    return send_image('temp.png')


# overlay blend - superpose a second image on top of the base image
@app.route("/overlay-blend", methods=["POST"])
def overlay_blend():
    import base64
    from io import BytesIO

    # retrieve parameters from html form
    filename = request.form['image']
    overlay_base64 = request.form['overlay_data']
    x_percent = float(request.form['x_percent'])
    y_percent = float(request.form['y_percent'])
    scale_percent = float(request.form['scale_percent'])
    opacity_percent = float(request.form['opacity_percent'])

    # open base image
    target = os.path.join(APP_ROOT, 'static/images')
    destination = "/".join([target, filename])
    base_img = Image.open(destination)

    # Ensure base image is RGB
    if base_img.mode == 'RGBA':
        background = Image.new('RGB', base_img.size, (255, 255, 255))
        background.paste(base_img, mask=base_img.split()[3])
        base_img = background
    elif base_img.mode != 'RGB':
        base_img = base_img.convert('RGB')

    # decode overlay image from base64
    overlay_data = base64.b64decode(overlay_base64)
    overlay_img = Image.open(BytesIO(overlay_data))

    # Ensure overlay image is RGBA for transparency support
    if overlay_img.mode != 'RGBA':
        overlay_img = overlay_img.convert('RGBA')

    # Calculate overlay dimensions based on scale
    base_width, base_height = base_img.size
    overlay_width = int(overlay_img.width * (scale_percent / 100))
    overlay_height = int(overlay_img.height * (scale_percent / 100))

    # Resize overlay image
    overlay_img = overlay_img.resize((overlay_width, overlay_height), Image.LANCZOS)

    # Calculate position based on percentage (centered on the point)
    x = int((base_width * x_percent / 100) - (overlay_width / 2))
    y = int((base_height * y_percent / 100) - (overlay_height / 2))

    # Apply opacity to overlay image (efficient method using alpha channel)
    if overlay_img.mode == 'RGBA' and opacity_percent < 100:
        # Extract alpha channel and multiply by opacity percentage
        alpha = overlay_img.split()[3]
        alpha = alpha.point(lambda p: int(p * (opacity_percent / 100)))
        overlay_img.putalpha(alpha)

    # Paste overlay on base image
    base_img.paste(overlay_img, (x, y), overlay_img)

    # save and return image
    # Save as temp.png, temp_no_rotation.png, AND temp_geometry.png
    destination = "/".join([target, 'temp.png'])
    destination_no_rot = "/".join([target, 'temp_no_rotation.png'])
    destination_geometry = "/".join([target, 'temp_geometry.png'])

    if os.path.isfile(destination):
        os.remove(destination)
    if os.path.isfile(destination_no_rot):
        os.remove(destination_no_rot)
    if os.path.isfile(destination_geometry):
        os.remove(destination_geometry)

    base_img.save(destination)
    base_img.save(destination_no_rot)
    base_img.save(destination_geometry)  # Update geometry base with overlay

    return send_image('temp.png')


# retrieve file from 'static/images' directory
@app.route('/static/images/<filename>')
def send_image(filename):
    return send_from_directory("static/images", filename)


if __name__ == "__main__":
    app.run()

