# 光之相紙 — FFXIV 截圖加框

A small static page that adds a white camera-style information footer to an FFXIV screenshot and exports a PNG at the screenshot's original width.

## Use

Open `index.html` in a modern browser, choose or drop a PNG, JPEG, or WebP screenshot, fill in the aperture, focal length, optional shutter speed and ISO, date and signature, then download the framed PNG. Empty optional fields are omitted from the exported footer. Each camera setting has its own **使用預設** button: aperture f/2.8, shutter 1/150s, focal length 77mm, and ISO 640.

The page reads embedded date metadata when available. FFXIV screenshots often do not contain this information; in that case, it automatically uses the file's last-modified time. You can edit the date or press **帶入檔案修改時間** to restore it. That time may differ from when the screenshot was taken.

Images are decoded, previewed and exported in the browser. The page does not upload images or depend on a server-side image processor.

The header links to the project repository and has a light/dark theme switch. The selected theme is saved in the browser when local storage is available.

The custom text appears as the large second line beneath the camera settings, in the position occupied by coordinates in the reference frame. Its size is adjustable from 60% to 160% of the image-based default, in 5% increments. Longer text wraps and may shrink to fit within that area.

The XIV mark in the page header and exported frame uses three separate sans-serif letterforms with equal stroke weight and even spacing. X and V share the same top and baseline, while the red I extends equally above and below them. The mark has a transparent background: X and V appear black in the exported frame and light in the page's dark theme. It does not trace the Fan Festival artwork. The favicon uses the same shapes without a background.

The website footer identifies this as an unofficial, non-commercial fan tool and displays `© SQUARE ENIX` on its own line. Its wording was checked against the September 16, 2026 materials usage policy revisions; users should follow the version applicable to them when sharing screenshots.

## GitHub Pages

The site is published at https://ryan4559.github.io/ffxiv-ss-frame/ from the root of the `main` branch. The exported image includes the attribution `© SQUARE ENIX`.
