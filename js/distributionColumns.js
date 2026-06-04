/**
 * Facturación LLL - Columnas exportables por módulo para Distribución.
 * Las columnas se derivan de la plantilla Lululemon 7.31.25.xlsx:
 * - fila 1: azul -> LLL
 * - fila 2: rosado -> EXPO
 * - fila 3: verde  -> PCP
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
            title: 'LLL WIP Updated',
            filenamePrefix: 'LLL WIP Updated',
            suffix: 'LLL',
            columns: expandRanges([
                [1, 14],
                [16, 22],
                [34, 34],
                [39, 44],
                [51, 54],
                [58, 74],
                [77, 80],
                [82, 120],
                [124, 124],
                [126, 126],
                [145, 145],
                [148, 151],
                [164, 167],
                [171, 194],
                [196, 232],
                [236, 239],
                [241, 254],
                [256, 263],
                [265, 265]
            ])
        },
        EXPO: {
            sheetName: 'Expo',
            title: 'LLL WIP Updated Expo',
            filenamePrefix: 'LLL WIP Updated',
            suffix: 'Expo',
            columns: expandRanges([
                [1, 14],
                [18, 22],
                [34, 34],
                [43, 44],
                [50, 50],
                [77, 80],
                [82, 120],
                [124, 124],
                [126, 126],
                [129, 131],
                [147, 147],
                [151, 151],
                [156, 156],
                [163, 181]
            ])
        },
        PCP: {
            sheetName: 'PCP',
            title: 'LLL WIP Updated PCP',
            filenamePrefix: 'LLL WIP Updated',
            suffix: 'PCP',
            columns: expandRanges([
                [1, 14],
                [16, 22],
                [34, 34],
                [51, 57],
                [80, 80],
                [82, 120],
                [129, 142],
                [145, 145],
                [149, 153],
                [156, 156],
                [158, 159],
                [161, 186],
                [189, 194],
                [196, 264],
                [266, 268]
            ])
        }
    };

    root.DistributionModuleConfig = config;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = config;
    }
})(typeof window !== 'undefined' ? window : globalThis);
