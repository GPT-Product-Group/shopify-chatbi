"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { normalizeRows, pickChartKeys } from "@/lib/normalize";

type ChartProps = {
  data: unknown;
  elementId: string;
};

export function DataChart({ data, elementId }: ChartProps) {
  const { rows: chartData } = normalizeRows(data);
  if (!chartData.length) {
    return (
      <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
        暂无可视化数据（需要数组形式的数据集）。
      </div>
    );
  }

  const { nameKey, valueKey } = pickChartKeys(chartData);

  if (!valueKey) {
    return (
      <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
        找不到可用的数值字段用于图表。
      </div>
    );
  }

  return (
    <div id={elementId} className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={nameKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={valueKey} fill="#0EA5E9" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
