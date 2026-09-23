(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const themeToggle = byId('theme-toggle');
  const fileInput = byId('image-file');
  const dropzone = byId('dropzone');
  const previewStage = byId('preview-stage');
  const canvas = byId('preview-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const fields = {
    date: byId('capture-time'),
    aperture: byId('aperture'),
    shutter: byId('shutter'),
    focal: byId('focal-length'),
    iso: byId('iso'),
    signature: byId('signature'),
    signatureSize: byId('signature-size'),
  };

  let image = null;
  let imageUrl = '';
  let selectedFile = null;
  let toastTimer = 0;
  let loadToken = 0;
  let dateEditVersion = 0;
  const xivMark = new Image();
  xivMark.onload = () => renderFrame();
  xivMark.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(byId('xiv-mark')))}`;

  const exposureDefaults = { aperture: '2.8', shutter: '1/150', focal: '77', iso: '640' };

  function setTheme(theme, persist = false) {
    document.documentElement.dataset.theme = theme;
    const label = theme === 'light' ? '切換至深色模式' : '切換至淺色模式';
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
    document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f3f6f5' : '#101820';
    if (persist) {
      try { localStorage.setItem('ffxiv-frame-theme', theme); } catch (error) { /* Theme still works for this visit. */ }
    }
  }

  setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true);
  });

  function clean(value) {
    return value.trim().replace(/\s+/g, ' ');
  }

  function frameMeasurements(photo) {
    const width = photo.naturalWidth;
    const portrait = photo.naturalHeight > width;
    const footerHeight = Math.max(132, Math.round(portrait ? photo.naturalHeight * 0.109 : width * 0.118));
    const dateSize = Math.round(Math.max(15, portrait ? Math.min(footerHeight * 0.145, width * 0.024) : footerHeight * 0.145));
    return { portrait, footerHeight, dateSize };
  }

  function updateSignatureSizeLabel() {
    const size = fields.signatureSize.value;
    byId('signature-size-value').textContent = `${size}%`;
    fields.signatureSize.setAttribute('aria-valuetext', `${size} 百分比`);
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

  function formatFileDate(file) {
    const date = new Date(file.lastModified);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function useFileDate(file, automatic = false) {
    const date = formatFileDate(file);
    if (!date) {
      setDateHint('無法取得檔案修改時間，請自行填寫日期與時間。');
      return;
    }
    fields.date.value = date;
    setDateHint(automatic
      ? '圖片中沒有可用的日期資訊，已帶入檔案最後修改時間；可自行修改。'
      : '已帶入檔案最後修改時間，請確認是否與拍攝時間相符。');
    renderFrame();
  }

  function setFileDate() {
    if (!selectedFile) return;
    dateEditVersion += 1;
    useFileDate(selectedFile);
  }

  function displayDate(raw) {
    if (!raw) return '';
    const match = raw.match(/^(\d{4})[:.-](\d{2})[:.-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (!match) return '';
    const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, second, 0);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day
      || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) return '';
    return `${match[1]}.${match[2]}.${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
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
    if (!file || !(/^image\/(png|jpeg|webp)$/.test(file.type) || (!file.type && /\.(png|jpe?g|webp)$/i.test(file.name)))) {
      fileInput.value = '';
      showToast('請選擇 PNG、JPG／JPEG 或 WebP 圖片。');
      return;
    }

    const token = ++loadToken;
    const dateVersionAtSelection = dateEditVersion;
    const nextUrl = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      if (token !== loadToken) {
        URL.revokeObjectURL(nextUrl);
        return;
      }
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = nextUrl;
      image = nextImage;
      selectedFile = file;
      fileInput.value = '';
      dropzone.hidden = true;
      byId('empty-preview').hidden = true;
      canvas.hidden = false;
      previewStage.classList.add('has-image');
      byId('file-summary').hidden = false;
      byId('file-name').textContent = file.name;
      byId('file-size').textContent = `${image.naturalWidth} × ${image.naturalHeight} · ${fileSize(file.size)}`;
      byId('download-image').disabled = false;
      byId('use-file-date').disabled = false;
      renderFrame();
      readFileDate(file, token, dateVersionAtSelection);
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      if (token !== loadToken) return;
      fileInput.value = '';
      showToast('無法開啟這張圖片，請選擇另一個檔案。');
    };
    nextImage.src = nextUrl;
  }

  async function readFileDate(file, token, dateVersionAtSelection) {
    if (dateVersionAtSelection !== dateEditVersion) return;
    const editVersion = dateEditVersion;
    fields.date.value = '';
    setDateHint('正在讀取圖片中的日期資訊…');
    renderFrame();
    try {
      const date = displayDate(parseExifDate(await file.arrayBuffer()));
      if (token !== loadToken || editVersion !== dateEditVersion) return;
      if (date) {
        fields.date.value = date;
        setDateHint('已讀取圖片中的日期資訊；可自行修改。');
      } else {
        useFileDate(file, true);
      }
    } catch (error) {
      if (token !== loadToken || editVersion !== dateEditVersion) return;
      useFileDate(file, true);
    }
    renderFrame();
  }

  function wrapCanvasText(context, value, maxWidth) {
    const lines = [];
    let line = '';
    for (const character of Array.from(value)) {
      const next = line + character;
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line.trim());
        line = character.trimStart();
      } else {
        line = next;
      }
    }
    if (line) lines.push(line.trim());
    return lines;
  }

  function renderFrame() {
    if (!image || !ctx) return;
    const width = image.naturalWidth;
    const photoHeight = image.naturalHeight;
    const { portrait, footerHeight, dateSize } = frameMeasurements(image);
    const scale = width / 1800;
    const pad = Math.round(width * 0.036);
    const footerTop = photoHeight;
    const footerBottom = photoHeight + footerHeight;
    const dividerX = Math.round(width * (portrait ? 0.555 : 0.69));
    const topLine = footerTop + footerHeight * 0.24;
    const dividerBottom = footerTop + footerHeight * 0.84;
    const mainBaseline = footerTop + footerHeight * (portrait ? 0.47 : 0.51);
    const subBaseline = footerTop + footerHeight * (portrait ? 0.73 : 0.76);

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
    ctx.stroke();

    ctx.strokeStyle = '#b6b6b6';
    ctx.lineWidth = Math.max(2, scale * 2.4);
    ctx.beginPath();
    ctx.moveTo(dividerX, topLine);
    ctx.lineTo(dividerX, dividerBottom);
    ctx.stroke();

    const markHeight = Math.round(Math.max(32, footerHeight * 0.38));
    const markWidth = Math.round(markHeight * 160 / 90);
    const titleSize = Math.round(Math.max(20, Math.min(footerHeight * 0.23, width * (portrait ? 0.03 : 0.022))));
    const logoX = dividerX - Math.round(width * (portrait ? 0.02 : 0.014)) - markWidth;
    if (xivMark.complete && xivMark.naturalWidth) {
      // The drawn XIV paths span y=19..75 in the SVG's 90-unit viewBox.
      const logoY = (topLine + dividerBottom) / 2 - markHeight * (47 / 90);
      ctx.drawImage(xivMark, logoX, logoY, markWidth, markHeight);
    }
    const titleX = pad;
    ctx.fillStyle = '#171a1b';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = `700 ${titleSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Arial, sans-serif`;
    ctx.fillText('FINAL FANTASY XIV', titleX, mainBaseline, logoX - titleX - Math.round(width * 0.02));

    const capture = clean(fields.date.value);
    ctx.fillStyle = capture ? '#898e8e' : '#a3a6a5';
    ctx.font = `400 ${dateSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Arial, sans-serif`;
    ctx.fillText(capture || '—', pad, subBaseline, dividerX - pad * 2);

    const focal = clean(fields.focal.value).replace(/\s*mm$/i, '');
    const metrics = [
      focal ? `${focal}mm` : '—mm',
      clean(fields.aperture.value) ? `f/${clean(fields.aperture.value).replace(/^f\//i, '')}` : 'f/—',
    ];
    if (clean(fields.shutter.value)) metrics.push(clean(fields.shutter.value).replace(/s$/i, ''));
    if (clean(fields.iso.value)) metrics.push(`ISO ${clean(fields.iso.value).replace(/^iso\s*/i, '')}`);

    const rightX = dividerX + Math.round(width * (portrait ? 0.018 : 0.025));
    const rightEnd = width - pad;
    const availableWidth = rightEnd - rightX;
    const minGap = Math.max(8, Math.round(width * 0.012));
    const valueFont = (size) => `500 ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Arial, sans-serif`;
    const metricWidths = (size) => {
      ctx.font = valueFont(size);
      return metrics.map((metric) => ctx.measureText(metric).width);
    };
    let metricFont = Math.round(Math.max(21, Math.min(footerHeight * 0.24, width * (portrait ? 0.032 : 0.03))));
    let widths = metricWidths(metricFont);
    const totalWidth = () => widths.reduce((sum, value) => sum + value, 0) + minGap * (metrics.length - 1);
    while (metricFont > 12 && totalWidth() > availableWidth) {
      metricFont -= 1;
      widths = metricWidths(metricFont);
    }
    const constrained = totalWidth() > availableWidth;
    if (constrained) widths = metrics.map(() => (availableWidth - minGap * (metrics.length - 1)) / metrics.length);
    const gap = constrained ? minGap : Math.min(
      (availableWidth - widths.reduce((sum, value) => sum + value, 0)) / (metrics.length - 1),
      width * 0.03,
    );
    let metricX = rightX;
    metrics.forEach((metric, index) => {
      ctx.fillStyle = metric.includes('—') ? '#a2a6a5' : '#171a1b';
      ctx.textAlign = 'left';
      ctx.font = valueFont(metricFont);
      ctx.fillText(metric, metricX, mainBaseline, widths[index]);
      metricX += widths[index] + gap;
    });

    const signature = clean(fields.signature.value);
    if (signature) {
      let signatureSize = Math.round(dateSize * Number(fields.signatureSize.value) / 100);
      let signatureLines = [];
      const signatureFont = (size) => `400 ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Arial, sans-serif`;
      const minimumSize = Math.round(Math.max(12, footerHeight * 0.08));
      do {
        ctx.font = signatureFont(signatureSize);
        signatureLines = wrapCanvasText(ctx, signature, availableWidth);
        const heightLimit = signatureLines.length >= 3
          ? Math.round(footerHeight * 0.105)
          : signatureLines.length === 2 ? Math.round(footerHeight * 0.15) : signatureSize;
        if (signatureLines.length <= 3 && signatureSize <= heightLimit) break;
        if (signatureSize <= minimumSize) break;
        signatureSize = Math.max(minimumSize, Math.min(signatureSize - 1, heightLimit));
      } while (true);
      if (signatureLines.length > 3) signatureLines = [signatureLines[0], signatureLines[1], signatureLines.slice(2).join(' ')];
      ctx.font = signatureFont(signatureSize);
      const firstBaseline = signatureLines.length === 1 ? subBaseline : footerTop + footerHeight * (signatureLines.length === 2 ? 0.66 : 0.63);
      const lineStep = footerHeight * (signatureLines.length === 2 ? 0.15 : 0.11);
      ctx.fillStyle = '#898e8e';
      ctx.textAlign = 'left';
      signatureLines.forEach((line, index) => ctx.fillText(line, rightX, firstBaseline + index * lineStep, availableWidth));
    }

    ctx.fillStyle = '#8e9392';
    ctx.textAlign = 'right';
    ctx.font = `400 ${Math.round(Math.max(11, footerHeight * 0.07))}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
    ctx.fillText('© SQUARE ENIX', width - Math.max(2, Math.round(width * 0.002)), footerTop + footerHeight * 0.965, availableWidth);
  }

  function downloadFrame() {
    if (!image) return;
    renderFrame();
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('無法產生 PNG，請改用較小的圖片再試。');
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
      byId('export-note').textContent = `已產生 ${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()} px 的 PNG。`;
      showToast('已開始下載圖片。');
    }, 'image/png');
  }

  fileInput.addEventListener('change', () => loadImage(fileInput.files?.[0]));
  byId('replace-image').addEventListener('click', () => fileInput.click());
  byId('use-file-date').addEventListener('click', setFileDate);
  document.querySelectorAll('[data-default-field]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.defaultField;
      fields[key].value = exposureDefaults[key];
      renderFrame();
    });
  });
  byId('download-image').addEventListener('click', downloadFrame);
  Object.values(fields).forEach((field) => field.addEventListener('input', () => {
    if (field === fields.signatureSize) {
      updateSignatureSizeLabel();
    }
    if (field === fields.date) {
      dateEditVersion += 1;
      setDateHint(field.value.trim()
        ? '將顯示你填寫的日期與時間。'
        : selectedFile
          ? '日期與時間尚未填寫；可自行輸入，或帶入檔案修改時間。'
          : '日期與時間尚未填寫；選擇圖片後可自動帶入。');
    }
    renderFrame();
  }));

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
  updateSignatureSizeLabel();
})();
