/**
 * Facturación LLL - Modelo de Fórmulas y Metadatos de Tooltips
 */

const FormulaDefinitions = {
    CLIENTE: {
        formula: '=IF(A{row}="Cofaco Industries SAC","LULULEMON COF",IF(A{row}="Garment Industries SAC","LULULEMON GAR"," "))',
        criteria: 'Si el Vendedor original (DATA 1) es "Cofaco Industries SAC", se asigna "LULULEMON COF". Si es "Garment Industries SAC", se asigna "LULULEMON GAR". De lo contrario, queda vacío.',
        calculate: (row) => {
            const data1 = row.data1 || '';
            if (data1.includes('Cofaco Industries SAC')) return 'LULULEMON COF';
            if (data1.includes('Garment Industries SAC')) return 'LULULEMON GAR';
            return ' ';
        }
    },
    VENDOR: {
        formula: '=IF(A{row}="Cofaco Industries SAC","COFACO",IF(A{row}="Garment Industries SAC","GARMENT"," "))',
        criteria: 'Si el Vendedor original (DATA 1) es "Cofaco Industries SAC", se asigna "COFACO". Si es "Garment Industries SAC", se asigna "GARMENT". De lo contrario, queda vacío.',
        calculate: (row) => {
            const data1 = row.data1 || '';
            if (data1.includes('Cofaco Industries SAC')) return 'COFACO';
            if (data1.includes('Garment Industries SAC')) return 'GARMENT';
            return ' ';
        }
    },
    Bordado: {
        formula: '=IF(ISNUMBER(SEARCH("Bordado",C{row})),"B","")',
        criteria: 'Busca la palabra "Bordado" en la columna de MARKETING (DATA 3) de manera insensible a mayúsculas. Si la encuentra, marca la celda con "B".',
        calculate: (row) => {
            const data3 = row.data3 || '';
            return /bordado/i.test(data3) ? 'B' : '';
        }
    },
    Estampado: {
        formula: '=IF(ISNUMBER(SEARCH("Estampado",C{row})),"E","")',
        criteria: 'Busca la palabra "Estampado" en la columna de MARKETING (DATA 3) de manera insensible a mayúsculas. Si la encuentra, marca la celda con "E".',
        calculate: (row) => {
            const data3 = row.data3 || '';
            return /estampado/i.test(data3) ? 'E' : '';
        }
    },
    TotalUS: {
        formula: '=CANTIDAD*PRECIO_$',
        criteria: 'Multiplica la cantidad de prendas (CANTIDAD) por el precio unitario pactado (PRECIO $).',
        calculate: (row) => {
            const qty = parseFloat(row.cantidad) || 0;
            const price = parseFloat(row.precio) || 0;
            return qty * price;
        }
    },
    STATUS: {
        formula: '=IF(B{row}="Fully Shipped","DESPACHADO",IF(B{row}="Not Shipped","EN PROCESO",IF(B{row}="Partially Shipped","DESPACHADO",IF(B{row}="(en blanco)","EN PROCESO"," "))))',
        criteria: 'Clasifica el estado de despacho: "DESPACHADO" si DATA 2 es "Fully Shipped" o "Partially Shipped"; "EN PROCESO" si es "Not Shipped" o "(en blanco)".',
        calculate: (row) => {
            const data2 = (row.data2 || '').trim();
            if (data2 === 'Fully Shipped' || data2 === 'Partially Shipped') {
                return 'DESPACHADO';
            }
            if (data2 === 'Not Shipped' || data2 === '' || data2 === '(en blanco)') {
                return 'EN PROCESO';
            }
            return ' ';
        }
    },
    Wk: {
        formula: '=WEEKNUM(Q{row})',
        criteria: 'Calcula el número de semana del año (1 a 53) correspondiente a la fecha de despacho (FECHA DESPACHO).',
        calculate: (row) => {
            if (!row.fechaDespacho) return 0;
            const parts = row.fechaDespacho.split('-');
            let d;
            if (parts.length === 3) {
                d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
            } else {
                d = new Date(row.fechaDespacho);
            }
            if (isNaN(d.getTime())) return 0;
            
            // Algoritmo WEEKNUM de Excel (Tipo 1: Domingo inicio de semana)
            const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const startDay = startOfYear.getUTCDay(); // 0 es Domingo
            const firstSunday = new Date(startOfYear);
            if (startDay > 0) {
                firstSunday.setUTCDate(startOfYear.getUTCDate() + (7 - startDay));
            }
            
            if (d < firstSunday) {
                return 1;
            }
            
            const diffMs = d.getTime() - firstSunday.getTime();
            const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
            return Math.floor(diffDays / 7) + 2;
        }
    },
    MONTH: {
        formula: '=TEXT(Q{row},"MMMM")',
        criteria: 'Obtiene el nombre completo del mes en español (capitalizado) correspondiente a la fecha de despacho (FECHA DESPACHO).',
        calculate: (row) => {
            if (!row.fechaDespacho) return 'Enero';
            const parts = row.fechaDespacho.split('-');
            let monthIdx = 0;
            if (parts.length === 3) {
                monthIdx = parseInt(parts[1], 10) - 1;
            } else {
                const d = new Date(row.fechaDespacho);
                if (isNaN(d.getTime())) return 'Enero';
                monthIdx = d.getUTCMonth();
            }
            const months = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            return months[monthIdx];
        }
    },
    YEAR3: {
        formula: '=TEXT(Q{row},"YYY")',
        criteria: 'Extrae el año en formato de texto a partir de la fecha de despacho (FECHA DESPACHO).',
        calculate: (row) => {
            if (!row.fechaDespacho) return '1900';
            const parts = row.fechaDespacho.split('-');
            if (parts.length === 3) {
                return parts[0];
            } else {
                const d = new Date(row.fechaDespacho);
                if (isNaN(d.getTime())) return '1900';
                return d.getUTCFullYear().toString();
            }
        }
    }
};

/**
 * Recalcula todos los campos de fórmula para una fila de datos.
 * @param {Object} row Fila de la tabla
 * @param {number} rowIndex Número de fila en Excel (para generar fórmulas correctas en tooltips)
 * @returns {Object} Fila recalculada
 */
function recalculateRow(row, rowIndex = 2) {
    const updatedRow = { ...row };
    
    // Calcular fórmulas
    updatedRow.cliente = FormulaDefinitions.CLIENTE.calculate(updatedRow);
    updatedRow.vendorCalc = FormulaDefinitions.VENDOR.calculate(updatedRow);
    updatedRow.bordado = FormulaDefinitions.Bordado.calculate(updatedRow);
    updatedRow.estampado = FormulaDefinitions.Estampado.calculate(updatedRow);
    updatedRow.totalUs = FormulaDefinitions.TotalUS.calculate(updatedRow);
    updatedRow.status = FormulaDefinitions.STATUS.calculate(updatedRow);
    updatedRow.wk = FormulaDefinitions.Wk.calculate(updatedRow);
    updatedRow.month = FormulaDefinitions.MONTH.calculate(updatedRow);
    updatedRow.year3 = FormulaDefinitions.YEAR3.calculate(updatedRow);
    
    return updatedRow;
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FormulaDefinitions, recalculateRow };
} else {
    window.FormulaDefinitions = FormulaDefinitions;
    window.recalculateRow = recalculateRow;
}
