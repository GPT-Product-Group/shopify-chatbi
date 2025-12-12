"use client";

import { exportCsv } from "@/lib/export/csv";
import { exportExcel } from "@/lib/export/excel";
import { exportPdfFromText } from "@/lib/export/pdf";
import { exportPngFromElement } from "@/lib/export/png";
import { normalizeRows } from "@/lib/normalize";

type Props = {
  data: unknown;
  fileBaseName: string;
  targetElementId: string;
};

export function ExportButtons({
  data,
  fileBaseName,
  targetElementId,
}: Props) {
  const { rows } = normalizeRows(data);

  const handleExcel = () => {
    exportExcel(rows, `${fileBaseName}.xlsx`);
  };

  const handleCsv = () => {
    exportCsv(rows, `${fileBaseName}.csv`);
  };

  const handlePdf = () => {
    const text =
      typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
    exportPdfFromText("数据导出", text.split("\n"), `${fileBaseName}.pdf`);
  };

  const handlePng = () => {
    exportPngFromElement(targetElementId, `${fileBaseName}.png`).catch(
      (err) => {
        console.error(err);
        alert("导出 PNG 失败，请检查元素是否存在。");
      },
    );
  };

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <button
        className="rounded-md border border-neutral-200 bg-white px-3 py-2 hover:bg-neutral-50"
        onClick={handleExcel}
      >
        导出 Excel
      </button>
      <button
        className="rounded-md border border-neutral-200 bg-white px-3 py-2 hover:bg-neutral-50"
        onClick={handleCsv}
      >
        导出 CSV
      </button>
      <button
        className="rounded-md border border-neutral-200 bg-white px-3 py-2 hover:bg-neutral-50"
        onClick={handlePdf}
      >
        导出 PDF
      </button>
      <button
        className="rounded-md border border-neutral-200 bg-white px-3 py-2 hover:bg-neutral-50"
        onClick={handlePng}
      >
        导出 PNG
      </button>
    </div>
  );
}
