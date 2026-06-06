/**
 * Facturación LLL - Columnas exportables por módulo para Distribución.
 * La plantilla visual se toma de LLL Global Report.xlsx y usa tres bloques de encabezado:
 * - LLL WIP  -> encabezado azul
 * - EXPO WIP -> encabezado rosado
 * - PCP WIP  -> encabezado verde
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

    const buildColumns = (ranges) => expandRanges(ranges).filter((col) => col > 2);

    const config = {
        LLL: {
            sheetName: 'LLL',
            title: 'LLL WIP',
            filenamePrefix: 'LLL WIP',
            suffix: 'LLL',
            accentColor: '#4F8F62',
            accentSoftColor: '#E6F2EA',
            description: 'Encabezados azules del template',
            columns: buildColumns([
                [1, 14],
                [17, 21],
                [27, 27],
                [29, 32],
                [41, 45],
                [48, 49],
                [51, 59],
                [60, 64],
                [65, 97],
                [101, 102],
                [106, 106],
                [121, 121],
                [123, 123],
                [126, 131],
                [132, 132],
                [139, 142],
                [151, 153],
                [155, 162],
                [163, 176],
                [177, 178],
                [180, 185],
                [186, 188],
                [189, 196],
                [197, 198],
                [199, 200],
                [201, 204],
                [205, 208],
                [209, 212],
                [217, 220],
                [222, 227],
                [228, 230],
                [231, 233],
                [234, 236],
                [238, 240],
                [241, 242],
                [245, 247],
                [248, 249],
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
            columns: buildColumns([
                [9, 9],
                [19, 21],
                [27, 27],
                [61, 61],
                [64, 64],
                [94, 94],
                [217, 219],
                [228, 230],
                [231, 233],
                [234, 236],
                [238, 242],
                [245, 247],
                [251, 254],
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
            columns: buildColumns([
                [9, 9],
                [19, 21],
                [27, 27],
                [61, 61],
                [64, 64],
                [94, 94],
                [217, 219],
                [228, 230],
                [231, 233],
                [234, 236],
                [238, 242],
                [245, 247],
                [251, 254],
                [256, 258]
            ])
        }
    };

    root.DistributionModuleConfig = config;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = config;
    }
})(typeof window !== 'undefined' ? window : globalThis);
