/**
 * Facturación LLL - Analizador y Agrupador de Excel (Réplica de PIVOT)
 */

const ExcelParser = {
    /**
     * Utilidad para normalizar texto para búsquedas (quita acentos, saltos de línea y mayúsculas)
     */
    normalizeText: (text) => {
        if (text === null || text === undefined) return '';
        return String(text)
            .toLowerCase()
            .replace(/\r?\n|\r/g, ' ')
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    },

    /**
     * Convierte número de serie de fecha de Excel a objeto Date de JS
     */
    excelSerialToDate: (serial) => {
        if (!serial && serial !== 0) return null;
        if (serial instanceof Date) {
            // Si es un objeto Date de JS, extraemos sus componentes en UTC
            return new Date(Date.UTC(serial.getUTCFullYear(), serial.getUTCMonth(), serial.getUTCDate()));
        }
        if (typeof serial === 'number') {
            // Número de serie de Excel (independiente de la zona horaria en UTC)
            // Redondeamos para evitar microsegundos de imprecisión flotante
            return new Date(Date.UTC(1899, 11, 30 + Math.round(serial)));
        }
        if (typeof serial === 'string') {
            const parsed = new Date(serial);
            if (isNaN(parsed.getTime())) return null;
            return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
        }
        return null;
    },

    /**
     * Formatea una fecha como YYYY-MM-DD
     */
    formatDate: (dateObj) => {
        if (!dateObj || isNaN(dateObj.getTime())) return '';
        const yyyy = dateObj.getUTCFullYear();
        const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    /**
     * Analiza el archivo LLL Global Report y genera las filas agrupadas para Facturacion Template.
     * @param {ArrayBuffer} arrayBuffer Contenido del archivo Excel
     * @returns {Promise<Array>} Promesa que resuelve a un array de objetos con las filas agrupadas
     */
    parseGlobalReport: async (arrayBuffer) => {
        return new Promise((resolve, reject) => {
            try {
                // Cargar el libro usando XLSX (SheetJS)
                const data = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: false, cellNF: false, cellText: false });
                
                // Buscar la hoja LLL GR.
                const sheetName = 'LLL GR.';
                if (!workbook.SheetNames.includes(sheetName)) {
                    throw new Error(`No se encontró la hoja requerida '${sheetName}' en el archivo Excel.`);
                }
                
                const worksheet = workbook.Sheets[sheetName];
                
                // Convertir hoja a matriz de celdas raw para procesar fácilmente
                const sheetRange = XLSX.utils.decode_range(worksheet['!ref']);
                const totalRows = sheetRange.e.r + 1;
                
                // 1. Encontrar la fila de cabeceras dinámicamente (escanear primeras 15 filas)
                let headerRowIndex = -1;
                let colMapping = {};
                
                for (let r = 0; r < Math.min(15, totalRows); r++) {
                    const rowCells = [];
                    for (let c = sheetRange.s.c; c <= sheetRange.e.c; c++) {
                        const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
                        const cell = worksheet[cellRef];
                        rowCells.push(cell ? cell.v : null);
                    }
                    
                    // Buscar columnas críticas
                    let hasStatus = false;
                    let hasVendor = false;
                    let tempMapping = {};
                    
                    rowCells.forEach((val, cIdx) => {
                        if (val === null || val === undefined) return;
                        const normalized = ExcelParser.normalizeText(val);
                        
                        // Mapeo por nombre de columna
                        if (normalized === 'status season' || normalized === 'status\nseason') {
                            hasStatus = true;
                            tempMapping.statusSeason = cIdx;
                        } else if (normalized === 'vendor') {
                            hasVendor = true;
                            tempMapping.vendor = cIdx;
                        } else if (normalized === 'order shipment status') {
                            tempMapping.orderShipmentStatus = cIdx;
                        } else if (normalized.includes('marketing')) {
                            tempMapping.marketing = cIdx;
                        } else if (normalized === 'season') {
                            // Guardar solo si no hemos asignado una más específica
                            if (tempMapping.season === undefined) {
                                tempMapping.season = cIdx;
                            }
                        } else if (normalized === 'gain') {
                            tempMapping.gain = cIdx;
                        } else if (normalized === 'op') {
                            tempMapping.op = cIdx;
                        } else if (normalized === 'style name' || normalized === 'style') {
                            tempMapping.styleName = cIdx;
                        } else if (normalized.includes('tela (facturacion)') || normalized.includes('tela (facturacion)')) {
                            tempMapping.telaFacturacion = cIdx;
                        } else if (normalized === 'articulo interno (cof)') {
                            tempMapping.articuloInterno = cIdx;
                        } else if (normalized === 'description') {
                            tempMapping.description = cIdx;
                        } else if (normalized === 'cof fob br' || normalized === 'cof\nfob br') {
                            tempMapping.cofFobBr = cIdx;
                        } else if (normalized === 'hod lululemon' || normalized === 'hod\nlululemon') {
                            tempMapping.hodLululemon = cIdx;
                        } else if (normalized === 'm a r g e n' || normalized === 'margen') {
                            tempMapping.margen = cIdx;
                        } else if (normalized === 'total po qty' || normalized === 'total\npo qty') {
                            tempMapping.totalPoQty = cIdx;
                        }
                    } );
                    
                    // Si encontramos al menos Status y Vendor, esta es nuestra fila de cabeceras
                    if (hasStatus && hasVendor) {
                        headerRowIndex = r;
                        colMapping = tempMapping;
                        break;
                    }
                }
                
                if (headerRowIndex === -1) {
                    throw new Error("No se pudo detectar la fila de cabeceras en el archivo Excel. Asegúrese de que las columnas 'STATUS\\nSeason' y 'VENDOR' estén presentes.");
                }
                
                console.log(`Cabecera detectada en la fila ${headerRowIndex + 1}. Mapeo:`, colMapping);
                
                // 2. Procesar filas y realizar agrupación (Réplica del PIVOT)
                const groups = {};
                
                // Empezar a leer desde la fila posterior a la cabecera
                for (let r = headerRowIndex + 1; r < totalRows; r++) {
                    const getVal = (colIdx) => {
                        if (colIdx === undefined) return null;
                        const cellRef = XLSX.utils.encode_cell({ r: r, c: colIdx });
                        const cell = worksheet[cellRef];
                        return cell ? cell.v : null;
                    };
                    
                    // A. Filtro por Estado: STATUS\nSeason == 'Producción'
                    const statusSeasonVal = getVal(colMapping.statusSeason);
                    const normalizedStatusSeason = ExcelParser.normalizeText(statusSeasonVal);
                    
                    // Consideramos válido "producción", "produccion", "producción "
                    if (!normalizedStatusSeason.startsWith('produccion')) {
                        continue; // Saltar fila
                    }
                    
                    // B. Obtener los 11 campos clave
                    const vendor = String(getVal(colMapping.vendor) || '').trim();
                    const orderShipmentStatus = String(getVal(colMapping.orderShipmentStatus) || '').trim();
                    const marketing = String(getVal(colMapping.marketing) || '').trim();
                    const season = String(getVal(colMapping.season) || '').trim();
                    const gain = String(getVal(colMapping.gain) || '').trim();
                    const op = parseInt(getVal(colMapping.op), 10) || 0;
                    const styleName = String(getVal(colMapping.styleName) || '').trim();
                    
                    // Tela (Facturación): Si está en la columna directa, usarla; si no, concatenar ES y EV
                    let tela = '';
                    if (colMapping.telaFacturacion !== undefined) {
                        tela = String(getVal(colMapping.telaFacturacion) || '').trim();
                    }
                    // Si no se encuentra, o está vacía, intentamos concatenar Artículo Interno y Descripción
                    if (!tela && colMapping.articuloInterno !== undefined && colMapping.description !== undefined) {
                        const artInt = String(getVal(colMapping.articuloInterno) || '').trim();
                        const desc = String(getVal(colMapping.description) || '').trim();
                        if (artInt || desc) {
                            tela = `${artInt} / ${desc}`;
                        }
                    }
                    
                    const price = parseFloat(getVal(colMapping.cofFobBr)) || 0;
                    
                    // Fecha de despacho: Convertir a Date
                    const rawDate = getVal(colMapping.hodLululemon);
                    const parsedDate = ExcelParser.excelSerialToDate(rawDate);
                    const formattedDate = ExcelParser.formatDate(parsedDate);
                    
                    const margen = parseFloat(getVal(colMapping.margen)) || 0;
                    
                    // Cantidad a sumar
                    const qty = parseInt(getVal(colMapping.totalPoQty), 10) || 0;
                    
                    // C. Crear clave de agrupación única
                    const groupKey = [
                        vendor,
                        orderShipmentStatus,
                        marketing,
                        season,
                        gain,
                        op,
                        styleName,
                        tela,
                        price,
                        formattedDate,
                        margen
                    ].join('|||');
                    
                    // D. Agregar al grupo
                    if (!groups[groupKey]) {
                        groups[groupKey] = {
                            data1: vendor,
                            data2: orderShipmentStatus,
                            data3: marketing,
                            season: season,
                            programa: gain,
                            op: op,
                            estilo: styleName,
                            garmentDye: '', // Siempre vacío en plantilla
                            tela: tela,
                            cantidad: 0,
                            precio: price,
                            fechaDespacho: formattedDate,
                            year4: margen
                        };
                    }
                    
                    groups[groupKey].cantidad += qty;
                }
                
                // Convertir el objeto de grupos a una lista de filas final
                const resultRows = Object.values(groups);
                console.log(`Agrupación completada. Se generaron ${resultRows.length} filas agrupadas.`);
                resolve(resultRows);
                
            } catch (err) {
                console.error("Error al analizar el reporte global:", err);
                reject(err);
            }
        });
    }
};

// Exportar módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelParser;
} else {
    window.ExcelParser = ExcelParser;
}
