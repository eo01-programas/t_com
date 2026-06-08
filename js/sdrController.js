/**
 * Facturacion LLL - Controlador del flujo SDR
 */

class SdrController {
    constructor(containerId, kpisContainerId) {
        this.container = document.getElementById(containerId);
        this.kpisContainer = document.getElementById(kpisContainerId);

        this.sourceNameEl = document.getElementById('sdr-source-name');
        this.searchInput = document.getElementById('sdr-global-search');
        this.selectSeason = document.getElementById('sdr-filter-season');
        this.selectDeliveryGroup = document.getElementById('sdr-filter-delivery-group');
        this.selectStatus = document.getElementById('sdr-filter-status');
        this.btnResetFilters = document.getElementById('btn-reset-sdr-filters');
        this.btnDownloadWorkbook = document.getElementById('btn-download-sdr');

        this.kpiRows = document.getElementById('sdr-kpi-rows');
        this.kpiCurrentQty = document.getElementById('sdr-kpi-current-qty');
        this.kpiShippedQty = document.getElementById('sdr-kpi-shipped-qty');
        this.kpiSeasons = document.getElementById('sdr-kpi-seasons');

        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.sortColumn = '';
        this.sortAsc = true;
        this.searchTerm = '';
        this.sourceName = '';
        this.sourceArrayBuffer = null;
        this.sourceWorkbook = null;
        this.sourceSheetName = '';
        this.isExporting = false;
        this.filters = {
            season: '',
            deliveryGroup: '',
            status: ''
        };

        this.columns = [
            { key: 'createDate', label: 'Create Date', type: 'date' },
            { key: 'season', label: 'Season' },
            { key: 'deliveryGroup', label: 'Delivery Group' },
            { key: 'vendorName', label: 'Vendor Name' },
            { key: 'manufacturerName', label: 'Manufacturer Name' },
            { key: 'masterPoNumber', label: 'Master PO Number' },
            { key: 'poNumber', label: 'PO #' },
            { key: 'channel', label: 'Channel' },
            { key: 'route', label: 'Route' },
            { key: 'destination', label: 'Destination' },
            { key: 'styleName', label: 'Style Name' },
            { key: 'style', label: 'Style' },
            { key: 'colorCode', label: 'Color Code' },
            { key: 'colorDescription', label: 'Color Description' },
            { key: 'size', label: 'Size' },
            { key: 'currentQuantity', label: 'Current Quantity', type: 'number' },
            { key: 'shippedQuantity', label: 'Shipped Quantity', type: 'number' },
            { key: 'orderShipmentStatus', label: 'Order Shipment Status', type: 'badge' },
            { key: 'exFactoryDate', label: 'Ex-Factory Date', type: 'date' },
            { key: 'currentInDcPo', label: 'Current In DC (PO)', type: 'date' },
            { key: 'currentIsd', label: 'Current ISD', type: 'date' },
            { key: 'delayReasonCausedBy', label: 'Delay Reason Caused By' },
            { key: 'delayReasonCode', label: 'Delay Reason Code' },
            { key: 'orderStatus', label: 'Order Status', type: 'badge' },
            { key: 'delayReasonComments', label: 'Delay Reason Comments' },
            { key: 'fob', label: 'FOB', type: 'number' }
        ];

        if (this.btnDownloadWorkbook) {
            this.btnDownloadWorkbook.classList.add('hidden');
            this.btnDownloadWorkbook.addEventListener('click', () => {
                this.downloadWorkbook();
            });
        }

        this.bindEvents();
        this.renderEmptyState();
        this.updateKpis();
    }

    getTemplateData() {
        if (window.SdrTemplateData) {
            return window.SdrTemplateData;
        }

        return {
            colorCodeRows: [],
            dataClrCodeWidths: [9.57, 12.57, 83.71],
            pivotSizeHeaders: ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', 'XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'],
            pivotRowFields: [
                'Season',
                'Delivery Group',
                'Vendor Name',
                'Manufacturer Name',
                'Create Date',
                'Master PO Number',
                'PO #',
                'Orig PO Handover',
                'Crrt PO Handover',
                'Order Shipment Status',
                'Ex-Factory Date ',
                'Current In DC (PO)',
                'Current ISD',
                'Destination',
                'Channel',
                'Route',
                'Style',
                'Style Name',
                'Color Code',
                'Color Description',
                'Color Name',
                'FOB'
            ]
        };
    }

    getColorLookup() {
        if (this.colorLookup) {
            return this.colorLookup;
        }

        const template = this.getTemplateData();
        const lookup = new Map();

        (template.colorCodeRows || []).forEach((row) => {
            const colorCode = String(row[0] != null ? row[0] : '').trim();
            if (!colorCode) return;
            lookup.set(colorCode, {
                clr: String(row[1] != null ? row[1] : '').trim(),
                colorName: String(row[2] != null ? row[2] : '').trim()
            });
        });

        this.colorLookup = lookup;
        return lookup;
    }

    getColorNameByCode(colorCode) {
        const lookup = this.getColorLookup();
        const normalizedCode = String(colorCode != null ? colorCode : '').trim();
        if (!normalizedCode) return '';

        const colorInfo = lookup.get(normalizedCode);
        return colorInfo && colorInfo.colorName ? colorInfo.colorName : '';
    }

    getExportTheme() {
        const borderColor = { rgb: 'C8D8BD' };
        const textColor = { rgb: '2F3B2F' };
        const headerFill = { rgb: 'DFECCD' };
        const titleFill = { rgb: 'EEF5E8' };
        const altFill = { rgb: 'F6FAF1' };

        const border = {
            top: { style: 'thin', color: borderColor },
            bottom: { style: 'thin', color: borderColor },
            left: { style: 'thin', color: borderColor },
            right: { style: 'thin', color: borderColor }
        };

        return {
            title: {
                font: { bold: true, color: textColor, sz: 11 },
                fill: { patternType: 'solid', fgColor: titleFill },
                border,
                alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
            },
            header: {
                font: { bold: true, color: textColor, sz: 10 },
                fill: { patternType: 'solid', fgColor: headerFill },
                border,
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
            },
            body: {
                font: { color: textColor, sz: 10 },
                fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
                border,
                alignment: { vertical: 'center' }
            },
            bodyAlt: {
                font: { color: textColor, sz: 10 },
                fill: { patternType: 'solid', fgColor: altFill },
                border,
                alignment: { vertical: 'center' }
            }
        };
    }

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

