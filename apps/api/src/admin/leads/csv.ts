/**
 * CSV seguro para Excel / LibreOffice / Google Sheets.
 * - Comillas dobles en todas las celdas y comillas internas duplicadas (RFC 4180).
 * - Inyección de fórmulas (CSV injection): si una celda empieza con = + - @ tab o
 *   retorno de carro, se antepone un apóstrofo para que se muestre como texto y no
 *   se ejecute. Los textos vienen del formulario público: no son de confianza.
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(','));
  // BOM UTF-8 para que Excel muestre bien los acentos.
  return `﻿${lines.join('\r\n')}\r\n`;
}
