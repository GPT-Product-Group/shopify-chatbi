import * as XLSX from "xlsx";

export function exportExcel<T extends Record<string, unknown>>(
  rows: T[],
  fileName = "export.xlsx",
) {
  const worksheet = XLSX.utils.json_to_sheet(rows ?? []);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, fileName);
}
