(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const fileInput = byId('image-file');
  const dropzone = byId('dropzone');
  const canvas = byId('preview-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const fields = {
    date: byId('capture-time'),
    aperture: byId('aperture'),
    shutter: byId('shutter'),
    focal: byId('focal-length'),
    iso: byId('iso'),
    signature: byId('signature'),
  };

  let image = null;
  let imageUrl = '';
  let selectedFile = null;
  let toastTimer = 0;

  function clean(value) {
    return value.trim().replace(/\s+/g, ' ');
  }

  function showToast(message) {
    const toast = byId('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function fileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function setDateHint(message) {
    byId('date-hint').textContent = message;
  }

  function setFileDate() {
    if (!selectedFile) return;
    const date = new Date(selectedFile.lastModified);
    const pad = (number) => String(number).padStart(2, '0');
    fields.date.value = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    setDateHint('已填入檔案的最後修改時間；它不一定是遊戲截圖的拍攝時間。');
    renderFrame();
  }

  function displayDate(raw) {
    if (!raw) return '';
    const match = raw.match(/^(\d{4})[:.-](\d{2})[:.-](\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    if (match) return `${match[1]}.${match[2]}.${match[3]} ${match[4]}`;
    return raw.trim();
  }

  function readTiffDate(view, start, length) {
    const end = Math.min(view.byteLength, start + length);
    if (start < 0 || start + 8 > end) return '';
    const byteOrder = view.getUint16(start, false);
    const little = byteOrder === 0x4949;
    if (!little && byteOrder !== 0x4d4d) return '';
    const u16 = (offset) => view.getUint16(offset, little);
    const u32 = (offset) => view.getUint32(offset, little);
    if (u16(start + 2) !== 42) return '';

    function readEntry(ifdOffset, wantedTag) {
      const directory = start + ifdOffset;
      if (directory + 2 > end) return null;
      const count = u16(directory);
      for (let index = 0; index < count; index += 1) {
        const entry = directory + 2 + index * 12;
        if (entry + 12 > end) break;
        if (u16(entry) !== wantedTag) continue;
        const type = u16(entry + 2);
        const itemCount = u32(entry + 4);
        const unitSize = type === 2 ? 1 : type === 3 ? 2 : type === 4 ? 4 : 0;
        if (!unitSize || !itemCount || itemCount > 128) return null;
        const byteCount = unitSize * itemCount;
        const valueOffset = byteCount <= 4 ? entry + 8 : start + u32(entry + 8);
        if (valueOffset < start || valueOffset + byteCount > end) return null;
        if (type === 2) {
          let value = '';
          for (let at = 0; at < itemCount; at += 1) value += String.fromCharCode(view.getUint8(valueOffset + at));
          return value.replace(/\0.*$/, '').trim();
        }
        return type === 3 ? u16(valueOffset) : u32(valueOffset);
      }
      return null;
    }

    const ifd0Offset = u32(start + 4);
    const exifOffset = readEntry(ifd0Offset, 0x8769);
    if (typeof exifOffset === 'number') {
      const dateOriginal = readEntry(exifOffset, 0x9003);
      if (typeof dateOriginal === 'string' && dateOriginal) return dateOriginal;
      const dateDigitized = readEntry(exifOffset, 0x9004);
      if (typeof dateDigitized === 'string' && dateDigitized) return dateDigitized;
    }
    const imageDate = readEntry(ifd0Offset, 0x0132);
    return typeof imageDate === 'string' ? imageDate : '';
  }

  function parseExifDate(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const ascii = (offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));

    // JPEG: search APP1 segments for the Exif TIFF directory.
    if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset + 4 < bytes.length) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker === 0xda || marker === 0xd9) break;
        const segmentLength = view.getUint16(offset + 2, false);
        if (segmentLength < 2 || offset + 2 + segmentLength > bytes.length) break;
        const dataStart = offset + 4;
        const dataLength = segmentLength - 2;
        if (marker === 0xe1 && dataLength >= 14 && ascii(dataStart, 6) === 'Exif\0\0') {
          const date = readTiffDate(view, dataStart + 6, dataLength - 6);
          if (date) return date;
        }
        offset += segmentLength + 2;
      }
    }

    // PNG: standard eXIf chunks contain a TIFF directory; text chunks can also carry dates.
    const pngSignature = '\x89PNG\r\n\x1a\n';
    if (bytes.length > 16 && ascii(0, 8) === pngSignature) {
      let offset = 8;
      while (offset + 12 <= bytes.length) {
        const length = view.getUint32(offset, false);
        const type = ascii(offset + 4, 4);
        const dataStart = offset + 8;
        if (length > bytes.length - dataStart - 4) break;
        if (type === 'eXIf') {
          const date = readTiffDate(view, dataStart, length);
          if (date) return date;
        }
        if (type === 'tEXt') {
          const chunk = ascii(dataStart, length);
          const split = chunk.indexOf('\0');
          if (split >= 0 && /date|time|creation/i.test(chunk.slice(0, split))) {
            const value = chunk.slice(split + 1).trim();
            if (/^\d{4}[:.-]\d{2}[:.-]\d{2}/.test(value)) return value;
          }
        }
        offset = dataStart + length + 4;
      }
    }

    // WebP: EXIF chunks are padded to even-byte boundaries.
    if (bytes.length > 16 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
      let offset = 12;
      while (offset + 8 <= bytes.length) {
        const type = ascii(offset, 4);
        const length = view.getUint32(offset + 4, true);
        const dataStart = offset + 8;
        if (length > bytes.length - dataStart) break;
        if (type === 'EXIF') {
          let tiffStart = dataStart;
          if (ascii(dataStart, 6) === 'Exif\0\0') tiffStart += 6;
          const date = readTiffDate(view, tiffStart, dataStart + length - tiffStart);
          if (date) return date;
        }
        offset = dataStart + length + (length % 2);
      }
    }
    return '';
  }

  function loadImage(file) {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showToast('請選擇 PNG、JPG 或 WebP 圖片。');
      return;
    }

    if (imageUrl) URL.revokeObjectURL(imageUrl);
    selectedFile = file;
    imageUrl = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      image = nextImage;
      byId('empty-preview').hidden = true;
      canvas.hidden = false;
      byId('file-summary').hidden = false;
      byId('file-name').textContent = file.name;
      byId('file-size').textContent = `${image.naturalWidth} × ${image.naturalHeight} · ${fileSize(file.size)}`;
      byId('preview-dimensions').textContent = `${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} px`;
      byId('preview-file-caption').textContent = file.name;
      byId('download-image').disabled = false;
      byId('use-file-date').disabled = false;
      renderFrame();
      readFileDate(file);
    };
    nextImage.onerror = () => {
      showToast('無法讀取這張圖片，請換一個檔案再試。');
      URL.revokeObjectURL(imageUrl);
      imageUrl = '';
      selectedFile = null;
    };
    nextImage.src = imageUrl;
  }

  async function readFileDate(file) {
    fields.date.value = '';
    setDateHint('正在讀取圖片內的拍攝日期…');
    try {
      const date = displayDate(parseExifDate(await file.arrayBuffer()));
      if (date) {
        fields.date.value = date;
        setDateHint('已從圖片的 EXIF 資訊讀取拍攝日期，可直接修改。');
      } else {
        setDateHint('圖片內沒有可讀取的拍攝日期；你可以手動輸入，或使用檔案日期。');
      }
    } catch (error) {
      setDateHint('無法讀取圖片日期；你可以手動輸入，或使用檔案日期。');
    }
    renderFrame();
  }

  function drawCrystal(context, x, y, size) {
    context.save();
    context.translate(x, y);
    context.strokeStyle = '#243946';
    context.lineWidth = Math.max(1.4, size * 0.035);
    context.beginPath();
    context.moveTo(size * 0.5, 0);
    context.lineTo(size, size * 0.43);
    context.lineTo(size * 0.5, size);
    context.lineTo(0, size * 0.43);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(size * 0.5, size * 0.18);
    context.lineTo(size * 0.5, size * 0.79);
    context.moveTo(size * 0.22, size * 0.43);
    context.lineTo(size * 0.78, size * 0.43);
    context.strokeStyle = '#a44045';
    context.stroke();
    context.restore();
  }

  function renderFrame() {
    if (!image || !ctx) return;
    const width = image.naturalWidth;
    const photoHeight = image.naturalHeight;
    const footerHeight = Math.max(132, Math.round(width * 0.118));
    const scale = width / 1800;
    const pad = Math.round(width * 0.036);
    const footerTop = photoHeight;
    const footerBottom = photoHeight + footerHeight;
    const dividerX = Math.round(width * 0.665);
    const topLine = footerTop + footerHeight * 0.24;
    const mainBaseline = footerTop + footerHeight * 0.51;
    const subBaseline = footerTop + footerHeight * 0.76;

    canvas.width = width;
    canvas.height = footerBottom;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, footerBottom);
    ctx.drawImage(image, 0, 0, width, photoHeight);

    ctx.strokeStyle = '#d9d9d7';
    ctx.lineWidth = Math.max(1, scale * 0.75);
    ctx.beginPath();
    ctx.moveTo(0, footerTop + 0.5);
    ctx.lineTo(width, footerTop + 0.5);
    ctx.moveTo(dividerX, topLine);
    ctx.lineTo(dividerX, footerTop + footerHeight * 0.84);
    ctx.stroke();

    const crystalSize = Math.round(Math.max(30, footerHeight * 0.29));
    drawCrystal(ctx, pad, footerTop + footerHeight * 0.29, crystalSize);
    const titleX = pad + crystalSize + Math.round(15 * scale);
    const titleSize = Math.round(Math.max(20, Math.min(footerHeight * 0.23, width * 0.022)));
    ctx.fillStyle = '#171a1b';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = `700 ${titleSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Arial, sans-serif`;
    ctx.fillText('FINAL FANTASY XIV', titleX, mainBaseline);

    const capture = clean(fields.date.value) || 'DATE / TIME';
    ctx.fillStyle = capture === 'DATE / TIME' ? '#a3a6a5' : '#898e8e';
    ctx.font = `400 ${Math.round(Math.max(15, footerHeight * 0.145))}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Arial, sans-serif`;
    ctx.fillText(capture, pad, subBaseline);

    const metrics = [
      { value: clean(fields.focal.value) ? `${clean(fields.focal.value)} mm` : '— mm', label: 'FOCAL LENGTH' },
      { value: clean(fields.aperture.value) ? `f/${clean(fields.aperture.value).replace(/^f\//i, '')}` : 'f/—', label: 'APERTURE' },
      { value: clean(fields.shutter.value) ? clean(fields.shutter.value).replace(/s$/i, '') : '—', label: 'SHUTTER' },
    ];
    if (clean(fields.iso.value)) metrics.push({ value: `ISO ${clean(fields.iso.value).replace(/^iso\s*/i, '')}`, label: 'SENSITIVITY' });

    const rightX = dividerX + Math.round(width * 0.025);
    const rightEnd = width - pad;
    const cellGap = Math.round(width * 0.012);
    const cellWidth = (rightEnd - rightX - cellGap * (metrics.length - 1)) / metrics.length;
    const metricFont = Math.round(Math.max(21, Math.min(footerHeight * 0.24, cellWidth * 0.37)));
    metrics.forEach((metric, index) => {
      const x = rightX + index * (cellWidth + cellGap);
      ctx.fillStyle = metric.value.includes('—') ? '#a2a6a5' : '#171a1b';
      ctx.textAlign = 'left';
      ctx.font = `500 ${metricFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Arial, sans-serif`;
      ctx.fillText(metric.value, x, mainBaseline);
      ctx.fillStyle = '#999e9d';
      ctx.font = `500 ${Math.max(10, Math.round(footerHeight * 0.058))}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.fillText(metric.label, x, subBaseline);
    });

    const signature = clean(fields.signature.value);
    if (signature) {
      const signY = footerTop + footerHeight * 0.91;
      ctx.fillStyle = '#777e7d';
      ctx.textAlign = 'right';
      ctx.font = `400 ${Math.round(Math.max(11, footerHeight * 0.08))}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Arial, sans-serif`;
      ctx.fillText(`— ${signature}`, width - pad, signY);
    }

    ctx.fillStyle = '#a4a8a7';
    ctx.textAlign = 'left';
    ctx.font = `400 ${Math.round(Math.max(9, footerHeight * 0.055))}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
    ctx.fillText('FINAL FANTASY XIV © SQUARE ENIX', pad, footerTop + footerHeight * 0.93);
  }

  function downloadFrame() {
    if (!image) return;
    renderFrame();
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('無法輸出圖片，請重新選取較小的截圖再試。');
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const baseName = (selectedFile?.name || 'ffxiv-screenshot').replace(/\.[^.]+$/, '').replace(/[\/:*?"<>|]/g, '_');
      anchor.href = url;
      anchor.download = `${baseName}-frame.png`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      byId('export-note').textContent = `已輸出 ${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()} px PNG。`;
      showToast('影格已準備好，開始下載 PNG。');
    }, 'image/png');
  }

  fileInput.addEventListener('change', () => loadImage(fileInput.files?.[0]));
  byId('replace-image').addEventListener('click', () => fileInput.click());
  byId('use-file-date').addEventListener('click', setFileDate);
  byId('download-image').addEventListener('click', downloadFrame);
  Object.values(fields).forEach((field) => field.addEventListener('input', renderFrame));

  for (const eventName of ['dragenter', 'dragover']) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
    });
  }
  dropzone.addEventListener('drop', (event) => loadImage(event.dataTransfer?.files?.[0]));
  byId('use-file-date').disabled = true;
})();
