/**
 * Facturación LLL - Controlador de la Cuadrícula Interactiva
 */

class GridController {
    constructor(containerId, kpisContainerId) {
        this.container = document.getElementById(containerId);
        this.kpisContainer = document.getElementById(kpisContainerId);
        this.data = [];          // Datos originales procesados
        this.filteredData = [];  // Datos después de búsqueda y filtros
        this.currentPage = 1;
        this.pageSize = 50;
        this.sortColumn = '';
        this.sortAsc = true;
        this.searchTerm = '';
        this.filters = {
            data1: '', // VENDOR
            season: '',
            status: ''  // STATUS calc
        };
        
        // Columnas a mostrar en la tabla
        this.columns = [
            { key: 'data1', label: 'DATA 1 (Vendedor)', editable: true, type: 'text' },
            { key: 'data2', label: 'DATA 2 (Status Envío)', editable: true, type: 'text' },
            { key: 'data3', label: 'DATA 3 (Marketing)', editable: true, type: 'text' },
            { key: 'cliente', label: 'CLIENTE', formulaKey: 'CLIENTE', locked: true },
            { key: 'vendorCalc', label: 'VENDOR ABR', formulaKey: 'VENDOR', locked: true },
            { key: 'season', label: 'Season', editable: true, type: 'text' },
            { key: 'programa', label: 'PROGRAMA', editable: true, type: 'text' },
            { key: 'op', label: 'OP', editable: true, type: 'number' },
            { key: 'estilo', label: 'ESTILO', editable: true, type: 'text' },
            { key: 'bordado', label: 'Bordado', formulaKey: 'Bordado', locked: true },
            { key: 'estampado', label: 'Estampado', formulaKey: 'Estampado', locked: true },
            { key: 'garmentDye', label: 'Garment Dye', editable: true, type: 'text' },
            { key: 'tela', label: 'TELA', editable: true, type: 'text' },
            { key: 'cantidad', label: 'CANTIDAD', editable: true, type: 'integer' },
            { key: 'precio', label: 'PRECIO $', editable: true, type: 'price' },
            { key: 'totalUs', label: 'Total US$', formulaKey: 'TotalUS', locked: true },
            { key: 'fechaDespacho', label: 'FECHA DESPACHO', editable: true, type: 'date' },
            { key: 'status', label: 'STATUS', formulaKey: 'STATUS', locked: true },
            { key: 'wk', label: 'Wk', formulaKey: 'Wk', locked: true },
            { key: 'month', label: 'MONTH', formulaKey: 'MONTH', locked: true },
            { key: 'year3', label: 'YEAR3', formulaKey: 'YEAR3', locked: true },
            { key: 'year4', label: 'YEAR4 (Margen)', editable: true, type: 'margin' }
        ];

        this.initTooltip();
    }

    /**
     * Inicializa el tooltip flotante para mostrar fórmulas
     */
    initTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'formula-tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);
        
