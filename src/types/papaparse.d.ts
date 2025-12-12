declare module "papaparse" {
  export interface UnparseOptions {
    quotes?: boolean | boolean[];
    quoteChar?: string;
    delimiter?: string;
    header?: boolean;
    newline?: string;
    skipEmptyLines?: boolean | "greedy";
    columns?: string[];
  }

  export function unparse<T extends Record<string, unknown>>(data: T[] | object, config?: UnparseOptions): string;

  const Papa: {
    unparse: typeof unparse;
  };

  export default Papa;
}
