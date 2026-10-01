/**
 * ==========================================================================
 * 4U LISTAFÁCIL PRO — CLIENT-SIDE FILE ANALYZER & STRUCTURE GENERATOR
 * Architecture: ES6+ Modular Class
 * Features:
 *   - Universal Directory Reader (showDirectoryPicker + webkitdirectory fallback + Drag & Drop)
 *   - Recursive Folder Scanner with Dev/System Folder Ignore Filter
 *   - Interactive Tree View (Collapsible) + ASCII Tree Generator
 *   - AI Prompt Context Generator (Ready for ChatGPT / Claude / Gemini)
 *   - Multi-Format Exporters (CSV Excel UTF-8 BOM, Markdown Table, JSON, TXT)
 *   - Disk Space Diagnostics (Top 10 Space Hogs, Category Breakdown, Duplicates)
 *   - 100% Zero-Knowledge & Offline (Private in browser)
 * ==========================================================================
 */

class ListaFacilApp {
  constructor() {
    this.allFiles = [];
    this.filteredFiles = [];
    this.activeTab = 'list'; // 'list' | 'table' | 'tree' | 'insights' | 'text'
    this.activeCategory = 'all';
    this.activeSizeFilter = 'all';
    this.textFormat = 'ascii-tree'; // 'ascii-tree' | 'ai-prompt' | 'markdown' | 'csv' | 'json' | 'paths' | 'names'
    this.expandedFolders = new Set(['/']); // root expanded by default

    this.extMap = {
      code: ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'json', 'py', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'sql', 'sh', 'bash', 'yaml', 'yml', 'toml', 'md', 'xml', 'vue', 'svelte'],
      image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'heic', 'avif'],
      document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'epub'],
      video: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'],
      audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'tgz']
    };

    this.categoryIcons = {
      all: '📁',
      code: '💻',
      image: '🖼️',
      document: '📄',
      video: '🎬',
      audio: '🎵',
      archive: '📦',
      other: '⚙️'
    };

    this.categoryColors = {
      code: '#818cf8',
      image: '#34d399',
      document: '#22d3ee',
      video: '#fb7185',
      audio: '#fbbf24',
      archive: '#c084fc',
      other: '#94a3b8'
    };

    this.ignoredPatterns = [
      '.git', 'node_modules', '.vscode', '.idea', 'vendor', '__pycache__',
      '.venv', 'env', '.ds_store', 'thumbs.db', 'desktop.ini', '.next', '.nuxt',
      'dist', 'build', '.cache', '.turbo'
    ];

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.setupKeyboardShortcuts();

    // Suporte a Deep Linking e Demo via URL
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1' || params.has('demo')) {
        this.loadDemoDataset();
        const tab = params.get('tab');
        if (tab && ['list', 'table', 'tree', 'insights', 'text'].includes(tab)) {
          this.switchTab(tab);
        }
      }
    } catch (e) {
      console.warn('Erro ao processar query params:', e);
    }
  }

  // ==========================================================================
  // EVENT LISTENERS & SETUP
  // ==========================================================================
  setupEventListeners() {
    // Pick Button & Fallback
    const pickBtn = document.getElementById('pickBtn');
    if (pickBtn) pickBtn.addEventListener('click', () => this.handlePickFolder());

    const fallbackInput = document.getElementById('fallbackFolderInput');
    if (fallbackInput) {
      fallbackInput.addEventListener('change', (e) => this.handleFallbackInput(e));
    }

    // Demo Data Button
    const demoBtn = document.getElementById('btnLoadDemo');
    if (demoBtn) demoBtn.addEventListener('click', () => this.loadDemoDataset());

    // Search and Filters
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', () => this.filterAndRender());

    const extSelect = document.getElementById('extSelect');
    if (extSelect) extSelect.addEventListener('change', () => this.filterAndRender());

    const sizeSelect = document.getElementById('sizeFilterSelect');
    if (sizeSelect) {
      sizeSelect.addEventListener('change', (e) => {
        this.activeSizeFilter = e.target.value;
        this.filterAndRender();
      });
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', () => this.filterAndRender());

    // Options Checkboxes
    const optRecursive = document.getElementById('optRecursive');
    if (optRecursive) optRecursive.addEventListener('change', () => {
      if (this.allFiles.length > 0 && !this.isDemo) {
        this.showToast('Reescaneie a pasta para aplicar a recursividade', 'info');
      }
    });

    const optIgnoreDev = document.getElementById('optIgnoreDev');
    if (optIgnoreDev) optIgnoreDev.addEventListener('change', () => this.filterAndRender());

    const optShowPath = document.getElementById('optShowPath');
    if (optShowPath) optShowPath.addEventListener('change', () => this.renderCurrentView());

    const optShowSize = document.getElementById('optShowSize');
    if (optShowSize) optShowSize.addEventListener('change', () => this.renderCurrentView());

    // Tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetView = e.currentTarget.dataset.view;
        this.switchTab(targetView);
      });
    });

    // Text Format Selector inside Text Tab
    const textFormatSelect = document.getElementById('textFormatSelect');
    if (textFormatSelect) {
      textFormatSelect.addEventListener('change', (e) => {
        this.textFormat = e.target.value;
        this.renderTextView();
      });
    }
  }

  setupDragAndDrop() {
    const overlay = document.getElementById('dropzoneOverlay');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (overlay) overlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (overlay) overlay.classList.remove('active');
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (overlay) overlay.classList.remove('active');

      const items = e.dataTransfer && e.dataTransfer.items;
      if (!items || items.length === 0) return;

      this.setLoading(true, 'Lendo arquivos e pastas soltados...');
      try {
        const newFiles = [];
        const recursive = document.getElementById('optRecursive')?.checked ?? true;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.webkitGetAsEntry) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
              await this.traverseFileTree(entry, '', newFiles, recursive);
            }
          } else if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
              newFiles.push(this.createFileRecord(file.name, file.name, file.size, file.lastModified));
            }
          }
        }

        if (newFiles.length > 0) {
          this.allFiles = newFiles;
          this.isDemo = false;
          this.postScanSuccess();
        } else {
          this.showToast('Nenhum arquivo válido encontrado', 'error');
        }
      } catch (err) {
        console.error('Erro no drag & drop:', err);
        this.showToast('Erro ao processar arquivos arrastados', 'error');
      } finally {
        this.setLoading(false);
      }
    });
  }

  async traverseFileTree(item, path, fileArray, recursive) {
    path = path || '';
    if (item.isFile) {
      await new Promise((resolve) => {
        item.file((file) => {
          const fullPath = path ? `${path}/${file.name}` : file.name;
          fileArray.push(this.createFileRecord(file.name, fullPath, file.size, file.lastModified));
          resolve();
        }, () => resolve());
      });
    } else if (item.isDirectory && (recursive || !path)) {
      const dirReader = item.createReader();
      const readAllEntries = async () => {
        const entries = await new Promise((resolve) => {
          dirReader.readEntries(resolve, () => resolve([]));
        });
        if (entries.length > 0) {
          for (let i = 0; i < entries.length; i++) {
            await this.traverseFileTree(entries[i], path ? `${path}/${item.name}` : item.name, fileArray, recursive);
          }
          await readAllEntries();
        }
      };
      await readAllEntries();
    }
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+O or Cmd+O to open folder
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.handlePickFolder();
      }
      // Slash '/' to focus search when not in input
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
      }
      // Escape to clear search
      if (e.key === 'Escape' && document.activeElement.id === 'searchInput') {
        e.currentTarget.value = '';
        this.filterAndRender();
        document.activeElement.blur();
      }
    });
  }

  // ==========================================================================
  // DIRECTORY SCANNING ENGINES
  // ==========================================================================
  async handlePickFolder() {
    // Verifica suporte à moderna File System Access API
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        this.setLoading(true, 'Escaneando pasta e calculando tamanhos...');
        this.allFiles = [];
        this.isDemo = false;

        const recursive = document.getElementById('optRecursive')?.checked ?? true;
        await this.scanDirectoryHandle(dirHandle, '', recursive);

        this.setLoading(false);
        this.postScanSuccess();
      } catch (err) {
        this.setLoading(false);
        if (err.name !== 'AbortError') {
          console.warn('Erro com showDirectoryPicker, acionando fallback:', err);
          this.triggerFallbackInput();
        }
      }
    } else {
      // Fallback para navegadores sem showDirectoryPicker (Firefox, Safari, Mobile)
      this.triggerFallbackInput();
    }
  }

  triggerFallbackInput() {
    const input = document.getElementById('fallbackFolderInput');
    if (input) {
      input.click();
    } else {
      this.showToast('Nenhum método compatível de seleção de pasta disponível no navegador.', 'error');
    }
  }

  async handleFallbackInput(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    this.setLoading(true, `Processando ${files.length} arquivos...`);
    this.allFiles = [];
    this.isDemo = false;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const relPath = f.webkitRelativePath || f.name;
      this.allFiles.push(this.createFileRecord(f.name, relPath, f.size, f.lastModified));
    }

    this.setLoading(false);
    this.postScanSuccess();
    e.target.value = ''; // Reset input
  }

  async scanDirectoryHandle(dirHandle, path, recursive) {
    for await (const [name, handle] of dirHandle.entries()) {
      const currentPath = path ? `${path}/${name}` : name;

      if (handle.kind === 'file') {
        try {
          const file = await handle.getFile();
          this.allFiles.push(this.createFileRecord(name, currentPath, file.size, file.lastModified));
        } catch (e) {
          console.warn('Erro ao ler arquivo:', name, e);
        }
      } else if (handle.kind === 'directory' && recursive) {
        await this.scanDirectoryHandle(handle, currentPath, true);
      }
    }
  }

  createFileRecord(name, fullPath, size, lastModified) {
    const parts = fullPath.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    const ext = name.includes('.') && !name.startsWith('.') ? name.split('.').pop().toLowerCase() : '';
    const category = this.detectCategory(ext);

    return {
      name,
      path: fullPath,
      folder,
      size: Number(size) || 0,
      ext,
      category,
      lastModified: Number(lastModified) || Date.now(),
      dateFormatted: this.formatDate(lastModified)
    };
  }

  detectCategory(ext) {
    if (!ext) return 'other';
    for (const [cat, exts] of Object.entries(this.extMap)) {
      if (exts.includes(ext)) return cat;
    }
    return 'other';
  }

  postScanSuccess() {
    this.updateCategoryPills();
    this.updateExtensionDropdown();
    this.filterAndRender();
    this.updateKPIs();

    // Mostra seções
    document.getElementById('emptyState')?.classList.add('hidden');
    document.getElementById('mainContentArea')?.classList.remove('hidden');
    document.getElementById('statsOverview')?.classList.remove('hidden');
    document.getElementById('filterBar')?.classList.remove('hidden');
    document.getElementById('actionsRightGroup')?.classList.remove('hidden');

    this.showToast(`✨ ${this.allFiles.length} arquivos analisados com sucesso!`, 'success');
  }

  // ==========================================================================
  // FILTERS, SEARCH & SORTING PIPELINE
  // ==========================================================================
  filterAndRender() {
    const searchVal = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const extVal = (document.getElementById('extSelect')?.value || '').toLowerCase();
    const sortVal = document.getElementById('sortSelect')?.value || 'name-asc';
    const ignoreDev = document.getElementById('optIgnoreDev')?.checked ?? true;

    this.filteredFiles = this.allFiles.filter(file => {
      // Ignorar pastas de sistema/desenvolvimento
      if (ignoreDev) {
        const lowerPath = `/${file.path.toLowerCase()}/`;
        const isIgnored = this.ignoredPatterns.some(pat => lowerPath.includes(`/${pat}/`) || lowerPath.endsWith(`/${pat}/`));
        if (isIgnored) return false;
      }

      // Filtro de Categoria
      if (this.activeCategory !== 'all' && file.category !== this.activeCategory) {
        return false;
      }

      // Filtro de Extensão
      if (extVal && file.ext !== extVal) {
        return false;
      }

      // Filtro de Faixa de Tamanho
      if (this.activeSizeFilter !== 'all') {
        const s = file.size;
        if (this.activeSizeFilter === 'small' && s >= 100 * 1024) return false; // < 100 KB
        if (this.activeSizeFilter === 'medium' && (s < 100 * 1024 || s >= 10 * 1024 * 1024)) return false; // 100KB - 10MB
        if (this.activeSizeFilter === 'large' && (s < 10 * 1024 * 1024 || s >= 100 * 1024 * 1024)) return false; // 10MB - 100MB
        if (this.activeSizeFilter === 'huge' && s < 100 * 1024 * 1024) return false; // > 100 MB
      }

      // Busca por texto no nome ou caminho
      if (searchVal) {
        return file.name.toLowerCase().includes(searchVal) || file.path.toLowerCase().includes(searchVal);
      }

      return true;
    });

    // Ordenação
    this.sortFileList(this.filteredFiles, sortVal);

    // Atualiza contadores e renderiza a view ativa
    const countEl = document.getElementById('filterCountLabel');
    if (countEl) {
      countEl.textContent = `${this.filteredFiles.length} de ${this.allFiles.length} arquivos`;
    }

    this.renderCurrentView();
  }

  sortFileList(list, sortVal) {
    list.sort((a, b) => {
      switch (sortVal) {
        case 'name-asc': return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'name-desc': return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'size-desc': return b.size - a.size;
        case 'size-asc': return a.size - b.size;
        case 'date-desc': return b.lastModified - a.lastModified;
        case 'date-asc': return a.lastModified - b.lastModified;
        case 'ext-asc': return a.ext.localeCompare(b.ext);
        case 'path-asc': return a.path.localeCompare(b.path);
        default: return 0;
      }
    });
  }

  setCategoryFilter(cat) {
    this.activeCategory = cat;
    document.querySelectorAll('.pill-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === cat);
    });
    this.filterAndRender();
  }

  updateCategoryPills() {
    const counts = { all: this.allFiles.length };
    Object.keys(this.categoryIcons).forEach(k => {
      if (k !== 'all') counts[k] = 0;
    });

    this.allFiles.forEach(f => {
      if (counts[f.category] !== undefined) {
        counts[f.category]++;
      } else {
        counts.other = (counts.other || 0) + 1;
      }
    });

    const pillsContainer = document.getElementById('categoryPills');
    if (!pillsContainer) return;

    pillsContainer.innerHTML = Object.entries(this.categoryIcons).map(([cat, icon]) => {
      const count = counts[cat] || 0;
      const label = cat === 'all' ? 'Todos' :
                    cat === 'code' ? 'Código' :
                    cat === 'image' ? 'Imagens' :
                    cat === 'document' ? 'Documentos' :
                    cat === 'video' ? 'Vídeos' :
                    cat === 'audio' ? 'Áudio' :
                    cat === 'archive' ? 'Compactados' : 'Outros';
      const isActive = this.activeCategory === cat ? 'active' : '';

      return `
        <button type="button" class="pill-filter ${isActive}" data-category="${cat}" onclick="app.setCategoryFilter('${cat}')">
          <span>${icon}</span>
          <span>${label}</span>
          <span class="pill-count">${count}</span>
        </button>
      `;
    }).join('');
  }

  updateExtensionDropdown() {
    const select = document.getElementById('extSelect');
    if (!select) return;

    const extCounts = {};
    this.allFiles.forEach(f => {
      if (f.ext) extCounts[f.ext] = (extCounts[f.ext] || 0) + 1;
    });

    const sortedExts = Object.keys(extCounts).sort();
    select.innerHTML = '<option value="">Todas as Extensões</option>' +
      sortedExts.map(ext => `<option value="${ext}">.${ext} (${extCounts[ext]})</option>`).join('');
  }

  updateKPIs() {
    const totalFilesEl = document.getElementById('kpiTotalFiles');
    const totalSizeEl = document.getElementById('kpiTotalSize');
    const totalFoldersEl = document.getElementById('kpiTotalFolders');
    const totalTypesEl = document.getElementById('kpiTotalTypes');

    const totalBytes = this.allFiles.reduce((acc, f) => acc + f.size, 0);
    const uniqueFolders = new Set(this.allFiles.map(f => f.folder).filter(Boolean)).size;
    const uniqueExts = new Set(this.allFiles.map(f => f.ext).filter(Boolean)).size;

    if (totalFilesEl) totalFilesEl.textContent = this.allFiles.length.toLocaleString('pt-BR');
    if (totalSizeEl) totalSizeEl.textContent = this.formatSize(totalBytes);
    if (totalFoldersEl) totalFoldersEl.textContent = uniqueFolders.toLocaleString('pt-BR');
    if (totalTypesEl) totalTypesEl.textContent = `${uniqueExts} extensões`;

    // Atualiza barra de progresso de armazenamento
    this.renderStorageBar(totalBytes);
  }

  renderStorageBar(totalBytes) {
    const bar = document.getElementById('storageProgressBar');
    const legend = document.getElementById('storageBarLegend');
    if (!bar || !legend) return;

    if (totalBytes === 0) {
      bar.innerHTML = '<div class="storage-segment" style="width: 100%; background: #334155;"></div>';
      legend.innerHTML = '';
      return;
    }

    const catBytes = {};
    this.allFiles.forEach(f => {
      catBytes[f.category] = (catBytes[f.category] || 0) + f.size;
    });

    const segments = [];
    const legendItems = [];

    Object.entries(catBytes).sort((a, b) => b[1] - a[1]).forEach(([cat, bytes]) => {
      const pct = (bytes / totalBytes) * 100;
      if (pct > 0.5) {
        const color = this.categoryColors[cat] || '#94a3b8';
        const label = cat === 'code' ? 'Código' :
                      cat === 'image' ? 'Imagens' :
                      cat === 'document' ? 'Documentos' :
                      cat === 'video' ? 'Vídeos' :
                      cat === 'audio' ? 'Áudio' :
                      cat === 'archive' ? 'Compactados' : 'Outros';

        segments.push(`<div class="storage-segment" style="width: ${pct.toFixed(2)}%; background: ${color};" title="${label}: ${this.formatSize(bytes)} (${pct.toFixed(1)}%)"></div>`);
        legendItems.push(`
          <div class="flex items-center gap-1.5 text-xs text-slate-300">
            <span class="w-2.5 h-2.5 rounded-full" style="background: ${color};"></span>
            <span>${label} (${pct.toFixed(1)}%)</span>
          </div>
        `);
      }
    });

    bar.innerHTML = segments.join('');
    legend.innerHTML = legendItems.join('');
  }

  // ==========================================================================
  // VIEW SWITCHING & RENDERING
  // ==========================================================================
  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.view-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === tabName);
    });

    // Oculta todas as views
    ['viewList', 'viewTable', 'viewTree', 'viewInsights', 'viewText'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    const activeEl = document.getElementById(`view${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (activeEl) activeEl.classList.remove('hidden');

    this.renderCurrentView();
  }

  renderCurrentView() {
    if (this.allFiles.length === 0) return;

    switch (this.activeTab) {
      case 'list': this.renderListView(); break;
      case 'table': this.renderTableView(); break;
      case 'tree': this.renderTreeView(); break;
      case 'insights': this.renderInsightsView(); break;
      case 'text': this.renderTextView(); break;
    }
  }

  // 1. LIST VIEW
  renderListView() {
    const container = document.getElementById('viewList');
    if (!container) return;

    if (this.filteredFiles.length === 0) {
      container.innerHTML = this.getEmptyFilterTemplate();
      return;
    }

    const showPath = document.getElementById('optShowPath')?.checked ?? true;
    const showSize = document.getElementById('optShowSize')?.checked ?? true;

    container.innerHTML = `
      <div class="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        ${this.filteredFiles.map(f => `
          <div class="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/60 transition-all group">
            <span class="text-2xl">${this.categoryIcons[f.category] || '📄'}</span>
            <div class="flex-1 min-w-0">
              <div class="text-slate-100 font-medium truncate flex items-center gap-2">
                <span>${f.name}</span>
                ${f.ext ? `<span class="badge-tag badge-${f.category}">${f.ext}</span>` : ''}
              </div>
              <div class="text-xs text-slate-400 truncate mt-0.5">
                ${showPath ? f.path : (f.folder || 'raiz')}
              </div>
            </div>
            <div class="text-right">
              ${showSize ? `<div class="text-sm font-semibold text-slate-200">${this.formatSize(f.size)}</div>` : ''}
              <div class="text-xs text-slate-500">${f.dateFormatted}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 2. TABLE VIEW
  renderTableView() {
    const container = document.getElementById('viewTable');
    if (!container) return;

    if (this.filteredFiles.length === 0) {
      container.innerHTML = this.getEmptyFilterTemplate();
      return;
    }

    container.innerHTML = `
      <div class="max-h-[600px] overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl overflow-hidden">
        <table class="data-table">
          <thead>
            <tr>
              <th onclick="app.setSortColumn('name')" class="w-1/3">Nome Arquivo ↕</th>
              <th onclick="app.setSortColumn('path')" class="w-1/3">Caminho Relativo ↕</th>
              <th onclick="app.setSortColumn('ext')" class="w-24">Extensão ↕</th>
              <th onclick="app.setSortColumn('size')" class="w-32 text-right">Tamanho ↕</th>
              <th onclick="app.setSortColumn('date')" class="w-40 text-right">Modificado ↕</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredFiles.map(f => `
              <tr>
                <td>
                  <div class="flex items-center gap-2.5 truncate font-medium text-slate-100">
                    <span>${this.categoryIcons[f.category] || '📄'}</span>
                    <span class="truncate" title="${f.name}">${f.name}</span>
                  </div>
                </td>
                <td class="text-slate-400 font-mono text-xs truncate" title="${f.path}">${f.path}</td>
                <td><span class="badge-tag badge-${f.category}">${f.ext || '—'}</span></td>
                <td class="text-right font-medium text-slate-200">${this.formatSize(f.size)}</td>
                <td class="text-right text-xs text-slate-400">${f.dateFormatted}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  setSortColumn(col) {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;

    const currentVal = sortSelect.value;
    let nextVal = 'name-asc';

    if (col === 'name') nextVal = currentVal === 'name-asc' ? 'name-desc' : 'name-asc';
    else if (col === 'size') nextVal = currentVal === 'size-desc' ? 'size-asc' : 'size-desc';
    else if (col === 'date') nextVal = currentVal === 'date-desc' ? 'date-asc' : 'date-desc';
    else if (col === 'path') nextVal = 'path-asc';
    else if (col === 'ext') nextVal = 'ext-asc';

    sortSelect.value = nextVal;
    this.filterAndRender();
  }

  // 3. TREE VIEW (HIERARCHICAL FOLDER EXPLORER)
  renderTreeView() {
    const container = document.getElementById('viewTree');
    if (!container) return;

    if (this.filteredFiles.length === 0) {
      container.innerHTML = this.getEmptyFilterTemplate();
      return;
    }

    const treeData = this.buildTreeObject(this.filteredFiles);

    container.innerHTML = `
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-800 text-xs text-slate-400">
        <div class="flex gap-2">
          <button type="button" onclick="app.expandAllTreeFolders()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors">
            ➕ Expandir Tudo
          </button>
          <button type="button" onclick="app.collapseAllTreeFolders()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors">
            ➖ Recolher Tudo
          </button>
        </div>
        <span>Pastas interativas com pesos somados</span>
      </div>
      <div class="max-h-[580px] overflow-y-auto custom-scrollbar p-2 font-mono text-sm space-y-0.5" id="interactiveTreeContent">
        ${this.renderTreeHtmlNode(treeData, '/')}
      </div>
    `;
  }

  buildTreeObject(files) {
    const root = { name: '/', isDir: true, path: '/', children: {}, totalSize: 0, fileCount: 0 };

    files.forEach(file => {
      const parts = file.path.split('/');
      let curr = root;
      curr.totalSize += file.size;
      curr.fileCount++;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const subPath = parts.slice(0, i + 1).join('/');

        if (isFile) {
          curr.children[part] = {
            name: part,
            isDir: false,
            path: file.path,
            size: file.size,
            ext: file.ext,
            category: file.category
          };
        } else {
          if (!curr.children[part]) {
            curr.children[part] = {
              name: part,
              isDir: true,
              path: subPath,
              children: {},
              totalSize: 0,
              fileCount: 0
            };
          }
          curr.children[part].totalSize += file.size;
          curr.children[part].fileCount++;
          curr = curr.children[part];
        }
      }
    });

    return root;
  }

  renderTreeHtmlNode(node, currentPath, depth = 0) {
    const isRoot = node.name === '/';
    const keys = Object.keys(node.children || {}).sort((a, b) => {
      const itemA = node.children[a];
      const itemB = node.children[b];
      if (itemA.isDir && !itemB.isDir) return -1;
      if (!itemA.isDir && itemB.isDir) return 1;
      return a.localeCompare(b);
    });

    let html = '';

    if (!isRoot) {
      const isExpanded = this.expandedFolders.has(node.path);
      const indentPadding = depth * 18;

      html += `
        <div class="tree-dir-row" style="padding-left: ${indentPadding}px;" onclick="app.toggleTreeFolder('${node.path.replace(/'/g, "\\'")}')">
          <span class="tree-arrow ${isExpanded ? 'expanded' : ''}">▶</span>
          <span>${isExpanded ? '📂' : '📁'}</span>
          <span class="font-bold text-slate-100 flex-1 truncate">${node.name}</span>
          <span class="text-xs text-violet-400 font-semibold">${node.fileCount} itens</span>
          <span class="text-xs text-slate-400">(${this.formatSize(node.totalSize)})</span>
        </div>
      `;

      if (!isExpanded) return html;
    }

    keys.forEach(key => {
      const child = node.children[key];
      if (child.isDir) {
        html += this.renderTreeHtmlNode(child, child.path, isRoot ? depth : depth + 1);
      } else {
        const indentPadding = (isRoot ? depth : depth + 1) * 18 + 18;
        html += `
          <div class="tree-file-row" style="padding-left: ${indentPadding}px;">
            <span>${this.categoryIcons[child.category] || '📄'}</span>
            <span class="text-slate-200 flex-1 truncate">${child.name}</span>
            <span class="text-xs text-slate-400">${this.formatSize(child.size)}</span>
          </div>
        `;
      }
    });

    return html;
  }

  toggleTreeFolder(folderPath) {
    if (this.expandedFolders.has(folderPath)) {
      this.expandedFolders.delete(folderPath);
    } else {
      this.expandedFolders.add(folderPath);
    }
    this.renderTreeView();
  }

  expandAllTreeFolders() {
    this.allFiles.forEach(f => {
      const parts = f.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        this.expandedFolders.add(parts.slice(0, i).join('/'));
      }
    });
    this.expandedFolders.add('/');
    this.renderTreeView();
  }

  collapseAllTreeFolders() {
    this.expandedFolders.clear();
    this.expandedFolders.add('/');
    this.renderTreeView();
  }

  // 4. INSIGHTS & STORAGE DIAGNOSTICS VIEW
  renderInsightsView() {
    const container = document.getElementById('viewInsights');
    if (!container) return;

    // Top 10 maiores arquivos
    const sortedBySize = [...this.allFiles].sort((a, b) => b.size - a.size).slice(0, 10);
    const largestFileBytes = sortedBySize[0]?.size || 1;

    // Detecção de duplicatas (mesmo nome e mesmo tamanho)
    const seen = new Map();
    const duplicates = [];

    this.allFiles.forEach(f => {
      const key = `${f.name.toLowerCase()}:::${f.size}`;
      if (seen.has(key)) {
        duplicates.push({ original: seen.get(key), duplicate: f });
      } else {
        seen.set(key, f);
      }
    });

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top 10 Space Hogs -->
        <div class="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">🏆</span>
            <div>
              <h3 class="text-base font-bold text-white">Top 10 Maiores Arquivos</h3>
              <p class="text-xs text-slate-400">Arquivos que mais ocupam espaço no disco</p>
            </div>
          </div>
          <div class="space-y-3">
            ${sortedBySize.map((f, idx) => {
              const pct = ((f.size / largestFileBytes) * 100).toFixed(0);
              return `
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-medium text-slate-200 truncate pr-2">#${idx + 1} ${f.name}</span>
                    <span class="font-bold text-violet-400">${this.formatSize(f.size)}</span>
                  </div>
                  <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div class="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full" style="width: ${pct}%"></div>
                  </div>
                  <div class="text-[11px] text-slate-500 truncate mt-0.5 font-mono">${f.path}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Duplicates & Health -->
        <div class="space-y-6">
          <!-- Duplicates box -->
          <div class="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xl">🔍</span>
              <div>
                <h3 class="text-base font-bold text-white">Arquivos Idênticos / Duplicados</h3>
                <p class="text-xs text-slate-400">Detectados por correspondência de nome e tamanho exato</p>
              </div>
            </div>
            ${duplicates.length === 0 ? `
              <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <span>✅</span>
                <span>Nenhuma duplicata óbvia detectada nesta pasta!</span>
              </div>
            ` : `
              <div class="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                ${duplicates.map(d => `
                  <div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <div class="font-bold text-amber-300 flex items-center justify-between">
                      <span>⚠️ ${d.duplicate.name}</span>
                      <span>${this.formatSize(d.duplicate.size)}</span>
                    </div>
                    <div class="text-slate-400 truncate">1: ${d.original.path}</div>
                    <div class="text-slate-400 truncate">2: ${d.duplicate.path}</div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Quick Actions & Stats -->
          <div class="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
            <h3 class="text-base font-bold text-white mb-2">⚡ Ações de Otimização</h3>
            <p class="text-xs text-slate-400 mb-4">Exporte relatórios para auditar e limpar seu armazenamento.</p>
            <div class="flex flex-wrap gap-2">
              <button type="button" onclick="app.exportCSV()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all flex items-center gap-2">
                📑 Gerar Relatório de Auditoria (.CSV)
              </button>
              <button type="button" onclick="app.copyAIPrompt()" class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-all flex items-center gap-2">
                🤖 Copiar Diagnóstico para IA
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 5. TEXT / EXPORT OUTPUT VIEW
  renderTextView() {
    const container = document.getElementById('viewText');
    const textarea = document.getElementById('outputTextArea');
    if (!container || !textarea) return;

    let content = '';
    switch (this.textFormat) {
      case 'ascii-tree':
        content = this.generateAsciiTree();
        break;
      case 'ai-prompt':
        content = this.generateAIPrompt();
        break;
      case 'markdown':
        content = this.generateMarkdownTable();
        break;
      case 'csv':
        content = this.generateCSVContent();
        break;
      case 'json':
        content = JSON.stringify(this.filteredFiles, null, 2);
        break;
      case 'paths':
        content = this.filteredFiles.map(f => f.path).join('\n');
        break;
      case 'names':
        content = this.filteredFiles.map(f => f.name).join('\n');
        break;
      default:
        content = this.generateAsciiTree();
    }

    textarea.value = content;
  }

  // ==========================================================================
  // EXPORT BUILDERS (ASCII TREE, AI PROMPT, CSV, MARKDOWN, JSON)
  // ==========================================================================
  generateAsciiTree() {
    const tree = this.buildTreeObject(this.filteredFiles);
    const lines = [];
    const showSize = document.getElementById('optShowSize')?.checked ?? true;

    lines.push(`projeto/ (${this.formatSize(tree.totalSize)})`);

    const traverse = (node, prefix = '') => {
      const keys = Object.keys(node.children || {}).sort((a, b) => {
        const itemA = node.children[a];
        const itemB = node.children[b];
        if (itemA.isDir && !itemB.isDir) return -1;
        if (!itemA.isDir && itemB.isDir) return 1;
        return a.localeCompare(b);
      });

      keys.forEach((key, idx) => {
        const isLast = idx === keys.length - 1;
        const child = node.children[key];
        const connector = isLast ? '└── ' : '├── ';
        const sizeTag = showSize ? ` (${this.formatSize(child.isDir ? child.totalSize : child.size)})` : '';

        if (child.isDir) {
          lines.push(`${prefix}${connector}${child.name}/${sizeTag}`);
          traverse(child, prefix + (isLast ? '    ' : '│   '));
        } else {
          lines.push(`${prefix}${connector}${child.name}${sizeTag}`);
        }
      });
    };

    traverse(tree);
    return lines.join('\n');
  }

  generateAIPrompt() {
    const totalBytes = this.filteredFiles.reduce((acc, f) => acc + f.size, 0);
    const catCounts = {};
    this.filteredFiles.forEach(f => {
      catCounts[f.category] = (catCounts[f.category] || 0) + 1;
    });

    const catSummary = Object.entries(catCounts)
      .map(([cat, count]) => `${count} ${cat}`)
      .join(', ');

    const asciiTree = this.generateAsciiTree();

    return `# Contexto da Arquitetura do Projeto\n\n` +
      `Abaixo está a estrutura completa de arquivos do projeto para contextualizar nosso desenvolvimento:\n\n` +
      `### Resumo Geral:\n` +
      `- **Total de Arquivos:** ${this.filteredFiles.length}\n` +
      `- **Tamanho Total:** ${this.formatSize(totalBytes)}\n` +
      `- **Distribuição:** ${catSummary || 'arquivos diversos'}\n\n` +
      `### Árvore de Diretórios (Comando tree):\n` +
      `\`\`\`text\n${asciiTree}\n\`\`\`\n\n` +
      `---\n` +
      `*Prompt pronto para ser colado no ChatGPT, Claude, Gemini ou Cursor.*`;
  }

  generateCSVContent() {
    const headers = ['Nome', 'Caminho Relativo', 'Pasta', 'Extensão', 'Categoria', 'Tamanho Formatado', 'Bytes', 'Última Modificação'];
    const rows = this.filteredFiles.map(f => [
      `"${f.name.replace(/"/g, '""')}"`,
      `"${f.path.replace(/"/g, '""')}"`,
      `"${f.folder.replace(/"/g, '""')}"`,
      `"${f.ext}"`,
      `"${f.category}"`,
      `"${this.formatSize(f.size)}"`,
      f.size,
      `"${f.dateFormatted}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  }

  generateMarkdownTable() {
    const headers = '| Nome | Caminho | Categoria | Tamanho | Modificado |';
    const separator = '|:---|:---|:---:|---:|:---|';
    const rows = this.filteredFiles.map(f =>
      `| \`${f.name}\` | \`${f.path}\` | ${f.category} | ${this.formatSize(f.size)} | ${f.dateFormatted} |`
    );

    return [headers, separator, ...rows].join('\n');
  }

  // ==========================================================================
  // ACTION BUTTONS (COPY & DOWNLOAD)
  // ==========================================================================
  copyCurrentText() {
    const textarea = document.getElementById('outputTextArea');
    if (!textarea || !textarea.value) {
      this.showToast('Nenhum texto disponível para copiar', 'error');
      return;
    }

    navigator.clipboard.writeText(textarea.value).then(() => {
      this.showToast('📋 Copiado para a área de transferência!', 'success');
    }).catch(() => {
      this.showToast('Erro ao copiar texto', 'error');
    });
  }

  copyAIPrompt() {
    const prompt = this.generateAIPrompt();
    navigator.clipboard.writeText(prompt).then(() => {
      this.showToast('🤖 Prompt de IA copiado com sucesso!', 'success');
    }).catch(() => {
      this.showToast('Erro ao copiar prompt', 'error');
    });
  }

  copyAsciiTree() {
    const tree = this.generateAsciiTree();
    navigator.clipboard.writeText(tree).then(() => {
      this.showToast('🌲 Árvore ASCII copiada com sucesso!', 'success');
    }).catch(() => {
      this.showToast('Erro ao copiar árvore', 'error');
    });
  }

  exportCSV() {
    if (this.filteredFiles.length === 0) {
      this.showToast('Nenhum arquivo para exportar', 'error');
      return;
    }

    // UTF-8 BOM (\uFEFF) para garantir abertura sem erros de acentuação no Excel
    const csvContent = '\uFEFF' + this.generateCSVContent();
    this.downloadBlob(csvContent, 'lista-arquivos.csv', 'text/csv;charset=utf-8;');
    this.showToast('📑 Planilha CSV exportada com sucesso!', 'success');
  }

  exportJSON() {
    if (this.filteredFiles.length === 0) {
      this.showToast('Nenhum arquivo para exportar', 'error');
      return;
    }

    const data = JSON.stringify(this.filteredFiles, null, 2);
    this.downloadBlob(data, 'lista-arquivos.json', 'application/json');
    this.showToast('💾 Arquivo JSON exportado!', 'success');
  }

  exportMarkdown() {
    if (this.filteredFiles.length === 0) {
      this.showToast('Nenhum arquivo para exportar', 'error');
      return;
    }

    const md = this.generateMarkdownTable();
    this.downloadBlob(md, 'lista-arquivos.md', 'text/markdown;charset=utf-8;');
    this.showToast('📋 Arquivo Markdown exportado!', 'success');
  }

  downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearAll() {
    this.allFiles = [];
    this.filteredFiles = [];
    this.expandedFolders.clear();
    this.expandedFolders.add('/');

    document.getElementById('emptyState')?.classList.remove('hidden');
    document.getElementById('mainContentArea')?.classList.add('hidden');
    document.getElementById('statsOverview')?.classList.add('hidden');
    document.getElementById('filterBar')?.classList.add('hidden');
    document.getElementById('actionsRightGroup')?.classList.add('hidden');

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    const textarea = document.getElementById('outputTextArea');
    if (textarea) textarea.value = '';

    this.showToast('Lista limpa com sucesso', 'info');
  }

  // ==========================================================================
  // DEMO DATASET LOADER (TRY IN 1 CLICK)
  // ==========================================================================
  loadDemoDataset() {
    this.isDemo = true;
    const now = Date.now();
    const day = 86400000;

    const sample = [
      { p: 'package.json', s: 1420, d: now - day * 2 },
      { p: 'README.md', s: 5340, d: now - day * 1 },
      { p: '.env.example', s: 420, d: now - day * 10 },
      { p: 'tsconfig.json', s: 980, d: now - day * 15 },
      { p: 'vite.config.ts', s: 1250, d: now - day * 4 },
      { p: 'src/main.tsx', s: 2100, d: now - day * 1 },
      { p: 'src/App.tsx', s: 6400, d: now - day * 1 },
      { p: 'src/index.css', s: 3100, d: now - day * 3 },
      { p: 'src/components/Header.tsx', s: 4200, d: now - day * 2 },
      { p: 'src/components/Footer.tsx', s: 2800, d: now - day * 5 },
      { p: 'src/components/Sidebar.tsx', s: 5100, d: now - day * 2 },
      { p: 'src/components/DataTable.tsx', s: 9200, d: now - day * 1 },
      { p: 'src/hooks/useStorage.ts', s: 3400, d: now - day * 4 },
      { p: 'src/hooks/useAuth.ts', s: 4800, d: now - day * 3 },
      { p: 'src/utils/formatters.ts', s: 2300, d: now - day * 6 },
      { p: 'src/utils/analytics.ts', s: 3900, d: now - day * 7 },
      { p: 'src/services/api.ts', s: 7200, d: now - day * 2 },
      { p: 'public/favicon.ico', s: 15400, d: now - day * 30 },
      { p: 'public/logo.svg', s: 8400, d: now - day * 20 },
      { p: 'public/banner.webp', s: 245000, d: now - day * 10 },
      { p: 'public/icons/app-icon-512.png', s: 142000, d: now - day * 12 },
      { p: 'assets/video-demo.mp4', s: 8450000, d: now - day * 5 },
      { p: 'assets/soundtrack.mp3', s: 3200000, d: now - day * 14 },
      { p: 'docs/architecture.pdf', s: 1450000, d: now - day * 8 },
      { p: 'docs/api-spec.json', s: 34500, d: now - day * 4 },
      { p: 'backup/database-dump.sql', s: 12400000, d: now - day * 3 },
      { p: 'backup/assets-archive.zip', s: 18900000, d: now - day * 10 }
    ];

    this.allFiles = sample.map(item => {
      const name = item.p.split('/').pop();
      return this.createFileRecord(name, item.p, item.s, item.d);
    });

    this.postScanSuccess();
    this.showToast('🚀 Pasta de demonstração carregada com sucesso!', 'success');
  }

  // ==========================================================================
  // HELPERS & UI UTILITIES
  // ==========================================================================
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(timestamp) {
    if (!timestamp) return '—';
    const d = new Date(timestamp);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  setLoading(isLoading, text = 'Processando...') {
    const loadingEl = document.getElementById('loadingState');
    const loadingText = document.getElementById('loadingStateText');
    const pickBtn = document.getElementById('pickBtn');

    if (loadingEl) loadingEl.classList.toggle('hidden', !isLoading);
    if (loadingText) loadingText.textContent = text;
    if (pickBtn) pickBtn.disabled = isLoading;
  }

  getEmptyFilterTemplate() {
    return `
      <div class="py-16 text-center text-slate-500">
        <span class="text-4xl block mb-2">🔎</span>
        <p class="font-semibold text-slate-300">Nenhum arquivo corresponde aos filtros atuais</p>
        <p class="text-xs text-slate-500 mt-1">Tente limpar a pesquisa ou selecionar "Todas as Extensões".</p>
      </div>
    `;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const bgMap = {
      success: 'bg-emerald-600/90 border-emerald-500/30 text-white',
      error: 'bg-rose-600/90 border-rose-500/30 text-white',
      info: 'bg-slate-800/90 border-violet-500/40 text-slate-100'
    };
    const iconMap = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };

    toast.className = `toast-item ${bgMap[type] || bgMap.info} border backdrop-blur-md`;
    toast.innerHTML = `
      <span class="font-bold text-base">${iconMap[type] || '•'}</span>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3000);
  }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ListaFacilApp();
});
