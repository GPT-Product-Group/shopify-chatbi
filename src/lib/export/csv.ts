import Papa from "papaparse";

export function exportCsv<T extends Record<string, unknown>>(
  rows: T[],
  fileName = "export.csv",
) {
  const csv = Papa.unparse(rows ?? []);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
