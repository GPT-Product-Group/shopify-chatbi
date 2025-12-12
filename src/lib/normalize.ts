export type NormalizedRows = {
  rows: Record<string, unknown>[];
  sourcePath?: string;
};

// 尝试从 Shopify GraphQL 常见结构中提取数组
export function normalizeRows(data: unknown): NormalizedRows {
  if (Array.isArray(data)) {
    return { rows: data as Record<string, unknown>[], sourcePath: "root" };
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    // 形如 { orders: { edges: [...] } }
    for (const [key, value] of Object.entries(obj)) {
      if (
        value &&
        typeof value === "object" &&
        "edges" in (value as Record<string, unknown>)
      ) {
        const edges = (value as Record<string, unknown>).edges;
        if (Array.isArray(edges)) {
          const rows = edges.map((e) =>
            e && typeof e === "object" && "node" in (e as Record<string, unknown>)
              ? ((e as Record<string, unknown>).node as Record<string, unknown>)
              : (e as Record<string, unknown>),
          );
          return { rows, sourcePath: `${key}.edges` };
        }
      }
    }

    // 形如 { products: { nodes: [...] } }
    for (const [key, value] of Object.entries(obj)) {
      if (
        value &&
        typeof value === "object" &&
        "nodes" in (value as Record<string, unknown>)
      ) {
        const nodes = (value as Record<string, unknown>).nodes;
        if (Array.isArray(nodes)) {
          return { rows: nodes as Record<string, unknown>[], sourcePath: `${key}.nodes` };
        }
      }
    }

    // 找第一个数组字段
    const firstArrayEntry = Object.entries(obj).find(([, v]) => Array.isArray(v));
    if (firstArrayEntry) {
      const [key, arr] = firstArrayEntry;
      return { rows: arr as Record<string, unknown>[], sourcePath: key };
    }
  }

  return { rows: [] };
}

export function pickChartKeys(rows: Record<string, unknown>[]) {
  const sample = rows[0] ?? {};
  const numericKeys = Object.keys(sample).filter(
    (k) => typeof (sample as Record<string, unknown>)[k] === "number",
  );
  const valueKey = numericKeys[0] ?? null;

  // 选一个非数值字段做名称
  const nameKey =
    Object.keys(sample).find((k) => k !== valueKey) ?? Object.keys(sample)[0] ?? "name";

  return { nameKey, valueKey };
}
