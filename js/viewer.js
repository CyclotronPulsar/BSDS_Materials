/**
 * Lumina PDF Web – Chrome-Grade Core Viewer
 * Compatible with PDF.js 3.11.174 (cdnjs)
 * Drop into BSDS_Materials and open via viewer.html?file=...
 * Preserves 100% of original Lumina features + adds full Chrome PDF Viewer parity.
 */

(() => {
  'use strict';

  // --------------------------------------------------
  // Constants
  // --------------------------------------------------
  const WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const SCALE_STEP = 0.15;
  const MIN_SCALE = 0.4;
  const MAX_SCALE = 4.0;
  const DEFAULT_SCALE = 1.25; // 125% default zoom
  const THEMES = ['dark', 'light', 'invert', 'sepia', 'amoled', 'eye-comfort', 'smart-dark'];
  const DEFAULT_FALLBACK_PDF = 'BSDS_1/SEM_1/ECO/NOTES/Eco1_Midsem.pdf';

  // --------------------------------------------------
  // DOM helpers
  // --------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const els = {
    back: $('btn-back'),
    title: $('doc-title'),
    bookmarkPageBtn: $('btn-bookmark-page'),
    openLocalBtn: $('btn-open-local'),
    fileInput: $('file-input'),
    prev: $('btn-prev'),
    next: $('btn-next'),
    pageInput: $('page-input'),
    pageTotal: $('page-total'),
    zoomOut: $('btn-zoom-out'),
    zoomIn: $('btn-zoom-in'),
    zoomLabel: $('zoom-label'),
    zoomMenu: $('zoom-menu'),
    fitWidth: $('btn-fit-width'),
    fitPage: $('btn-fit-page'),
    rotateCcw: $('btn-rotate-ccw'),
    rotateCw: $('btn-rotate-cw'),
    spreadBtn: $('btn-spread'),
    handBtn: $('btn-hand'),
    searchInput: $('search-input'),
    matchCaseBtn: $('btn-match-case'),
    searchCount: $('search-count'),
    searchPrev: $('btn-search-prev'),
    searchNext: $('btn-search-next'),
    searchMarkers: $('search-markers'),
    drawHighlightBtn: $('btn-draw-highlight'),
    drawPenBtn: $('btn-draw-pen'),
    drawEraserBtn: $('btn-draw-eraser'),
    annotBar: $('annot-bar'),
    annotModeLabel: $('annot-mode-label'),
    annotSize: $('annot-size'),
    annotUndoBtn: $('btn-annot-undo'),
    annotDoneBtn: $('btn-annot-done'),
    theme: $('btn-theme'),
    themeMenu: $('theme-menu'),
    sidebarBtn: $('btn-sidebar'),
    fullscreen: $('btn-fullscreen'),
    download: $('btn-download'),
    print: $('btn-print'),
    moreBtn: $('btn-more'),
    moreMenu: $('more-menu'),
    menuTwoPage: $('menu-two-page'),
    checkTwoPage: $('check-two-page'),
    menuAnnotations: $('menu-annotations'),
    checkAnnotations: $('check-annotations'),
    menuPresent: $('menu-present'),
    menuFirstPage: $('menu-first-page'),
    menuLastPage: $('menu-last-page'),
    menuShortcuts: $('menu-shortcuts'),
    menuDocProps: $('menu-doc-props'),
    sidebar: $('sidebar'),
    sidebarContent: $('sidebar-content'),
    panelThumbs: $('panel-thumbs'),
    panelOutline: $('panel-outline'),
    panelBookmarks: $('panel-bookmarks'),
    addBookmarkBtn: $('btn-add-bookmark'),
    bmCurPage: $('bm-cur-page'),
    bookmarksList: $('bookmarks-list'),
    viewerWrap: $('viewer-wrap'),
    viewer: $('viewer'),
    readingProgress: $('reading-progress'),
    fabFit: $('fab-fit'),
    fabZoomIn: $('fab-zoom-in'),
    fabZoomOut: $('fab-zoom-out'),
    status: $('status'),
    statusMeta: $('status-meta'),
    propsBackdrop: $('props-backdrop'),
    propsClose: $('props-close'),
    propsOk: $('props-ok'),
    shortcutsBackdrop: $('shortcuts-backdrop'),
    shortcutsClose: $('shortcuts-close'),
    shortcutsOk: $('shortcuts-ok'),
  };

  // --------------------------------------------------
  // State
  // --------------------------------------------------
  const state = {
    pdfDoc: null,
    filePath: '',
    fileKey: '',
    fileName: '',
    fileByteLength: 0,
    pageCount: 0,
    currentPage: 1,
    scale: DEFAULT_SCALE,
    rotation: 0, // 0, 90, 180, 270
    zoomMode: 'custom', // fit-width | fit-page | custom
    spreadMode: false, // two-page side-by-side view
    handTool: false,
    spacePressed: false,
    isPanning: false,
    panStart: { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 },
    theme: localStorage.getItem('lumina-theme') || 'dark',
    sidebarOpen: window.innerWidth > 1100,
    searchTerm: '',
    matchCase: false,
    searchMatches: [], // {page, start, end}
    currentMatch: -1,
    pageStates: [],
    renderToken: 0,
    baseViewport: null,
    observer: null,
    thumbObserver: null,
    // Annotation state
    drawTool: null, // null | 'highlight' | 'pen'
    drawColor: '#facc15',
    drawSize: 14,
    showAnnotations: true,
    annotations: {}, // { [pageNum]: Array<{ tool, color, size, points: Array<{x,y}> }> }
    bookmarks: [], // Array<{ page, label, createdAt }>
  };

  // --------------------------------------------------
  // Utilities
  // --------------------------------------------------
  function setStatus(msg) {
    if (els.status) els.status.textContent = msg;
    updateStatusMeta();
  }

  function updateStatusMeta() {
    if (!els.statusMeta) return;
    if (!state.pageCount) {
      els.statusMeta.textContent = '';
      return;
    }
    const parts = [
      `Page ${state.currentPage}/${state.pageCount}`,
      `${Math.round(state.scale * 100)}%`,
    ];
    if (state.rotation) parts.push(`${state.rotation}°`);
    if (state.spreadMode) parts.push('2-Page');
    parts.push(state.theme);
    els.statusMeta.textContent = parts.join(' · ');

    if (els.readingProgress) {
      const pct = state.pageCount > 1
        ? ((state.currentPage - 1) / (state.pageCount - 1)) * 100
        : 100;
      els.readingProgress.style.width = `${clamp(pct, 0, 100)}%`;
    }
  }

  function setTitle(name) {
    if (els.title) els.title.textContent = name;
    document.title = `${name} · Lumina PDF`;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function normalizePage(n) {
    return clamp(n || 1, 1, state.pageCount || 1);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Allowed paths (same security as original reader)
  function sanitizePath(raw) {
    if (!raw) return null;
    let v = String(raw).trim();
    try { v = decodeURIComponent(v); } catch {}
    v = v.replace(/\\/g, '/').replace(/^\/+/, '');
    if (/^(https?:|data:|javascript:)/i.test(v)) return null;
    if (v.includes('..')) return null;
    if (!/^(BSDS_1|BSDS_2|BSDS_3)\/.+\.pdf$/i.test(v) && !v.endsWith('.pdf')) {
      if (!/\.pdf$/i.test(v)) return null;
    }
    return v;
  }

  function getParams() {
    const p = new URLSearchParams(location.search);
    const rawFile = p.get('file');
    const file = sanitizePath(rawFile) || (!rawFile ? DEFAULT_FALLBACK_PDF : null);
    const page = Math.max(1, parseInt(p.get('page') || '1', 10) || 1);
    return { file, page, hadExplicitFile: Boolean(rawFile) };
  }

  // --------------------------------------------------
  // Theme (7 Lumina modes + Chrome UI sync)
  // --------------------------------------------------
  function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = 'dark';
    state.theme = theme;
    localStorage.setItem('lumina-theme', theme);

    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme !== 'light');
    document.documentElement.classList.toggle('theme-amoled', theme === 'amoled');
    document.documentElement.classList.toggle('theme-sepia', theme === 'sepia');

    // Canvas color modes on main pages and thumbnails
    document.querySelectorAll('.page-canvas, .thumb-canvas').forEach((c) => {
      c.classList.remove('invert', 'sepia', 'amoled', 'eye-comfort', 'smart-dark');
      if (['invert', 'sepia', 'amoled', 'eye-comfort', 'smart-dark'].includes(theme)) {
        c.classList.add(theme);
      }
    });

    // Update active state in theme dropdown
    if (els.themeMenu) {
      els.themeMenu.querySelectorAll('[data-theme]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
      });
    }

    const icons = {
      dark: '☾',
      light: '☀',
      invert: '◐',
      sepia: '棕',
      amoled: '⬤',
      'eye-comfort': '👁',
      'smart-dark': '◑',
    };
    if (els.theme) els.theme.textContent = icons[theme] || '☾';
    setStatus(`Theme: ${theme}`);
  }

  function cycleTheme() {
    const idx = THEMES.indexOf(state.theme);
    applyTheme(THEMES[(idx + 1) % THEMES.length]);
  }

  // --------------------------------------------------
  // Persistent Bookmarks & Annotations per PDF
  // --------------------------------------------------
  function loadSavedStateForFile(fileKey) {
    state.fileKey = fileKey;
    try {
      const rawBm = localStorage.getItem(`lumina-bookmarks:${fileKey}`);
      state.bookmarks = rawBm ? JSON.parse(rawBm) : [];
    } catch {
      state.bookmarks = [];
    }
    try {
      const rawAnnot = localStorage.getItem(`lumina-annots:${fileKey}`);
      state.annotations = rawAnnot ? JSON.parse(rawAnnot) : {};
    } catch {
      state.annotations = {};
    }
    renderBookmarksList();
    updateBookmarkStar();
  }

  function saveBookmarks() {
    if (!state.fileKey) return;
    try {
      localStorage.setItem(`lumina-bookmarks:${state.fileKey}`, JSON.stringify(state.bookmarks));
    } catch {}
  }

  function saveAnnotations() {
    if (!state.fileKey) return;
    try {
      localStorage.setItem(`lumina-annots:${state.fileKey}`, JSON.stringify(state.annotations));
    } catch {}
  }

  function isPageBookmarked(pageNum) {
    return state.bookmarks.some((b) => b.page === pageNum);
  }

  function updateBookmarkStar() {
    if (!els.bookmarkPageBtn) return;
    const active = isPageBookmarked(state.currentPage);
    els.bookmarkPageBtn.textContent = active ? '★' : '☆';
    els.bookmarkPageBtn.classList.toggle('bookmarked', active);
    if (els.bmCurPage) els.bmCurPage.textContent = String(state.currentPage);
  }

  function toggleBookmarkOnPage(pageNum = state.currentPage) {
    const existingIdx = state.bookmarks.findIndex((b) => b.page === pageNum);
    if (existingIdx !== -1) {
      state.bookmarks.splice(existingIdx, 1);
      setStatus(`Removed bookmark on page ${pageNum}`);
    } else {
      // Extract a short snippet from page text if available
      let snippet = `Page ${pageNum}`;
      const ps = getPageState(pageNum);
      if (ps && ps.textContent && ps.textContent.items) {
        const words = ps.textContent.items
          .map((it) => (it.str || '').trim())
          .filter(Boolean)
          .slice(0, 6)
          .join(' ');
        if (words) snippet = `P.${pageNum} — ${words.slice(0, 38)}`;
      }
      state.bookmarks.push({
        page: pageNum,
        label: snippet,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      state.bookmarks.sort((a, b) => a.page - b.page);
      setStatus(`Bookmarked page ${pageNum}`);
    }
    saveBookmarks();
    updateBookmarkStar();
    renderBookmarksList();
  }

  function renderBookmarksList() {
    if (!els.bookmarksList) return;
    els.bookmarksList.innerHTML = '';
    if (!state.bookmarks.length) {
      els.bookmarksList.innerHTML = '<p class="empty">No bookmarks saved for this PDF yet.<br><small>Click ☆ in the toolbar or the button above to bookmark any page.</small></p>';
      return;
    }

    for (const bm of state.bookmarks) {
      const card = document.createElement('div');
      card.className = 'bookmark-card';
      card.innerHTML = `
        <div class="bookmark-info">
          <div class="bookmark-title">${escapeHtml(bm.label)}</div>
          <div class="bookmark-sub">Page ${bm.page} · Saved ${escapeHtml(bm.createdAt || '')}</div>
        </div>
        <button type="button" class="bookmark-del" title="Remove bookmark" aria-label="Remove bookmark">✕</button>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.bookmark-del')) {
          e.stopPropagation();
          toggleBookmarkOnPage(bm.page);
          return;
        }
        setCurrentPage(bm.page);
        scrollToPage(bm.page);
      });
      els.bookmarksList.appendChild(card);
    }
  }

  // --------------------------------------------------
  // Page state helpers
  // --------------------------------------------------
  function getPageState(n) {
    if (!state.pageStates[n]) {
      state.pageStates[n] = {
        canvas: null,
        textLayer: null,
        linkLayer: null,
        annotLayer: null,
        container: null,
        renderedScale: 0,
        renderedRotation: -1,
        rendering: null,
        viewport: null,
        textContent: null,
        thumbCanvas: null,
        thumbRendered: false,
      };
    }
    return state.pageStates[n];
  }

  function buildPageSkeleton(n) {
    const page = document.createElement('article');
    page.className = 'page';
    page.id = `page-${n}`;
    page.dataset.page = String(n);

    if (state.baseViewport) {
      const rot = (state.rotation % 180 !== 0);
      const w = (rot ? state.baseViewport.height : state.baseViewport.width) * state.scale;
      const h = (rot ? state.baseViewport.width : state.baseViewport.height) * state.scale;
      page.style.width = `${Math.floor(w)}px`;
      page.style.height = `${Math.floor(h)}px`;
    }

    const loading = document.createElement('div');
    loading.className = 'page-loading';
    loading.textContent = `Page ${n}`;
    page.appendChild(loading);

    const canvas = document.createElement('canvas');
    canvas.className = 'page-canvas';
    page.appendChild(canvas);

    const textLayer = document.createElement('div');
    textLayer.className = 'textLayer';
    page.appendChild(textLayer);

    const linkLayer = document.createElement('div');
    linkLayer.className = 'linkLayer';
    page.appendChild(linkLayer);

    const annotLayer = document.createElement('canvas');
    annotLayer.className = 'annotLayer' + (state.showAnnotations ? '' : ' hidden') + (state.drawTool ? ' drawing' : '');
    page.appendChild(annotLayer);

    const ps = getPageState(n);
    ps.canvas = canvas;
    ps.textLayer = textLayer;
    ps.linkLayer = linkLayer;
    ps.annotLayer = annotLayer;
    ps.container = page;

    bindAnnotationEvents(n, annotLayer);
    return page;
  }

  // --------------------------------------------------
  // Chrome Freehand Pen & Highlighter Layer
  // --------------------------------------------------
  function bindAnnotationEvents(pageNum, canvas) {
    let drawing = false;
    let currentStroke = null;

    function getNormCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clamp((clientX - rect.left) / (rect.width || 1), 0, 1),
        y: clamp((clientY - rect.top) / (rect.height || 1), 0, 1),
      };
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (!state.drawTool) return;
      e.preventDefault();
      e.stopPropagation();
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      const pt = getNormCoords(e);
      currentStroke = {
        tool: state.drawTool,
        color: state.drawColor,
        size: Number(state.drawSize) || (state.drawTool === 'highlight' ? 16 : 3),
        points: [pt],
      };
      if (!state.annotations[pageNum]) state.annotations[pageNum] = [];
      state.annotations[pageNum].push(currentStroke);
      redrawAnnotations(pageNum);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!drawing || !currentStroke) return;
      e.preventDefault();
      currentStroke.points.push(getNormCoords(e));
      redrawAnnotations(pageNum);
    });

    const finishStroke = () => {
      if (!drawing) return;
      drawing = false;
      currentStroke = null;
      saveAnnotations();
    };

    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);
  }

  function redrawAnnotations(pageNum) {
    const ps = getPageState(pageNum);
    const canvas = ps.annotLayer;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const strokes = state.annotations[pageNum];
    if (!strokes || !strokes.length) return;

    const w = canvas.width;
    const h = canvas.height;
    const scaleFactor = state.scale || 1;

    for (const s of strokes) {
      if (!s.points || !s.points.length) continue;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = s.color || '#facc15';
      ctx.lineWidth = (s.size || 6) * scaleFactor;
      ctx.lineCap = s.tool === 'highlight' ? 'butt' : 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = s.tool === 'highlight' ? 0.36 : 0.92;

      const first = s.points[0];
      ctx.moveTo(first.x * w, first.y * h);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * w, s.points[i].y * h);
      }
      if (s.points.length === 1) {
        ctx.lineTo(first.x * w + 0.5, first.y * h + 0.5);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function setDrawTool(tool) {
    state.drawTool = state.drawTool === tool ? null : tool;
    if (els.drawHighlightBtn) els.drawHighlightBtn.classList.toggle('active', state.drawTool === 'highlight');
    if (els.drawPenBtn) els.drawPenBtn.classList.toggle('active', state.drawTool === 'pen');
    if (els.annotBar) els.annotBar.classList.toggle('hidden', !state.drawTool);

    if (state.drawTool === 'highlight') {
      if (els.annotModeLabel) els.annotModeLabel.textContent = 'Highlighter Tool';
      state.drawSize = 16;
      if (els.annotSize) els.annotSize.value = '16';
    } else if (state.drawTool === 'pen') {
      if (els.annotModeLabel) els.annotModeLabel.textContent = 'Pen Drawing Tool';
      state.drawSize = 3;
      if (els.annotSize) els.annotSize.value = '3';
    }

    document.querySelectorAll('.annotLayer').forEach((layer) => {
      layer.classList.toggle('drawing', Boolean(state.drawTool));
    });
  }

  // --------------------------------------------------
  // Interactive PDF Links Layer (Internal & External)
  // --------------------------------------------------
  async function buildLinkLayer(pageNum, page, viewport) {
    const ps = getPageState(pageNum);
    const layer = ps.linkLayer;
    if (!layer) return;
    layer.innerHTML = '';

    try {
      const annotations = await page.getAnnotations({ intent: 'display' });
      for (const annot of annotations) {
        if (annot.subtype !== 'Link' || !annot.rect) continue;
        const rect = viewport.convertToViewportRectangle(annot.rect);
        const left = Math.min(rect[0], rect[2]);
        const top = Math.min(rect[1], rect[3]);
        const width = Math.abs(rect[2] - rect[0]);
        const height = Math.abs(rect[3] - rect[1]);

        const a = document.createElement('a');
        a.style.left = `${left}px`;
        a.style.top = `${top}px`;
        a.style.width = `${width}px`;
        a.style.height = `${height}px`;

        if (annot.url) {
          a.href = annot.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.title = annot.url;
        } else if (annot.dest) {
          a.href = '#';
          a.title = 'Jump to section';
          a.addEventListener('click', async (e) => {
            e.preventDefault();
            await navigateToDestination(annot.dest);
          });
        } else {
          continue;
        }
        layer.appendChild(a);
      }
    } catch {}
  }

  async function navigateToDestination(dest) {
    if (!state.pdfDoc || !dest) return;
    try {
      const explicitDest = typeof dest === 'string'
        ? await state.pdfDoc.getDestination(dest)
        : dest;
      if (!Array.isArray(explicitDest) || !explicitDest[0]) return;
      const pageRef = explicitDest[0];
      const pageIndex = typeof pageRef === 'number'
        ? pageRef
        : await state.pdfDoc.getPageIndex(pageRef);
      const targetPage = normalizePage(pageIndex + 1);
      setCurrentPage(targetPage);
      scrollToPage(targetPage);
    } catch {}
  }

  // --------------------------------------------------
  // Text layer – matches browser PDF viewer selection
  // --------------------------------------------------
  async function buildTextLayer(pageNum, page, viewport) {
    const ps = getPageState(pageNum);
    const layer = ps.textLayer;
    if (!layer) return;

    layer.innerHTML = '';
    layer.style.width = Math.floor(viewport.width) + 'px';
    layer.style.height = Math.floor(viewport.height) + 'px';
    layer.style.setProperty('--total-scale-factor', String(viewport.scale));
    layer.style.setProperty('--scale-factor', String(viewport.scale));

    const textContent = await page.getTextContent({
      includeMarkedContent: true,
      disableNormalization: false,
    });
    ps.textContent = textContent;

    // Official renderTextLayer with enhanceTextSelection (PDF.js 3.x)
    if (typeof pdfjsLib.renderTextLayer === 'function') {
      try {
        const textDivs = [];
        const task = pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: layer,
          viewport,
          textDivs,
          enhanceTextSelection: false,
        });
        await task.promise;

        // Remove empty / whitespace-only / zero-width spans (stops left-column phantom selection)
        cleanupEmptyTextSpans(layer);

        // endOfContent is required for drag-select across lines
        let end = layer.querySelector('.endOfContent');
        if (!end) {
          end = document.createElement('div');
          end.className = 'endOfContent';
          layer.appendChild(end);
        }

        // Bind mouse events so selection expands correctly (same as official viewer)
        bindTextLayerSelection(layer, end);
        return;
      } catch (e) {
        console.warn('renderTextLayer failed, using fallback', e);
        layer.innerHTML = '';
      }
    }

    // Fallback: precise manual spans
    const styles = textContent.styles || {};
    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;
      if (item.width != null && item.width <= 0) continue;

      const span = document.createElement('span');
      span.textContent = item.str;
      span.dir = item.dir || 'ltr';

      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.hypot(tx[2], tx[3]) || 12;
      const angle = Math.atan2(tx[1], tx[0]);

      const fontObj = styles[item.fontName];
      if (fontObj && fontObj.fontFamily) {
        span.style.fontFamily = fontObj.fontFamily;
      } else {
        span.style.fontFamily = 'sans-serif';
      }

      span.style.left = `${tx[4]}px`;
      span.style.top = `${tx[5] - fontHeight}px`;
      span.style.fontSize = `${fontHeight}px`;
      span.style.lineHeight = '1';
      span.style.transformOrigin = '0% 0%';

      const glyphWidth = Math.hypot(tx[0], tx[1]) || 1;
      const scaleX = item.width ? (item.width * viewport.scale) / glyphWidth : 1;

      let transform = '';
      if (Math.abs(angle) > 0.001) transform += `rotate(${angle}rad) `;
      if (Math.abs(scaleX - 1) > 0.01) transform += `scaleX(${scaleX})`;
      if (transform) span.style.transform = transform;

      layer.appendChild(span);
    }

    cleanupEmptyTextSpans(layer);

    const end = document.createElement('div');
    end.className = 'endOfContent';
    layer.appendChild(end);
    bindTextLayerSelection(layer, end);
  }

  // Disable spans that create the thin left-column selection strips:
  // empty text, pure whitespace, vertical/rotated text, and very narrow tall boxes.
  function cleanupEmptyTextSpans(layer) {
    const layerRect = layer.getBoundingClientRect();
    const pageWidth = layerRect.width || 1;
    const leftZone = pageWidth * 0.08; // leftmost 8% of the page

    layer.querySelectorAll('span').forEach((span) => {
      const text = span.textContent || '';
      const trimmed = text.trim();

      if (!trimmed) {
        disableSpan(span);
        return;
      }

      const rect = span.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const left = rect.left - layerRect.left;

      if (w > 0 && w < 3) {
        disableSpan(span);
        return;
      }

      if (w > 0 && h > 0 && h / w > 4 && w < 12) {
        disableSpan(span);
        return;
      }

      const transform = (span.style.transform || '').toLowerCase();
      const isRotated = transform.includes('rotate') && !transform.includes('rotate(0');
      if (isRotated && left < leftZone) {
        disableSpan(span);
        return;
      }

      if (trimmed.length <= 2 && left < leftZone && w < 14) {
        disableSpan(span);
        return;
      }
    });
  }

  function disableSpan(span) {
    span.style.pointerEvents = 'none';
    span.style.userSelect = 'none';
    span.style.webkitUserSelect = 'none';
    span.setAttribute('aria-hidden', 'true');
    span.classList.add('no-select');
  }

  function bindTextLayerSelection(layer, endOfContent) {
    layer.addEventListener('mousedown', () => {
      endOfContent.classList.add('active');
    });
    layer.addEventListener('mouseup', () => {
      endOfContent.classList.remove('active');
    });
    layer.addEventListener('mouseleave', () => {
      endOfContent.classList.remove('active');
    });
  }

  // --------------------------------------------------
  // Render single page & thumbnail
  // --------------------------------------------------
  async function renderPage(pageNum, { force = false } = {}) {
    const ps = getPageState(pageNum);
    if (!state.pdfDoc || !ps.container) return;
    if (ps.rendering) return ps.rendering;
    if (
      !force &&
      ps.renderedScale === state.scale &&
      ps.renderedRotation === state.rotation &&
      ps.viewport
    ) {
      return;
    }

    const token = ++state.renderToken;
    ps.rendering = (async () => {
      try {
        const page = await state.pdfDoc.getPage(pageNum);
        const totalRotation = (page.rotate + state.rotation) % 360;
        const viewport = page.getViewport({ scale: state.scale, rotation: totalRotation });
        ps.viewport = viewport;

        const canvas = ps.canvas;
        const ctx = canvas.getContext('2d', { alpha: false });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';

        // Sync annotation canvas dimensions
        if (ps.annotLayer) {
          ps.annotLayer.width = Math.floor(viewport.width);
          ps.annotLayer.height = Math.floor(viewport.height);
          ps.annotLayer.style.width = viewport.width + 'px';
          ps.annotLayer.style.height = viewport.height + 'px';
        }

        // Apply current theme class
        canvas.classList.remove('invert', 'sepia', 'amoled', 'eye-comfort', 'smart-dark');
        if (['invert', 'sepia', 'amoled', 'eye-comfort', 'smart-dark'].includes(state.theme)) {
          canvas.classList.add(state.theme);
        }

        const renderCtx = {
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        };

        ps.container.style.width = viewport.width + 'px';
        ps.container.style.height = viewport.height + 'px';
        ps.textLayer.style.width = viewport.width + 'px';
        ps.textLayer.style.height = viewport.height + 'px';

        const loading = ps.container.querySelector('.page-loading');
        if (loading) loading.remove();

        await page.render(renderCtx).promise;
        if (token !== state.renderToken && !force) {
          // Keep going to build text layer even if another page started rendering
        }

        await buildTextLayer(pageNum, page, viewport);
        await buildLinkLayer(pageNum, page, viewport);
        redrawAnnotations(pageNum);

        ps.renderedScale = state.scale;
        ps.renderedRotation = state.rotation;

        if (state.searchTerm) applyHighlightsOnPage(pageNum);
      } catch (err) {
        console.error('Render error', pageNum, err);
        ps.container.innerHTML = `<div class="page-loading">Failed to render page ${pageNum}</div>`;
      } finally {
        ps.rendering = null;
      }
    })();

    return ps.rendering;
  }

  async function renderThumbnail(pageNum) {
    const ps = getPageState(pageNum);
    if (!state.pdfDoc || !ps.thumbCanvas || ps.thumbRendered) return;
    ps.thumbRendered = true;
    try {
      const page = await state.pdfDoc.getPage(pageNum);
      const totalRotation = (page.rotate + state.rotation) % 360;
      const baseVp = page.getViewport({ scale: 1, rotation: totalRotation });
      const thumbScale = 124 / (baseVp.width || 600);
      const vp = page.getViewport({ scale: thumbScale, rotation: totalRotation });

      const canvas = ps.thumbCanvas;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(vp.width * dpr);
      canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = `${Math.floor(vp.width)}px`;
      canvas.style.height = `${Math.floor(vp.height)}px`;

      canvas.classList.remove('invert', 'sepia', 'amoled', 'eye-comfort', 'smart-dark');
      if (['invert', 'sepia', 'amoled', 'eye-comfort', 'smart-dark'].includes(state.theme)) {
        canvas.classList.add(state.theme);
      }

      const ctx = canvas.getContext('2d', { alpha: false });
      await page.render({
        canvasContext: ctx,
        viewport: vp,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
      }).promise;
    } catch {}
  }

  // --------------------------------------------------
  // Document Outline / Table of Contents
  // --------------------------------------------------
  async function loadOutline() {
    if (!els.panelOutline || !state.pdfDoc) return;
    els.panelOutline.innerHTML = '<p class="empty">Loading outline…</p>';

    try {
      const outline = await state.pdfDoc.getOutline();
      if (outline && outline.length > 0) {
        els.panelOutline.innerHTML = '';
        const tree = buildOutlineDom(outline);
        els.panelOutline.appendChild(tree);
        return;
      }
    } catch {}

    // Fallback: Offer smart heading scan when PDF has no embedded outline
    els.panelOutline.innerHTML = `
      <div class="empty">
        <p>No embedded outline in this PDF.</p>
        <button type="button" id="btn-scan-headings" class="btn wide subtle-btn" style="margin-top:8px">
          Scan Document Headings
        </button>
      </div>
    `;
    const scanBtn = document.getElementById('btn-scan-headings');
    if (scanBtn) {
      scanBtn.addEventListener('click', scanHeadingsFromPages);
    }
  }

  function buildOutlineDom(items) {
    const ul = document.createElement('ul');
    ul.className = 'outline-tree';
    for (const item of items) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'outline-btn';
      btn.innerHTML = `<span>${escapeHtml(item.title || 'Untitled section')}</span>`;
      btn.addEventListener('click', () => {
        if (item.dest) navigateToDestination(item.dest);
        else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
      });
      li.appendChild(btn);

      if (item.items && item.items.length > 0) {
        li.appendChild(buildOutlineDom(item.items));
      }
      ul.appendChild(li);
    }
    return ul;
  }

  async function scanHeadingsFromPages() {
    if (!state.pdfDoc || !els.panelOutline) return;
    els.panelOutline.innerHTML = '<p class="empty">Scanning pages for headings…</p>';
    const detected = [];
    const maxPagesToScan = Math.min(state.pageCount, 40);

    for (let p = 1; p <= maxPagesToScan; p++) {
      try {
        const page = await state.pdfDoc.getPage(p);
        const tc = await page.getTextContent();
        for (const item of tc.items) {
          const str = (item.str || '').trim();
          if (str.length < 4 || str.length > 80) continue;
          const h = Math.hypot(item.transform[2], item.transform[3]) || 0;
          if (h >= 13.5 || /^(Chapter|Section|Unit|Lecture|Topic|Problem|Theorem)\s+\d+/i.test(str)) {
            if (!detected.some((d) => d.title === str && d.page === p)) {
              detected.push({ title: str, page: p });
            }
          }
        }
      } catch {}
    }

    if (!detected.length) {
      els.panelOutline.innerHTML = '<p class="empty">No distinct section headings found.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'outline-tree';
    for (const h of detected.slice(0, 60)) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'outline-btn';
      btn.innerHTML = `<span>${escapeHtml(h.title)}</span><span class="outline-page">p.${h.page}</span>`;
      btn.addEventListener('click', () => {
        setCurrentPage(h.page);
        scrollToPage(h.page);
      });
      li.appendChild(btn);
      ul.appendChild(li);
    }
    els.panelOutline.innerHTML = '';
    els.panelOutline.appendChild(ul);
  }

  // --------------------------------------------------
  // Zoom / Fit / Rotate / Two-Page Spread
  // --------------------------------------------------
  function getFitScale(mode) {
    if (!state.baseViewport || !els.viewerWrap) return state.scale;
    const availW = Math.max(280, els.viewerWrap.clientWidth - 48);
    const availH = Math.max(360, els.viewerWrap.clientHeight - 48);
    const rotated = (state.rotation % 180 !== 0);
    const width = rotated ? state.baseViewport.height : state.baseViewport.width;
    const height = rotated ? state.baseViewport.width : state.baseViewport.height;

    const effectiveWidth = state.spreadMode ? width * 2 + 24 : width;

    if (mode === 'fit-page') {
      return clamp(Math.min(availW / effectiveWidth, availH / height) * 0.98, MIN_SCALE, MAX_SCALE);
    }
    return clamp((availW / effectiveWidth) * 0.98, MIN_SCALE, MAX_SCALE);
  }

  function setZoom(scale, mode = 'custom') {
    state.scale = clamp(scale, MIN_SCALE, MAX_SCALE);
    state.zoomMode = mode;
    if (els.zoomLabel) els.zoomLabel.textContent = Math.round(state.scale * 100) + '%';
    if (els.fitWidth) els.fitWidth.classList.toggle('active', mode === 'fit-width');
    if (els.fitPage) els.fitPage.classList.toggle('active', mode === 'fit-page');

    // Update skeleton sizes immediately so scroll layout stays accurate
    if (state.baseViewport) {
      const rotated = (state.rotation % 180 !== 0);
      const w = Math.floor((rotated ? state.baseViewport.height : state.baseViewport.width) * state.scale);
      const h = Math.floor((rotated ? state.baseViewport.width : state.baseViewport.height) * state.scale);
      els.viewer.querySelectorAll('.page').forEach((el) => {
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      });
    }

    updateStatusMeta();
    if (state.pdfDoc) renderVisible(true);
  }

  function rotatePages(deltaDeg) {
    state.rotation = (state.rotation + deltaDeg + 360) % 360;
    // Reset thumbnail cache so thumbnails reflect rotation
    for (let i = 1; i <= state.pageCount; i++) {
      const ps = getPageState(i);
      ps.thumbRendered = false;
      renderThumbnail(i);
    }
    if (state.zoomMode === 'fit-width' || state.zoomMode === 'fit-page') {
      setZoom(getFitScale(state.zoomMode), state.zoomMode);
    } else {
      setZoom(state.scale, 'custom');
    }
    setStatus(`Rotated to ${state.rotation}°`);
  }

  function toggleSpreadMode() {
    state.spreadMode = !state.spreadMode;
    els.viewer.classList.toggle('spread-view', state.spreadMode);
    if (els.spreadBtn) els.spreadBtn.classList.toggle('active', state.spreadMode);
    if (els.checkTwoPage) els.checkTwoPage.textContent = state.spreadMode ? '✓' : '';
    if (state.zoomMode === 'fit-width' || state.zoomMode === 'fit-page') {
      setZoom(getFitScale(state.zoomMode), state.zoomMode);
    } else {
      renderVisible(true);
    }
    setStatus(state.spreadMode ? 'Two-page view enabled' : 'Single-page view enabled');
  }

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------
  function scrollToPage(n, behavior = 'smooth') {
    const el = els.viewer.querySelector(`[data-page="${n}"]`);
    if (el) el.scrollIntoView({ behavior, block: 'start' });
  }

  function scrollToMatch(behavior = 'smooth') {
    const mark = els.viewer.querySelector('mark.highlight.selected')
      || els.viewer.querySelector('mark.highlight')
      || els.viewer.querySelector('.highlight.selected');
    if (!mark) return false;

    const wrap = els.viewerWrap;
    if (!wrap) {
      mark.scrollIntoView({ behavior, block: 'center', inline: 'center' });
      return true;
    }

    const markRect = mark.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();

    const markCenterY = markRect.top + markRect.height / 2;
    const wrapCenterY = wrapRect.top + wrapRect.height / 2;
    const deltaY = markCenterY - wrapCenterY;

    const markCenterX = markRect.left + markRect.width / 2;
    const wrapCenterX = wrapRect.left + wrapRect.width / 2;
    const deltaX = markCenterX - wrapCenterX;

    const targetTop = wrap.scrollTop + deltaY;
    const targetLeft = wrap.scrollLeft + deltaX;

    wrap.scrollTo({
      top: Math.max(0, targetTop),
      left: Math.max(0, targetLeft),
      behavior,
    });
    return true;
  }

  function setCurrentPage(n, syncInput = true) {
    state.currentPage = normalizePage(n);
    if (syncInput && els.pageInput) els.pageInput.value = String(state.currentPage);
    if (els.prev) els.prev.disabled = state.currentPage <= 1;
    if (els.next) els.next.disabled = state.currentPage >= state.pageCount;

    // Update URL parameter lightly
    try {
      const url = new URL(location.href);
      url.searchParams.set('page', String(state.currentPage));
      history.replaceState(null, '', url);
    } catch {}

    // Highlight active thumbnail and scroll it into view in sidebar
    document.querySelectorAll('.thumb-item').forEach((t) => {
      const isAct = Number(t.dataset.page) === state.currentPage;
      t.classList.toggle('active', isAct);
      if (isAct && state.sidebarOpen) {
        t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });

    updateBookmarkStar();
    updateStatusMeta();
  }

  // --------------------------------------------------
  // Search + Scrollbar Match Markers
  // --------------------------------------------------
  function updateSearchCount() {
    if (!els.searchCount) return;
    const total = state.searchMatches.length;
    if (!state.searchTerm || total === 0) {
      els.searchCount.textContent = state.searchTerm ? '0/0' : '';
      renderSearchMarkers();
      return;
    }
    const cur = state.currentMatch >= 0 ? state.currentMatch + 1 : 0;
    els.searchCount.textContent = cur + '/' + total;
    renderSearchMarkers();
  }

  function renderSearchMarkers() {
    if (!els.searchMarkers) return;
    els.searchMarkers.innerHTML = '';
    if (!state.searchMatches.length || !state.pageCount) return;

    state.searchMatches.forEach((m, idx) => {
      const tick = document.createElement('div');
      tick.className = 'search-marker' + (idx === state.currentMatch ? ' active' : '');
      const topPct = ((m.page - 0.5) / state.pageCount) * 100;
      tick.style.top = `${clamp(topPct, 1, 99)}%`;
      els.searchMarkers.appendChild(tick);
    });
  }

  function clearHighlights() {
    document.querySelectorAll('.textLayer mark.highlight').forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
      parent.normalize();
    });
    document.querySelectorAll('.textLayer .highlight').forEach((el) => {
      el.classList.remove('highlight', 'selected');
    });
  }

  // Highlight ONLY the matched characters inside spans (not the whole line)
  function applyHighlightsOnPage(pageNum) {
    if (!state.searchTerm) return;
    const ps = getPageState(pageNum);
    if (!ps.textLayer) return;

    const current = state.searchMatches[state.currentMatch];
    const pageMatches = state.searchMatches.filter((m) => m.page === pageNum);
    if (!pageMatches.length) return;

    const spans = Array.from(ps.textLayer.querySelectorAll(':scope > span'));
    let charPos = 0;

    spans.forEach((span) => {
      const raw = span.textContent || '';
      const len = raw.length;
      const spanStart = charPos;
      const spanEnd = charPos + len;
      charPos = spanEnd;

      const hits = pageMatches.filter((m) => m.end > spanStart && m.start < spanEnd);
      if (!hits.length) return;

      let html = '';
      let cursor = 0;
      const localHits = hits
        .map((m) => ({
          localStart: Math.max(0, m.start - spanStart),
          localEnd: Math.min(len, m.end - spanStart),
          isCurrent: current && m.page === current.page && m.start === current.start && m.end === current.end,
        }))
        .filter((h) => h.localEnd > h.localStart)
        .sort((a, b) => a.localStart - b.localStart);

      for (const h of localHits) {
        if (h.localStart > cursor) {
          html += escapeHtml(raw.slice(cursor, h.localStart));
        }
        const cls = h.isCurrent ? 'highlight selected' : 'highlight';
        html += `<mark class="${cls}">${escapeHtml(raw.slice(h.localStart, h.localEnd))}</mark>`;
        cursor = h.localEnd;
      }
      if (cursor < len) {
        html += escapeHtml(raw.slice(cursor));
      }

      span.innerHTML = html;
    });
  }

  async function runSearch(term) {
    const rawTerm = (term || '').trim();
    state.searchTerm = state.matchCase ? rawTerm : rawTerm.toLowerCase();
    state.searchMatches = [];
    state.currentMatch = -1;
    clearHighlights();

    if (!state.searchTerm || !state.pdfDoc) {
      updateSearchCount();
      setStatus(state.pageCount ? `Loaded ${state.pageCount} pages` : 'Ready');
      return;
    }

    setStatus(`Searching “${rawTerm}”…`);

    for (let p = 1; p <= state.pageCount; p++) {
      let ps = getPageState(p);
      if (!ps.textContent) {
        try {
          const page = await state.pdfDoc.getPage(p);
          ps.textContent = await page.getTextContent();
        } catch { continue; }
      }

      let pageText = '';
      for (const item of ps.textContent.items) {
        pageText += item.str || '';
      }
      const haystack = state.matchCase ? pageText : pageText.toLowerCase();
      let from = 0;
      let pos;
      while ((pos = haystack.indexOf(state.searchTerm, from)) !== -1) {
        state.searchMatches.push({ page: p, start: pos, end: pos + state.searchTerm.length });
        from = pos + 1;
      }
    }

    if (!state.searchMatches.length) {
      updateSearchCount();
      setStatus(`No matches for “${rawTerm}”`);
      return;
    }

    state.currentMatch = 0;
    const first = state.searchMatches[0];
    setCurrentPage(first.page);
    await renderPage(first.page);
    applyHighlightsOnPage(first.page);
    requestAnimationFrame(() => {
      if (!scrollToMatch('smooth')) {
        scrollToPage(first.page);
        setTimeout(() => scrollToMatch('smooth'), 50);
      }
    });
    updateSearchCount();
    setStatus(`Match 1 of ${state.searchMatches.length}`);
  }

  function jumpMatch(dir) {
    if (!state.searchMatches.length) return;
    state.currentMatch =
      (state.currentMatch + dir + state.searchMatches.length) % state.searchMatches.length;
    const m = state.searchMatches[state.currentMatch];
    setCurrentPage(m.page);
    renderPage(m.page).then(() => {
      clearHighlights();
      applyHighlightsOnPage(m.page);
      requestAnimationFrame(() => {
        if (!scrollToMatch('smooth')) {
          scrollToPage(m.page);
          setTimeout(() => scrollToMatch('smooth'), 50);
        }
      });
    });
    updateSearchCount();
    setStatus(`Match ${state.currentMatch + 1} of ${state.searchMatches.length}`);
  }

  // --------------------------------------------------
  // Visible page rendering + observers
  // --------------------------------------------------
  async function renderVisible(force = false) {
    if (!state.pdfDoc) return;
    const candidates = new Set([
      state.currentPage,
      state.currentPage - 1,
      state.currentPage + 1,
      state.currentPage + 2,
    ]);
    for (const n of candidates) {
      if (n >= 1 && n <= state.pageCount) await renderPage(n, { force });
    }
  }

  function observePages() {
    if (state.observer) state.observer.disconnect();
    state.observer = new IntersectionObserver(
      (entries) => {
        let best = { page: state.currentPage, ratio: 0 };
        for (const e of entries) {
          const n = Number(e.target.dataset.page);
          if (e.isIntersecting) {
            renderPage(n);
            if (e.intersectionRatio >= best.ratio) {
              best = { page: n, ratio: e.intersectionRatio };
            }
          }
        }
        if (best.page && best.ratio > 0) setCurrentPage(best.page);
      },
      { root: els.viewerWrap, threshold: [0.15, 0.35, 0.6], rootMargin: '250px 0px' }
    );
    els.viewer.querySelectorAll('.page').forEach((p) => state.observer.observe(p));
  }

  function observeThumbnails() {
    if (state.thumbObserver) state.thumbObserver.disconnect();
    state.thumbObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const n = Number(e.target.dataset.page);
            if (n) renderThumbnail(n);
          }
        }
      },
      { root: els.sidebarContent, rootMargin: '150px 0px' }
    );
    els.panelThumbs.querySelectorAll('.thumb-item').forEach((t) => state.thumbObserver.observe(t));
  }

  // --------------------------------------------------
  // Build viewer + Chrome Miniature Thumbnails
  // --------------------------------------------------
  function buildViewer() {
    els.viewer.innerHTML = '';
    state.pageStates = new Array(state.pageCount + 1).fill(null);
    for (let i = 1; i <= state.pageCount; i++) {
      els.viewer.appendChild(buildPageSkeleton(i));
    }
    observePages();

    // Miniature Canvas Thumbnails
    els.panelThumbs.innerHTML = '';
    for (let i = 1; i <= state.pageCount; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb-item' + (i === state.currentPage ? ' active' : '');
      btn.dataset.page = String(i);

      const wrap = document.createElement('div');
      wrap.className = 'thumb-canvas-wrap';
      const tc = document.createElement('canvas');
      tc.className = 'thumb-canvas';
      wrap.appendChild(tc);

      const lbl = document.createElement('span');
      lbl.className = 'thumb-label';
      lbl.textContent = String(i);

      btn.appendChild(wrap);
      btn.appendChild(lbl);

      btn.addEventListener('click', () => {
        setCurrentPage(i);
        scrollToPage(i);
      });

      const ps = getPageState(i);
      ps.thumbCanvas = tc;
      els.panelThumbs.appendChild(btn);
    }
    observeThumbnails();
  }

  // --------------------------------------------------
  // Chrome Document Properties Modal
  // --------------------------------------------------
  async function populateDocumentProperties() {
    if (!state.pdfDoc) return;
    const setProp = (id, val) => {
      const el = $(id);
      if (el) el.textContent = val || '—';
    };

    setProp('prop-filename', state.fileName || '—');
    setProp('prop-pages', String(state.pageCount));

    try {
      const dlInfo = await state.pdfDoc.getDownloadInfo();
      if (dlInfo && dlInfo.length) {
        state.fileByteLength = dlInfo.length;
      }
    } catch {}

    if (state.fileByteLength) {
      const kb = (state.fileByteLength / 1024).toFixed(1);
      const mb = (state.fileByteLength / (1024 * 1024)).toFixed(2);
      setProp('prop-filesize', state.fileByteLength > 1048576 ? `${mb} MB (${state.fileByteLength.toLocaleString()} bytes)` : `${kb} KB (${state.fileByteLength.toLocaleString()} bytes)`);
    }

    if (state.baseViewport) {
      const inW = (state.baseViewport.width / 72).toFixed(2);
      const inH = (state.baseViewport.height / 72).toFixed(2);
      const mmW = Math.round((state.baseViewport.width / 72) * 25.4);
      const mmH = Math.round((state.baseViewport.height / 72) * 25.4);
      setProp('prop-pagesize', `${inW} × ${inH} in (${mmW} × ${mmH} mm)`);
    }

    try {
      const meta = await state.pdfDoc.getMetadata();
      const info = meta?.info || {};
      setProp('prop-title', info.Title);
      setProp('prop-author', info.Author);
      setProp('prop-subject', info.Subject);
      setProp('prop-keywords', info.Keywords);
      setProp('prop-creator', info.Creator);
      setProp('prop-producer', info.Producer);
      setProp('prop-version', info.PDFFormatVersion);
      setProp('prop-linearized', info.IsLinearized ? 'Yes' : 'No');
      setProp('prop-created', formatPdfDate(info.CreationDate));
      setProp('prop-modified', formatPdfDate(info.ModDate));
    } catch {}
  }

  function formatPdfDate(raw) {
    if (!raw || typeof raw !== 'string') return '—';
    const m = raw.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/);
    if (!m) return raw;
    return `${m[1]}-${m[2]}-${m[3]} ${m[4] || '00'}:${m[5] || '00'}`;
  }

  // --------------------------------------------------
  // Load PDF (Remote Multi-CDN or Local File)
  // --------------------------------------------------
  function resolvePdfUrls(relPath) {
    const encoded = encodeURI(relPath);
    const urls = [];

    // 1) Relative to current site (GitHub Pages or local server)
    urls.push(encoded);

    // 2) Absolute from current origin + path prefix
    try {
      const base = location.href.replace(/[^/]*$/, '');
      urls.push(new URL(encoded, base).href);
    } catch {}

    // 3) raw.githubusercontent.com – both known owners
    const owners = ['CyclotronPulsar', 'Cyclotron123'];
    for (const owner of owners) {
      urls.push(`https://raw.githubusercontent.com/${owner}/BSDS_Materials/main/${encoded}`);
    }

    // 4) raw.githack CDN (good CORS)
    for (const owner of owners) {
      urls.push(`https://raw.githack.com/${owner}/BSDS_Materials/main/${encoded}`);
    }

    return [...new Set(urls)];
  }

  async function loadPdfDocument(relPath) {
    const candidates = resolvePdfUrls(relPath);
    let lastError = null;

    for (const url of candidates) {
      try {
        setStatus(`Loading… ${url.split('/').slice(-2).join('/')}`);
        const task = pdfjsLib.getDocument({
          url,
          withCredentials: false,
          isEvalSupported: false,
        });
        task.onProgress = (p) => {
          if (p && p.total) {
            state.fileByteLength = p.total;
            setStatus(`Loading… ${Math.round((p.loaded / p.total) * 100)}%`);
          }
        };
        const doc = await task.promise;
        state.filePath = url;
        return doc;
      } catch (err) {
        console.warn('Failed candidate', url, err && err.message);
        lastError = err;
      }
    }
    throw lastError || new Error('All load candidates failed');
  }

  async function initializeLoadedDoc(doc, fileKey, displayName, startPage = 1) {
    state.pdfDoc = doc;
    state.pageCount = doc.numPages;
    state.fileName = displayName;
    setTitle(displayName);
    loadSavedStateForFile(fileKey);

    if (els.pageTotal) els.pageTotal.textContent = `/ ${state.pageCount}`;
    if (els.pageInput) els.pageInput.max = String(state.pageCount);
    if (els.sidebar) els.sidebar.classList.toggle('hidden', !state.sidebarOpen);

    const first = await state.pdfDoc.getPage(1);
    state.baseViewport = first.getViewport({ scale: 1 });

    buildViewer();
    loadOutline();
    populateDocumentProperties();

    // Default open scale = 125%
    setZoom(DEFAULT_SCALE, 'custom');

    const targetPage = normalizePage(startPage);
    await renderPage(targetPage, { force: true });
    if (targetPage > 1) await renderPage(1, { force: true });

    scrollToPage(targetPage, 'auto');
    setCurrentPage(targetPage);
    setStatus(`Loaded ${state.pageCount} pages · ${Math.round(state.scale * 100)}%`);
  }

  async function loadPdf() {
    const { file, page } = getParams();
    if (!file) {
      setTitle('No document');
      setStatus('Missing or invalid ?file= parameter');
      return;
    }

    const fileName = file.split('/').pop() || 'document.pdf';
    setTitle(fileName);
    setStatus('Loading PDF…');

    try {
      if (!window.pdfjsLib) throw new Error('PDF.js failed to load from CDN');
      pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;

      const doc = await loadPdfDocument(file);
      await initializeLoadedDoc(doc, file, fileName, page);
    } catch (err) {
      console.error(err);
      setTitle('Error');
      const msg = (err && err.message) ? err.message : 'Unknown error';
      setStatus('Failed to load PDF: ' + msg);
      els.viewer.innerHTML = `<div class="page-loading">Could not open this document.<br><small style="opacity:.7">${escapeHtml(msg)}</small><br><br><small>Tried relative path and GitHub raw URLs.<br>File: ${escapeHtml(file)}</small></div>`;
    }
  }

  async function loadLocalPdfFile(fileObj) {
    if (!fileObj) return;
    try {
      setStatus(`Opening local file ${fileObj.name}…`);
      state.fileByteLength = fileObj.size || 0;
      const buf = await fileObj.arrayBuffer();
      const blobUrl = URL.createObjectURL(fileObj);
      state.filePath = blobUrl;
      pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
      const doc = await pdfjsLib.getDocument({ data: buf, isEvalSupported: false }).promise;
      await initializeLoadedDoc(doc, `local:${fileObj.name}`, fileObj.name, 1);
    } catch (err) {
      setStatus('Failed to open local PDF: ' + (err?.message || 'Error'));
    }
  }

  // --------------------------------------------------
  // Controls & Event Listeners
  // --------------------------------------------------
  function closeAllDropdowns() {
    if (els.zoomMenu) els.zoomMenu.classList.add('hidden');
    if (els.themeMenu) els.themeMenu.classList.add('hidden');
    if (els.moreMenu) els.moreMenu.classList.add('hidden');
  }

  function initControls() {
    els.back?.addEventListener('click', () => {
      if (document.referrer && new URL(document.referrer).origin === location.origin) {
        history.back();
      } else {
        location.href = 'index.html';
      }
    });

    els.bookmarkPageBtn?.addEventListener('click', () => toggleBookmarkOnPage(state.currentPage));
    els.addBookmarkBtn?.addEventListener('click', () => toggleBookmarkOnPage(state.currentPage));

    els.openLocalBtn?.addEventListener('click', () => els.fileInput?.click());
    els.fileInput?.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) loadLocalPdfFile(f);
    });

    // Drag and drop PDF support anywhere on viewer
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f && f.name.toLowerCase().endsWith('.pdf')) {
        loadLocalPdfFile(f);
      }
    });

    els.prev?.addEventListener('click', () => {
      const p = normalizePage(state.currentPage - 1);
      setCurrentPage(p);
      scrollToPage(p);
    });
    els.next?.addEventListener('click', () => {
      const p = normalizePage(state.currentPage + 1);
      setCurrentPage(p);
      scrollToPage(p);
    });

    els.pageInput?.addEventListener('change', () => {
      const p = normalizePage(parseInt(els.pageInput.value, 10));
      setCurrentPage(p);
      scrollToPage(p);
    });

    els.zoomOut?.addEventListener('click', () => setZoom(state.scale - SCALE_STEP));
    els.zoomIn?.addEventListener('click', () => setZoom(state.scale + SCALE_STEP));
    els.fabZoomOut?.addEventListener('click', () => setZoom(state.scale - SCALE_STEP));
    els.fabZoomIn?.addEventListener('click', () => setZoom(state.scale + SCALE_STEP));
    els.fabFit?.addEventListener('click', () => {
      const nextMode = state.zoomMode === 'fit-width' ? 'fit-page' : 'fit-width';
      setZoom(getFitScale(nextMode), nextMode);
    });

    els.fitWidth?.addEventListener('click', () => setZoom(getFitScale('fit-width'), 'fit-width'));
    els.fitPage?.addEventListener('click', () => setZoom(getFitScale('fit-page'), 'fit-page'));

    // Zoom preset dropdown
    els.zoomLabel?.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasHidden = els.zoomMenu?.classList.contains('hidden');
      closeAllDropdowns();
      if (wasHidden) els.zoomMenu?.classList.remove('hidden');
    });
    els.zoomMenu?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.zoom) {
        setZoom(getFitScale(btn.dataset.zoom), btn.dataset.zoom);
      } else if (btn.dataset.scale) {
        setZoom(parseFloat(btn.dataset.scale), 'custom');
      }
      closeAllDropdowns();
    });

    // Rotation & Spread & Hand tool
    els.rotateCcw?.addEventListener('click', () => rotatePages(-90));
    els.rotateCw?.addEventListener('click', () => rotatePages(90));
    els.spreadBtn?.addEventListener('click', toggleSpreadMode);

    els.handBtn?.addEventListener('click', () => {
      state.handTool = !state.handTool;
      els.handBtn.classList.toggle('active', state.handTool);
      els.viewerWrap.classList.toggle('hand-pan', state.handTool);
      setStatus(state.handTool ? 'Hand pan tool active (drag to pan)' : 'Text selection tool active');
    });

    // Hand tool drag-to-pan implementation
    els.viewerWrap?.addEventListener('mousedown', (e) => {
      if ((!state.handTool && !state.spacePressed) || state.drawTool) return;
      if (e.button !== 0) return;
      state.isPanning = true;
      els.viewerWrap.classList.add('panning');
      state.panStart = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: els.viewerWrap.scrollLeft,
        scrollTop: els.viewerWrap.scrollTop,
      };
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isPanning) return;
      const dx = e.clientX - state.panStart.x;
      const dy = e.clientY - state.panStart.y;
      els.viewerWrap.scrollLeft = state.panStart.scrollLeft - dx;
      els.viewerWrap.scrollTop = state.panStart.scrollTop - dy;
    });

    window.addEventListener('mouseup', () => {
      if (state.isPanning) {
        state.isPanning = false;
        els.viewerWrap?.classList.remove('panning');
      }
    });

    // Smooth Ctrl + Wheel zoom (Chrome behavior)
    els.viewerWrap?.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
        setZoom(state.scale + delta, 'custom');
      }
    }, { passive: false });

    // Search
    let searchTimer;
    els.searchInput?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => runSearch(els.searchInput.value), 250);
    });
    els.searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!state.searchMatches.length) {
          runSearch(els.searchInput.value);
          return;
        }
        if (e.shiftKey) jumpMatch(-1);
        else jumpMatch(1);
      }
    });
    els.matchCaseBtn?.addEventListener('click', () => {
      state.matchCase = !state.matchCase;
      els.matchCaseBtn.classList.toggle('active', state.matchCase);
      runSearch(els.searchInput.value);
    });
    els.searchPrev?.addEventListener('click', () => jumpMatch(-1));
    els.searchNext?.addEventListener('click', () => jumpMatch(1));

    // Annotation Controls
    els.drawHighlightBtn?.addEventListener('click', () => setDrawTool('highlight'));
    els.drawPenBtn?.addEventListener('click', () => setDrawTool('pen'));
    els.drawEraserBtn?.addEventListener('click', () => {
      if (state.annotations[state.currentPage]?.length) {
        delete state.annotations[state.currentPage];
        saveAnnotations();
        redrawAnnotations(state.currentPage);
        setStatus(`Cleared annotations on page ${state.currentPage}`);
      } else {
        setStatus(`No annotations on page ${state.currentPage}`);
      }
    });
    document.querySelectorAll('.color-swatch').forEach((sw) => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
        sw.classList.add('active');
        state.drawColor = sw.dataset.color || '#facc15';
      });
    });
    els.annotSize?.addEventListener('input', () => {
      state.drawSize = Number(els.annotSize.value) || 10;
    });
    els.annotUndoBtn?.addEventListener('click', () => {
      const list = state.annotations[state.currentPage];
      if (list && list.length) {
        list.pop();
        saveAnnotations();
        redrawAnnotations(state.currentPage);
      }
    });
    els.annotDoneBtn?.addEventListener('click', () => setDrawTool(null));

    // Theme cycler + right-click menu
    els.theme?.addEventListener('click', () => {
      closeAllDropdowns();
      cycleTheme();
    });
    els.theme?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wasHidden = els.themeMenu?.classList.contains('hidden');
      closeAllDropdowns();
      if (wasHidden) els.themeMenu?.classList.remove('hidden');
    });
    els.themeMenu?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme]');
      if (!btn) return;
      applyTheme(btn.dataset.theme);
      closeAllDropdowns();
    });

    // Sidebar toggle
    els.sidebarBtn?.addEventListener('click', () => {
      state.sidebarOpen = !state.sidebarOpen;
      els.sidebar.classList.toggle('hidden', !state.sidebarOpen);
      els.sidebarBtn.classList.toggle('active', state.sidebarOpen);
    });

    // Fullscreen
    els.fullscreen?.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch {}
    });

    // Download (Blob fetch so cross-origin raw GitHub URLs save cleanly)
    els.download?.addEventListener('click', async () => {
      if (!state.filePath) return;
      try {
        setStatus('Preparing download…');
        const res = await fetch(state.filePath);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = state.fileName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatus(`Downloaded ${state.fileName}`);
      } catch {
        const a = document.createElement('a');
        a.href = state.filePath;
        a.download = state.fileName || 'document.pdf';
        a.target = '_blank';
        a.click();
      }
    });

    // Print
    els.print?.addEventListener('click', async () => {
      if (!state.filePath) return;
      try {
        setStatus('Preparing document for printing…');
        const res = await fetch(state.filePath);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch {
            window.open(state.filePath, '_blank');
          }
          setTimeout(() => {
            iframe.remove();
            URL.revokeObjectURL(blobUrl);
          }, 2000);
        };
      } catch {
        window.open(state.filePath, '_blank');
      }
    });

    // More (⋮) Menu
    els.moreBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasHidden = els.moreMenu?.classList.contains('hidden');
      closeAllDropdowns();
      if (wasHidden) els.moreMenu?.classList.remove('hidden');
    });
    els.menuTwoPage?.addEventListener('click', () => {
      toggleSpreadMode();
      closeAllDropdowns();
    });
    els.menuAnnotations?.addEventListener('click', () => {
      state.showAnnotations = !state.showAnnotations;
      if (els.checkAnnotations) els.checkAnnotations.textContent = state.showAnnotations ? '✓' : '';
      document.querySelectorAll('.annotLayer').forEach((el) => {
        el.classList.toggle('hidden', !state.showAnnotations);
      });
      closeAllDropdowns();
    });
    els.menuPresent?.addEventListener('click', () => {
      closeAllDropdowns();
      setZoom(getFitScale('fit-page'), 'fit-page');
      els.fullscreen?.click();
    });
    els.menuFirstPage?.addEventListener('click', () => {
      closeAllDropdowns();
      setCurrentPage(1);
      scrollToPage(1);
    });
    els.menuLastPage?.addEventListener('click', () => {
      closeAllDropdowns();
      setCurrentPage(state.pageCount);
      scrollToPage(state.pageCount);
    });
    els.menuShortcuts?.addEventListener('click', () => {
      closeAllDropdowns();
      els.shortcutsBackdrop?.classList.remove('hidden');
    });
    els.menuDocProps?.addEventListener('click', () => {
      closeAllDropdowns();
      populateDocumentProperties();
      els.propsBackdrop?.classList.remove('hidden');
    });

    els.propsClose?.addEventListener('click', () => els.propsBackdrop?.classList.add('hidden'));
    els.propsOk?.addEventListener('click', () => els.propsBackdrop?.classList.add('hidden'));
    els.propsBackdrop?.addEventListener('click', (e) => {
      if (e.target === els.propsBackdrop) els.propsBackdrop.classList.add('hidden');
    });

    els.shortcutsClose?.addEventListener('click', () => els.shortcutsBackdrop?.classList.add('hidden'));
    els.shortcutsOk?.addEventListener('click', () => els.shortcutsBackdrop?.classList.add('hidden'));
    els.shortcutsBackdrop?.addEventListener('click', (e) => {
      if (e.target === els.shortcutsBackdrop) els.shortcutsBackdrop.classList.add('hidden');
    });

    document.addEventListener('click', () => closeAllDropdowns());

    // Sidebar tabs
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const name = tab.dataset.tab;
        document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
        const panel = document.getElementById(`panel-${name}`);
        if (panel) panel.classList.remove('hidden');
      });
    });

    // Resize
    window.addEventListener('resize', () => {
      if (state.zoomMode === 'fit-width' || state.zoomMode === 'fit-page') {
        setZoom(getFitScale(state.zoomMode), state.zoomMode);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea';

      if (e.code === 'Space' && !typing) {
        state.spacePressed = true;
        els.viewerWrap?.classList.add('hand-pan');
      }

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'f') {
          e.preventDefault();
          els.searchInput?.focus();
          els.searchInput?.select();
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom(state.scale + SCALE_STEP);
        } else if (e.key === '-') {
          e.preventDefault();
          setZoom(state.scale - SCALE_STEP);
        } else if (e.key === '0') {
          e.preventDefault();
          setZoom(getFitScale('fit-width'), 'fit-width');
        } else if (e.key === '9') {
          e.preventDefault();
          setZoom(getFitScale('fit-page'), 'fit-page');
        } else if (k === 'd') {
          e.preventDefault();
          cycleTheme();
        } else if (k === 'b') {
          e.preventDefault();
          els.sidebarBtn?.click();
        } else if (k === 'm') {
          e.preventDefault();
          toggleBookmarkOnPage(state.currentPage);
        } else if (k === 'p') {
          e.preventDefault();
          els.print?.click();
        } else if (k === 's') {
          e.preventDefault();
          els.download?.click();
        } else if (k === 'i') {
          e.preventDefault();
          populateDocumentProperties();
          els.propsBackdrop?.classList.remove('hidden');
        }
        return;
      }

      if (e.key === 'Escape') {
        closeAllDropdowns();
        els.propsBackdrop?.classList.add('hidden');
        els.shortcutsBackdrop?.classList.add('hidden');
        if (state.drawTool) setDrawTool(null);
        if (document.fullscreenElement) document.exitFullscreen();
        return;
      }

      if (typing) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        els.next?.click();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        els.prev?.click();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
        scrollToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentPage(state.pageCount);
        scrollToPage(state.pageCount);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        rotatePages(e.shiftKey ? -90 : 90);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        toggleSpreadMode();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        els.handBtn?.click();
      } else if (e.key === 'F4') {
        e.preventDefault();
        els.sidebarBtn?.click();
      } else if (e.key === 'F11') {
        e.preventDefault();
        els.fullscreen?.click();
      } else if (e.key === '?') {
        e.preventDefault();
        els.shortcutsBackdrop?.classList.remove('hidden');
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        state.spacePressed = false;
        if (!state.handTool) els.viewerWrap?.classList.remove('hand-pan');
      }
    });
  }

  // --------------------------------------------------
  // Boot
  // --------------------------------------------------
  function boot() {
    applyTheme(state.theme);
    initControls();
    const start = Date.now();
    (function waitPdfJs() {
      if (window.pdfjsLib) {
        loadPdf();
        return;
      }
      if (Date.now() - start > 8000) {
        setStatus('PDF.js failed to load from CDN. Check your internet connection.');
        return;
      }
      setTimeout(waitPdfJs, 50);
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