    cloneWorksheet(ws) {
        if (!ws) return null;
        if (typeof structuredClone === 'function') {
            try {
                return structuredClone(ws);
            } catch (err) {
                // Fallback below.
            }
        }
        try {
            return JSON.parse(JSON.stringify(ws));
        } catch (err) {
            return { ...ws };
        }
    }

    buildFormulaMapWorksheet(workbook) {
        if (!workbook || !Array.isArray(workbook.SheetNames)) {
            return null;
        }

        const rows = [['Sheet', 'Cell', 'Formula', 'Value']];

        workbook.SheetNames.forEach((sheetName) => {
            const ws = workbook.Sheets ? workbook.Sheets[sheetName] : null;
            if (!ws || !ws['!ref']) return;

            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let r = range.s.r; r <= range.e.r; r += 1) {
                for (let c = range.s.c; c <= range.e.c; c += 1) {
                    const addr = XLSX.utils.encode_cell({ r, c });
                    const cell = ws[addr];
                    if (!cell || !cell.f) continue;

                    const formulaText = String(cell.f || '').trim();
                    rows.push([
                        sheetName,
                        addr,
                        formulaText.startsWith('=') ? formulaText : `=${formulaText}`,
                        cell.v != null ? cell.v : ''
                    ]);
                }
            }
        });

        if (rows.length === 1) {
            return null;
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [
            { wch: 24 },
            { wch: 12 },
            { wch: 90 },
            { wch: 22 }
        ];
        this.applySheetTheme(ws, {
            headerRows: 1,
            dataStartRow: 1,
            freeze: { xSplit: 0, ySplit: 1 },
            autoFilter: true
        });
        return ws;
    }

    applySheetTheme(ws, options = {}) {
        if (!ws || !ws['!ref']) return;

        const theme = this.getExportTheme();
        const range = XLSX.utils.decode_range(ws['!ref']);
        const titleRows = Number.isInteger(options.titleRows) ? Math.max(0, options.titleRows) : 0;
        const headerRows = Number.isInteger(options.headerRows) ? Math.max(0, options.headerRows) : 1;
        const dataStartRow = Number.isInteger(options.dataStartRow) ? Math.max(0, options.dataStartRow) : headerRows;
        const zebra = options.zebra !== false;
        const dateColumns = new Set((options.dateColumns || []).map((idx) => Number(idx)).filter((idx) => Number.isInteger(idx) && idx >= 0));
        const numberColumns = new Set((options.numberColumns || []).map((idx) => Number(idx)).filter((idx) => Number.isInteger(idx) && idx >= 0));
        const rows = ws['!rows'] ? ws['!rows'].slice() : [];

        if (options.autoFilter !== false) {
            ws['!autofilter'] = { ref: options.autoFilterRef || ws['!ref'] };
        }

        for (let r = range.s.r; r <= range.e.r; r += 1) {
            if (!rows[r]) rows[r] = {};
            rows[r].hpt = r < headerRows ? 24 : 20;

            const isTitleRow = r < titleRows;
            const isHeaderRow = r >= titleRows && r < headerRows;
            const isAltRow = r >= dataStartRow && zebra && ((r - dataStartRow) % 2 === 1);

            for (let c = range.s.c; c <= range.e.c; c += 1) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = ws[addr];
                if (!cell) continue;

                let style = theme.body;
                if (isTitleRow) {
                    style = theme.title;
                } else if (isHeaderRow) {
                    style = theme.header;
                } else if (isAltRow) {
                    style = theme.bodyAlt;
                }

                if (r >= dataStartRow && dateColumns.has(c)) {
                    style = this.mergeExcelStyle(style, { numFmt: 'm/d/yy' });
                } else if (r >= dataStartRow && numberColumns.has(c)) {
                    style = this.mergeExcelStyle(style, { numFmt: '#,##0' });
                }

                cell.s = this.mergeExcelStyle(style);
            }
        }

