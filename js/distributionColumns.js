/**
 * Facturación LLL - Columnas exportables por módulo para Distribución.
 * Rangos verificados contra archivos de referencia:
 * - LLL WIP  -> WIP LLL/LLL Wip Updated 6.5.26.xlsx  (202 cols, sin ocultas)
 * - EXPO WIP -> WIP EXPO/LLL WIP Updated 6.3.26.xlsx (206 cols, con ocultas)
 * - PCP WIP  -> WIP PCP/LLL WIP Updated 6.3.26.xlsx  (206 cols, con ocultas)
 */

(function (root) {
    const expandRanges = (ranges) => {
        const cols = [];

        ranges.forEach(([start, end]) => {
            for (let col = start; col <= end; col += 1) {
                cols.push(col);
            }
        });

        return cols;
    };

    const config = {
        LLL: {
            sheetName: 'LLL',
            title: 'LLL WIP',
            filenamePrefix: 'LLL WIP',
            suffix: 'LLL',
            accentColor: '#4F8F62',
            accentSoftColor: '#E6F2EA',
            description: 'Encabezados azules del template',
            // 202 columnas — incluye cols 1-2 (Conc), excluye col 254 (COFACO days before HOD)
            columns: expandRanges([
                [1, 14],
                [17, 21],
                [27, 27],
                [29, 32],
                [41, 45],
                [48, 49],
                [51, 97],
                [101, 102],
                [106, 106],
                [121, 121],
                [123, 123],
                [126, 132],
                [139, 142],
                [151, 153],
                [155, 178],
                [180, 212],
                [217, 220],
                [222, 236],
                [238, 242],
                [245, 249],
                [251, 253],
                [255, 255],
                [270, 284]
            ])
        },
        EXPO: {
            sheetName: 'EXPO',
            title: 'EXPO WIP',
            filenamePrefix: 'EXPO WIP',
            suffix: 'EXPO',
            accentColor: '#D97BAE',
            accentSoftColor: '#F8E4EF',
            description: 'Encabezados rosados del template',
            // 206 columnas — mismo subconjunto que PCP, incluye cols ocultas de la referencia
            columns: expandRanges([
                [1, 14],
                [17, 21],
                [27, 27],
                [41, 44],
                [49, 49],
                [51, 52],
                [60, 97],
                [108, 123],
                [127, 133],
                [135, 149],
                [151, 167],
                [170, 172],
                [169, 169],
                [175, 178],
                [180, 254],
                [256, 258]
            ])
        },
        PCP: {
            sheetName: 'PCP',
            title: 'PCP WIP',
            filenamePrefix: 'PCP WIP',
            suffix: 'PCP',
            accentColor: '#7CB342',
            accentSoftColor: '#E6F2D9',
            description: 'Encabezados verdes del template',
            // 206 columnas — excluye cols internas del fuente (HOD-LLL, costos FOB, fechas intermedias)
            columns: expandRanges([
                [1, 14],
                [17, 21],
                [27, 27],
                [41, 44],
                [49, 49],
                [51, 52],
                [60, 97],
                [108, 123],
                [127, 133],
                [135, 149],
                [151, 167],
                [170, 172],
                [169, 169],
                [175, 178],
                [180, 254],
                [256, 258]
            ])
        }
    };

    root.DistributionModuleConfig = config;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = config;
    }
})(typeof window !== 'undefined' ? window : globalThis);
