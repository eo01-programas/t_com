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
    const searchInput = document.getElementById('global-search');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    const btnExportExcel = document.getElementById('btn-export');
    const btnNewImport = document.getElementById('btn-new-import');

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
                grid.setData(parsedRows);
                
                // Cambiar vistas
                importView.classList.add('hidden');
                dataView.classList.remove('hidden');
                
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

    // Restablecer todos los filtros
    btnResetFilters.addEventListener('click', () => {
        searchInput.value = '';
        selectVendor.value = '';
        selectSeason.value = '';
        selectStatus.value = '';
        
        grid.searchTerm = '';
        grid.filters.data1 = '';
        grid.filters.season = '';
        grid.filters.status = '';
        grid.currentPage = 1;
        
        grid.applyFilters();
    });

    // --- Exportación y Reinicio ---
    btnExportExcel.addEventListener('click', () => {
        grid.exportToExcel();
    });

    btnNewImport.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas importar otro archivo? Se perderán los cambios no exportados.')) {
            // Limpiar inputs
            fileInput.value = '';
            searchInput.value = '';
            selectVendor.value = '';
            selectSeason.value = '';
            selectStatus.value = '';
            
            grid.data = [];
            grid.filteredData = [];
            grid.searchTerm = '';
            grid.filters = { data1: '', season: '', status: '' };
            
            // Volver a vista de importación
            dataView.classList.add('hidden');
            importView.classList.remove('hidden');
        }
    });
});