        document.addEventListener('mousemove', (e) => {
            if (this.tooltip.style.display === 'block') {
                this.tooltip.style.left = (e.pageX + 15) + 'px';
                this.tooltip.style.top = (e.pageY + 15) + 'px';
            }
        });
    }

    /**
     * Establece los datos iniciales y recalcula las celdas de fórmula
     */
    setData(rows) {
        this.data = rows.map((row, idx) => {
            // Generar valores recalculados inicialmente
            return window.recalculateRow(row, idx + 2);
        });
        this.currentPage = 1;
        this.applyFilters();
    }

    /**
     * Aplica la búsqueda global y los filtros de columna
     */
    applyFilters() {
        this.filteredData = this.data.filter(row => {
            // 1. Búsqueda global
            if (this.searchTerm) {
                const searchLower = this.searchTerm.toLowerCase();
                const matchesSearch = Object.values(row).some(val => 
                    String(val || '').toLowerCase().includes(searchLower)
                );
                if (!matchesSearch) return false;
            }
            
            // 2. Filtro VENDOR (DATA 1)
            if (this.filters.data1 && row.data1 !== this.filters.data1) return false;
            
            // 3. Filtro Season
            if (this.filters.season && row.season !== this.filters.season) return false;
            
            // 4. Filtro STATUS
            if (this.filters.status && row.status !== this.filters.status) return false;

            return true;
        });

        // Aplicar ordenación si está definida
        if (this.sortColumn) {
            this.sortData(this.sortColumn, this.sortAsc, false);
        }

        this.render();
        this.updateKPIs();
        this.updateFilterDropdowns();
    }

    /**
     * Ordena los datos filtrados
     */
    sortData(columnKey, ascending = true, reRender = true) {
        this.sortColumn = columnKey;
        this.sortAsc = ascending;

        this.filteredData.sort((a, b) => {
            let valA = a[columnKey];
            let valB = b[columnKey];

            // Manejo de valores vacíos/null
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            // Comparación de números
            if (typeof valA === 'number' && typeof valB === 'number') {
                return ascending ? valA - valB : valB - valA;
            }

            // Comparación de cadenas de texto
            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            return ascending ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });

        if (reRender) {
            this.render();
        }
    }

    /**
     * Renderiza el listado de páginas, controles y el cuerpo de la tabla
     */
    render() {
        if (!this.container) return;
        
        if (this.data.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📂</div>
                    <h3>No hay datos importados</h3>
                    <p>Por favor, importa el archivo LLL Global Report (.xlsx) para comenzar a visualizar y gestionar la facturación.</p>
                </div>
            `;
            return;
        }

        const totalRows = this.filteredData.length;
        const totalPages = Math.ceil(totalRows / this.pageSize) || 1;
        
        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }
        
        const startIdx = (this.currentPage - 1) * this.pageSize;
        const endIdx = Math.min(startIdx + this.pageSize, totalRows);
        const pageRows = this.filteredData.slice(startIdx, endIdx);

        // Crear la estructura de la tabla
        let html = `
            <div class="table-actions-row">
                <div class="table-info-text">
                    Mostrando del <strong>${totalRows > 0 ? startIdx + 1 : 0}</strong> al <strong>${endIdx}</strong> de <strong>${totalRows}</strong> filas.
                </div>
                <div class="table-page-size-selector">
                    <span>Filas por página:</span>
                    <select id="grid-page-size">
                        <option value="25" ${this.pageSize === 25 ? 'selected' : ''}>25</option>
                        <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100</option>
                        <option value="200" ${this.pageSize === 200 ? 'selected' : ''}>200</option>
                    </select>
                </div>
            </div>
            
            <div class="table-responsive-wrapper">
                <table class="premium-table">
                    <thead>
                        <tr>
        `;

        // Cabeceras de columna con ordenación
        this.columns.forEach(col => {
            const isSorted = this.sortColumn === col.key;
            const sortIcon = isSorted ? (this.sortAsc ? ' 🔼' : ' 🔽') : '';
            const sortedClass = isSorted ? 'sorted' : '';
            
            html += `
                <th class="${sortedClass}" data-key="${col.key}">
                    <div class="th-content">
                        <span>${col.label}</span>
                        <span class="sort-icon">${sortIcon}</span>
                    </div>
                </th>
            `;
        });

        html += `
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Filas de la tabla
        pageRows.forEach((row, pIdx) => {
            const globalRowIdx = startIdx + pIdx; // Índice en filteredData
            const excelRowNumber = this.data.indexOf(row) + 2; // Fila real de Excel (comienza en A2)
            
            html += `<tr data-row-idx="${globalRowIdx}" data-excel-row="${excelRowNumber}">`;

            this.columns.forEach(col => {
                const val = row[col.key];
                let displayVal = val;
                let cellClass = '';
                let cellAttr = '';
                
                // Formatear valores especiales
                if (col.key === 'precio') {
                    displayVal = val !== null && val !== undefined ? `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : '';
                    cellClass = 'numeric-cell';
                } else if (col.key === 'totalUs') {
                    displayVal = val !== null && val !== undefined ? `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
                    cellClass = 'numeric-cell formula-cell';
                } else if (col.key === 'cantidad') {
                    displayVal = val !== null && val !== undefined ? Number(val).toLocaleString('en-US') : '';
                    cellClass = 'numeric-cell';
                } else if (col.key === 'year4') {
                    displayVal = val !== null && val !== undefined ? `${(Number(val) * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '';
                    cellClass = 'numeric-cell';
                } else if (col.locked) {
                    cellClass = 'formula-cell';
                }

                // Si está bloqueada/fórmula, agregar lock icon e indicar metadatos de tooltip
                if (col.locked) {
                    cellClass += ' locked-cell';
                    cellAttr = `data-formula="${col.formulaKey}" data-row-num="${excelRowNumber}"`;
                }

                html += `
                    <td class="${cellClass}" ${cellAttr} data-col-key="${col.key}">
                        <div class="td-content">
                            ${col.locked ? '<span class="lock-icon">🔒</span>' : ''}
                            <span class="cell-value-text">${displayVal !== null && displayVal !== undefined ? displayVal : ''}</span>
                        </div>
                    </td>
                `;
            });

            html += `</tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>
            
            <!-- Paginación -->
            <div class="pagination-container">
                <button class="pag-btn" id="pag-first" ${this.currentPage === 1 ? 'disabled' : ''}>« Primera</button>
                <button class="pag-btn" id="pag-prev" ${this.currentPage === 1 ? 'disabled' : ''}>‹ Anterior</button>
                
                <div class="pagination-pages">
        `;

        // Mostrar páginas resumidas
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let p = startPage; p <= endPage; p++) {
            html += `
                <button class="pag-page-btn ${this.currentPage === p ? 'active' : ''}" data-page="${p}">
                    ${p}
                </button>
            `;
        }

        html += `
                </div>
                
                <button class="pag-btn" id="pag-next" ${this.currentPage === totalPages ? 'disabled' : ''}>Siguiente ›</button>
                <button class="pag-btn" id="pag-last" ${this.currentPage === totalPages ? 'disabled' : ''}>Última »</button>
            </div>
        `;

        this.container.innerHTML = html;

        // Bindeos de eventos después de renderizar
        this.bindEvents();
    }

    /**
     * Bindea eventos del DOM de la tabla (ordenación, edición, tooltip, paginación)
     */
    bindEvents() {
        // 1. Evento de Ordenación al hacer click en cabeceras th
        this.container.querySelectorAll('thead th').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.getAttribute('data-key');
                const isCurrent = this.sortColumn === key;
                const newAsc = isCurrent ? !this.sortAsc : true;
                this.sortData(key, newAsc);
            });
        });

        // 2. Eventos de Tooltips en hover sobre celdas bloqueadas
        this.container.querySelectorAll('.locked-cell').forEach(cell => {
            cell.addEventListener('mouseenter', (e) => {
                const formulaKey = cell.getAttribute('data-formula');
                const rowNum = cell.getAttribute('data-row-num');
                const def = window.FormulaDefinitions[formulaKey];
                
                if (def) {
                    const compiledFormula = def.formula.replace(/{row}/g, rowNum);
                    this.tooltip.innerHTML = `
                        <div class="tooltip-title">Fórmula Excel</div>
                        <div class="tooltip-formula">${compiledFormula}</div>
                        <div class="tooltip-criteria-title">Criterio / Lógica</div>
                        <div class="tooltip-criteria">${def.criteria}</div>
                    `;
                    this.tooltip.style.display = 'block';
                }
            });

            cell.addEventListener('mouseleave', () => {
                this.tooltip.style.display = 'none';
            });
        });

        // 3. Edición en doble click en celdas editables (no locked)
        this.container.querySelectorAll('tbody td:not(.locked-cell)').forEach(td => {
            td.addEventListener('dblclick', () => {
                this.makeCellEditable(td);
            });
        });

        // 4. Paginación
        const selectPageSize = this.container.querySelector('#grid-page-size');
        if (selectPageSize) {
            selectPageSize.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value, 10);
                this.currentPage = 1;
                this.render();
            });
        }

        const btnFirst = this.container.querySelector('#pag-first');
        if (btnFirst) btnFirst.addEventListener('click', () => { this.currentPage = 1; this.render(); });
        
        const btnPrev = this.container.querySelector('#pag-prev');
        if (btnPrev) btnPrev.addEventListener('click', () => { if (this.currentPage > 1) { this.currentPage--; this.render(); } });
        
        const btnNext = this.container.querySelector('#pag-next');
        if (btnNext) btnNext.addEventListener('click', () => { 
            const totalPages = Math.ceil(this.filteredData.length / this.pageSize) || 1;
            if (this.currentPage < totalPages) { this.currentPage++; this.render(); } 
        });
        
        const btnLast = this.container.querySelector('#pag-last');
        if (btnLast) btnLast.addEventListener('click', () => { 
            const totalPages = Math.ceil(this.filteredData.length / this.pageSize) || 1;
            this.currentPage = totalPages; 
            this.render(); 
        });

        this.container.querySelectorAll('.pagination-pages button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPage = parseInt(btn.getAttribute('data-page'), 10);
                this.render();
            });
        });
    }

    /**
     * Transforma la celda en un input interactivo para editar su contenido
     */
    makeCellEditable(td) {
        if (td.classList.contains('editing')) return;
        
        td.classList.add('editing');
        const colKey = td.getAttribute('data-col-key');
        const colDef = this.columns.find(c => c.key === colKey);
        const tr = td.parentElement;
        const filteredRowIdx = parseInt(tr.getAttribute('data-row-idx'), 10);
        const excelRowNumber = parseInt(tr.getAttribute('data-excel-row'), 10);
        
        const rowData = this.filteredData[filteredRowIdx];
        const val = rowData[colKey];

        // Crear elemento input adecuado según el tipo
        let input;
        if (colDef.type === 'date') {
            input = document.createElement('input');
            input.type = 'date';
            input.value = val || '';
        } else if (colDef.type === 'integer' || colDef.type === 'number' || colDef.type === 'price' || colDef.type === 'margin') {
            input = document.createElement('input');
            input.type = 'number';
            input.step = colDef.type === 'price' || colDef.type === 'margin' ? '0.0001' : '1';
            input.value = val !== null && val !== undefined ? val : '';
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = val !== null && val !== undefined ? val : '';
        }

        input.className = 'grid-cell-input';
        
        // Reemplazar contenido de la celda
        const contentDiv = td.querySelector('.td-content');
        const valSpan = td.querySelector('.cell-value-text');
        valSpan.style.display = 'none';
        contentDiv.appendChild(input);
        input.focus();

        // Controladores para guardar cambios
        const saveChange = () => {
            let newVal = input.value;
            
            // Cast según el tipo de dato
            if (colDef.type === 'integer' || colDef.type === 'number') {
                newVal = parseInt(newVal, 10);
                if (isNaN(newVal)) newVal = 0;
            } else if (colDef.type === 'price' || colDef.type === 'margin') {
                newVal = parseFloat(newVal);
                if (isNaN(newVal)) newVal = 0;
            } else if (colDef.type === 'date') {
                // Mantener string YYYY-MM-DD
            }
            
            // Verificar si el valor realmente cambió
            if (rowData[colKey] !== newVal) {
                // 1. Guardar en el objeto original de datos
                rowData[colKey] = newVal;
                
                // 2. Recalcular la fila entera
                const updatedRow = window.recalculateRow(rowData, excelRowNumber);
                Object.assign(rowData, updatedRow); // Actualizar propiedades del objeto
                
                // 3. Destellar las celdas recalculadas en la UI
                // Actualizamos las celdas de la fila en el DOM actual
                this.columns.forEach(col => {
                    const cellToUpdate = tr.querySelector(`td[data-col-key="${col.key}"]`);
                    if (cellToUpdate) {
                        const cellValSpan = cellToUpdate.querySelector('.cell-value-text');
                        let displayVal = rowData[col.key];
                        
                        if (col.key === 'precio') {
                            displayVal = displayVal !== null ? `$${Number(displayVal).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : '';
                        } else if (col.key === 'totalUs') {
                            displayVal = displayVal !== null ? `$${Number(displayVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
                        } else if (col.key === 'cantidad') {
                            displayVal = displayVal !== null ? Number(displayVal).toLocaleString('en-US') : '';
                        } else if (col.key === 'year4') {
                            displayVal = displayVal !== null ? `${(Number(displayVal) * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '';
                        }

                        cellValSpan.textContent = displayVal !== null && displayVal !== undefined ? displayVal : '';
                        
                        // Si era una columna calculada por fórmula, destellamos con un highlight animado
                        if (col.locked) {
                            cellToUpdate.classList.add('cell-recalculated-flash');
                            setTimeout(() => {
                                cellToUpdate.classList.remove('cell-recalculated-flash');
                            }, 1000);
                        }
                    }
                });

                // 4. Actualizar tarjetas KPI globales
                this.updateKPIs();
            }

            // Restaurar celda
            input.remove();
            valSpan.style.display = 'block';
            td.classList.remove('editing');
            
            // Si la celda editada era DATA 1 o DATA 2 o DATA 3, o Fecha Despacho, que alteran texto/filtros, re-aplicar filtros
            if (colKey === 'data1' || colKey === 'data2' || colKey === 'data3' || colKey === 'fechaDespacho') {
                this.applyFilters();
            }
        };

        const cancelChange = () => {
            input.remove();
            valSpan.style.display = 'block';
            td.classList.remove('editing');
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveChange();
            } else if (e.key === 'Escape') {
                cancelChange();
            }
        });

        input.addEventListener('blur', () => {
            saveChange();
        });
    }

    /**
     * Calcula métricas globales de los registros filtrados y actualiza las tarjetas KPI
     */
    updateKPIs() {
        if (!this.kpisContainer) return;

        let totalQty = 0;
        let totalRevenue = 0;
        let totalOrders = this.filteredData.length;
        let sumMargin = 0;

        this.filteredData.forEach(row => {
            totalQty += parseInt(row.cantidad) || 0;
            totalRevenue += parseFloat(row.totalUs) || 0;
            sumMargin += parseFloat(row.year4) || 0;
        });

        const avgMargin = totalOrders > 0 ? (sumMargin / totalOrders) * 100 : 0;
        const avgPrice = totalQty > 0 ? totalRevenue / totalQty : 0;

        // Actualizar cards
        const qtyCardVal = this.kpisContainer.querySelector('#kpi-qty');
        const revCardVal = this.kpisContainer.querySelector('#kpi-revenue');
        const ordersCardVal = this.kpisContainer.querySelector('#kpi-orders');
        const marginCardVal = this.kpisContainer.querySelector('#kpi-margin');

        if (qtyCardVal) qtyCardVal.textContent = totalQty.toLocaleString('en-US');
        if (revCardVal) revCardVal.textContent = `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (ordersCardVal) ordersCardVal.textContent = totalOrders.toLocaleString('en-US');
        if (marginCardVal) marginCardVal.textContent = `${avgMargin.toFixed(2)}%`;
    }

    /**
     * Rellena dinámicamente los dropdowns de filtrado de columna con los valores únicos
     */
    updateFilterDropdowns() {
        // Encontrar selectores
        const selectVendor = document.getElementById('filter-vendor');
        const selectSeason = document.getElementById('filter-season');
        const selectStatus = document.getElementById('filter-status');

        if (!selectVendor || !selectSeason || !selectStatus) return;

        // Obtener valores seleccionados actuales
        const currentVendor = this.filters.data1;
        const currentSeason = this.filters.season;
        const currentStatus = this.filters.status;

        // Obtener listas ordenadas únicas basadas en data original completa
        const vendors = [...new Set(this.data.map(r => r.data1).filter(Boolean))].sort();
        const seasons = [...new Set(this.data.map(r => r.season).filter(Boolean))].sort();
        const statuses = [...new Set(this.data.map(r => r.status).filter(Boolean))].sort();

        // Rellenar Vendor
        selectVendor.innerHTML = `<option value="">Todos los Vendedores</option>` + 
            vendors.map(v => `<option value="${v}" ${v === currentVendor ? 'selected' : ''}>${v}</option>`).join('');

        // Rellenar Season
        selectSeason.innerHTML = `<option value="">Todas las Temporadas</option>` + 
            seasons.map(s => `<option value="${s}" ${s === currentSeason ? 'selected' : ''}>${s}</option>`).join('');

        // Rellenar Status
        selectStatus.innerHTML = `<option value="">Todos los Estados</option>` + 
            statuses.map(st => `<option value="${st}" ${st === currentStatus ? 'selected' : ''}>${st}</option>`).join('');
    }

    /**
     * Exporta la cuadrícula actual de vuelta a un archivo Excel (.xlsx) con fórmulas nativas vivas
     */
    exportToExcel() {
        if (this.data.length === 0) return;

        // 1. Crear nuevo libro Excel
        const wb = XLSX.utils.book_new();
        
        // 2. Construir la hoja Facturacion Template
        // Cabeceras en la fila 1
        const headers = this.columns.map(c => c.label);
        const ws_data = [headers];
        
        const dateToExcelSerial = (dateStr) => {
            if (!dateStr) return null;
            const parts = dateStr.split('-');
            if (parts.length !== 3) return null;
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            
            const utcDate = Date.UTC(y, m, d);
            const epoch = Date.UTC(1899, 11, 30);
            const diffMs = utcDate - epoch;
            return diffMs / (24 * 60 * 60 * 1000);
        };

        // Agregar las filas de datos con sus fórmulas
        this.data.forEach((row, idx) => {
            const excelRow = idx + 2; // Fila 2 de Excel
            
            const r_cols = [];
            this.columns.forEach(col => {
                // Si es celda de fórmula, creamos el formato de celda especial de SheetJS
                if (col.locked) {
                    const def = window.FormulaDefinitions[col.formulaKey];
                    // Reemplazar {row} con el número de fila real en Excel
                    const compiledFormula = def.formula.replace(/{row}/g, String(excelRow));
                    
                    // Quitar el '+' inicial si existe para compatibilidad de SheetJS
                    const cleanFormula = compiledFormula.startsWith('=+') ? compiledFormula.substring(2) : compiledFormula.substring(1);
                    
                    let cellVal = row[col.key];
                    let cellType = 'str'; // Use 'str' (formula string result) instead of 's' (shared string) for string formula values to prevent Excel XML validation errors
                    
                    if (typeof cellVal === 'number') {
                        cellType = 'n';
                    } else if (cellVal instanceof Date) {
                        cellType = 'd';
                    }
                    
                    if (cellVal === null || cellVal === undefined) {
                        cellVal = '';
                    }
                    
                    // Formatear Total US$ con máscara de moneda en la exportación
                    if (col.formulaKey === 'TotalUS') {
                        r_cols.push({
                            t: 'n',
                            v: cellVal || 0,
                            f: cleanFormula,
                            z: '$#,##0.00'
                        });
                    } else {
                        r_cols.push({
                            t: cellType,
                            v: cellVal,
                            f: cleanFormula
                        });
                    }
                } else {
                    // Valor directo (DATA 1, DATA 2, CANTIDAD, PRECIO, etc.)
                    let cellVal = row[col.key];
                    
                    if (col.key === 'fechaDespacho' && cellVal) {
                        const serial = dateToExcelSerial(cellVal);
                        if (serial !== null) {
                            r_cols.push({
                                t: 'n',
                                v: serial,
                                z: 'd-mmm-yy'
                            });
                            return;
                        }
                    }
                    
                    if (col.key === 'cantidad') {
                        r_cols.push({
                            t: 'n',
                            v: cellVal || 0,
                            z: '#,##0'
                        });
                        return;
                    }
                    
                    if (col.key === 'precio') {
                        r_cols.push({
                            t: 'n',
                            v: cellVal || 0,
                            z: '$#,##0.0000'
                        });
                        return;
                    }
                    
                    if (col.key === 'year4') {
                        r_cols.push({
                            t: 'n',
                            v: cellVal || 0,
                            z: '0.00%'
                        });
                        return;
                    }
                    
                    r_cols.push(cellVal);
                }
            });
            ws_data.push(r_cols);
        });

        // Generar worksheet a partir de la estructura
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Ajustar anchos de columna automáticamente
        const wscols = this.columns.map(() => ({ wch: 18 }));
        wscols[0] = { wch: 25 }; // DATA 1
        wscols[3] = { wch: 22 }; // CLIENTE
        wscols[8] = { wch: 25 }; // ESTILO
        wscols[12] = { wch: 30 }; // TELA
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Facturacion Template");
        
        // ----------------------------------------------------
        // 2b. Construir la hoja "Plantilla Luis"
        // ----------------------------------------------------
        const luisHeaders = [
            "Cliente", "Vendor", "Temporada", "Reserva o Programa", "OP", "Estilo", 
            "Bordado", "Estampado", "Garment Dye", "Tela", "Cantidad", "Precio FOB $", 
            "Total US$", "Fecha de Despacho", "Status", "Semana", "Mes", "Año", 
            "% Margen", "Total US$ Margen"
        ];
        
        const luisData = [luisHeaders];
        
        this.data.forEach((row, idx) => {
            const excelRow = idx + 2; // Fila 2 de Excel
            const r_cols = [];
            
            // 1. Cliente (Col A)
            r_cols.push(row.cliente || '');
            
            // 2. Vendor (Col B)
            r_cols.push(row.vendorCalc || '');
            
            // 3. Temporada (Col C)
            r_cols.push(row.season || '');
            
            // 4. Reserva o Programa (Col D)
            r_cols.push(row.programa || '');
            
            // 5. OP (Col E)
            r_cols.push(row.op ? Number(row.op) : 0);
            
            // 6. Estilo (Col F)
            r_cols.push(row.estilo || '');
            
            // 7. Bordado (Col G)
            r_cols.push(row.bordado || '');
            
            // 8. Estampado (Col H)
            r_cols.push(row.estampado || '');
            
            // 9. Garment Dye (Col I)
            r_cols.push(row.garmentDye || '');
            
            // 10. Tela (Col J)
            r_cols.push(row.tela || '');
            
            // 11. Cantidad (Col K)
            r_cols.push({
                t: 'n',
                v: row.cantidad || 0,
                z: '#,##0'
            });
            
            // 12. Precio FOB $ (Col L)
            r_cols.push({
                t: 'n',
                v: row.precio || 0,
                z: '$#,##0.0000'
            });
            
            // 13. Total US$ (Col M) -> Fórmula K*L
            r_cols.push({
                t: 'n',
                v: row.totalUs || 0,
                f: `K${excelRow}*L${excelRow}`,
                z: '$#,##0.00'
            });
            
            // 14. Fecha de Despacho (Col N)
            let dateSerial = null;
            if (row.fechaDespacho) {
                dateSerial = dateToExcelSerial(row.fechaDespacho);
            }
            if (dateSerial !== null) {
                r_cols.push({
                    t: 'n',
                    v: dateSerial,
                    z: 'd-mmm-yy'
                });
            } else {
                r_cols.push('');
            }
            
            // 15. Status (Col O)
            r_cols.push(row.status || '');
            
            // 16. Semana (Col P) -> Fórmula WEEKNUM(N)
            r_cols.push({
                t: 'n',
                v: row.wk || 0,
                f: `WEEKNUM(N${excelRow})`
            });
            
            // 17. Mes (Col Q) -> Fórmula TEXT(N, "MMMM")
            r_cols.push({
                t: 'str',
                v: row.month || '',
                f: `TEXT(N${excelRow},"MMMM")`
            });
            
            // 18. Año (Col R) -> Fórmula TEXT(N, "YYY")
            r_cols.push({
                t: 'str',
                v: row.year3 || '',
                f: `TEXT(N${excelRow},"YYY")`
            });
            
            // 19. % Margen (Col S)
            r_cols.push({
                t: 'n',
                v: row.year4 || 0,
                z: '0.00%'
            });
            
            // 20. Total US$ Margen (Col T) -> Fórmula M*S
            const marginValue = (row.totalUs || 0) * (row.year4 || 0);
            r_cols.push({
                t: 'n',
                v: marginValue,
                f: `M${excelRow}*S${excelRow}`,
                z: '$#,##0.00'
            });
            
            luisData.push(r_cols);
        });
        
        const ws2 = XLSX.utils.aoa_to_sheet(luisData);
        
        // Ajustar anchos de columna para "Plantilla Luis"
        const ws2cols = luisHeaders.map(() => ({ wch: 18 }));
        ws2cols[0] = { wch: 22 }; // Cliente
        ws2cols[5] = { wch: 25 }; // Estilo
        ws2cols[9] = { wch: 30 }; // Tela
        ws2['!cols'] = ws2cols;
        
        XLSX.utils.book_append_sheet(wb, ws2, "Plantilla Luis");
        
        // 3. Escribir y descargar el archivo
        XLSX.writeFile(wb, "Facturacion_Exportada.xlsx");
    }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridController;
} else {
    window.GridController = GridController;
}