        ws['!rows'] = rows;
        if (options.freeze) {
            ws['!freeze'] = options.freeze;
        }
    }

    normalizeText(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .toLowerCase()
            .replace(/\r?\n|\r/g, ' ')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    excelSerialToDate(serial) {
        if (serial === null || serial === undefined || serial === '') return null;

        if (serial instanceof Date) {
            if (Number.isNaN(serial.getTime())) return null;
            return new Date(Date.UTC(serial.getUTCFullYear(), serial.getUTCMonth(), serial.getUTCDate()));
        }

        if (typeof serial === 'number') {
            const epoch = Date.UTC(1899, 11, 30);
            return new Date(epoch + Math.round(serial) * 24 * 60 * 60 * 1000);
        }

        if (typeof serial === 'string') {
            const trimmed = serial.trim();
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
            if (!Number.isNaN(parsed.getTime())) {
                return new Date(Date.UTC(
                    parsed.getUTCFullYear(),
                    parsed.getUTCMonth(),
                    parsed.getUTCDate()
                ));
            }
        }

        return null;
    }

    formatDate(value) {
        const parsed = this.excelSerialToDate(value);
        if (!parsed) return '';
        const yyyy = parsed.getUTCFullYear();
        const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    formatDateLabel(value) {
        const parsed = this.excelSerialToDate(value);
        if (!parsed) return '';
        const yyyy = parsed.getUTCFullYear();
        const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getUTCDate()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy}`;
    }

    formatNumber(value) {
        if (value === null || value === undefined || value === '') return '';
        const n = Number(value);
        if (!Number.isFinite(n)) return '';
        return n.toLocaleString('en-US');
    }

    renderStatusBadge(value) {
        if (!value) return '';
        const normalized = this.normalizeText(value);
        let cls = 'neutral';
        if (normalized.includes('shipped') || normalized.includes('complete')) cls = 'success';
        else if (normalized.includes('pending') || normalized.includes('hold') || normalized.includes('delay')) cls = 'warning';
        else if (normalized.includes('cancel') || normalized.includes('exception') || normalized.includes('problem')) cls = 'danger';
        return `<span class="status-badge ${cls}">${value}</span>`;
    }

    bindEvents() {
        if (this.searchInput) {
            let timer;
            this.searchInput.addEventListener('input', (e) => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    this.searchTerm = e.target.value || '';
                    this.currentPage = 1;
                    this.applyFilters();
                }, 250);
            });
        }

        if (this.selectSeason) {
            this.selectSeason.addEventListener('change', (e) => {
                this.filters.season = e.target.value || '';
                this.currentPage = 1;
                this.applyFilters();
            });
        }

        if (this.selectDeliveryGroup) {
            this.selectDeliveryGroup.addEventListener('change', (e) => {
                this.filters.deliveryGroup = e.target.value || '';
                this.currentPage = 1;
                this.applyFilters();
            });
        }

        if (this.selectStatus) {
            this.selectStatus.addEventListener('change', (e) => {
                this.filters.status = e.target.value || '';
                this.currentPage = 1;
                this.applyFilters();
            });
        }

        if (this.btnResetFilters) {
            this.btnResetFilters.addEventListener('click', () => {
                this.resetFilters();
            });
        }
    }

    setSourceName(sourceName) {
        this.sourceName = sourceName || '';
        if (this.sourceNameEl) {
            this.sourceNameEl.textContent = this.sourceName || 'Sin archivo cargado';
        }
    }

    clear() {
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.sortColumn = '';
        this.sortAsc = true;
        this.searchTerm = '';
        this.filters = {
            season: '',
            deliveryGroup: '',
            status: ''
        };
        if (this.searchInput) this.searchInput.value = '';
        if (this.selectSeason) this.selectSeason.innerHTML = '<option value="">Todas las Temporadas</option>';
        if (this.selectDeliveryGroup) this.selectDeliveryGroup.innerHTML = '<option value="">Todos los Delivery Group</option>';
        if (this.selectStatus) this.selectStatus.innerHTML = '<option value="">Todos los Status</option>';
        this.setSourceName('');
        this.sourceArrayBuffer = null;
        this.sourceWorkbook = null;
        this.sourceSheetName = '';
        this.colorLookup = null;
        if (this.btnDownloadWorkbook) {
            this.btnDownloadWorkbook.classList.add('hidden');
            this.btnDownloadWorkbook.disabled = false;
            this.btnDownloadWorkbook.innerHTML = '<span>Descargar SDR WIP</span>';
        }
        this.renderEmptyState();
        this.updateKpis();
    }

    setData(rows, sourceName = '') {
        this.data = Array.isArray(rows) ? rows.slice() : [];
        this.filteredData = this.data.slice();
        this.currentPage = 1;
        this.sortColumn = '';
        this.sortAsc = true;
        this.searchTerm = '';
        this.filters = {
            season: '',
            deliveryGroup: '',
            status: ''
        };
        this.setSourceName(sourceName);
        if (this.searchInput) this.searchInput.value = '';
        this.populateFilters();
        this.applyFilters();
        if (this.btnDownloadWorkbook) {
            this.btnDownloadWorkbook.classList.remove('hidden');
        }
    }

    populateFilters() {
        this.populateSelect(this.selectSeason, this.getUniqueValues('season'), 'Todas las Temporadas');
        this.populateSelect(this.selectDeliveryGroup, this.getUniqueValues('deliveryGroup'), 'Todos los Delivery Group');
        this.populateSelect(this.selectStatus, this.getUniqueValues('orderShipmentStatus'), 'Todos los Status');
    }

    populateSelect(selectEl, values, placeholder) {
        if (!selectEl) return;
        const current = selectEl.value || '';
        const options = [`<option value="">${placeholder}</option>`]
            .concat(values.map((value) => `<option value="${this.escapeHtml(value)}">${this.escapeHtml(value)}</option>`));
        selectEl.innerHTML = options.join('');
        if (current && values.includes(current)) {
            selectEl.value = current;
        }
    }

    getUniqueValues(key) {
        const values = new Set();
        this.data.forEach((row) => {
            const value = String(row[key] || '').trim();
            if (value) values.add(value);
        });
        return Array.from(values).sort((a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' }));
    }

    escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    applyFilters() {
        this.filteredData = this.data.filter((row) => {
            if (this.searchTerm) {
                const searchLower = this.normalizeText(this.searchTerm);
                const matchesSearch = Object.values(row).some((value) =>
                    this.normalizeText(value).includes(searchLower)
                );
                if (!matchesSearch) return false;
            }

            if (this.filters.season && String(row.season || '') !== this.filters.season) return false;
            if (this.filters.deliveryGroup && String(row.deliveryGroup || '') !== this.filters.deliveryGroup) return false;
            if (this.filters.status && String(row.orderShipmentStatus || '') !== this.filters.status) return false;

            return true;
        });

        if (this.sortColumn) {
            this.sortData(this.sortColumn, this.sortAsc, false);
        }

        this.render();
        this.updateKpis();
    }

    sortData(columnKey, ascending = true, reRender = true) {
        this.sortColumn = columnKey;
        this.sortAsc = ascending;

        this.filteredData.sort((a, b) => {
            let valA = a[columnKey];
            let valB = b[columnKey];

            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            const colDef = this.columns.find((col) => col.key === columnKey);
            if (colDef && colDef.type === 'number') {
                const numA = Number(valA) || 0;
                const numB = Number(valB) || 0;
                return ascending ? numA - numB : numB - numA;
            }

            if (colDef && colDef.type === 'date') {
                const dateA = this.excelSerialToDate(valA);
                const dateB = this.excelSerialToDate(valB);
                const tsA = dateA ? dateA.getTime() : 0;
                const tsB = dateB ? dateB.getTime() : 0;
                return ascending ? tsA - tsB : tsB - tsA;
            }

            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            return ascending ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });

        if (reRender) {
            this.render();
        }
    }

    updateKpis() {
        const totalRows = this.data.length;
        const totalCurrentQty = this.data.reduce((sum, row) => sum + (Number(row.currentQuantity) || 0), 0);
        const totalShippedQty = this.data.reduce((sum, row) => sum + (Number(row.shippedQuantity) || 0), 0);
        const uniqueSeasons = new Set(this.data.map((row) => String(row.season || '').trim()).filter(Boolean)).size;

        if (this.kpiRows) this.kpiRows.textContent = totalRows.toLocaleString('en-US');
        if (this.kpiCurrentQty) this.kpiCurrentQty.textContent = totalCurrentQty.toLocaleString('en-US');
        if (this.kpiShippedQty) this.kpiShippedQty.textContent = totalShippedQty.toLocaleString('en-US');
        if (this.kpiSeasons) this.kpiSeasons.textContent = uniqueSeasons.toLocaleString('en-US');
    }

    resetFilters() {
        this.searchTerm = '';
        this.filters = {
            season: '',
            deliveryGroup: '',
            status: ''
        };
        this.sortColumn = '';
        this.sortAsc = true;
        this.currentPage = 1;

        if (this.searchInput) this.searchInput.value = '';
        if (this.selectSeason) this.selectSeason.value = '';
        if (this.selectDeliveryGroup) this.selectDeliveryGroup.value = '';
        if (this.selectStatus) this.selectStatus.value = '';

        this.applyFilters();
    }

    renderEmptyState() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📂</div>
                <h3>No hay datos SDR importados</h3>
                <p>Importa un archivo de Supplier Sourcing Delivery Report para ver el flujo independiente.</p>
            </div>
        `;
    }

    render() {
        if (!this.container) return;

        if (this.data.length === 0) {
            this.renderEmptyState();
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

        let html = `
            <div class="table-actions-row">
                <div class="table-info-text">
                    Mostrando del <strong>${totalRows > 0 ? startIdx + 1 : 0}</strong> al <strong>${endIdx}</strong> de <strong>${totalRows}</strong> filas.
                </div>
                <div class="table-page-size-selector">
                    <span>Filas por pagina:</span>
                    <select id="sdr-page-size">
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

        this.columns.forEach((col) => {
            const isSorted = this.sortColumn === col.key;
            const sortIcon = isSorted ? (this.sortAsc ? ' ▲' : ' ▼') : '';
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

        pageRows.forEach((row) => {
            const globalRowIdx = this.filteredData.indexOf(row);
            html += `<tr data-row-idx="${globalRowIdx}">`;

            this.columns.forEach((col) => {
                const val = row[col.key];
                let displayVal = val;
                let cellClass = '';

                if (col.type === 'date') {
                    displayVal = this.formatDateLabel(val);
                    cellClass = 'numeric-cell';
                } else if (col.type === 'number') {
                    displayVal = this.formatNumber(val);
                    cellClass = 'numeric-cell';
                } else if (col.type === 'badge') {
                    displayVal = val ? this.renderStatusBadge(val) : '';
                } else if (val === null || val === undefined) {
                    displayVal = '';
                }

                html += `
                    <td class="${cellClass}" data-col-key="${col.key}">
                        <div class="td-content">
                            <span class="cell-value-text">${displayVal !== null && displayVal !== undefined ? displayVal : ''}</span>
                        </div>
                    </td>
                `;
            });

            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div class="pagination-container">
                <button class="pag-btn" id="sdr-pag-first" ${this.currentPage === 1 ? 'disabled' : ''}>« Primera</button>
                <button class="pag-btn" id="sdr-pag-prev" ${this.currentPage === 1 ? 'disabled' : ''}>‹ Anterior</button>
                <div class="pagination-pages">
        `;

        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let p = startPage; p <= endPage; p += 1) {
            html += `
                <button class="pag-page-btn ${this.currentPage === p ? 'active' : ''}" data-page="${p}">
                    ${p}
                </button>
            `;
        }

        html += `
                </div>
                <button class="pag-btn" id="sdr-pag-next" ${this.currentPage === totalPages ? 'disabled' : ''}>Siguiente ›</button>
                <button class="pag-btn" id="sdr-pag-last" ${this.currentPage === totalPages ? 'disabled' : ''}>Última »</button>
            </div>
        `;

        this.container.innerHTML = html;
        this.bindTableEvents();
    }

    bindTableEvents() {
        this.container.querySelectorAll('thead th').forEach((th) => {
            th.addEventListener('click', () => {
                const key = th.getAttribute('data-key');
                const isCurrent = this.sortColumn === key;
                const newAsc = isCurrent ? !this.sortAsc : true;
                this.sortData(key, newAsc);
            });
        });

        const selectPageSize = this.container.querySelector('#sdr-page-size');
        if (selectPageSize) {
            selectPageSize.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value, 10);
                this.currentPage = 1;
                this.render();
            });
        }

        const btnFirst = this.container.querySelector('#sdr-pag-first');
        if (btnFirst) btnFirst.addEventListener('click', () => { this.currentPage = 1; this.render(); });

        const btnPrev = this.container.querySelector('#sdr-pag-prev');
        if (btnPrev) btnPrev.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage -= 1;
                this.render();
            }
        });

        const btnNext = this.container.querySelector('#sdr-pag-next');
        if (btnNext) btnNext.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredData.length / this.pageSize) || 1;
            if (this.currentPage < totalPages) {
                this.currentPage += 1;
                this.render();
            }
        });

        const btnLast = this.container.querySelector('#sdr-pag-last');
        if (btnLast) btnLast.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredData.length / this.pageSize) || 1;
            this.currentPage = totalPages;
            this.render();
        });

        this.container.querySelectorAll('.pagination-pages button').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.currentPage = parseInt(btn.getAttribute('data-page'), 10);
                this.render();
            });
        });
    }

    detectHeaderRow(worksheet, sheetRange, maxRows = 10) {
        const requiredHeaders = [
            'season',
            'delivery group',
            'master po number',
            'po #'
        ];

        let bestRow = -1;
        let bestScore = 0;
        const scanLimit = Math.min(maxRows, sheetRange.e.r + 1);

        for (let r = 0; r < scanLimit; r += 1) {
            let score = 0;
            for (let c = sheetRange.s.c; c <= sheetRange.e.c; c += 1) {
                const cellRef = XLSX.utils.encode_cell({ r, c });
                const cell = worksheet[cellRef];
                if (!cell || cell.v === null || cell.v === undefined) continue;
                const normalized = this.normalizeText(cell.v);
                if (requiredHeaders.includes(normalized)) {
                    score += 2;
                } else if (normalized.includes('create date') || normalized.includes('order shipment status') || normalized.includes('style name') || normalized.includes('color description')) {
                    score += 1;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestRow = r;
            }
        }

        return bestScore >= 4 ? bestRow : -1;
    }

    mapHeaderColumns(worksheet, headerRowIndex, sheetRange, sheetNameUsed = '') {
        const mapping = {};
        const duplicateCounters = {
            memberId: 0
        };
        const isQtyPivot = this.normalizeText(sheetNameUsed).includes('qty shpd');

        for (let c = sheetRange.s.c; c <= sheetRange.e.c; c += 1) {
            const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c });
            const cell = worksheet[cellRef];
            if (!cell || cell.v === null || cell.v === undefined) continue;

            const normalized = this.normalizeText(cell.v);

            if (normalized === 'create date') mapping.createDate = c;
            else if (normalized === 'delivery group') mapping.deliveryGroup = c;
            else if (normalized === 'master po number') mapping.masterPoNumber = c;
            else if (normalized === 'po #') mapping.poNumber = c;
            else if (normalized === 'channel') mapping.channel = c;
            else if (normalized === 'destination') mapping.destination = c;
            else if (normalized === 'route') mapping.route = c;
            else if (normalized === 'style name') mapping.styleName = c;
            else if (normalized === 'style') mapping.style = c;
            else if (normalized === 'color code') mapping.colorCode = c;
            else if (normalized === 'color description') mapping.colorDescription = c;
            else if (normalized === 'size') mapping.size = c;
            else if (normalized === 'current quantity') mapping.currentQuantity = c;
            else if (normalized === 'season') mapping.season = c;
            else if (normalized === 'orig po handover') mapping.origPoHandover = c;
            else if (normalized === 'crrt po handover') mapping.crrtPoHandover = c;
            else if (normalized === 'order shipment status') mapping.orderShipmentStatus = c;
            else if (normalized === 'ex-factory date') mapping.exFactoryDate = c;
            else if (normalized === 'shipped quantity') mapping.shippedQuantity = c;
            else if (normalized === 'current in dc (po)') mapping.currentInDcPo = c;
            else if (normalized === 'current isd') mapping.currentIsd = c;
            else if (normalized === 'delay reason caused by') mapping.delayReasonCausedBy = c;
            else if (normalized === 'delay reason code') mapping.delayReasonCode = c;
            else if (normalized === 'order status') mapping.orderStatus = c;
            else if (normalized === 'delay reason comments') mapping.delayReasonComments = c;
            else if (normalized === 'fob') mapping.fob = c;
            else if (normalized === 'manufacturer name') mapping.manufacturerName = c;
            else if (normalized === 'vendor name') mapping.vendorName = c;
            else if (normalized === 'total general' || normalized === 'total') {
                if (isQtyPivot) mapping.shippedQuantity = c;
                else mapping.currentQuantity = c;
            }
            else if (normalized === 'member id') {
                duplicateCounters.memberId += 1;
                if (duplicateCounters.memberId === 1) mapping.memberId1 = c;
                else if (duplicateCounters.memberId === 2) mapping.memberId2 = c;
            }
        }

        return mapping;
    }

    parseCellValue(value, asType) {
        if (value === null || value === undefined || value === '') return '';

        if (asType === 'date') {
            return value;
        }

        if (asType === 'number') {
            const num = Number(value);
            return Number.isFinite(num) ? num : 0;
        }

        return value;
    }

    getPivotFieldDefs() {
        return [
            { key: 'season', label: 'Season' },
            { key: 'deliveryGroup', label: 'Delivery Group' },
            { key: 'vendorName', label: 'Vendor Name' },
            { key: 'manufacturerName', label: 'Manufacturer Name' },
            { key: 'createDate', label: 'Create Date', sortType: 'date' },
            { key: 'masterPoNumber', label: 'Master PO Number', sortType: 'numeric' },
            { key: 'poNumber', label: 'PO #', sortType: 'numeric' },
            { key: 'origPoHandover', label: 'Orig PO Handover', sortType: 'date' },
            { key: 'crrtPoHandover', label: 'Crrt PO Handover', sortType: 'date' },
            { key: 'orderShipmentStatus', label: 'Order Shipment Status' },
            { key: 'exFactoryDate', label: 'Ex-Factory Date ', sortType: 'date' },
            { key: 'currentInDcPo', label: 'Current In DC (PO)', sortType: 'date' },
            { key: 'currentIsd', label: 'Current ISD', sortType: 'date' },
            { key: 'destination', label: 'Destination' },
            { key: 'channel', label: 'Channel' },
            { key: 'route', label: 'Route' },
            { key: 'style', label: 'Style' },
            { key: 'styleName', label: 'Style Name' },
            { key: 'colorCode', label: 'Color Code', sortType: 'numeric' },
            { key: 'colorDescription', label: 'Color Description' },
            { key: 'colorName', label: 'Color Name' },
            { key: 'fob', label: 'FOB', sortType: 'numeric' }
        ];
    }

    getPivotSizeHeaders() {
        return (this.getTemplateData().pivotSizeHeaders || []).map((value) => String(value));
    }

    getSizeLookup() {
        if (this.sizeLookup) {
            return this.sizeLookup;
        }

        const lookup = new Map();
        this.getPivotSizeHeaders().forEach((size) => {
            lookup.set(this.normalizeText(size), size);
        });
        this.sizeLookup = lookup;
        return lookup;
    }

    normalizePivotSize(value) {
        const size = String(value != null ? value : '').trim();
        if (!size) return '';
        const lookup = this.getSizeLookup();
        return lookup.get(this.normalizeText(size)) || size;
    }

    comparePivotValues(def, leftValue, rightValue) {
        if (def.sortType === 'date' || def.sortType === 'numeric') {
            const numA = Number(leftValue);
            const numB = Number(rightValue);
            const safeA = Number.isFinite(numA) ? numA : 0;
            const safeB = Number.isFinite(numB) ? numB : 0;
            return safeA - safeB;
        }

        const strA = String(leftValue != null ? leftValue : '');
        const strB = String(rightValue != null ? rightValue : '');
        return strA.localeCompare(strB, 'es', { numeric: true, sensitivity: 'base' });
    }

    aggregatePivotGroups() {
        const fieldDefs = this.getPivotFieldDefs();
        const sizeHeaders = this.getPivotSizeHeaders();
        const sizeSet = new Set(sizeHeaders.map((size) => this.normalizeText(size)));
        const currentGroups = new Map();
        const shippedGroups = new Map();

        const ensureGroup = (groupMap, key, values) => {
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    key,
                    values: { ...values },
                    sizes: new Map(),
                    total: 0
                });
            }
            return groupMap.get(key);
        };

        this.data.forEach((row) => {
            const rowValues = {
                season: row.season != null ? row.season : '',
                deliveryGroup: row.deliveryGroup != null ? row.deliveryGroup : '',
                vendorName: row.vendorName != null ? row.vendorName : '',
                manufacturerName: row.manufacturerName != null ? row.manufacturerName : '',
                createDate: row.createDate != null ? row.createDate : '',
                masterPoNumber: row.masterPoNumber != null ? row.masterPoNumber : '',
                poNumber: row.poNumber != null ? row.poNumber : '',
                origPoHandover: row.origPoHandover != null ? row.origPoHandover : '',
                crrtPoHandover: row.crrtPoHandover != null ? row.crrtPoHandover : '',
                orderShipmentStatus: row.orderShipmentStatus != null ? row.orderShipmentStatus : '',
                exFactoryDate: row.exFactoryDate != null ? row.exFactoryDate : '',
                currentInDcPo: row.currentInDcPo != null ? row.currentInDcPo : '',
                currentIsd: row.currentIsd != null ? row.currentIsd : '',
                destination: row.destination != null ? row.destination : '',
                channel: row.channel != null ? row.channel : '',
                route: row.route != null ? row.route : '',
                style: row.style != null ? row.style : '',
                styleName: row.styleName != null ? row.styleName : '',
                colorCode: row.colorCode != null ? row.colorCode : '',
                colorDescription: row.colorDescription != null ? row.colorDescription : '',
                colorName: this.getColorNameByCode(row.colorCode),
                fob: row.fob != null ? row.fob : ''
            };

            const groupKey = fieldDefs.map((def) => String(rowValues[def.key] != null ? rowValues[def.key] : '')).join('\u0001');
            const currentGroup = ensureGroup(currentGroups, groupKey, rowValues);
            const shippedGroup = ensureGroup(shippedGroups, groupKey, rowValues);
            const sizeLabel = this.normalizePivotSize(row.size);
            const currentQty = Number(row.currentQuantity) || 0;
            const shippedQty = Number(row.shippedQuantity) || 0;

            currentGroup.total += currentQty;
            shippedGroup.total += shippedQty;

            if (sizeLabel && sizeSet.has(this.normalizeText(sizeLabel))) {
                currentGroup.sizes.set(sizeLabel, (currentGroup.sizes.get(sizeLabel) || 0) + currentQty);
                shippedGroup.sizes.set(sizeLabel, (shippedGroup.sizes.get(sizeLabel) || 0) + shippedQty);
            } else {
                currentGroup.other = (currentGroup.other || 0) + currentQty;
                shippedGroup.other = (shippedGroup.other || 0) + shippedQty;
            }
        });

        const sortGroups = (groupMap) => {
            const groups = Array.from(groupMap.values());
            groups.sort((left, right) => {
                for (const def of fieldDefs) {
                    const diff = this.comparePivotValues(def, left.values[def.key], right.values[def.key]);
                    if (diff !== 0) return diff;
                }
                return 0;
            });
            return groups;
        };

        return {
            fieldDefs,
            sizeHeaders,
            currentGroups: sortGroups(currentGroups),
            shippedGroups: sortGroups(shippedGroups)
        };
    }

    buildColorCodeWorksheet() {
        const template = this.getTemplateData();
        const rows = [
            ['Color Code', 'Clr ', 'Color Name'],
            ...(template.colorCodeRows || []).map((row) => [
                String(row[0] != null ? row[0] : ''),
                String(row[1] != null ? row[1] : ''),
                String(row[2] != null ? row[2] : '')
            ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = (template.dataClrCodeWidths || [9.57, 12.57, 83.71]).map((width) => ({ wch: width }));
        this.applySheetTheme(ws, {
            headerRows: 1,
            dataStartRow: 1,
            freeze: { xSplit: 0, ySplit: 1 },
            autoFilter: true
        });
        return ws;
    }

    buildPivotWorksheet({ title, measureLabel, groups, includeSizes }) {
        const fieldDefs = this.getPivotFieldDefs();
        const sizeHeaders = includeSizes ? this.getPivotSizeHeaders() : [];
        const rowFields = fieldDefs.map((def) => def.label);
        const rowData = [];

        if (includeSizes) {
            rowData.push([]);
            rowData.push([]);
            rowData.push([title, ...new Array(rowFields.length - 1).fill(''), 'Size']);
            rowData.push([...rowFields, ...sizeHeaders, 'Total general']);

            groups.forEach((group) => {
                const row = fieldDefs.map((def) => group.values[def.key] != null ? group.values[def.key] : '');
                sizeHeaders.forEach((size) => {
                    row.push(group.sizes.get(size) || 0);
                });
                row.push(group.total || 0);
                rowData.push(row);
            });
        } else {
            rowData.push([]);
            rowData.push([]);
            rowData.push([title]);
            rowData.push([...rowFields, measureLabel]);

            groups.forEach((group) => {
                const row = fieldDefs.map((def) => group.values[def.key] != null ? group.values[def.key] : '');
                row.push(group.total || 0);
                rowData.push(row);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(rowData);
        ws['!cols'] = this.getPivotColumnWidths(includeSizes);
        this.applyPivotWorksheetTheme(ws, { includeSizes });
        return ws;
    }

    buildResultWorksheet({ currentGroups, shippedGroups }) {
        const fieldDefs = this.getPivotFieldDefs();
        const sizeHeaders = this.getPivotSizeHeaders();
        const rowFields = fieldDefs.map((def) => def.label);
        const shippedLookup = new Map();
        const buildKey = (group) => {
            if (group && group.key) {
                return group.key;
            }

            return fieldDefs.map((def) => String(group && group.values && group.values[def.key] != null ? group.values[def.key] : '')).join('\u0001');
        };

        (Array.isArray(shippedGroups) ? shippedGroups : []).forEach((group) => {
            shippedLookup.set(buildKey(group), Number(group && group.total) || 0);
        });

        const rowData = [];
        rowData.push([]);
        rowData.push([]);
        rowData.push(['Result', ...new Array(rowFields.length - 1).fill(''), 'Size']);
        rowData.push([...rowFields, ...sizeHeaders, 'Total general', 'Qty Shipped']);

        (Array.isArray(currentGroups) ? currentGroups : []).forEach((group) => {
            const row = fieldDefs.map((def) => group.values[def.key] != null ? group.values[def.key] : '');
            sizeHeaders.forEach((size) => {
                row.push(group.sizes.get(size) || 0);
            });
            row.push(group.total || 0);
            row.push(shippedLookup.get(buildKey(group)) || 0);
            rowData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(rowData);
        ws['!cols'] = this.getPivotColumnWidths(true, 2);
        this.applyPivotWorksheetTheme(ws, { includeSizes: true, measureColumnCount: 2 });
        return ws;
    }

    getPivotColumnWidths(includeSizes, measureColumnCount = 1) {
        const rowWidths = [
            8.42578125,
            16.7109375,
            23.85546875,
            25,
            13.7109375,
            11.7109375,
            11.7109375,
            12.85546875,
            11.85546875,
            16.140625,
            14.85546875,
            15.140625,
            15.140625,
            13.5703125,
            23.7109375,
            11.7109375,
            13,
            39.140625,
            10.85546875,
            11,
            52.42578125,
            9.140625
        ];
        const measureWidths = Array.from(
            { length: Math.max(1, Number(measureColumnCount) || 1) },
            () => ({ wch: 12.5703125 })
        );

        if (includeSizes) {
            return [
                ...rowWidths.map((width) => ({ wch: width })),
                ...new Array(this.getPivotSizeHeaders().length).fill({ wch: 9.140625 }),
                ...measureWidths
            ];
        }

        return [
            ...rowWidths.map((width) => ({ wch: width })),
            ...measureWidths
        ];
    }

    applyPivotWorksheetTheme(ws, options = {}) {
        if (!ws || !ws['!ref']) return;

        const theme = this.getExportTheme();
        const range = XLSX.utils.decode_range(ws['!ref']);
        const includeSizes = options.includeSizes !== false;
        const measureColumnCount = Math.max(1, Number(options.measureColumnCount) || 1);
        const titleRowIndex = 2;
        const headerRowIndex = 3;
        const dataStartRow = 4;
        const dateColumns = new Set([4, 7, 8, 10, 11, 12]);
        const numberColumns = new Set();
        const sizeCount = includeSizes ? this.getPivotSizeHeaders().length : 0;
        const sizeStartIndex = 22;
        const measureStartIndex = sizeStartIndex + sizeCount;
        if (includeSizes) {
            for (let idx = 0; idx < sizeCount; idx += 1) {
                numberColumns.add(sizeStartIndex + idx);
            }
        }
        for (let idx = 0; idx < measureColumnCount; idx += 1) {
            numberColumns.add(measureStartIndex + idx);
        }
        const rows = ws['!rows'] ? ws['!rows'].slice() : [];

        ws['!autofilter'] = { ref: ws['!ref'] };
        ws['!freeze'] = { xSplit: 0, ySplit: 4 };

        for (let r = range.s.r; r <= range.e.r; r += 1) {
            if (!rows[r]) rows[r] = {};
            rows[r].hpt = r === titleRowIndex ? 22 : (r === headerRowIndex ? 38 : 20);

            for (let c = range.s.c; c <= range.e.c; c += 1) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = ws[addr];
                if (!cell) continue;

                let style = theme.body;
                if (r === titleRowIndex) {
                    style = theme.title;
                } else if (r === headerRowIndex) {
                    style = theme.header;
                } else if (r >= dataStartRow && ((r - dataStartRow) % 2 === 1)) {
                    style = theme.bodyAlt;
                }

                if (dateColumns.has(c)) {
                    style = this.mergeExcelStyle(style, { numFmt: 'm/d/yy' });
                } else if (numberColumns.has(c)) {
                    style = this.mergeExcelStyle(style, { numFmt: '#,##0' });
                }

                cell.s = this.mergeExcelStyle(style);
            }
        }

        ws['!rows'] = rows;
    }

    async downloadWorkbook() {
        if (this.isExporting) return;

        if (!this.data.length) {
            alert('Primero importa un archivo SDR para poder descargar el workbook.');
            return;
        }

        this.isExporting = true;
        const button = this.btnDownloadWorkbook;
        const originalLabel = button ? button.innerHTML : '';
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span>Generando...</span>';
        }

        try {
            await new Promise((resolve) => setTimeout(resolve, 50));

            const wb = XLSX.utils.book_new();
            const { currentGroups, shippedGroups } = this.aggregatePivotGroups();

            const colorWs = this.buildColorCodeWorksheet();
            const dataWs = this.cloneWorksheet(
                this.sourceWorkbook && this.sourceSheetName && this.sourceWorkbook.Sheets[this.sourceSheetName]
            );

            if (!dataWs) {
                throw new Error('No se pudo reconstruir la hoja fuente SDR.');
            }

            const pivotCurrentWs = this.buildPivotWorksheet({
                title: 'Suma de Current Quantity',
                measureLabel: 'Total general',
                groups: currentGroups,
                includeSizes: true
            });

            const pivotShippedWs = this.buildPivotWorksheet({
                title: 'Suma de Shipped Quantity',
                measureLabel: 'Qty Shipped',
                groups: shippedGroups,
                includeSizes: true
            });
            const resultWs = this.buildResultWorksheet({
                currentGroups,
                shippedGroups
            });

            XLSX.utils.book_append_sheet(wb, colorWs, 'Data Clr Code');
            XLSX.utils.book_append_sheet(wb, dataWs, 'SDR - Data (Daily)');
            XLSX.utils.book_append_sheet(wb, pivotCurrentWs, 'SDR - PIVOT');
            XLSX.utils.book_append_sheet(wb, pivotShippedWs, 'SDR Qty Shpd - PIVOT');
            XLSX.utils.book_append_sheet(wb, resultWs, 'Result');
            const formulaMapWs = this.buildFormulaMapWorksheet(wb);
            if (formulaMapWs) {
                XLSX.utils.book_append_sheet(wb, formulaMapWs, 'Mapa de Formulas');
            }

            wb.Props = { ...(wb.Props || {}), Title: 'LLL SDR WIP' };

            XLSX.writeFile(wb, 'LLL SDR WIP.xlsx', { cellStyles: true });
        } catch (err) {
            console.error(err);
            alert(`No se pudo generar el export SDR:\n${err.message}`);
        } finally {
            this.isExporting = false;
            if (button) {
                button.disabled = false;
                button.innerHTML = originalLabel || '<span>Descargar SDR WIP</span>';
            }
        }
    }

    async loadFromWorkbook(arrayBuffer) {
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: false,
            cellNF: false,
            cellText: false,
            cellStyles: true
        });

        if (workbook.SheetNames.length === 0) {
            throw new Error('El archivo SDR no contiene hojas.');
        }

        const targetSheetName = workbook.SheetNames.find((name) => {
            const n = this.normalizeText(name);
            return n === 'result set' || n === 'sdr - data (daily)';
        });

        if (!targetSheetName) {
            throw new Error('El archivo SDR debe contener una hoja "Result Set" o "SDR - Data (Daily)".');
        }

        const worksheet = workbook.Sheets[targetSheetName];
        if (!worksheet || !worksheet['!ref']) {
            throw new Error(`La hoja "${targetSheetName}" no tiene datos válidos.`);
        }

        this.sourceArrayBuffer = arrayBuffer;
        this.sourceWorkbook = workbook;
        this.sourceSheetName = targetSheetName;
        this.colorLookup = null;

        const sheetRange = XLSX.utils.decode_range(worksheet['!ref']);
        const headerRowIndex = this.detectHeaderRow(worksheet, sheetRange, 12);
        if (headerRowIndex === -1) {
            throw new Error(`No se pudo detectar la cabecera SDR en la hoja "${targetSheetName}".`);
        }

        const mapping = this.mapHeaderColumns(worksheet, headerRowIndex, sheetRange, targetSheetName);
        const rows = [];

        for (let r = headerRowIndex + 1; r <= sheetRange.e.r; r += 1) {
            const getVal = (colIdx) => {
                if (colIdx === undefined) return null;
                const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
                const cell = worksheet[cellRef];
                return cell ? cell.v : null;
            };

            const rawRow = {
                createDate: this.parseCellValue(getVal(mapping.createDate), 'date'),
                deliveryGroup: this.parseCellValue(getVal(mapping.deliveryGroup)),
                masterPoNumber: this.parseCellValue(getVal(mapping.masterPoNumber)),
                poNumber: this.parseCellValue(getVal(mapping.poNumber), 'number'),
                channel: this.parseCellValue(getVal(mapping.channel)),
                destination: this.parseCellValue(getVal(mapping.destination)),
                route: this.parseCellValue(getVal(mapping.route)),
                styleName: this.parseCellValue(getVal(mapping.styleName)),
                style: this.parseCellValue(getVal(mapping.style)),
                colorCode: this.parseCellValue(getVal(mapping.colorCode), 'number'),
                colorDescription: this.parseCellValue(getVal(mapping.colorDescription)),
                size: this.parseCellValue(getVal(mapping.size)),
                currentQuantity: this.parseCellValue(getVal(mapping.currentQuantity), 'number'),
                season: this.parseCellValue(getVal(mapping.season)),
                origPoHandover: this.parseCellValue(getVal(mapping.origPoHandover), 'date'),
                crrtPoHandover: this.parseCellValue(getVal(mapping.crrtPoHandover), 'date'),
                orderShipmentStatus: this.parseCellValue(getVal(mapping.orderShipmentStatus)),
                exFactoryDate: this.parseCellValue(getVal(mapping.exFactoryDate), 'date'),
                shippedQuantity: this.parseCellValue(getVal(mapping.shippedQuantity), 'number'),
                currentInDcPo: this.parseCellValue(getVal(mapping.currentInDcPo), 'date'),
                currentIsd: this.parseCellValue(getVal(mapping.currentIsd), 'date'),
                delayReasonCausedBy: this.parseCellValue(getVal(mapping.delayReasonCausedBy)),
                delayReasonCode: this.parseCellValue(getVal(mapping.delayReasonCode)),
                orderStatus: this.parseCellValue(getVal(mapping.orderStatus)),
                delayReasonComments: this.parseCellValue(getVal(mapping.delayReasonComments)),
                fob: this.parseCellValue(getVal(mapping.fob), 'number'),
                manufacturerName: this.parseCellValue(getVal(mapping.manufacturerName)),
                vendorName: this.parseCellValue(getVal(mapping.vendorName)),
                memberId1: this.parseCellValue(getVal(mapping.memberId1)),
                memberId2: this.parseCellValue(getVal(mapping.memberId2))
            };

            const hasValues = Object.values(rawRow).some((value) => value !== null && value !== undefined && String(value).trim() !== '');
            if (hasValues) {
                rows.push(rawRow);
            }
        }

        return rows;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SdrController;
} else {
    window.SdrController = SdrController;
}
