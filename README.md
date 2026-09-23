# FINAL FANTASY XIV Screenshot Frame

A small static page that adds a white camera-style information footer to an FFXIV screenshot and exports a PNG at the screenshot's original width and resolution.

## Use

Open `index.html` in a modern browser, choose or drop a PNG, JPEG, or WebP screenshot, fill in the aperture, shutter speed, focal length, optional ISO, date and signature, then download the framed PNG.

The page reads EXIF capture dates when available. FFXIV screenshots often do not contain EXIF capture dates; in that case, enter one manually or choose **Use file date** to use the file's last-modified time. That time may differ from when the screenshot was taken.

Images are decoded, previewed and exported in the browser. The page does not upload images or depend on a server-side image processor.

## GitHub Pages

Serve these files from the root of the `ffxiv-photo-frame` repository with GitHub Pages. The exported image includes the attribution `FINAL FANTASY XIV © SQUARE ENIX`.
