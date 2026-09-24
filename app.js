(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const themeToggle = byId('theme-toggle');
  const languagePicker = byId('language-picker');
  const languageToggle = byId('language-toggle');
  const languageMenu = byId('language-menu');
  const fileInput = byId('image-file');
  const dropzone = byId('dropzone');
  const previewStage = byId('preview-stage');
  const previewZoom = byId('preview-zoom');
  const showCopyright = byId('show-copyright');
  const canvas = byId('preview-canvas');
  // A 4K screenshot plus its footer fits below this limit at native resolution.
  const previewMaxPixels = 12_000_000;
  const fields = {
    date: byId('capture-time'),
    aperture: byId('aperture'),
    shutter: byId('shutter'),
    focal: byId('focal-length'),
    iso: byId('iso'),
    signature: byId('signature'),
    signatureSize: byId('signature-size'),
  };

  const translations = {
    'zh-Hant': {
      description: '為 FFXIV 截圖加上可自訂的白色資訊底框，預覽並下載 PNG。日期可讀取圖片資訊或手動填寫，圖片僅在瀏覽器中處理。',
      language: '語言', toLight: '切換至淺色模式', toDark: '切換至深色模式',
      hero: '為 FFXIV 截圖加上白色攝影資訊底框。填寫日期、光圈、快門、焦距與自訂文字，預覽後下載 PNG。',
      editorLabel: '截圖資訊框編輯器', settingsTitle: '圖片與設定', settingsDescription: '選擇截圖，設定底框要顯示的內容。',
      dropBefore: '拖曳截圖到這裡，或', chooseImage: '選擇圖片', supportedFormats: '支援 PNG、JPG／JPEG、WebP',
      imageBadge: '圖片', imagePlaceholder: '截圖', replaceImage: '更換圖片', privacy: '圖片只在瀏覽器中處理，不會上傳。',
      frameInfo: '底框資訊', dateTime: '日期與時間', useFileDate: '帶入檔案修改時間',
      aperture: '光圈', shutter: '快門', focal: '焦距', optional: '選填', useDefault: '預設',
      defaultAperture: '將光圈設為 f/2.8', defaultShutter: '將快門設為 1/150 秒', defaultFocal: '將焦距設為 77 mm', defaultIso: '將 ISO 設為 640',
      customText: '自訂文字', customPlaceholder: '輸入名字、角色名或想顯示的文字', customSize: '自訂文字大小',
      customHint: '顯示在底框右側、拍攝參數下方；文字過長時會自動縮小。',
      copyrightToggle: '在底框顯示 © SQUARE ENIX', copyrightHint: '原圖已有著作權標示時，可取消勾選。',
      download: '下載圖片', preview: '預覽', zoom: '縮放', noImage: '尚未選擇圖片', previewPlaceholder: '加框後的圖片會顯示在這裡',
      canvasLabel: '加上白色底框的圖片預覽', footerLabel: 'FFXIV 素材使用資訊',
      footerText: '這是玩家製作的非官方、非營利工具，未獲 SQUARE ENIX 認可或贊助。分享 FINAL FANTASY XIV 截圖或加框圖片前，請依適用地區的官方素材使用規範，確認用途、修改方式與權利標示；規範如有更新，以官方原文為準。',
      noscript: '請啟用 JavaScript，才能預覽與下載圖片。',
      dateInitial: '優先讀取圖片中的日期資訊；讀不到時，帶入檔案最後修改時間。',
      dateUnavailable: '無法取得檔案修改時間，請自行填寫日期與時間。',
      dateFileAuto: '圖片中沒有可用的日期資訊，已帶入檔案最後修改時間；可自行修改。',
      dateFileManual: '已帶入檔案最後修改時間，請確認是否與拍攝時間相符。',
      dateReading: '正在讀取圖片中的日期資訊…', dateExif: '已讀取圖片中的日期資訊；可自行修改。',
      dateTyped: '將顯示你填寫的日期與時間。',
      dateBlankWithFile: '日期與時間尚未填寫；可自行輸入，或帶入檔案修改時間。',
      dateBlankNoFile: '日期與時間尚未填寫；選擇圖片後可自動帶入。',
      exportInitial: '沿用原圖寬度，在底部加上白色底框並輸出 PNG。',
      exportComplete: '已產生 {width} × {height} px 的 PNG。',
      invalidFile: '請選擇 PNG、JPG／JPEG 或 WebP 圖片。', openFailed: '無法開啟這張圖片，請選擇另一個檔案。',
      pngFailed: '無法產生 PNG，請改用較小的圖片再試。', downloadStarted: '已開始下載圖片。',
      percentage: '{value} 百分比',
    },
    en: {
      description: 'Add a customizable white information strip to FFXIV screenshots. Preview and download a PNG. Read the date from the image or enter it yourself. Images stay in your browser.',
      language: 'Language', toLight: 'Switch to light mode', toDark: 'Switch to dark mode',
      hero: 'Add a white camera-style information strip to FFXIV screenshots. Enter the date, aperture, shutter speed, focal length, and custom text, then preview and download a PNG.',
      editorLabel: 'Screenshot frame editor', settingsTitle: 'Image & settings', settingsDescription: 'Choose a screenshot and set the information shown in the frame.',
      dropBefore: 'Drop a screenshot here, or ', chooseImage: 'choose an image', supportedFormats: 'PNG, JPG/JPEG, WebP',
      imageBadge: 'IMG', imagePlaceholder: 'Screenshot', replaceImage: 'Replace image', privacy: 'Images are processed in your browser and are not uploaded.',
      frameInfo: 'Frame details', dateTime: 'Date & time', useFileDate: 'Use file modified time',
      aperture: 'Aperture', shutter: 'Shutter', focal: 'Focal length', optional: 'optional', useDefault: 'Default',
      defaultAperture: 'Set aperture to f/2.8', defaultShutter: 'Set shutter to 1/150 second', defaultFocal: 'Set focal length to 77 mm', defaultIso: 'Set ISO to 640',
      customText: 'Custom text', customPlaceholder: 'Name, character name, or other text', customSize: 'Custom text size',
      customHint: 'Appears below the camera settings on the right side of the frame. Long text shrinks to fit.',
      copyrightToggle: 'Show © SQUARE ENIX in the frame', copyrightHint: 'Turn this off if the original image already includes a copyright notice.',
      download: 'Download image', preview: 'Preview', zoom: 'Zoom', noImage: 'No image selected', previewPlaceholder: 'Your framed image will appear here',
      canvasLabel: 'Preview of the image with a white information strip', footerLabel: 'FFXIV content use information',
      footerText: 'This is an unofficial, noncommercial fan tool. It is not endorsed or sponsored by SQUARE ENIX. Before sharing FINAL FANTASY XIV screenshots or framed images, check the official material usage rules for your region, including permitted uses, modifications, and credit requirements. Refer to the current official text if the rules change.',
      noscript: 'Enable JavaScript to preview and download images.',
      dateInitial: 'The image date takes priority. If none is available, the file modified time is used.',
      dateUnavailable: 'The file modified time is unavailable. Enter the date and time yourself.',
      dateFileAuto: 'No usable date was found in the image. The file modified time was used; you can edit it.',
      dateFileManual: 'The file modified time was used. Check that it matches the capture time.',
      dateReading: 'Reading the date from the image…', dateExif: 'Date found in the image; you can edit it.',
      dateTyped: 'Your entered date and time will be shown.',
      dateBlankWithFile: 'No date or time entered. Enter one or use the file modified time.',
      dateBlankNoFile: 'No date or time entered. Select an image to fill it automatically.',
      exportInitial: 'Keeps the original image width, adds a white strip below, and exports a PNG.',
      exportComplete: 'Created a {width} × {height} px PNG.',
      invalidFile: 'Choose a PNG, JPG/JPEG, or WebP image.', openFailed: 'Could not open this image. Choose another file.',
      pngFailed: 'Could not create a PNG. Try a smaller image.', downloadStarted: 'Image download started.',
      percentage: '{value} percent',
    },
    ja: {
      description: 'FFXIVのスクリーンショットに、編集できる白い撮影情報欄を追加します。日付は画像から読み取るか手入力でき、ブラウザー内でプレビューしてPNGを保存できます。',
      language: '言語', toLight: 'ライトモードに切り替え', toDark: 'ダークモードに切り替え',
      hero: 'FFXIVのスクリーンショットに白い撮影情報欄を追加。日時、絞り、シャッター速度、焦点距離、自由入力の文字を設定し、プレビューしてPNGを保存できます。',
      editorLabel: 'スクリーンショットのフレーム編集', settingsTitle: '画像と設定', settingsDescription: '画像を選び、情報欄に表示する内容を設定します。',
      dropBefore: '画像をここにドラッグするか、', chooseImage: '画像を選択', supportedFormats: 'PNG、JPG／JPEG、WebPに対応',
      imageBadge: '画像', imagePlaceholder: 'スクリーンショット', replaceImage: '画像を変更', privacy: '画像はブラウザー内だけで処理され、アップロードされません。',
      frameInfo: '情報欄の内容', dateTime: '日付と時刻', useFileDate: 'ファイルの更新日時を使用',
      aperture: '絞り', shutter: 'シャッター', focal: '焦点距離', optional: '任意', useDefault: '初期値',
      defaultAperture: '絞りを f/2.8 に設定', defaultShutter: 'シャッターを 1/150 秒に設定', defaultFocal: '焦点距離を 77 mm に設定', defaultIso: 'ISO を 640 に設定',
      customText: '自由入力の文字', customPlaceholder: '名前、キャラクター名など', customSize: '文字の大きさ',
      customHint: '情報欄の右側、撮影設定の下に表示します。長い文字は収まるように縮小されます。',
      copyrightToggle: '情報欄に © SQUARE ENIX を表示', copyrightHint: '元画像に権利表記がある場合はオフにできます。',
      download: '画像をダウンロード', preview: 'プレビュー', zoom: '拡大率', noImage: '画像が選択されていません', previewPlaceholder: '枠付きの画像がここに表示されます',
      canvasLabel: '白い情報欄を付けた画像のプレビュー', footerLabel: 'FFXIV素材の利用について',
      footerText: 'このツールはプレイヤーが制作した非公式・非営利のツールであり、SQUARE ENIXの承認や支援を受けていません。FINAL FANTASY XIVのスクリーンショットや枠付き画像を共有する前に、用途、改変方法、権利表記について、お住まいの地域に適用される公式の素材利用規定を確認してください。規定が更新された場合は公式の原文を優先してください。',
      noscript: '画像のプレビューとダウンロードにはJavaScriptを有効にしてください。',
      dateInitial: '画像内の日付を優先します。取得できない場合はファイルの更新日時を使用します。',
      dateUnavailable: 'ファイルの更新日時を取得できません。日時を入力してください。',
      dateFileAuto: '画像内に利用できる日付がないため、ファイルの更新日時を使用しました。変更できます。',
      dateFileManual: 'ファイルの更新日時を使用しました。撮影日時と一致するか確認してください。',
      dateReading: '画像内の日付を読み取っています…', dateExif: '画像内の日付を読み取りました。変更できます。',
      dateTyped: '入力した日時を表示します。',
      dateBlankWithFile: '日時が未入力です。入力するか、ファイルの更新日時を使用してください。',
      dateBlankNoFile: '日時が未入力です。画像を選ぶと自動で入力できます。',
      exportInitial: '元画像の横幅を維持し、下部に白い情報欄を追加してPNGで保存します。',
      exportComplete: '{width} × {height} px のPNGを作成しました。',
      invalidFile: 'PNG、JPG／JPEG、WebP画像を選択してください。', openFailed: '画像を開けませんでした。別のファイルを選択してください。',
      pngFailed: 'PNGを作成できませんでした。小さめの画像でお試しください。', downloadStarted: '画像のダウンロードを開始しました。',
      percentage: '{value}パーセント',
    },
  };
  let language = 'zh-Hant';
  let dateHintKey = 'dateInitial';
  let exportNoteKey = 'exportInitial';
  let exportNoteParams = {};
  let toastKey = '';

  function t(key, params = {}) {
    return translations[language][key].replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
  }

  function setLanguage(nextLanguage, persist = false) {
    language = Object.hasOwn(translations, nextLanguage) ? nextLanguage : 'zh-Hant';
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-label]').forEach((node) => { node.setAttribute('aria-label', t(node.dataset.i18nLabel)); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-content]').forEach((node) => { node.content = t(node.dataset.i18nContent); });
    document.querySelectorAll('[data-default-label]').forEach((node) => {
      const key = `default${node.dataset.defaultLabel[0].toUpperCase()}${node.dataset.defaultLabel.slice(1)}`;
      node.setAttribute('aria-label', t(key));
    });
    languageToggle.setAttribute('aria-label', t('language'));
    languageToggle.title = t('language');
    languageMenu.setAttribute('aria-label', t('language'));
    languageMenu.querySelectorAll('[data-language]').forEach((node) => {
      node.setAttribute('aria-checked', String(node.dataset.language === language));
    });
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    setDateHint(dateHintKey);
    setExportNote(exportNoteKey, exportNoteParams);
    updateSignatureSizeLabel();
    if (toastKey) byId('toast').textContent = t(toastKey);
    if (persist) {
      try { localStorage.setItem('ffxiv-frame-language', language); } catch (error) { /* Language still works for this visit. */ }
    }
  }

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
    const label = t(theme === 'light' ? 'toDark' : 'toLight');
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

  function closeLanguageMenu(restoreFocus = false) {
    languageMenu.hidden = true;
    languageToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) languageToggle.focus();
  }

  languageToggle.addEventListener('click', () => {
    if (!languageMenu.hidden) {
      closeLanguageMenu();
      return;
    }
    languageMenu.hidden = false;
    languageToggle.setAttribute('aria-expanded', 'true');
    languageMenu.querySelector('[aria-checked="true"]').focus();
  });
  languageMenu.querySelectorAll('[data-language]').forEach((option) => {
    option.addEventListener('click', () => {
      setLanguage(option.dataset.language, true);
      closeLanguageMenu(true);
    });
  });
  languageMenu.addEventListener('keydown', (event) => {
    const options = Array.from(languageMenu.querySelectorAll('[data-language]'));
    const current = options.indexOf(document.activeElement);
    let next = current;
    if (event.key === 'ArrowDown') next = (current + 1) % options.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else if (event.key === 'Escape') {
      closeLanguageMenu(true);
      return;
    } else return;
    event.preventDefault();
    options[next].focus();
  });
  languageMenu.addEventListener('focusout', (event) => {
    if (!languagePicker.contains(event.relatedTarget)) closeLanguageMenu();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!languagePicker.contains(event.target)) closeLanguageMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !languageMenu.hidden) closeLanguageMenu(true);
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
    fields.signatureSize.setAttribute('aria-valuetext', t('percentage', { value: size }));
  }

  function showToast(key) {
    toastKey = key;
    const toast = byId('toast');
    toast.textContent = t(key);
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      toastKey = '';
    }, 3200);
  }

  function fileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function setDateHint(key) {
    dateHintKey = key;
    byId('date-hint').textContent = t(key);
  }

  function setExportNote(key, params = {}) {
    exportNoteKey = key;
    exportNoteParams = params;
    byId('export-note').textContent = t(key, params);
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
      setDateHint('dateUnavailable');
      return;
    }
    fields.date.value = date;
    setDateHint(automatic ? 'dateFileAuto' : 'dateFileManual');
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
          // PNG keywords are at most 79 bytes; only a short date prefix is needed.
          const keyword = ascii(dataStart, Math.min(length, 80));
          const split = keyword.indexOf('\0');
          if (split > 0 && /date|time|creation/i.test(keyword.slice(0, split))) {
            const value = ascii(dataStart + split + 1, Math.min(length - split - 1, 64)).trim();
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
      showToast('invalidFile');
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
      setExportNote('exportInitial');
      byId('use-file-date').disabled = false;
      previewZoom.value = '100';
      previewZoom.disabled = false;
      byId('preview-zoom-value').textContent = '100%';
      renderFrame();
      readFileDate(file, token, dateVersionAtSelection);
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      if (token !== loadToken) return;
      fileInput.value = '';
      showToast('openFailed');
    };
    nextImage.src = nextUrl;
  }

  async function readFileDate(file, token, dateVersionAtSelection) {
    if (dateVersionAtSelection !== dateEditVersion) return;
    const editVersion = dateEditVersion;
    fields.date.value = '';
    setDateHint('dateReading');
    renderFrame();
    try {
      const date = displayDate(parseExifDate(await file.arrayBuffer()));
      if (token !== loadToken || editVersion !== dateEditVersion) return;
      if (date) {
        fields.date.value = date;
        setDateHint('dateExif');
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

  function fitPreview() {
    if (!image) return;
    const column = previewStage.parentElement;
    const columnStyle = getComputedStyle(column);
    const padding = parseFloat(columnStyle.paddingLeft) + parseFloat(columnStyle.paddingRight);
    const availableWidth = Math.max(1, Math.floor(column.clientWidth - padding - 2));
    const availableHeight = Math.min(920, Math.max(240, window.innerHeight - 160));
    const fittedWidth = Math.max(1, Math.floor(Math.min(
      canvas.width,
      availableWidth,
      canvas.width * availableHeight / canvas.height,
    )));
    const maxZoom = Math.max(100, Math.min(200, Math.floor(availableWidth / fittedWidth * 10) * 10));
    previewZoom.max = String(maxZoom);
    if (Number(previewZoom.value) > maxZoom) previewZoom.value = String(maxZoom);
    const zoom = Number(previewZoom.value);
    byId('preview-zoom-value').textContent = `${zoom}%`;
    const requestedWidth = Math.max(1, Math.round(fittedWidth * zoom / 100));
    const displayWidth = Math.min(requestedWidth, availableWidth);
    canvas.style.width = `${displayWidth}px`;
    previewStage.style.width = `${displayWidth + 2}px`;
    previewStage.style.height = '';
  }

  function renderFrame(targetCanvas = canvas) {
    if (!image) return false;
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

    const previewScale = targetCanvas === canvas
      ? Math.min(1, Math.sqrt(previewMaxPixels / (width * footerBottom)))
      : 1;
    const outputWidth = Math.max(1, Math.round(width * previewScale));
    const outputHeight = Math.max(1, Math.round(footerBottom * previewScale));
    // Resizing a canvas reallocates its bitmap, so retain it across field edits.
    if (targetCanvas.width !== outputWidth) targetCanvas.width = outputWidth;
    if (targetCanvas.height !== outputHeight) targetCanvas.height = outputHeight;
    const ctx = targetCanvas.getContext('2d', { alpha: false });
    if (!ctx) return false;
    ctx.setTransform(targetCanvas.width / width, 0, 0, targetCanvas.height / footerBottom, 0, 0);
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

    if (showCopyright.checked) {
      ctx.fillStyle = '#8e9392';
      ctx.textAlign = 'right';
      ctx.font = `400 ${Math.round(Math.max(11, footerHeight * 0.07)) * 2}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
      ctx.fillText('© SQUARE ENIX', width - Math.max(2, Math.round(width * 0.002)), footerTop + footerHeight * 0.99, availableWidth);
    }
    if (targetCanvas === canvas) fitPreview();
    return true;
  }

  function downloadFrame() {
    if (!image) return;
    const sourceFile = selectedFile;
    const baseName = (sourceFile?.name || 'ffxiv-screenshot').replace(/\.[^.]+$/, '').replace(/[\/:*?"<>|]/g, '_');
    const { footerHeight } = frameMeasurements(image);
    const fullWidth = image.naturalWidth;
    const fullHeight = image.naturalHeight + footerHeight;
    const previewIsFullSize = canvas.width === fullWidth && canvas.height === fullHeight;
    const exportCanvas = previewIsFullSize ? canvas : document.createElement('canvas');
    try {
      if (!previewIsFullSize && !renderFrame(exportCanvas)) throw new Error('Canvas context unavailable');
    } catch (error) {
      showToast('pngFailed');
      return;
    }
    const outputWidth = exportCanvas.width;
    const outputHeight = exportCanvas.height;
    exportCanvas.toBlob((blob) => {
      if (!previewIsFullSize) {
        exportCanvas.width = 0;
        exportCanvas.height = 0;
      }
      if (!blob) {
        showToast('pngFailed');
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${baseName}-frame.png`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      if (selectedFile === sourceFile) {
        setExportNote('exportComplete', { width: outputWidth.toLocaleString(language), height: outputHeight.toLocaleString(language) });
      }
      showToast('downloadStarted');
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
  showCopyright.addEventListener('change', renderFrame);
  previewZoom.addEventListener('input', () => {
    fitPreview();
  });
  window.addEventListener('resize', fitPreview);
  Object.values(fields).forEach((field) => field.addEventListener('input', () => {
    if (field === fields.signatureSize) {
      updateSignatureSizeLabel();
    }
    if (field === fields.date) {
      dateEditVersion += 1;
      setDateHint(field.value.trim() ? 'dateTyped' : selectedFile ? 'dateBlankWithFile' : 'dateBlankNoFile');
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
  let savedLanguage = 'zh-Hant';
  try { savedLanguage = localStorage.getItem('ffxiv-frame-language') || 'zh-Hant'; } catch (error) { /* Use the default language. */ }
  setLanguage(savedLanguage);
})();
