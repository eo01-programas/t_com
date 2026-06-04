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
            status: '',  // STATUS calc
            hodDates: []
        };
        this.activeModule = 'facturacion';
        this.sourceArrayBuffer = null;
        
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

    renderStatusBadge(value) {
        if (!value) return '';
        const n = String(value).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        let cls = 'neutral';
        if (n.includes('producci') || n === 'produccion') cls = 'produccion';
        else if (n.includes('factur')) cls = 'facturado';
        else if (n.includes('cancel')) cls = 'cancelado';
        else if (n.includes('pend') || n.includes('hold')) cls = 'pendiente';
        return `<span class="status-badge ${cls}">${value}</span>`;
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
     * Guarda el archivo fuente completo para exportaciones específicas por módulo
     */
    setSourceArrayBuffer(arrayBuffer) {
        this.sourceArrayBuffer = arrayBuffer || null;
    }

    /**
     * Cambia el módulo activo de trabajo/exportación
     */
    setActiveModule(moduleName) {
        if (moduleName === 'distribucion' || moduleName === 'status') {
            this.activeModule = moduleName;
            return;
        }

        this.activeModule = 'facturacion';
    }

    /**
     * Normaliza texto para comparaciones sin depender de mayúsculas, acentos o saltos de línea.
     */
    normalizeText(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .toLowerCase()
            .replace(/\r?\n|\r/g, ' ')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    /**
     * Convierte una fecha de Excel o JS a UTC y la deja en formato ISO.
     */
    parseDateToUtc(dateValue) {
        if (!dateValue && dateValue !== 0) return null;

        if (dateValue instanceof Date) {
            if (isNaN(dateValue.getTime())) return null;
            return new Date(Date.UTC(
                dateValue.getUTCFullYear(),
                dateValue.getUTCMonth(),
                dateValue.getUTCDate()
            ));
        }

        if (typeof dateValue === 'number') {
            const epoch = Date.UTC(1899, 11, 30);
            return new Date(epoch + Math.round(dateValue) * 24 * 60 * 60 * 1000);
        }

        if (typeof dateValue === 'string') {
            const trimmed = dateValue.trim();
            if (!trimmed) return null;

            const parts = trimmed.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);

                if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
                    return new Date(Date.UTC(y, m, d));
                }
            }

            const parsed = new Date(trimmed);
            if (!isNaN(parsed.getTime())) {
                return new Date(Date.UTC(
                    parsed.getUTCFullYear(),
                    parsed.getUTCMonth(),
                    parsed.getUTCDate()
                ));
            }
        }

        return null;
    }

    /**
     * Convierte una fecha a serial de Excel.
     */
    dateToExcelSerial(dateValue) {
        const parsedDate = this.parseDateToUtc(dateValue);
        if (!parsedDate) return null;

        const epoch = Date.UTC(1899, 11, 30);
        const diffMs = parsedDate.getTime() - epoch;
        return diffMs / (24 * 60 * 60 * 1000);
    }

    /**
     * Convierte una fecha a YYYY-MM-DD para usarla como llave de filtro.
     */
    dateToIsoDate(dateValue) {
        const parsedDate = this.parseDateToUtc(dateValue);
        if (!parsedDate) return '';

        const yyyy = parsedDate.getUTCFullYear();
        const mm = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(parsedDate.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * Convierte una fecha a etiqueta legible dd/mm/yyyy.
     */
    formatDateLabel(dateValue) {
        const parsedDate = this.parseDateToUtc(dateValue);
        if (!parsedDate) return '';

        const dd = String(parsedDate.getUTCDate()).padStart(2, '0');
        const mm = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = parsedDate.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
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

            // 5. Filtro HOD solo en el módulo de Status
            if (this.activeModule === 'status' && Array.isArray(this.filters.hodDates) && this.filters.hodDates.length > 0) {
                if (!this.filters.hodDates.includes(String(row.fechaDespacho || '').trim())) return false;
            }

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
                } else if (col.key === 'status') {
                    displayVal = val ? this.renderStatusBadge(val) : '';
                    cellClass = 'formula-cell';
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

                        if (col.key === 'status') {
                            cellValSpan.innerHTML = this.renderStatusBadge(rowData[col.key]);
                        } else {
                            cellValSpan.textContent = displayVal !== null && displayVal !== undefined ? displayVal : '';
                        }

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
     * Devuelve una paleta de estilos reutilizable para exportes Excel.
     */
    getExcelTheme() {
        const borderColor = { rgb: 'C8D8BD' };
        const textColor = { rgb: '2F3B2F' };
        const altFillColor = { rgb: 'F9FBF5' };
        const headerFillColor = { rgb: 'DDECCD' };

        const border = {
            top: { style: 'thin', color: borderColor },
            bottom: { style: 'thin', color: borderColor },
            left: { style: 'thin', color: borderColor },
            right: { style: 'thin', color: borderColor }
        };

        return {
            header: {
                font: { bold: true, color: textColor, sz: 11 },
                fill: { patternType: 'solid', fgColor: headerFillColor },
                border: border,
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
            },
            body: {
                font: { color: textColor, sz: 10 },
                fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
                border: border,
                alignment: { vertical: 'center' }
            },
            bodyAlt: {
                font: { color: textColor, sz: 10 },
                fill: { patternType: 'solid', fgColor: altFillColor },
                border: border,
                alignment: { vertical: 'center' }
            },
            formula: {
                font: { color: { rgb: '5A5010' }, sz: 10, italic: true },
                fill: { patternType: 'solid', fgColor: { rgb: 'FDFBE6' } },
                border: border,
                alignment: { vertical: 'center' }
            },
            formulaAlt: {
                font: { color: { rgb: '5A5010' }, sz: 10, italic: true },
                fill: { patternType: 'solid', fgColor: { rgb: 'F5F2D5' } },
                border: border,
                alignment: { vertical: 'center' }
            }
        };
    }

    /**
     * Combina dos objetos de estilo de Excel sin perder las secciones anidadas.
     */
    mergeExcelStyle(baseStyle, extraStyle) {
        const base = baseStyle || {};
        const extra = extraStyle || {};
        return {
            ...base,
            ...extra,
            font: { ...(base.font || {}), ...(extra.font || {}) },
            fill: { ...(base.fill || {}), ...(extra.fill || {}) },
            border: { ...(base.border || {}), ...(extra.border || {}) },
            alignment: { ...(base.alignment || {}), ...(extra.alignment || {}) }
        };
    }

    /**
     * Aplica un formato visual consistente a una hoja Excel exportada.
     */
    applyExcelTheme(ws, options = {}) {
        if (!ws || !ws['!ref']) return;

        const theme = this.getExcelTheme();
        const range = XLSX.utils.decode_range(ws['!ref']);
        const headerRows = Math.max(1, options.headerRows || 1);
        const zebra = options.zebra !== false;
        const rows = ws['!rows'] ? ws['!rows'].slice() : [];
        const lockedColumns = options.lockedColumns || [];

        if (options.autoFilter !== false) {
            ws['!autofilter'] = { ref: ws['!ref'] };
        }

        for (let r = range.s.r; r <= range.e.r; r += 1) {
            const isHeader = r < headerRows;
            const isAltRow = !isHeader && zebra && ((r - headerRows) % 2 === 1);
            const rowStyle = isHeader ? theme.header : (isAltRow ? theme.bodyAlt : theme.body);

            if (!rows[r]) rows[r] = {};
            rows[r].hpt = isHeader ? 24 : 20;

            for (let c = range.s.c; c <= range.e.c; c += 1) {
                const addr = XLSX.utils.encode_cell({ r: r, c: c });
                const cell = ws[addr];
                if (!cell) continue;

                let cellStyle = rowStyle;
                if (!isHeader && lockedColumns.includes(c)) {
                    cellStyle = isAltRow ? theme.formulaAlt : theme.formula;
                }
                cell.s = this.mergeExcelStyle(cellStyle);
            }
        }

        ws['!rows'] = rows;
        ws['!freeze'] = { xSplit: 0, ySplit: headerRows };
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
        
        const parseDateToUtc = (dateValue) => {
            if (!dateValue && dateValue !== 0) return null;

            if (dateValue instanceof Date) {
                if (isNaN(dateValue.getTime())) return null;
                return new Date(Date.UTC(
                    dateValue.getUTCFullYear(),
                    dateValue.getUTCMonth(),
                    dateValue.getUTCDate()
                ));
            }

            if (typeof dateValue === 'number') {
                const epoch = Date.UTC(1899, 11, 30);
                return new Date(epoch + Math.round(dateValue) * 24 * 60 * 60 * 1000);
            }

            if (typeof dateValue === 'string') {
                const parts = dateValue.split('-');
                if (parts.length === 3) {
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10) - 1;
                    const d = parseInt(parts[2], 10);

                    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
                        return new Date(Date.UTC(y, m, d));
                    }
                }

                const parsed = new Date(dateValue);
                if (!isNaN(parsed.getTime())) {
                    return new Date(Date.UTC(
                        parsed.getUTCFullYear(),
                        parsed.getUTCMonth(),
                        parsed.getUTCDate()
                    ));
                }
            }

            return null;
        };

        const dateToExcelSerial = (dateValue) => {
            const parsedDate = parseDateToUtc(dateValue);
            if (!parsedDate) return null;

            const epoch = Date.UTC(1899, 11, 30);
            const diffMs = parsedDate.getTime() - epoch;
            return diffMs / (24 * 60 * 60 * 1000);
        };

        const formatDateYmd = (dateValue) => {
            const parsedDate = parseDateToUtc(dateValue);
            if (!parsedDate) return '';

            const yyyy = parsedDate.getUTCFullYear();
            const mm = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(parsedDate.getUTCDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const uniqueOrVarious = (values) => {
            const cleaned = values
                .map(val => String(val || '').trim())
                .filter(Boolean);

            const unique = [...new Set(cleaned)];
            if (unique.length === 0) return '';
            if (unique.length === 1) return unique[0];
            return 'VARIOS';
        };

        const getMonthGroupKey = (row) => {
            const parsedDate = parseDateToUtc(row.fechaDespacho);
            const clientKey = String(row.cliente || '').trim();

            if (!parsedDate) {
                return `${clientKey}|||SIN_FECHA`;
            }

            const year = parsedDate.getUTCFullYear();
            const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
            return `${clientKey}|||${year}-${month}`;
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
        const lockedColumnIndices = this.columns
            .map((col, idx) => col.locked ? idx : -1)
            .filter(idx => idx >= 0);
        this.applyExcelTheme(ws, { lockedColumns: lockedColumnIndices });

        XLSX.utils.book_append_sheet(wb, ws, "Facturacion Template");

        // Hoja adicional de validación con el detalle previo al agrupado mensual
        const pivotHeaders = [
            'Cliente',
            'Vendor',
            'Temporada',
            'Reserva o Programa',
            'OP',
            'Estilo',
            'Bordado',
            'Estampado',
            'Garment Dye',
            'Tela',
            'Cantidad',
            'Precio FOB $',
            'Total US$',
            'Fecha de Despacho',
            'Status',
            'Semana',
            'Mes',
            'Año',
            '% Margen',
            'Total US$ Margen'
        ];

        const pivotData = [pivotHeaders];

        this.data.forEach((row) => {
            const priceHasValue = row.precio !== '' && row.precio !== null && row.precio !== undefined;
            const priceValue = Number(row.precio);
            const totalUsValue = Number(row.totalUs) || 0;
            const marginValue = Number(row.year4) || 0;
            const dispatchSerial = row.fechaDespacho !== null && row.fechaDespacho !== undefined && row.fechaDespacho !== ''
                ? dateToExcelSerial(row.fechaDespacho)
                : null;
            const textValue = (value) => String(value || '').trim();

            pivotData.push([
                textValue(row.cliente),
                textValue(row.vendorCalc) || textValue(row.data1),
                textValue(row.season),
                textValue(row.programa),
                textValue(row.op),
                textValue(row.estilo),
                textValue(row.bordado),
                textValue(row.estampado),
                textValue(row.garmentDye),
                textValue(row.tela),
                {
                    t: 'n',
                    v: Number(row.cantidad) || 0,
                    z: '#,##0'
                },
                priceHasValue && Number.isFinite(priceValue)
                    ? {
                        t: 'n',
                        v: priceValue,
                        z: '$#,##0.0000'
                    }
                    : '',
                {
                    t: 'n',
                    v: totalUsValue,
                    z: '$#,##0.00'
                },
                dispatchSerial !== null
                    ? {
                        t: 'n',
                        v: dispatchSerial,
                        z: 'd-mmm-yy'
                    }
                    : '',
                textValue(row.status),
                {
                    t: 'n',
                    v: Number(row.wk) || 0,
                    z: '0'
                },
                textValue(row.month),
                textValue(row.year3),
                {
                    t: 'n',
                    v: marginValue,
                    z: '0.00%'
                },
                {
                    t: 'n',
                    v: totalUsValue * marginValue,
                    z: '$#,##0.00'
                }
            ]);
        });

        const wsPivot = XLSX.utils.aoa_to_sheet(pivotData);
        wsPivot['!cols'] = pivotHeaders.map((header) => {
            const headerText = String(header || '');
            if (headerText === 'Cliente') return { wch: 24 };
            if (headerText === 'Vendor') return { wch: 14 };
            if (headerText === 'Temporada') return { wch: 16 };
            if (headerText === 'Reserva o Programa') return { wch: 24 };
            if (headerText === 'Estilo') return { wch: 22 };
            if (headerText === 'Tela') return { wch: 28 };
            if (headerText === 'Fecha de Despacho') return { wch: 16 };
            if (headerText === 'Total US$ Margen') return { wch: 18 };
            return { wch: 14 };
        });
        this.applyExcelTheme(wsPivot);
        XLSX.utils.book_append_sheet(wb, wsPivot, "pivot");
        
        // ----------------------------------------------------
        // 2b. Construir la hoja "Plantilla Luis"
        // ----------------------------------------------------
        const luisHeaders = [
            "Cliente", "Vendor", "Temporada", "Reserva o Programa", "OP", "Estilo", 
            "Bordado", "Estampado", "Garment Dye", "Tela", "Cantidad", "Precio FOB $", 
            "Total US$", "Fecha de Despacho", "Status", "Semana", "Mes", "Año", 
            "% Margen", "Total US$ Margen"
        ];
        
        const luisGroups = new Map();

        this.data.forEach((row) => {
            const groupKey = getMonthGroupKey(row);
            const parsedDate = parseDateToUtc(row.fechaDespacho);

            if (!luisGroups.has(groupKey)) {
                luisGroups.set(groupKey, {
                    cliente: String(row.cliente || '').trim(),
                    rows: [],
                    latestDate: null
                });
            }

            const group = luisGroups.get(groupKey);
            group.rows.push(row);

            if (parsedDate && (!group.latestDate || parsedDate > group.latestDate)) {
                group.latestDate = parsedDate;
            }
        });

        const groupedLuisRows = [...luisGroups.values()]
            .map((group) => {
                const rows = group.rows;
                const latestDate = group.latestDate;
                const latestDateStr = latestDate ? formatDateYmd(latestDate) : '';
                const latestDateSerial = latestDate ? dateToExcelSerial(latestDate) : null;

                const cantidadTotal = rows.reduce((acc, row) => acc + (Number(row.cantidad) || 0), 0);
                const totalUsTotal = rows.reduce((acc, row) => acc + (Number(row.totalUs) || 0), 0);
                const marginValues = rows
                    .filter(row => row.year4 !== null && row.year4 !== undefined && row.year4 !== '')
                    .map(row => Number(row.year4))
                    .filter(val => Number.isFinite(val));
                const marginAverage = marginValues.length > 0
                    ? marginValues.reduce((acc, val) => acc + val, 0) / marginValues.length
                    : 0;
                const totalUsMargen = rows.reduce((acc, row) => {
                    const totalUs = Number(row.totalUs) || 0;
                    const margin = Number(row.year4) || 0;
                    return acc + (totalUs * margin);
                }, 0);

                const precioFob = '';

                const weekValue = latestDateStr && window.FormulaDefinitions && window.FormulaDefinitions.Wk
                    ? window.FormulaDefinitions.Wk.calculate({ fechaDespacho: latestDateStr })
                    : 0;
                const monthValue = latestDateStr && window.FormulaDefinitions && window.FormulaDefinitions.MONTH
                    ? window.FormulaDefinitions.MONTH.calculate({ fechaDespacho: latestDateStr })
                    : '';
                const yearValue = latestDateStr && window.FormulaDefinitions && window.FormulaDefinitions.YEAR3
                    ? window.FormulaDefinitions.YEAR3.calculate({ fechaDespacho: latestDateStr })
                    : '';

                return {
                    sortDate: latestDate ? latestDate.getTime() : 0,
                    cliente: group.cliente,
                    vendorCalc: uniqueOrVarious(rows.map(row => row.vendorCalc)),
                    season: uniqueOrVarious(rows.map(row => row.season)),
                    programa: uniqueOrVarious(rows.map(row => row.programa)),
                    op: 'VARIOS',
                    estilo: 'VARIOS',
                    bordado: 'VARIOS',
                    estampado: 'VARIOS',
                    garmentDye: 'VARIOS',
                    tela: 'VARIOS',
                    cantidad: cantidadTotal,
                    precio: precioFob,
                    totalUs: totalUsTotal,
                    fechaDespacho: latestDateSerial,
                    status: uniqueOrVarious(rows.map(row => row.status)),
                    wk: weekValue,
                    month: monthValue,
                    year3: yearValue,
                    year4: marginAverage,
                    totalUsMargen: totalUsMargen
                };
            })
            .sort((a, b) => {
                if (a.sortDate !== b.sortDate) return a.sortDate - b.sortDate;
                return String(a.cliente || '').localeCompare(String(b.cliente || ''));
            });

        const luisData = [luisHeaders];

        groupedLuisRows.forEach((row, idx) => {
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
            r_cols.push(row.op || 'VARIOS');

            // 6. Estilo (Col F)
            r_cols.push(row.estilo || 'VARIOS');

            // 7. Bordado (Col G)
            r_cols.push(row.bordado || 'VARIOS');

            // 8. Estampado (Col H)
            r_cols.push(row.estampado || 'VARIOS');

            // 9. Garment Dye (Col I)
            r_cols.push(row.garmentDye || 'VARIOS');

            // 10. Tela (Col J)
            r_cols.push(row.tela || 'VARIOS');

            // 11. Cantidad (Col K)
            r_cols.push({
                t: 'n',
                v: row.cantidad || 0,
                z: '#,##0'
            });

            // 12. Precio FOB $ (Col L)
            if (row.precio === '' || row.precio === null || row.precio === undefined) {
                r_cols.push('');
            } else {
                r_cols.push({
                    t: 'n',
                    v: row.precio,
                    z: '$#,##0.0000'
                });
            }

            // 13. Total US$ (Col M) -> Suma consolidada
            r_cols.push({
                t: 'n',
                v: row.totalUs || 0,
                z: '$#,##0.00'
            });

            // 14. Fecha de Despacho (Col N)
            if (row.fechaDespacho !== null && row.fechaDespacho !== undefined) {
                r_cols.push({
                    t: 'n',
                    v: row.fechaDespacho,
                    z: 'd-mmm-yy'
                });
            } else {
                r_cols.push('');
            }

            // 15. Status (Col O)
            r_cols.push(row.status || '');

            // 16. Semana (Col P)
            r_cols.push({
                t: 'n',
                v: row.wk || 0,
                f: `WEEKNUM(N${excelRow})`
            });

            // 17. Mes (Col Q)
            r_cols.push({
                t: 'str',
                v: row.month || '',
                f: `TEXT(N${excelRow},"MMMM")`
            });

            // 18. Año (Col R)
            r_cols.push({
                t: 'str',
                v: row.year3 || '',
                f: `TEXT(N${excelRow},"YYY")`
            });

            // 19. % Margen (Col S) -> Promedio consolidado
            r_cols.push({
                t: 'n',
                v: row.year4 || 0,
                z: '0.00%'
            });

            // 20. Total US$ Margen (Col T) -> Suma consolidada
            r_cols.push({
                t: 'n',
                v: row.totalUsMargen || 0,
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
        this.applyExcelTheme(ws2, { lockedColumns: [15, 16, 17] });

        XLSX.utils.book_append_sheet(wb, ws2, "Plantilla Luis");

        // 3. Escribir y descargar un único archivo de Facturación
        wb.Props = { ...(wb.Props || {}), Title: 'Facturacion LLL' };
        XLSX.writeFile(wb, 'Facturacion LLL.xlsx', { cellStyles: true });
    }

    /**
     * Exporta los 3 archivos de Distribución usando la plantilla de columnas
     * marcada por colores en Lululemon 7.31.25.xlsx.
     */
    exportDistributionExcels() {
        if (!this.sourceArrayBuffer) {
            alert('No se encontró el archivo fuente cargado. Vuelve a importar el global antes de exportar Distribución.');
            return;
        }

        if (!window.DistributionModuleConfig) {
            alert('No se encontró la configuración de columnas para Distribución.');
            return;
        }

        const normalizeText = (text) => {
            if (text === null || text === undefined) return '';
            return String(text)
                .toLowerCase()
                .replace(/\r?\n|\r/g, ' ')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();
        };

        const sourceWorkbook = XLSX.read(new Uint8Array(this.sourceArrayBuffer), {
            type: 'array',
            cellStyles: true,
            cellFormula: true,
            cellNF: true,
            cellText: false,
            cellDates: true
        });

        const sourceSheetName = sourceWorkbook.SheetNames.includes('LLL GR.')
            ? 'LLL GR.'
            : sourceWorkbook.SheetNames[0];
        const sourceWs = sourceWorkbook.Sheets[sourceSheetName];

        if (!sourceWs || !sourceWs['!ref']) {
            alert('No se pudo leer la hoja fuente para Distribución.');
            return;
        }

        const sourceRange = XLSX.utils.decode_range(sourceWs['!ref']);
        const headerRowIndex = 5; // Fila 6 de Excel

        let statusSeasonCol = 3; // Columna D por defecto
        for (let c = sourceRange.s.c; c <= sourceRange.e.c; c += 1) {
            const headerCell = sourceWs[XLSX.utils.encode_cell({ r: headerRowIndex, c })];
            if (normalizeText(headerCell ? headerCell.v : '') === 'status season') {
                statusSeasonCol = c;
                break;
            }
        }

        const exportStamp = (() => {
            const now = new Date();
            return `${now.getMonth() + 1}.${now.getDate()}.${String(now.getFullYear()).slice(-2)}`;
        })();

        const copyCell = (targetWs, sourceRow, sourceCol, targetRow, targetCol) => {
            const sourceCell = sourceWs[XLSX.utils.encode_cell({ r: sourceRow, c: sourceCol })];
            if (!sourceCell) return;

            const clonedCell = { ...sourceCell };
            delete clonedCell.f;
            delete clonedCell.F;
            delete clonedCell.D;

            targetWs[XLSX.utils.encode_cell({ r: targetRow, c: targetCol })] = clonedCell;
        };

        const moduleOrder = ['LLL', 'EXPO', 'PCP'];

        moduleOrder.forEach((moduleKey) => {
            const moduleConfig = window.DistributionModuleConfig[moduleKey];
            if (!moduleConfig) return;

            const selectedCols = moduleConfig.columns;
            const outWb = XLSX.utils.book_new();
            const outWs = {};
            const outRows = [];
            const outCols = selectedCols.map((sourceCol1Based) => {
                const sourceColMeta = sourceWs['!cols'] ? sourceWs['!cols'][sourceCol1Based - 1] : null;
                return sourceColMeta ? { ...sourceColMeta } : { wch: 18 };
            });

            let targetRow = 0;

            // Copiar solo la fila 6, que es el encabezado real de Distribución.
            for (let sourceRow = headerRowIndex; sourceRow <= Math.min(headerRowIndex, sourceRange.e.r); sourceRow += 1) {
                selectedCols.forEach((sourceCol1Based, targetCol) => {
                    copyCell(outWs, sourceRow, sourceCol1Based - 1, targetRow, targetCol);
                });

                if (sourceWs['!rows'] && sourceWs['!rows'][sourceRow]) {
                    outRows[targetRow] = { ...sourceWs['!rows'][sourceRow] };
                }

                targetRow += 1;
            }

            // Copiar solo filas con STATUS Season = Producción
            for (let sourceRow = headerRowIndex + 1; sourceRow <= sourceRange.e.r; sourceRow += 1) {
                const statusCell = sourceWs[XLSX.utils.encode_cell({ r: sourceRow, c: statusSeasonCol })];
                if (normalizeText(statusCell ? statusCell.v : '') !== 'produccion') {
                    continue;
                }

                selectedCols.forEach((sourceCol1Based, targetCol) => {
                    copyCell(outWs, sourceRow, sourceCol1Based - 1, targetRow, targetCol);
                });

                if (sourceWs['!rows'] && sourceWs['!rows'][sourceRow]) {
                    outRows[targetRow] = { ...sourceWs['!rows'][sourceRow] };
                }

                targetRow += 1;
            }

            outWs['!cols'] = outCols;
            outWs['!rows'] = outRows;
            outWs['!ref'] = XLSX.utils.encode_range({
                s: { r: 0, c: 0 },
                e: {
                    r: Math.max(targetRow - 1, 0),
                    c: Math.max(selectedCols.length - 1, 0)
                }
            });

            XLSX.utils.book_append_sheet(outWb, outWs, moduleConfig.sheetName);
            outWb.Props = { ...(outWb.Props || {}), Title: moduleConfig.title };

            XLSX.writeFile(
                outWb,
                `${moduleConfig.filenamePrefix || moduleConfig.title} ${exportStamp} ${moduleConfig.suffix}.xlsx`,
                { cellStyles: true }
            );
        });
    }

    /**
     * Devuelve las fechas HOD unicas disponibles para el modulo Status.
     */
    getStatusHodOptions() {
        if (!this.sourceArrayBuffer) {
            return [];
        }

        const sourceWorkbook = XLSX.read(new Uint8Array(this.sourceArrayBuffer), {
            type: 'array',
            cellStyles: true,
            cellFormula: true,
            cellNF: true,
            cellText: false,
            cellDates: true
        });

        const sourceSheetName = sourceWorkbook.SheetNames.includes('LLL GR.')
            ? 'LLL GR.'
            : sourceWorkbook.SheetNames[0];
        const sourceWs = sourceWorkbook.Sheets[sourceSheetName];

        if (!sourceWs || !sourceWs['!ref']) {
            return [];
        }

        const sourceRange = XLSX.utils.decode_range(sourceWs['!ref']);
        const headerRowIndex = 5; // Row 6 of Excel
        const headerMap = new Map();

        for (let c = sourceRange.s.c; c <= sourceRange.e.c; c += 1) {
            const headerCell = sourceWs[XLSX.utils.encode_cell({ r: headerRowIndex, c })];
            const normalizedHeader = this.normalizeText(headerCell ? headerCell.v : '');
            if (normalizedHeader) {
                headerMap.set(normalizedHeader, c);
            }
        }

        const findColumnIndex = (...aliases) => {
            for (const alias of aliases) {
                const normalizedAlias = this.normalizeText(alias);
                if (headerMap.has(normalizedAlias)) {
                    return headerMap.get(normalizedAlias);
                }
            }
            return -1;
        };

        const getSourceCellValue = (sourceRow, ...aliases) => {
            const colIdx = findColumnIndex(...aliases);
            if (colIdx < 0) return '';

            const cell = sourceWs[XLSX.utils.encode_cell({ r: sourceRow, c: colIdx })];
            if (!cell || cell.v === undefined || cell.v === null) return '';
            return cell.v;
        };

        const optionsMap = new Map();

        for (let sourceRow = headerRowIndex + 1; sourceRow <= sourceRange.e.r; sourceRow += 1) {
            const seasonStatus = this.normalizeText(getSourceCellValue(sourceRow, 'STATUS\nSeason'));
            if (seasonStatus !== 'produccion') {
                continue;
            }

            const hodValue = getSourceCellValue(sourceRow, 'HOD\nLULULEMON');
            const hodSerial = this.dateToExcelSerial(hodValue);
            if (hodSerial === null) {
                continue;
            }

            const hodKey = this.dateToIsoDate(hodValue);
            if (!hodKey) {
                continue;
            }

            if (!optionsMap.has(hodKey)) {
                optionsMap.set(hodKey, {
                    value: hodKey,
                    label: this.formatDateLabel(hodValue),
                    sort: hodSerial
                });
            }
        }

        return [...optionsMap.values()].sort((a, b) => a.sort - b.sort);
    }

    /**
     * Exporta el archivo Production Status con los campos solicitados.
     */
    exportStatusExcel(selectedOptions = {}) {
        if (!this.sourceArrayBuffer) {
            alert('No se encontro el archivo fuente cargado. Vuelve a importar el global antes de exportar Status.');
            return;
        }

        const exportOptions = Array.isArray(selectedOptions)
            ? { hodDates: selectedOptions }
            : (selectedOptions || {});

        const selectedHodDates = Array.isArray(exportOptions.hodDates)
            ? exportOptions.hodDates
                .map((value) => String(value || '').trim())
                .filter(Boolean)
            : [];
        const selectedHodSet = new Set(selectedHodDates);
        const selectedVendor = String(exportOptions.vendor || this.filters.data1 || '').trim();
        const selectedSeason = String(exportOptions.season || this.filters.season || '').trim();
        const selectedStatus = String(exportOptions.status || this.filters.status || '').trim();

        const numberValue = (value) => {
            if (value === null || value === undefined || value === '') return null;
            if (typeof value === 'number') return Number.isFinite(value) ? value : null;

            const parsed = Number(String(value).replace(/,/g, '').trim());
            return Number.isFinite(parsed) ? parsed : null;
        };

        const textValue = (value) => {
            if (value === null || value === undefined) return '';
            return String(value).trim();
        };

        const makeDateCell = (value) => {
            const serial = this.dateToExcelSerial(value);
            if (serial === null) return '';
            return {
                t: 'n',
                v: serial,
                z: 'd-mmm-yy'
            };
        };

        const makeNumberCell = (value, format = '#,##0') => {
            const numericValue = numberValue(value);
            if (numericValue === null) return '';
            return {
                t: 'n',
                v: numericValue,
                z: format
            };
        };

        const makePercentCell = (value) => {
            const numericValue = numberValue(value);
            if (numericValue === null) return '';
            return {
                t: 'n',
                v: numericValue,
                z: '0.00%'
            };
        };

        const accumulateMin = (currentValue, nextValue) => {
            if (nextValue === null || nextValue === undefined || nextValue === '') {
                return currentValue;
            }
            if (currentValue === null || currentValue === undefined || currentValue === '') {
                return nextValue;
            }
            return nextValue < currentValue ? nextValue : currentValue;
        };

        const accumulateMax = (currentValue, nextValue) => {
            if (nextValue === null || nextValue === undefined || nextValue === '') {
                return currentValue;
            }
            if (currentValue === null || currentValue === undefined || currentValue === '') {
                return nextValue;
            }
            return nextValue > currentValue ? nextValue : currentValue;
        };

        const uniqueOrVarious = (values) => {
            const cleaned = [...new Set(values.map(textValue).filter(Boolean))];
            if (cleaned.length === 0) return '';
            if (cleaned.length === 1) return cleaned[0];
            return 'VARIOS';
        };

        const sourceWorkbook = XLSX.read(new Uint8Array(this.sourceArrayBuffer), {
            type: 'array',
            cellStyles: true,
            cellFormula: true,
            cellNF: true,
            cellText: false,
            cellDates: true
        });

        const sourceSheetName = sourceWorkbook.SheetNames.includes('LLL GR.')
            ? 'LLL GR.'
            : sourceWorkbook.SheetNames[0];
        const sourceWs = sourceWorkbook.Sheets[sourceSheetName];

        if (!sourceWs || !sourceWs['!ref']) {
            alert('No se pudo leer la hoja fuente para Status.');
            return;
        }

        const sourceRange = XLSX.utils.decode_range(sourceWs['!ref']);
        const headerRowIndex = 5; // Row 6 of Excel
        const headerMap = new Map();

        for (let c = sourceRange.s.c; c <= sourceRange.e.c; c += 1) {
            const headerCell = sourceWs[XLSX.utils.encode_cell({ r: headerRowIndex, c })];
            const normalizedHeader = this.normalizeText(headerCell ? headerCell.v : '');
            if (normalizedHeader) {
                headerMap.set(normalizedHeader, c);
            }
        }

        const findColumnIndex = (...aliases) => {
            for (const alias of aliases) {
                const normalizedAlias = this.normalizeText(alias);
                if (headerMap.has(normalizedAlias)) {
                    return headerMap.get(normalizedAlias);
                }
            }
            return -1;
        };

        const getSourceCellValue = (sourceRow, ...aliases) => {
            const colIdx = findColumnIndex(...aliases);
            if (colIdx < 0) return '';

            const cell = sourceWs[XLSX.utils.encode_cell({ r: sourceRow, c: colIdx })];
            if (!cell || cell.v === undefined || cell.v === null) return '';
            return cell.v;
        };

        const getSourceCellValueByLetter = (sourceRow, columnLetter) => {
            const cell = sourceWs[XLSX.utils.encode_cell({
                r: sourceRow,
                c: XLSX.utils.decode_col(columnLetter)
            })];

            if (!cell || cell.v === undefined || cell.v === null) return '';
            return cell.v;
        };

        const getDateSerial = (sourceRow, ...aliases) => this.dateToExcelSerial(getSourceCellValue(sourceRow, ...aliases));

        const getDelayText = (sourceRow) => {
            const values = [
                getSourceCellValue(sourceRow, 'Dummy HOD due to pending approvals'),
                getSourceCellValue(sourceRow, 'HOD Hold due to LLL Request'),
                getSourceCellValue(sourceRow, 'Fabric Delay reason comments and Resolution')
            ]
                .map(textValue)
                .filter(Boolean);

            return values.length > 0 ? values.join(' | ') : '';
        };

        const getCommentsText = (sourceRow) => {
            const values = [
                getSourceCellValueByLetter(sourceRow, 'BX'),
                getSourceCellValueByLetter(sourceRow, 'GJ'),
                getSourceCellValueByLetter(sourceRow, 'GM')
            ]
                .map(textValue)
                .filter(Boolean);

            return values.length > 0 ? values.join(' | ') : '';
        };

        const statusHeaders = [
            'HOD\nLLL',
            'TOTAL',
            'Further Delay (indicate new HOD and volume)',
            'New Total',
            'Plnd Start Date (DYE/FINISH)',
            'Plnd End Date (DYE/FINISH)',
            'Completed units',
            '%',
            'Planned Fabric Completion for balance',
            'Actual Fabric Completion',
            'days before HOD that delivered fabric',
            'Plnd Start Date (CUT)',
            'Plnd End Date (CUT)',
            'Completed units',
            '%',
            'Planned Cut Completion for balance',
            'Actual Cut Completion',
            'days before HOD that ends the cut',
            'Plnd Start Date (SEW)',
            'Plnd End Date (SEW)',
            '# of lines',
            'Completed units',
            '%',
            'Planned Sewing for balance',
            'Actual Sewing Completion',
            'days before HOD that ends the sew',
            'Plnd Start Date (FINISHING)',
            'Plnd End Date (FINISHING)',
            '# of lines',
            'Completed units',
            '%',
            'Planned Finishing for balance',
            'Actual Finishing Completion',
            'days before HOD that ends the finish',
            'Plnd End Date (INSPECTION)',
            'Completed units',
            '%',
            'Actual Final Inspection',
            'days before HOD that done the last FRI',
            'Comments (Please always include sub\'n date for pending TOP /PP/Pilot samples, shortage)'
        ];

        const packageMap = new Map();

        for (let sourceRow = headerRowIndex + 1; sourceRow <= sourceRange.e.r; sourceRow += 1) {
            const seasonStatus = this.normalizeText(getSourceCellValue(sourceRow, 'STATUS\nSeason'));
            if (seasonStatus !== 'produccion') {
                continue;
            }

            const orderShipmentStatus = textValue(getSourceCellValue(sourceRow, 'Order Shipment Status'));
            const rowStatus = (() => {
                if (orderShipmentStatus === 'Fully Shipped' || orderShipmentStatus === 'Partially Shipped') {
                    return 'DESPACHADO';
                }
                if (orderShipmentStatus === 'Not Shipped' || orderShipmentStatus === '' || orderShipmentStatus === '(en blanco)') {
                    return 'EN PROCESO';
                }
                return ' ';
            })();
            if (selectedStatus && this.normalizeText(rowStatus) !== this.normalizeText(selectedStatus)) {
                continue;
            }

            const sourceSeason = textValue(getSourceCellValue(sourceRow, 'Season'));
            if (selectedSeason && this.normalizeText(sourceSeason) !== this.normalizeText(selectedSeason)) {
                continue;
            }

            const sourceVendor = textValue(getSourceCellValue(sourceRow, 'VENDOR'));
            if (selectedVendor && this.normalizeText(sourceVendor) !== this.normalizeText(selectedVendor)) {
                continue;
            }

            const hodValue = getSourceCellValue(sourceRow, 'HOD\nLULULEMON');
            const hodIso = this.dateToIsoDate(hodValue);
            if (selectedHodSet.size > 0 && !selectedHodSet.has(hodIso)) {
                continue;
            }
            if (!hodIso) {
                continue;
            }

            const hodSerial = getDateSerial(sourceRow, 'HOD\nLULULEMON');
            const totalQty = numberValue(getSourceCellValue(sourceRow, 'TOTAL PO Qty', 'TOTAL Qty to Ship')) || 0;
            const dyePercent = numberValue(getSourceCellValue(sourceRow, '% Recvd DYE/FINISH')) || 0;
            const cutPercent = numberValue(getSourceCellValue(sourceRow, 'Cutting %')) || 0;
            const sewPercent = numberValue(getSourceCellValue(sourceRow, '% sew')) || 0;
            const finishPercent = numberValue(getSourceCellValue(sourceRow, '% finish')) || 0;

            const dyeStartSerial = getDateSerial(sourceRow, 'Dyeing Start');
            const dyeEndSerial = getDateSerial(sourceRow, 'Dyeing End');
            const fabricPlannedSerial = getDateSerial(sourceRow, 'Fabric planned date');
            const fabricActualSerial = getDateSerial(sourceRow, 'Fabric End\nBODY');
            const cutStartSerial = getDateSerial(sourceRow, 'Cutting Start');
            const cutEndSerial = getDateSerial(sourceRow, 'Cutting End');
            const cutLeadtime = numberValue(getSourceCellValue(sourceRow, 'Cutting Leadtime')) || 0;
            const sewStartSerial = getDateSerial(sourceRow, 'Sewing Start');
            const sewEndSerial = getDateSerial(sourceRow, 'Sewing End');
            const sewLeadtime = numberValue(getSourceCellValue(sourceRow, 'Sewing Leadtime')) || 0;
            const finishStartSerial = getDateSerial(sourceRow, 'Packaging Start');
            const finishEndSerial = getDateSerial(sourceRow, 'Packaging End');
            const inspectionPlannedSerial = getDateSerial(sourceRow, 'INSPECTORIO Date', 'Plnd End Date (INSPECTION)');
            const inspectionActualSerial = getDateSerial(
                sourceRow,
                'Actual Final Inspection',
                'Actual FRI',
                'INSPECTORIO Actual',
                'INSPECTORIO Date'
            );
            const inspectionPercent = inspectionActualSerial !== null ? 1 : 0;
            const cutPlannedSerial = cutStartSerial !== null ? cutStartSerial + cutLeadtime : null;
            const sewPlannedSerial = sewStartSerial !== null ? sewStartSerial + sewLeadtime : null;

            if (!packageMap.has(hodIso)) {
                packageMap.set(hodIso, {
                    hodIso,
                    hodSerial,
                    totalQty: 0,
                    rowCount: 0,
                    dyePercentSum: 0,
                    cutPercentSum: 0,
                    sewPercentSum: 0,
                    finishPercentSum: 0,
                    inspectionPercentSum: 0,
                    dyeStartSerial: null,
                    dyeEndSerial: null,
                    fabricPlannedSerial: null,
                    fabricActualSerial: null,
                    cutStartSerial: null,
                    cutEndSerial: null,
                    cutPlannedSerial: null,
                    sewStartSerial: null,
                    sewEndSerial: null,
                    sewPlannedSerial: null,
                    finishStartSerial: null,
                    finishEndSerial: null,
                    inspectionPlannedSerial: null,
                    inspectionActualSerial: null,
                    sewingLines: [],
                    comments: []
                });
            }

            const bucket = packageMap.get(hodIso);
            bucket.hodSerial = bucket.hodSerial === null || bucket.hodSerial === undefined ? hodSerial : bucket.hodSerial;
            bucket.totalQty += totalQty;
            bucket.rowCount += 1;
            bucket.dyePercentSum += dyePercent;
            bucket.cutPercentSum += cutPercent;
            bucket.sewPercentSum += sewPercent;
            bucket.finishPercentSum += finishPercent;
            bucket.inspectionPercentSum += inspectionPercent;
            bucket.dyeStartSerial = accumulateMin(bucket.dyeStartSerial, dyeStartSerial);
            bucket.dyeEndSerial = accumulateMax(bucket.dyeEndSerial, dyeEndSerial);
            bucket.fabricPlannedSerial = accumulateMax(bucket.fabricPlannedSerial, fabricPlannedSerial);
            bucket.fabricActualSerial = accumulateMax(bucket.fabricActualSerial, fabricActualSerial);
            bucket.cutStartSerial = accumulateMin(bucket.cutStartSerial, cutStartSerial);
            bucket.cutEndSerial = accumulateMax(bucket.cutEndSerial, cutEndSerial);
            bucket.cutPlannedSerial = accumulateMax(bucket.cutPlannedSerial, cutPlannedSerial);
            bucket.sewStartSerial = accumulateMin(bucket.sewStartSerial, sewStartSerial);
            bucket.sewEndSerial = accumulateMax(bucket.sewEndSerial, sewEndSerial);
            bucket.sewPlannedSerial = accumulateMax(bucket.sewPlannedSerial, sewPlannedSerial);
            bucket.finishStartSerial = accumulateMin(bucket.finishStartSerial, finishStartSerial);
            bucket.finishEndSerial = accumulateMax(bucket.finishEndSerial, finishEndSerial);
            bucket.inspectionPlannedSerial = accumulateMax(bucket.inspectionPlannedSerial, inspectionPlannedSerial);
            bucket.inspectionActualSerial = accumulateMax(bucket.inspectionActualSerial, inspectionActualSerial);
            bucket.sewingLines.push(textValue(getSourceCellValue(sourceRow, 'Sewing LINE')));
            bucket.comments.push(getCommentsText(sourceRow));
        }

        const statusData = [statusHeaders];

        const packageRows = [...packageMap.values()].sort((a, b) => {
            const serialA = a.hodSerial === null || a.hodSerial === undefined ? Number.POSITIVE_INFINITY : a.hodSerial;
            const serialB = b.hodSerial === null || b.hodSerial === undefined ? Number.POSITIVE_INFINITY : b.hodSerial;
            return serialA - serialB;
        });

        for (const bucket of packageRows) {
            const avgDyePercent = bucket.rowCount > 0 ? bucket.dyePercentSum / bucket.rowCount : 0;
            const avgCutPercent = bucket.rowCount > 0 ? bucket.cutPercentSum / bucket.rowCount : 0;
            const avgSewPercent = bucket.rowCount > 0 ? bucket.sewPercentSum / bucket.rowCount : 0;
            const avgFinishPercent = bucket.rowCount > 0 ? bucket.finishPercentSum / bucket.rowCount : 0;
            const avgInspectionPercent = bucket.rowCount > 0 ? bucket.inspectionPercentSum / bucket.rowCount : 0;
            const inspectionReferenceSerial = (() => {
                const candidates = [bucket.inspectionActualSerial, bucket.inspectionPlannedSerial]
                    .filter((value) => value !== null && value !== undefined);

                if (candidates.length === 0) {
                    return null;
                }

                return Math.max(...candidates);
            })();

            statusData.push([
                makeDateCell(bucket.hodSerial),
                makeNumberCell(bucket.totalQty),
                '',
                '',
                makeDateCell(bucket.dyeStartSerial),
                makeDateCell(bucket.dyeEndSerial),
                makeNumberCell(Math.round(bucket.totalQty * avgDyePercent)),
                makePercentCell(avgDyePercent),
                makeDateCell(bucket.fabricPlannedSerial),
                makeDateCell(bucket.fabricActualSerial),
                makeNumberCell(bucket.hodSerial !== null && bucket.fabricPlannedSerial !== null ? Math.round(bucket.hodSerial - bucket.fabricPlannedSerial) : null),
                makeDateCell(bucket.cutStartSerial),
                makeDateCell(bucket.cutEndSerial),
                makeNumberCell(Math.round(bucket.totalQty * avgCutPercent)),
                makePercentCell(avgCutPercent),
                makeDateCell(bucket.cutPlannedSerial),
                makeDateCell(bucket.cutEndSerial),
                makeNumberCell(bucket.hodSerial !== null && bucket.cutPlannedSerial !== null ? Math.round(bucket.hodSerial - bucket.cutPlannedSerial) : null),
                makeDateCell(bucket.sewStartSerial),
                makeDateCell(bucket.sewEndSerial),
                uniqueOrVarious(bucket.sewingLines),
                makeNumberCell(Math.round(bucket.totalQty * avgSewPercent)),
                makePercentCell(avgSewPercent),
                makeDateCell(bucket.sewPlannedSerial),
                makeDateCell(bucket.sewEndSerial),
                makeNumberCell(bucket.hodSerial !== null && bucket.sewPlannedSerial !== null ? Math.round(bucket.hodSerial - bucket.sewPlannedSerial) : null),
                makeDateCell(bucket.finishStartSerial),
                makeDateCell(bucket.finishEndSerial),
                '',
                makeNumberCell(Math.round(bucket.totalQty * avgFinishPercent)),
                makePercentCell(avgFinishPercent),
                makeDateCell(bucket.finishEndSerial),
                makeDateCell(bucket.finishEndSerial),
                makeNumberCell(bucket.hodSerial !== null && bucket.finishEndSerial !== null ? Math.round(bucket.hodSerial - bucket.finishEndSerial) : null),
                makeDateCell(bucket.inspectionPlannedSerial),
                makeNumberCell(Math.round(bucket.totalQty * avgInspectionPercent)),
                makePercentCell(avgInspectionPercent),
                makeDateCell(bucket.inspectionActualSerial),
                makeNumberCell(bucket.hodSerial !== null && inspectionReferenceSerial !== null ? Math.round(bucket.hodSerial - inspectionReferenceSerial) : null),
                uniqueOrVarious(bucket.comments)
            ]);
        }

        if (statusData.length === 1) {
            alert('No se encontraron registros de Status para los filtros seleccionados.');
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(statusData);
        ws['!cols'] = statusHeaders.map((header) => {
            const headerText = String(header || '');
            if (headerText.includes('Comments')) {
                return { wch: 60 };
            }
            if (headerText.includes('Further Delay')) {
                return { wch: 34 };
            }
            if (headerText === '# of lines') {
                return { wch: 14 };
            }
            if (headerText === '%') {
                return { wch: 10 };
            }
            if (headerText.includes('days before HOD')) {
                return { wch: 18 };
            }
            return { wch: 18 };
        });
        this.applyExcelTheme(ws);

        XLSX.utils.book_append_sheet(wb, ws, 'Production Status');
        wb.Props = { ...(wb.Props || {}), Title: 'Production Status' };
        XLSX.writeFile(wb, 'Production Status.xlsx', { cellStyles: true });
    }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridController;
} else {
    window.GridController = GridController;
}
