export interface Statement<T = unknown> {
  run(params?: Record<string, unknown> | unknown[]): Promise<T>;
  all<TOut = unknown>(params?: Record<string, unknown> | unknown[]): Promise<{ results: TOut[] }>;
  first<TOut = unknown>(params?: Record<string, unknown> | unknown[]): Promise<TOut | null>;
}

export class D1Client {
  constructor(private db: D1Database) {}

  prepare<T = unknown>(sql: string): Statement<T> {
    const stmt = this.db.prepare(sql);
    return {
      run: (params) => stmt.bind(...bindParams(params)).run() as Promise<T>,
      all: (params) => stmt.bind(...bindParams(params)).all() as Promise<{ results: T[] }>,
      first: async (params) => {
        const res = await stmt.bind(...bindParams(params)).first<T>();
        return (res ?? null) as T | null;
      },
    };
  }
}

function bindParams(params?: Record<string, unknown> | unknown[]) {
  if (!params) return [];
  if (Array.isArray(params)) return params;
  return Object.values(params);
}
