type JsonPrimitive = string | number | boolean | null | Date;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function sortObjectKeys<T extends JsonValue>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys) as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (value !== null && typeof value === "object") {
    const sortedObject = Object.keys(value)
      .sort()
      .reduce<Record<string, JsonValue>>((accumulator, key) => {
        accumulator[key] = sortObjectKeys(value[key] as JsonValue);
        return accumulator;
      }, {});

    return sortedObject as T;
  }

  return value;
}

export function toStableJsonString(value: JsonValue): string {
  return JSON.stringify(sortObjectKeys(value));
}

export function areJsonValuesEqual(a: JsonValue, b: JsonValue): boolean {
  return toStableJsonString(a) === toStableJsonString(b);
}

export function simpleI32HashString(input: string): number {
  let hash = 5381;

  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }

  return hash >>> 0;
}
