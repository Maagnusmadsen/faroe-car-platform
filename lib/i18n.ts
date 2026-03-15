export type Locale = "en";

export function getNested(obj: object, path: string): string {
  const keys = path.split(".");
  let result: unknown = obj;
  for (const key of keys) {
    result = (result as Record<string, unknown>)?.[key];
  }
  return typeof result === "string" ? result : path;
}
