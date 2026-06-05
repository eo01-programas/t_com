/**
 * Facturación LLL - Aplicación Principal e Interacciones de UI
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar el controlador de la cuadrícula
    const grid = new window.GridController('grid-container', 'kpi-cards-container');

    // 2. Elementos DOM de interacción general
    const fileInput = document.getElementById('excel-file-input');
    const dragArea = document.getElementById('drag-drop-area');
    const loadingOverlay = document.getElementById('loading-overlay');
    const importView = document.getElementById('import-view');
    const dataView = document.getElementById('data-view');
    const menuView = document.getElementById('menu-view');
    const headerActions = document.querySelector('.header-actions');
    const menuOptFacturacion = document.getElementById('menu-opt-facturacion');
    const menuOptDistribucion = document.getElementById('menu-opt-distribucion');
    const menuOptStatus = document.getElementById('menu-opt-status');
    const searchInput = document.getElementById('global-search');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    const btnExportExcel = document.getElementById('btn-export');
    const btnReimport = document.getElementById('btn-reimport');
    const btnBackMenu = document.getElementById('btn-back-menu');
    const selectStatusHod = document.getElementById('filter-status-hod');
    const statusHodHelp = document.getElementById('status-hod-help');
    const filterDistSeason = document.getElementById('filter-dist-season');
    const distCheckLll = document.getElementById('dist-check-lll');
    const distCheckExpo = document.getElementById('dist-check-expo');
    const distCheckPcp = document.getElementById('dist-check-pcp');
    let exportInProgress = false;

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

    /**
     * Muestra u oculta la pantalla de carga con texto descriptivo
     */
    const toggleLoading = (show, message = 'Procesando archivo...') => {
        const textElement = loadingOverlay.querySelector('.loading-text');
        if (textElement) textElement.textContent = message;
        
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    };

    /**
     * Actualiza el texto del botón de exportación según el módulo activo
     */
    const updateExportButtonLabel = () => {
        const labelElement = btnExportExcel.querySelector('span');
        if (!labelElement) return;

        labelElement.textContent = grid.activeModule === 'distribucion'
            ? '📥 Exportar Excels'
            : grid.activeModule === 'status'
                ? '📥 Exportar Status'
            : '📥 Exportar a Excel';
    };

    const getSelectedStatusHodValues = () => {
        if (!selectStatusHod) return [];

        return Array.from(selectStatusHod.selectedOptions || [])
            .map((option) => option.value)
            .filter(Boolean);
    };

    const setSelectedStatusHodValues = (values = []) => {
        if (!selectStatusHod) return;

        const selectedValues = new Set(
            (Array.isArray(values) ? values : [values])
                .map((value) => String(value || '').trim())
                .filter(Boolean)
        );

        Array.from(selectStatusHod.options).forEach((option) => {
            option.selected = selectedValues.has(option.value);
        });

        if (selectedValues.size === 0) {
            selectStatusHod.selectedIndex = -1;
        }
    };

    const clearStatusHodSelection = () => {
        if (!selectStatusHod) return;

        Array.from(selectStatusHod.options).forEach((option) => {
            option.selected = false;
        });

        selectStatusHod.selectedIndex = -1;
    };

    /**
     * Carga las fechas HOD disponibles para el filtro de Status.
     */
    const populateStatusHodFilter = () => {
        if (!selectStatusHod) return;

        const currentValues = new Set(
            Array.isArray(grid.filters.hodDates) && grid.filters.hodDates.length > 0
                ? grid.filters.hodDates
                : getSelectedStatusHodValues()
        );
        const options = typeof grid.getStatusHodOptions === 'function'
            ? grid.getStatusHodOptions()
            : [];

        if (options.length === 0) {
            selectStatusHod.innerHTML = '';
            selectStatusHod.disabled = true;
            clearStatusHodSelection();
            grid.filters.hodDates = [];
            return;
        }

        selectStatusHod.innerHTML = [
            ...options.map((option) => `<option value="${option.value}">${option.label}</option>`)
        ].join('');

        const nextValues = options
            .map((option) => option.value)
            .filter((value) => currentValues.has(value));

        setSelectedStatusHodValues(nextValues);
        grid.filters.hodDates = nextValues;
        selectStatusHod.disabled = false;
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
            .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
            .join('');

        Array.from(filterDistSeason.options).forEach(opt => {
            opt.selected = opt.value === 'produccion';
        });
    };

    /**
     * Sincroniza la visibilidad de la UI principal según el módulo activo.
     * Distribución y Status dejan visible solo el botón de exportación en el bloque principal.
     */
    const syncModuleView = () => {
        const isCompactModule = grid.activeModule === 'distribucion';
        const isStatusModule = grid.activeModule === 'status';

        dataView.classList.toggle('distribution-mode', isCompactModule);
        dataView.classList.toggle('status-mode', isStatusModule);
        btnBackMenu.classList.toggle('hidden', isCompactModule);
        headerBackMenu.classList.toggle('hidden', !isCompactModule);
        if (selectStatusHod) {
            selectStatusHod.classList.toggle('hidden', !isStatusModule);
        }
        if (statusHodHelp) {
            statusHodHelp.classList.toggle('hidden', !isStatusModule);
        }
    };

    /**
     * Espera un ciclo de render antes de ejecutar una tarea pesada.
     * Esto permite que el overlay de carga se pinte en pantalla.
     */
    const waitForPaint = () => new Promise((resolve) => setTimeout(resolve, 75));

    /**
     * Habilita o deshabilita el estado visual de exportación.
     */
    const setExportBusyState = (isBusy, message) => {
        exportInProgress = isBusy;
        btnExportExcel.disabled = isBusy;
        btnExportExcel.setAttribute('aria-busy', isBusy ? 'true' : 'false');
        btnBackMenu.disabled = isBusy;
        if (btnReimport) btnReimport.disabled = isBusy;
        headerBackMenu.disabled = isBusy;
        if (selectStatusHod) {
            selectStatusHod.disabled = isBusy || selectStatusHod.options.length === 0;
        }

        if (isBusy) {
            const labelElement = btnExportExcel.querySelector('span');
            if (labelElement) {
                labelElement.textContent = grid.activeModule === 'distribucion'
                    ? '⏳ Generando Excels...'
                    : grid.activeModule === 'status'
                        ? '⏳ Generando Production Status...'
                    : '⏳ Exportando...';
            }
            toggleLoading(true, message);
            return;
        }

        toggleLoading(false);
        updateExportButtonLabel();
    };

    /**
     * Ejecuta una exportación mostrando estado de carga.
     */
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

    /**
     * Abre un módulo mostrando primero una pantalla de carga visible.
     */
    const openModuleView = async (moduleName) => {
        if (exportInProgress) return;

        const moduleLabel = moduleName === 'distribucion'
            ? 'Distribución'
            : moduleName === 'status'
                ? 'Status'
                : 'Facturación';

        try {
            toggleLoading(true, `Cargando ${moduleLabel}...`);
            await waitForPaint();

            if (moduleName === 'status') {
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
            menuView.classList.remove('hidden');
            dataView.classList.add('hidden');
        } finally {
            toggleLoading(false);
        }
    };

    /**
     * Procesa el archivo Excel seleccionado
     */
    const handleFile = async (file) => {
        if (!file) return;
        
        // Verificar extensión
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'xlsx' && ext !== 'xls') {
            alert('Por favor, selecciona un archivo Excel válido (.xlsx o .xls).');
            return;
        }

        toggleLoading(true, 'Leyendo archivo Excel...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                toggleLoading(true, 'Analizando estructura y aplicando filtros (Status: Producción)...');
                const arrayBuffer = e.target.result;
                
                // Procesar reporte global con ExcelParser
                const parsedRows = await window.ExcelParser.parseGlobalReport(arrayBuffer);
                
                if (parsedRows.length === 0) {
                    throw new Error("No se encontraron registros de producción válidos para facturar en la hoja 'LLL GR.'.");
                }

                // Cargar datos en la cuadrícula
                toggleLoading(true, 'Renderizando la cuadrícula y calculando fórmulas...');
                grid.setSourceArrayBuffer(arrayBuffer);
                populateStatusHodFilter();
                grid.setActiveModule('facturacion');
                updateExportButtonLabel();
                syncModuleView();
                grid.setData(parsedRows);
                
                // Cambiar vistas a Menú Principal
                importView.classList.add('hidden');
                menuView.classList.remove('hidden');
                if (btnReimport) btnReimport.classList.remove('hidden');
                
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

    // --- Eventos de Carga de Archivo (Input / Drag & Drop) ---
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Efectos visuales de drag & drop
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
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // --- Controles de la Tabla (Búsqueda y Filtros) ---

    // Búsqueda global (con debounce)
    let searchDebounceTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            grid.searchTerm = e.target.value;
            grid.currentPage = 1; // Volver a la página 1
            grid.applyFilters();
        }, 300);
    });

    // Filtros por columnas específicas
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

    if (selectStatusHod) {
        selectStatusHod.addEventListener('change', () => {
            grid.filters.hodDates = getSelectedStatusHodValues();
            grid.currentPage = 1;
            grid.applyFilters();
        });
    }

    // Restablecer todos los filtros
    btnResetFilters.addEventListener('click', () => {
        clearTimeout(searchDebounceTimeout);
        searchInput.value = '';
        selectVendor.value = '';
        selectSeason.value = '';
        selectStatus.value = '';
        clearStatusHodSelection();
        
        grid.searchTerm = '';
        grid.filters.data1 = '';
        grid.filters.season = '';
        grid.filters.status = '';
        grid.filters.hodDates = [];
        grid.currentPage = 1;
        
        grid.applyFilters();
    });

    // --- Exportación y Reinicio ---
    btnExportExcel.addEventListener('click', async () => {
        if (exportInProgress) return;

        if (grid.activeModule === 'distribucion') {
            const selectedStatuses = filterDistSeason
                ? Array.from(filterDistSeason.selectedOptions).map(opt => opt.value).filter(Boolean)
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
            const selectedHodDates = getSelectedStatusHodValues();
            grid.filters.hodDates = selectedHodDates;

            await runExportTask('Generando Production Status...', () => {
                grid.exportStatusExcel({
                    hodDates: selectedHodDates,
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

    /**
     * Abre el menú principal y limpia el estado de módulo activo.
     */
    const showMenuView = () => {
        grid.setActiveModule('facturacion');
        updateExportButtonLabel();
        syncModuleView();
        dataView.classList.add('hidden');
        menuView.classList.remove('hidden');
    };

    // Navegación desde el menú a la cuadrícula de Facturación
    menuOptFacturacion.addEventListener('click', () => {
        openModuleView('facturacion');
    });

    // Navegación desde el menú a la cuadrícula de Distribución
    menuOptDistribucion.addEventListener('click', () => {
        openModuleView('distribucion');
    });

    // Navegación desde el menú a la pantalla de Status
    menuOptStatus.addEventListener('click', () => {
        openModuleView('status');
    });

    // Navegación de regreso desde la cuadrícula al menú de módulos
    btnBackMenu.addEventListener('click', () => {
        showMenuView();
    });

    headerBackMenu.addEventListener('click', () => {
        showMenuView();
    });

    if (btnReimport) {
        btnReimport.addEventListener('click', () => {
            if (confirm('¿Deseas subir un nuevo archivo global? Se perderán los cambios no exportados.')) {
                clearTimeout(searchDebounceTimeout);
                fileInput.value = '';
                searchInput.value = '';
                selectVendor.value = '';
                selectSeason.value = '';
                selectStatus.value = '';
                clearStatusHodSelection();

                grid.data = [];
                grid.filteredData = [];
                grid.searchTerm = '';
                grid.filters = { data1: '', season: '', status: '', hodDates: [] };
                grid.setSourceArrayBuffer(null);
                if (selectStatusHod) {
                    selectStatusHod.innerHTML = '';
                    selectStatusHod.disabled = true;
                }
                grid.setActiveModule('facturacion');
                updateExportButtonLabel();
                syncModuleView();

                btnReimport.classList.add('hidden');
                dataView.classList.add('hidden');
                menuView.classList.add('hidden');
                importView.classList.remove('hidden');
            }
        });
    }

    updateExportButtonLabel();
    syncModuleView();
    populateStatusHodFilter();
});
