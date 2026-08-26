/**
 * Facturación LLL - Aplicación Principal e Interacciones de UI
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar el controlador de la cuadrícula
    const grid = new window.GridController('grid-container', 'kpi-cards-container');

    // 2. Elementos DOM de interacción general
    const fileInputGlobal = document.getElementById('file-input-global');
    const fileInputSdr = document.getElementById('file-input-sdr');
    const dragArea = document.getElementById('drag-drop-area');
    const loadingOverlay = document.getElementById('loading-overlay');
    const importView = document.getElementById('import-view');
    const dataView = document.getElementById('data-view');
    const sdrView = document.getElementById('sdr-view');
    const menuView = document.getElementById('menu-view');
    const headerActions = document.querySelector('.header-actions');
    const btnImportGlobal = document.getElementById('btn-import-global');
    const btnImportSdr = document.getElementById('btn-import-sdr');
    const importModeBadge = document.getElementById('import-mode-badge');
    const importTitle = dragArea ? dragArea.querySelector('h3') : null;
    const importDescription = dragArea ? dragArea.querySelector('p') : null;
    const importSelectLabel = null;
    const menuOptFacturacion = document.getElementById('menu-opt-facturacion');
    const menuOptDistribucion = document.getElementById('menu-opt-distribucion');
    const menuOptSeguimiento = document.getElementById('menu-opt-seguimiento');
    const menuOptStatus = document.getElementById('menu-opt-status');
    const searchInput = document.getElementById('global-search');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    const btnExportExcel = document.getElementById('btn-export');
    const btnReimport = document.getElementById('btn-reimport');
    const btnBackMenu = document.getElementById('btn-back-menu');
    const filterDistSeason = document.getElementById('filter-dist-season');
    const distCheckLll = document.getElementById('dist-check-lll');
    const distCheckExpo = document.getElementById('dist-check-expo');
    const distCheckPcp = document.getElementById('dist-check-pcp');

    const sdrController = window.SdrController
        ? new window.SdrController('sdr-grid-container', 'sdr-kpis-container')
        : null;

    // HOD filter (Excel-style panel)
    const hodFilterWrap = document.getElementById('status-hod-filter-wrap');
    const hodFilterToggleBtn = document.getElementById('btn-hod-filter-toggle');
    const hodFilterLabel = document.getElementById('hod-filter-label');
    const hodFilterPanel = document.getElementById('hod-filter-panel');
    const hodMonthSelect = document.getElementById('hod-month-select');
    const hodDateStart = document.getElementById('hod-date-start');
    const hodDateEnd = document.getElementById('hod-date-end');
    const hodFilterSummary = document.getElementById('hod-filter-summary');
    const hodSummaryTitle = document.getElementById('hod-summary-title');
    const hodSummaryDetail = document.getElementById('hod-summary-detail');
    const hodCheckAll = document.getElementById('hod-check-all');
    const hodCheckList = document.getElementById('hod-check-list');
    const btnHodAccept = document.getElementById('btn-hod-accept');
    const btnHodClear = document.getElementById('btn-hod-clear');

    let exportInProgress = false;
    let allHodOptions = [];
    let importMode = 'global';

    if (hodFilterToggleBtn) {
        hodFilterToggleBtn.setAttribute('aria-expanded', 'false');
        hodFilterToggleBtn.setAttribute('aria-controls', 'hod-filter-panel');
    }

    const headerBackMenu = document.createElement('button');
    headerBackMenu.type = 'button';
    headerBackMenu.className = 'btn-secondary header-back-btn hidden';
    headerBackMenu.innerHTML = '<span>🏠 Menú</span>';
    if (headerActions) {
        headerActions.appendChild(headerBackMenu);
    }

    // Selectores de filtros de columna
    const selectVendor = document.getElementById('filter-vendor');
    const selectSeason = document.getElementById('filter-season');
    const selectStatus = document.getElementById('filter-status');

    const toggleLoading = (show, message = 'Procesando archivo...') => {
        const textElement = loadingOverlay.querySelector('.loading-text');
        if (textElement) textElement.textContent = message;
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    };

    const updateExportButtonLabel = () => {
        const labelElement = btnExportExcel.querySelector('span');
        if (!labelElement) return;

        labelElement.textContent = grid.activeModule === 'distribucion'
            ? '📥 Exportar Excels'
            : grid.activeModule === 'status'
                ? '📥 Exportar Status'
            : grid.activeModule === 'seguimiento'
                ? '📥 Exportar Seguimiento'
            : '📥 Exportar a Excel';
    };

    // ─── HOD Filter helpers ────────────────────────────────────────────────

    const syncImportModeUi = () => {
        const isSdr = importMode === 'sdr';

        if (btnImportGlobal) btnImportGlobal.classList.toggle('active', !isSdr);
        if (btnImportSdr) btnImportSdr.classList.toggle('active', isSdr);
        if (btnImportGlobal) btnImportGlobal.setAttribute('aria-pressed', (!isSdr).toString());
        if (btnImportSdr) btnImportSdr.setAttribute('aria-pressed', isSdr.toString());
        if (importModeBadge) {
            importModeBadge.textContent = isSdr ? 'Modo activo: LLL SDR' : 'Modo activo: LLL Global';
        }
        if (importTitle) {
            importTitle.textContent = isSdr ? 'Importa tu reporte SDR' : 'Importa tu reporte global';
        }
        if (importDescription) {
            importDescription.innerHTML = isSdr
                ? 'Haz clic en <strong>Importar LLL SDR</strong> para abrir el selector, o arrastra y suelta tu archivo <strong>LLL SDR</strong> aquí.'
                : 'Haz clic en <strong>Importar LLL Global</strong> para abrir el selector, o arrastra y suelta tu archivo <strong>LLL Global Report.xlsx</strong> aquí.';
        }
    };

    const openImportPicker = (mode) => {
        importMode = mode === 'sdr' ? 'sdr' : 'global';
        syncImportModeUi();
        const activeInput = importMode === 'sdr' ? fileInputSdr : fileInputGlobal;
        if (activeInput) {
            activeInput.value = '';
            activeInput.click();
        }
    };

    const showInitialImportView = () => {
        if (menuView) menuView.classList.add('hidden');
        if (dataView) dataView.classList.add('hidden');
        if (sdrView) sdrView.classList.add('hidden');
        if (btnReimport) btnReimport.classList.add('hidden');
        if (headerBackMenu) headerBackMenu.classList.add('hidden');
        if (btnBackMenu) btnBackMenu.classList.add('hidden');
        if (importView) importView.classList.remove('hidden');
    };

    const showGlobalFlow = () => {
        if (sdrView) sdrView.classList.add('hidden');
        if (importView) importView.classList.add('hidden');
        if (menuView) menuView.classList.remove('hidden');
        if (dataView) dataView.classList.add('hidden');
        if (btnReimport) btnReimport.classList.remove('hidden');
        syncModuleView();
    };

    const showSdrFlow = () => {
        if (menuView) menuView.classList.add('hidden');
        if (dataView) dataView.classList.add('hidden');
        if (importView) importView.classList.add('hidden');
        if (sdrView) sdrView.classList.remove('hidden');
        if (btnReimport) btnReimport.classList.remove('hidden');
        if (headerBackMenu) headerBackMenu.classList.add('hidden');
        if (btnBackMenu) btnBackMenu.classList.add('hidden');
    };

    const formatIsoDateLabel = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const parts = raw.split('-');
        if (parts.length !== 3) return raw;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const getSelectedHodMonthValues = () => {
        if (!hodMonthSelect) return [];
        return Array.from(hodMonthSelect.selectedOptions || [])
            .map((opt) => String(opt.value || '').trim())
            .filter(Boolean);
    };

    const setSelectedHodMonthValues = (values = []) => {
        if (!hodMonthSelect) return;
        const selected = new Set(
            (Array.isArray(values) ? values : [values])
                .map((value) => String(value || '').trim())
                .filter(Boolean)
        );
        Array.from(hodMonthSelect.options).forEach((opt) => {
            opt.selected = selected.has(opt.value);
        });
    };

    const getHodRangeSelection = () => ({
        start: hodDateStart ? String(hodDateStart.value || '').trim() : '',
        end: hodDateEnd ? String(hodDateEnd.value || '').trim() : ''
    });

    const setHodRangeSelection = (start = '', end = '') => {
        if (hodDateStart) hodDateStart.value = start || '';
        if (hodDateEnd) hodDateEnd.value = end || '';
    };

    const syncHodFilterState = () => {
        if (!grid || !grid.filters) return;
        grid.filters.hodDates = getSelectedStatusHodValues();
        grid.filters.hodMonths = getSelectedHodMonthValues();
        const { start, end } = getHodRangeSelection();
        grid.filters.hodStartDate = start;
        grid.filters.hodEndDate = end;
    };

    const buildHodSummaryText = () => {
        const selectedDates = getSelectedStatusHodValues();
        if (selectedDates.length === 1) {
            const opt = allHodOptions.find((o) => o.value === selectedDates[0]);
            return opt ? opt.label : formatIsoDateLabel(selectedDates[0]);
        }
        if (selectedDates.length > 1) {
            return `${selectedDates.length} seleccionados`;
        }

        const { start, end } = getHodRangeSelection();
        if (start && end) {
            return `${formatIsoDateLabel(start)} - ${formatIsoDateLabel(end)}`;
        }
        if (start) {
            return `desde ${formatIsoDateLabel(start)}`;
        }
        if (end) {
            return `hasta ${formatIsoDateLabel(end)}`;
        }

        const selectedMonths = getSelectedHodMonthValues();
        if (selectedMonths.length === 1 && hodMonthSelect) {
            const opt = Array.from(hodMonthSelect.options).find((o) => o.value === selectedMonths[0]);
            return opt ? opt.textContent.trim() : selectedMonths[0];
        }
        if (selectedMonths.length > 1) {
            return `${selectedMonths.length} meses`;
        }

        return '';
    };

    const updateHodFilterSummary = () => {
        if (!hodFilterSummary && !hodSummaryTitle && !hodSummaryDetail) return;

        const selectedDates = getSelectedStatusHodValues();
        const selectedMonths = getSelectedHodMonthValues();
        const { start, end } = getHodRangeSelection();
        const hasSelection = selectedDates.length > 0 || selectedMonths.length > 0 || Boolean(start || end);

        if (hodFilterSummary) {
            hodFilterSummary.classList.toggle('is-active', hasSelection);
        }

        if (hodSummaryTitle) {
            hodSummaryTitle.textContent = buildHodSummaryText() || 'Selecciona meses o fechas';
        }

        if (hodSummaryDetail) {
            const detailParts = [];
            if (selectedDates.length > 0) {
                detailParts.push(`${selectedDates.length} fechas marcadas`);
            }
            if (selectedMonths.length > 0) {
                detailParts.push(`${selectedMonths.length} meses activos`);
            }
            if (start || end) {
                const rangeLabel = start && end
                    ? `${formatIsoDateLabel(start)} - ${formatIsoDateLabel(end)}`
                    : start
                        ? `desde ${formatIsoDateLabel(start)}`
                        : `hasta ${formatIsoDateLabel(end)}`;
                detailParts.push(`Rango: ${rangeLabel}`);
            }
            hodSummaryDetail.textContent = detailParts.length > 0
                ? detailParts.join(' · ')
                : 'Combina meses, rango y selección directa.';
        }
    };

    const updateKpiCardLabels = () => {
        if (!grid || !grid.kpisContainer) return;

        const labelNodes = Array.from(grid.kpisContainer.querySelectorAll('.kpi-info h4'));
        if (labelNodes.length === 0) return;

        const isHodModule = grid.activeModule === 'status' || grid.activeModule === 'seguimiento';
        const summary = isHodModule ? buildHodSummaryText() : '';
        const labels = isHodModule
            ? [
                summary ? `Cantidad HOD (${summary})` : 'Cantidad HOD',
                'Total facturado HOD',
                'Filas agrupadas HOD',
                'Margen promedio HOD'
            ]
            : [
                'Cantidad total',
                'Total facturado',
                'Filas agrupadas',
                'Margen promedio'
            ];

        labelNodes.forEach((node, index) => {
            if (labels[index]) {
                node.textContent = labels[index];
            }
        });
    };

    const updateHodFilterLabel = () => {
        if (!hodFilterLabel) return;

        syncHodFilterState();
        const selected = getSelectedStatusHodValues();
        const summary = buildHodSummaryText();

        if (selected.length === 0) {
            hodFilterLabel.textContent = summary ? `HOD: ${summary}` : 'HOD: Todos';
        } else if (selected.length === 1) {
            const opt = allHodOptions.find((o) => o.value === selected[0]);
            hodFilterLabel.textContent = `HOD: ${opt ? opt.label : selected[0]}`;
        } else {
            hodFilterLabel.textContent = `HOD: ${selected.length} seleccionados`;
        }

        updateHodFilterSummary();
        updateKpiCardLabels();
    };

    const updateHodCheckAllState = () => {
        if (!hodCheckAll || !hodCheckList) return;
        const visible = Array.from(
            hodCheckList.querySelectorAll('.hod-check-row:not(.hod-hidden) input[type="checkbox"]')
        );
        if (visible.length === 0) {
            hodCheckAll.checked = false;
            hodCheckAll.indeterminate = false;
            return;
        }
        const allChecked = visible.every((cb) => cb.checked);
        const someChecked = visible.some((cb) => cb.checked);
        hodCheckAll.checked = allChecked;
        hodCheckAll.indeterminate = someChecked && !allChecked;
    };

    const filterHodCheckList = () => {
        if (!hodCheckList) return;
        const monthValues = getSelectedHodMonthValues();
        const { start, end } = getHodRangeSelection();
        let rangeStart = start;
        let rangeEnd = end;

        if (rangeStart && rangeEnd && rangeStart > rangeEnd) {
            const temp = rangeStart;
            rangeStart = rangeEnd;
            rangeEnd = temp;
        }

        hodCheckList.querySelectorAll('.hod-check-row').forEach((row) => {
            const value = row.dataset.value || '';
            const matchMonth = monthValues.length === 0 || monthValues.some((monthValue) => value.substring(0, 7) === monthValue);
            const matchStart = !rangeStart || value >= rangeStart;
            const matchEnd = !rangeEnd || value <= rangeEnd;
            row.classList.toggle('hod-hidden', !(matchMonth && matchStart && matchEnd));
        });

        updateHodCheckAllState();
        updateHodFilterLabel();
    };

    const getSelectedStatusHodValues = () => {
        if (!hodCheckList) return [];
        return Array.from(hodCheckList.querySelectorAll('input[type="checkbox"]:checked'))
            .map((cb) => cb.value)
            .filter(Boolean);
    };

    const getVisibleStatusHodValues = () => {
        if (!hodCheckList) return [];
        return Array.from(hodCheckList.querySelectorAll('.hod-check-row:not(.hod-hidden) input[type="checkbox"]'))
            .map((cb) => cb.value)
            .filter(Boolean);
    };

    const getEffectiveStatusHodValues = () => {
        const selected = getSelectedStatusHodValues();
        if (selected.length > 0) {
            return selected;
        }
        return getVisibleStatusHodValues();
    };

    const setSelectedStatusHodValues = (values = []) => {
        if (!hodCheckList) return;
        const selected = new Set(
            (Array.isArray(values) ? values : [values])
                .map((v) => String(v || '').trim())
                .filter(Boolean)
        );
        hodCheckList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            cb.checked = selected.has(cb.value);
        });
        updateHodCheckAllState();
        updateHodFilterLabel();
    };

    const clearStatusHodSelection = () => {
        if (!hodCheckList) return;
        hodCheckList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            cb.checked = false;
        });
        if (hodCheckAll) {
            hodCheckAll.checked = false;
            hodCheckAll.indeterminate = false;
        }
        updateHodFilterLabel();
    };

    const closeHodPanel = () => {
        if (hodFilterToggleBtn) hodFilterToggleBtn.setAttribute('aria-expanded', 'false');
        if (hodFilterPanel) hodFilterPanel.classList.add('hidden');
    };

    const openHodPanel = () => {
        if (hodFilterToggleBtn) hodFilterToggleBtn.setAttribute('aria-expanded', 'true');
        if (hodFilterPanel) hodFilterPanel.classList.remove('hidden');
    };

    /**
     * Carga las fechas HOD disponibles para el filtro de Status.
     */
    const populateStatusHodFilter = () => {
        if (!hodCheckList) return;

        const currentValues = new Set(
            Array.isArray(grid.filters.hodDates) && grid.filters.hodDates.length > 0
                ? grid.filters.hodDates
                : getSelectedStatusHodValues()
        );
        const currentMonths = new Set(
            Array.isArray(grid.filters.hodMonths) && grid.filters.hodMonths.length > 0
                ? grid.filters.hodMonths
                : getSelectedHodMonthValues()
        );
        const currentRange = getHodRangeSelection();

        allHodOptions = typeof grid.getStatusHodOptions === 'function'
            ? grid.getStatusHodOptions()
            : [];

        if (allHodOptions.length === 0) {
            hodCheckList.innerHTML = '<div class="hod-empty">No hay fechas disponibles</div>';
            if (hodMonthSelect) {
                hodMonthSelect.innerHTML = '';
            }
            setHodRangeSelection(currentRange.start, currentRange.end);
            grid.filters.hodDates = [];
            grid.filters.hodMonths = [];
            grid.filters.hodStartDate = currentRange.start;
            grid.filters.hodEndDate = currentRange.end;
            updateKpiCardLabels();
            return;
        }

        // Populate month filter
        if (hodMonthSelect) {
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                                'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const months = new Map();
            allHodOptions.forEach((opt) => {
                const parts = opt.value.split('-');
                if (parts.length >= 2) {
                    const key = `${parts[0]}-${parts[1]}`;
                    if (!months.has(key)) {
                        const monthIdx = parseInt(parts[1], 10) - 1;
                        months.set(key, `${monthNames[monthIdx] || parts[1]} ${parts[0]}`);
                    }
                }
            });
            hodMonthSelect.innerHTML = [...months.entries()]
                .map(([k, v]) => `<option value="${k}">${v}</option>`)
                .join('');
            setSelectedHodMonthValues([...months.keys()].filter((k) => currentMonths.has(k)));
        }

        setHodRangeSelection(currentRange.start, currentRange.end);

        // Populate checkbox list
        hodCheckList.innerHTML = allHodOptions
            .map((opt) => `
                <label class="hod-check-row" data-value="${opt.value}" data-label="${opt.label}">
                    <input type="checkbox" class="hod-checkbox" value="${opt.value}">
                    <span>${opt.label}</span>
                </label>`)
            .join('');

        // Restore previous selection
        const nextValues = allHodOptions
            .map((o) => o.value)
            .filter((v) => currentValues.has(v));
        setSelectedStatusHodValues(nextValues);
        grid.filters.hodDates = nextValues;
        syncHodFilterState();
        filterHodCheckList();
    };

    /**
     * Carga los valores únicos de STATUS Season para el filtro de Distribución.
     */
    const populateDistributionStatusFilter = () => {
        if (!filterDistSeason) return;

        const options = typeof grid.getDistributionStatusSeasonOptions === 'function'
            ? grid.getDistributionStatusSeasonOptions()
            : [];

        filterDistSeason.innerHTML = options
            .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
            .join('');

        Array.from(filterDistSeason.options).forEach((opt) => {
            opt.selected = opt.value === 'produccion';
        });
    };

    /**
     * Sincroniza la visibilidad de la UI principal según el módulo activo.
     */
    const syncModuleView = () => {
        const isCompactModule = grid.activeModule === 'distribucion';
        const isStatusModule = grid.activeModule === 'status' || grid.activeModule === 'seguimiento';

        dataView.classList.toggle('distribution-mode', isCompactModule);
        dataView.classList.toggle('status-mode', isStatusModule);
        btnBackMenu.classList.toggle('hidden', isCompactModule);
        headerBackMenu.classList.toggle('hidden', !isCompactModule);
        const needsHodFilter = isStatusModule || grid.activeModule === 'seguimiento';
        if (hodFilterWrap) {
            hodFilterWrap.classList.toggle('hidden', !needsHodFilter);
        }
        if (needsHodFilter) {
            openHodPanel();
        } else {
            closeHodPanel();
        }

        updateKpiCardLabels();
    };

    const waitForPaint = () => new Promise((resolve) => setTimeout(resolve, 75));

    const requestFileProcessing = async (file, mode = importMode) => {
        if (!file) return;

        if (fileInputGlobal) fileInputGlobal.value = '';
        if (fileInputSdr) fileInputSdr.value = '';

        const activeMode = mode === 'sdr' ? 'sdr' : 'global';
        const modeLabel = activeMode === 'sdr' ? 'LLL SDR' : 'LLL Global';
        const confirmationMessage = `¿Deseas procesar el archivo "${file.name}" como ${modeLabel}?`;

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        await handleFile(file, activeMode);
    };

    const setExportBusyState = (isBusy, message) => {
        exportInProgress = isBusy;
        btnExportExcel.disabled = isBusy;
        btnExportExcel.setAttribute('aria-busy', isBusy ? 'true' : 'false');
        btnBackMenu.disabled = isBusy;
        if (btnReimport) btnReimport.disabled = isBusy;
        headerBackMenu.disabled = isBusy;
        if (hodFilterToggleBtn) hodFilterToggleBtn.disabled = isBusy;

        if (isBusy) {
            const labelElement = btnExportExcel.querySelector('span');
            if (labelElement) {
                labelElement.textContent = grid.activeModule === 'distribucion'
                    ? '⏳ Generando Excels...'
                    : grid.activeModule === 'status'
                        ? '⏳ Generando Production Status...'
                    : grid.activeModule === 'seguimiento'
                        ? '⏳ Generando Seguimiento...'
                    : '⏳ Exportando...';
            }
            toggleLoading(true, message);
            return;
        }

        toggleLoading(false);
        updateExportButtonLabel();
    };

    const runExportTask = async (message, action) => {
        if (exportInProgress) return;

        setExportBusyState(true, message);
        await waitForPaint();

        try {
            action();
        } catch (err) {
            console.error(err);
            alert(`Error al exportar los archivos Excel:\n${err.message}`);
        } finally {
            setExportBusyState(false);
        }
    };

    const openModuleView = async (moduleName) => {
        if (exportInProgress) return;

        const moduleLabel = moduleName === 'distribucion'
            ? 'Distribución'
            : moduleName === 'status'
                ? 'Status'
            : moduleName === 'seguimiento'
                ? 'Seguimiento'
                : 'Facturación';

        try {
            toggleLoading(true, `Cargando ${moduleLabel}...`);
            await waitForPaint();

            if (moduleName === 'status' || moduleName === 'seguimiento') {
                populateStatusHodFilter();
            }

            if (moduleName === 'distribucion') {
                populateDistributionStatusFilter();
            }

            grid.setActiveModule(moduleName);
            updateExportButtonLabel();
            syncModuleView();

            menuView.classList.add('hidden');
            dataView.classList.remove('hidden');

            grid.applyFilters();
        } catch (err) {
            console.error(err);
            alert(`No se pudo abrir el módulo ${moduleLabel}:\n${err.message}`);
            if (moduleName === 'status') {
                showMenuView();
            } else {
                menuView.classList.remove('hidden');
                dataView.classList.add('hidden');
            }
        } finally {
            toggleLoading(false);
        }
    };

    const handleFile = async (file, mode = importMode) => {
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'xlsx' && ext !== 'xls') {
            alert('Por favor, selecciona un archivo Excel válido (.xlsx o .xls).');
            return;
        }

        const activeMode = mode === 'sdr' ? 'sdr' : 'global';
        toggleLoading(true, activeMode === 'sdr' ? 'Leyendo archivo SDR...' : 'Leyendo archivo Excel...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;

                if (activeMode === 'sdr') {
                    toggleLoading(true, 'Analizando archivo SDR...');

                    if (!sdrController) {
                        throw new Error('El flujo SDR no esta disponible en esta version.');
                    }

                    const parsedRows = await sdrController.loadFromWorkbook(arrayBuffer);

                    if (parsedRows.length === 0) {
                        throw new Error('No se encontraron registros validos en el archivo SDR.');
                    }

                    sdrController.setData(parsedRows, file.name);
                    grid.data = [];
                    grid.filteredData = [];
                    showSdrFlow();
                } else {
                    toggleLoading(true, 'Analizando estructura y aplicando filtros (Status: Produccion)...');

                    const parsedRows = await window.ExcelParser.parseGlobalReport(arrayBuffer);

                    if (parsedRows.length === 0) {
                        throw new Error("No se encontraron registros de produccion validos para facturar en la hoja 'Global Report'.");
                    }

                    toggleLoading(true, 'Renderizando la cuadricula y calculando formulas...');
                    grid.setSourceArrayBuffer(arrayBuffer);
                    grid.filters.hodDates = [];
                    grid.filters.hodMonths = [];
                    grid.filters.hodStartDate = '';
                    grid.filters.hodEndDate = '';
                    setSelectedHodMonthValues([]);
                    setHodRangeSelection('', '');
                    clearStatusHodSelection();
                    allHodOptions = [];
                    populateStatusHodFilter();
                    grid.setActiveModule('facturacion');
                    updateExportButtonLabel();
                    syncModuleView();
                    grid.setData(parsedRows);

                    showGlobalFlow();
                }

            } catch (err) {
                console.error(err);
                alert(`Error al procesar el archivo Excel: \n${err.message}`);
            } finally {
                toggleLoading(false);
            }
        };

        reader.onerror = () => {
            toggleLoading(false);
            alert('Error de lectura del archivo local.');
        };

        reader.readAsArrayBuffer(file);
    };

    // ─── HOD panel events ──────────────────────────────────────────────────

    if (hodFilterToggleBtn) {
        hodFilterToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!hodFilterPanel) return;
            if (hodFilterPanel.classList.contains('hidden')) {
                openHodPanel();
            } else {
                closeHodPanel();
            }
        });
    }

    if (hodMonthSelect) {
        hodMonthSelect.addEventListener('change', () => {
            filterHodCheckList();
        });
    }

    if (hodDateStart) {
        hodDateStart.addEventListener('change', () => {
            filterHodCheckList();
        });
    }

    if (hodDateEnd) {
        hodDateEnd.addEventListener('change', () => {
            filterHodCheckList();
        });
    }

    if (hodCheckAll) {
        hodCheckAll.addEventListener('change', () => {
            if (!hodCheckList) return;
            const visible = hodCheckList.querySelectorAll(
                '.hod-check-row:not(.hod-hidden) input[type="checkbox"]'
            );
            visible.forEach((cb) => { cb.checked = hodCheckAll.checked; });
            updateHodCheckAllState();
            updateHodFilterLabel();
        });
    }

    if (hodCheckList) {
        hodCheckList.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                updateHodCheckAllState();
                updateHodFilterLabel();
            }
        });
    }

    if (btnHodAccept) {
        btnHodAccept.addEventListener('click', () => {
            const selected = getEffectiveStatusHodValues();
            syncHodFilterState();
            grid.filters.hodDates = selected;
            grid.currentPage = 1;
            grid.applyFilters();
            closeHodPanel();
        });
    }

    if (btnHodClear) {
        btnHodClear.addEventListener('click', () => {
            setSelectedHodMonthValues([]);
            setHodRangeSelection('', '');
            clearStatusHodSelection();
            grid.filters.hodDates = [];
            grid.filters.hodMonths = [];
            grid.filters.hodStartDate = '';
            grid.filters.hodEndDate = '';
            filterHodCheckList();
        });
    }

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (hodFilterWrap && !hodFilterWrap.contains(e.target)) {
            closeHodPanel();
        }
    });

    // ─── Eventos de Carga de Archivo ──────────────────────────────────────

    if (fileInputGlobal) {
        fileInputGlobal.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                requestFileProcessing(e.target.files[0], 'global');
            }
        });
    }

    if (fileInputSdr) {
        fileInputSdr.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                requestFileProcessing(e.target.files[0], 'sdr');
            }
        });
    }

    if (btnImportGlobal) {
        btnImportGlobal.addEventListener('click', () => {
            openImportPicker('global');
        });
    }

    if (btnImportSdr) {
        btnImportSdr.addEventListener('click', () => {
            openImportPicker('sdr');
        });
    }

    if (dragArea) {
        dragArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragArea.classList.add('dragover');
        });

        dragArea.addEventListener('dragleave', () => {
            dragArea.classList.remove('dragover');
        });

        dragArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dragArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                requestFileProcessing(e.dataTransfer.files[0], importMode);
            }
        });

        dragArea.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT') return;
            const activeInput = importMode === 'sdr' ? fileInputSdr : fileInputGlobal;
            if (activeInput) activeInput.click();
        });
    }

    // ─── Controles de la Tabla ────────────────────────────────────────────

    let searchDebounceTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            grid.searchTerm = e.target.value;
            grid.currentPage = 1;
            grid.applyFilters();
        }, 300);
    });

    selectVendor.addEventListener('change', (e) => {
        grid.filters.data1 = e.target.value;
        grid.currentPage = 1;
        grid.applyFilters();
    });

    selectSeason.addEventListener('change', (e) => {
        grid.filters.season = e.target.value;
        grid.currentPage = 1;
        grid.applyFilters();
    });

    selectStatus.addEventListener('change', (e) => {
        grid.filters.status = e.target.value;
        grid.currentPage = 1;
        grid.applyFilters();
    });

    btnResetFilters.addEventListener('click', () => {
        clearTimeout(searchDebounceTimeout);
        searchInput.value = '';
        selectVendor.value = '';
        selectSeason.value = '';
        selectStatus.value = '';
        setSelectedHodMonthValues([]);
        setHodRangeSelection('', '');
        clearStatusHodSelection();
        filterHodCheckList();

        grid.searchTerm = '';
        grid.filters.data1 = '';
        grid.filters.season = '';
        grid.filters.status = '';
        grid.filters.hodDates = [];
        grid.filters.hodMonths = [];
        grid.filters.hodStartDate = '';
        grid.filters.hodEndDate = '';
        grid.currentPage = 1;

        grid.applyFilters();
    });

    // ─── Exportación y Reinicio ───────────────────────────────────────────

    btnExportExcel.addEventListener('click', async () => {
        if (exportInProgress) return;

        if (grid.activeModule === 'distribucion') {
            const selectedStatuses = filterDistSeason
                ? Array.from(filterDistSeason.selectedOptions).map((opt) => opt.value).filter(Boolean)
                : [];
            const selectedModules = [
                distCheckLll && distCheckLll.checked ? 'LLL' : null,
                distCheckExpo && distCheckExpo.checked ? 'EXPO' : null,
                distCheckPcp && distCheckPcp.checked ? 'PCP' : null
            ].filter(Boolean);

            if (selectedModules.length === 0) {
                alert('Por favor selecciona al menos un archivo para generar.');
                return;
            }

            const countLabel = selectedModules.length === 1 ? '1 archivo' : `${selectedModules.length} archivos`;
            await runExportTask(`Generando ${countLabel} de Distribución...`, () => {
                grid.exportDistributionExcels({ statusSeasons: selectedStatuses, modules: selectedModules });
            });
            return;
        }

        if (grid.activeModule === 'status') {
            const selectedHodDates = getEffectiveStatusHodValues();
            syncHodFilterState();
            grid.filters.hodDates = selectedHodDates;

            await runExportTask('Generando Production Status...', () => {
                grid.exportStatusExcel({
                    hodDates: selectedHodDates,
                    hodMonths: grid.filters.hodMonths,
                    hodStartDate: grid.filters.hodStartDate,
                    hodEndDate: grid.filters.hodEndDate,
                    season: grid.filters.season,
                    vendor: grid.filters.data1,
                    status: grid.filters.status
                });
            });
            return;
        }

        if (grid.activeModule === 'seguimiento') {
            const selectedHodDates = getEffectiveStatusHodValues();
            syncHodFilterState();
            grid.filters.hodDates = selectedHodDates;

            await runExportTask('Generando Seguimiento...', () => {
                grid.exportSeguimientoExcel({
                    hodDates: selectedHodDates,
                    hodMonths: grid.filters.hodMonths,
                    hodStartDate: grid.filters.hodStartDate,
                    hodEndDate: grid.filters.hodEndDate,
                    season: grid.filters.season,
                    vendor: grid.filters.data1,
                    status: grid.filters.status
                });
            });
            return;
        }

        await runExportTask('Generando archivo(s) de Facturación...', () => {
            grid.exportToExcel();
        });
    });

    const showMenuView = () => {
        grid.setActiveModule('facturacion');
        updateExportButtonLabel();
        syncModuleView();
        dataView.classList.add('hidden');
        if (sdrView) sdrView.classList.add('hidden');
        menuView.classList.remove('hidden');
    };

    menuOptFacturacion.addEventListener('click', () => { openModuleView('facturacion'); });
    menuOptDistribucion.addEventListener('click', () => { openModuleView('distribucion'); });
    if (menuOptSeguimiento) menuOptSeguimiento.addEventListener('click', () => { openModuleView('seguimiento'); });
    menuOptStatus.addEventListener('click', () => { openModuleView('status'); });

    btnBackMenu.addEventListener('click', () => { showMenuView(); });
    headerBackMenu.addEventListener('click', () => { showMenuView(); });
    if (btnReimport) {
        btnReimport.addEventListener('click', () => {
            if (confirm('¿Deseas cargar un nuevo archivo? Se perderán los cambios no exportados.')) {
                clearTimeout(searchDebounceTimeout);
                if (fileInputGlobal) fileInputGlobal.value = '';
                if (fileInputSdr) fileInputSdr.value = '';
                searchInput.value = '';
                selectVendor.value = '';
                selectSeason.value = '';
                selectStatus.value = '';
                setSelectedHodMonthValues([]);
                setHodRangeSelection('', '');
                clearStatusHodSelection();
                closeHodPanel();

                grid.data = [];
                grid.filteredData = [];
                grid.searchTerm = '';
                grid.filters = {
                    data1: '',
                    season: '',
                    status: '',
                    hodDates: [],
                    hodMonths: [],
                    hodStartDate: '',
                    hodEndDate: ''
                };
                grid.setSourceArrayBuffer(null);
                if (sdrController) {
                    sdrController.clear();
                }
                allHodOptions = [];
                if (hodCheckList) hodCheckList.innerHTML = '';
                if (hodMonthSelect) hodMonthSelect.innerHTML = '';

                grid.setActiveModule('facturacion');
                updateExportButtonLabel();
                syncModuleView();
                importMode = 'global';
                syncImportModeUi();
                showInitialImportView();
            }
        });
    }

    syncImportModeUi();
    updateExportButtonLabel();
    syncModuleView();
    populateStatusHodFilter();
});
