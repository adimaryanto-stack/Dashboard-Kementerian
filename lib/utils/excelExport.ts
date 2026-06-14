import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Helper to format currency values or write formulas
export interface ExcelCellConfig {
  value: any; // Can be a string, number, or formula object like { formula: '...' }
  isCurrency?: boolean;
  isPercent?: boolean;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  bgColor?: string; // Hex color e.g., 'E0E7FF'
  textColor?: string;
}

export interface ExcelSheetData {
  name: string;
  headers: string[];
  rows: ExcelCellConfig[][];
  columnWidths?: number[];
}

/**
 * Generates and downloads a multi-sheet or single-sheet Excel workbook
 */
export async function exportToExcel(filename: string, sheets: ExcelSheetData[]) {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach((sheetData) => {
    const sheet = workbook.addWorksheet(sheetData.name, {
      views: [{ showGridLines: true }]
    });

    // Add Headers
    const headerRow = sheet.addRow(sheetData.headers);
    headerRow.height = 28;
    
    // Style Header Row
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F46E5' } // Indigo-600 premium accent
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'medium', color: { argb: '312E81' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };
    });

    // Add Data Rows
    sheetData.rows.forEach((rowConfig) => {
      const rowData = rowConfig.map((cell) => {
        if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
          return cell.value; // It is a formula object
        }
        return cell.value;
      });

      const excelRow = sheet.addRow(rowData);
      excelRow.height = 22;

      rowConfig.forEach((cellConfig, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        
        // Font
        cell.font = {
          name: 'Arial',
          size: 10,
          bold: cellConfig.bold || false,
          color: cellConfig.textColor ? { argb: cellConfig.textColor } : undefined
        };

        // Alignment
        cell.alignment = {
          vertical: 'middle',
          horizontal: cellConfig.align || (cellConfig.isCurrency || cellConfig.isPercent ? 'right' : 'left')
        };

        // Formatting
        if (cellConfig.isCurrency) {
          cell.numFormat = 'Rp#,##0';
        } else if (cellConfig.isPercent) {
          cell.numFormat = '0.0%';
        }

        // Fills / Background Colors
        if (cellConfig.bgColor) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: cellConfig.bgColor }
          };
        }

        // Standard borders
        cell.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        };
      });
    });

    // Set Column Widths
    if (sheetData.columnWidths) {
      sheetData.columnWidths.forEach((width, index) => {
        const col = sheet.getColumn(index + 1);
        col.width = width;
      });
    } else {
      // Auto-fit widths based on content length
      sheet.columns.forEach((column) => {
        let maxLen = 10;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          let cellVal = cell.value;
          if (cellVal && typeof cellVal === 'object' && 'formula' in cellVal) {
            cellVal = 'FormulaItemLength';
          }
          const valLen = cellVal ? String(cellVal).length : 0;
          if (valLen > maxLen) maxLen = valLen;
        });
        column.width = Math.min(maxLen + 4, 35);
      });
    }
  });

  // Write and Save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}

/**
 * Returns a color class representation hex for conditional formatting based on percentage (0-100 scale)
 */
export function getPctColorHex(pctValue: number): { bg: string; text: string } {
  if (pctValue >= 80) {
    return { bg: 'D1FAE5', text: '065F46' }; // Tailwind emerald-100 / emerald-800
  }
  if (pctValue >= 50) {
    return { bg: 'FEF3C7', text: '92400E' }; // Tailwind amber-100 / amber-800
  }
  return { bg: 'FEE2E2', text: '991B1B' }; // Tailwind red-100 / red-800
}
