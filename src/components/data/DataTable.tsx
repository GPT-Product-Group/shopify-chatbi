"use client";

import { normalizeRows } from "@/lib/normalize";

type TableProps = {
  data: unknown;
};

export function DataTable({ data }: TableProps) {
  const { rows, sourcePath } = normalizeRows(data);
  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
        暂无表格数据（需要 GraphQL 返回数组字段）。
      </div>
    );
  }

  const headers = Object.keys(rows[0] ?? {});

  return (
    <div className="overflow-auto rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-100 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
        数据源路径：{sourcePath ?? "未知"}
      </div>
      <table className="min-w-full divide-y divide-neutral-200 text-sm">
        <thead className="bg-neutral-50">
          <tr>
            {headers.map((key) => (
              <th
                key={key}
                className="px-4 py-2 text-left font-semibold text-neutral-700"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white">
          {rows.map((row, idx) => (
            <tr key={idx}>
              {headers.map((key) => (
                <td key={key} className="px-4 py-2 align-top text-neutral-800">
                  <pre className="whitespace-pre-wrap text-xs leading-5">
                    {String(
                      typeof row[key] === "object"
                        ? JSON.stringify(row[key], null, 2)
                        : row[key] ?? "",
                    )}
                  </pre>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
