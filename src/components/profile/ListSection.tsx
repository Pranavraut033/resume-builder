import { DateRangeField } from "@/components/form";
import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { isValidDateRange } from "@/lib/date";

export type FieldConfig<T> =
  | {
      type: "text";
      key: keyof T;
      label: string;
      placeholder?: string;
      width?: "full" | "half";
    }
  | {
      type: "textarea";
      key: keyof T;
      label?: string;
      rows?: number;
      placeholder?: string;
      helpText?: string;
      width?: "full" | "half";
    }
  | {
      type: "dateRange";
      label: string;
      startKey: keyof T;
      endKey: keyof T;
      width?: "full" | "half";
    }
  | {
      type: "list";
      key: keyof T;
      label: string;
      separator: "\n" | ", ";
      helpText?: string;
      rows?: number;
    };

interface ListSectionProps<T> {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  blank: () => T;
  addLabel: string;
  emptyText: string;
  itemNoun: string;
  fields: FieldConfig<T>[];
}

/** Fields are rendered in their configured order, one row per field, except
 * consecutive `half`-width fields which are grouped into a shared
 * `md:grid-cols-2` row (matching the layout of the original per-entity
 * components). */
function groupFields<T>(fields: FieldConfig<T>[]): FieldConfig<T>[][] {
  const rows: FieldConfig<T>[][] = [];
  let currentHalfRow: FieldConfig<T>[] = [];

  const flushHalfRow = () => {
    if (currentHalfRow.length > 0) {
      rows.push(currentHalfRow);
      currentHalfRow = [];
    }
  };

  for (const field of fields) {
    const isHalf =
      (field.type === "text" ||
        field.type === "textarea" ||
        field.type === "dateRange") &&
      field.width === "half";

    if (isHalf) {
      currentHalfRow.push(field);
    } else {
      flushHalfRow();
      rows.push([field]);
    }
  }
  flushHalfRow();

  return rows;
}

function renderField<T>(
  field: FieldConfig<T>,
  item: T,
  update: (next: T) => void
) {
  switch (field.type) {
    case "text":
      return (
        <FormField
          key={String(field.key)}
          label={field.label}
          value={(item[field.key] as string | null) || ""}
          onChange={(v) => update({ ...item, [field.key]: v })}
          placeholder={field.placeholder}
        />
      );
    case "textarea":
      return (
        <FormField
          key={String(field.key)}
          label={field.label}
          type="textarea"
          value={(item[field.key] as string | null) || ""}
          onChange={(v) => update({ ...item, [field.key]: v })}
          rows={field.rows}
          placeholder={field.placeholder}
          helpText={field.helpText}
        />
      );
    case "dateRange": {
      const startValue = item[field.startKey] as string | null;
      const endValue = item[field.endKey] as string | null;
      return (
        <div key={`${String(field.startKey)}-${String(field.endKey)}`}>
          <DateRangeField
            label={field.label}
            startDate={startValue || ""}
            endDate={endValue || ""}
            onStartDateChange={(v) => update({ ...item, [field.startKey]: v })}
            onEndDateChange={(v) => update({ ...item, [field.endKey]: v })}
            error={
              isValidDateRange(startValue, endValue)
                ? undefined
                : "End date must be after start date"
            }
          />
        </div>
      );
    }
    case "list": {
      const values = (item[field.key] as unknown as string[]) || [];
      return (
        <FormField
          key={String(field.key)}
          label={field.label}
          type={field.rows ? "textarea" : "text"}
          rows={field.rows}
          value={values.join(field.separator)}
          onChange={(v) =>
            update({
              ...item,
              [field.key]: v
                .split(field.separator === ", " ? "," : field.separator)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          helpText={field.helpText}
        />
      );
    }
  }
}

export function ListSection<T>({
  title,
  items,
  onChange,
  blank,
  addLabel,
  emptyText,
  itemNoun,
  fields,
}: ListSectionProps<T>) {
  const add = () => {
    onChange([...items, blank()]);
  };

  const update = (index: number, next: T) => {
    const updated = [...items];
    updated[index] = next;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const rows = groupFields(fields);

  return (
    <PageSection title={title}>
      <SurfacePanel>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={add}>
            {addLabel}
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">{emptyText}</p>
        ) : (
          <div className="space-y-6">
            {items.map((item, index) => (
              <div
                key={index}
                className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">
                    {itemNoun} {index + 1}
                  </h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
                {rows.map((row, rowIndex) =>
                  row.length > 1 ? (
                    <div
                      key={rowIndex}
                      className="grid grid-cols-1 gap-3 md:grid-cols-2"
                    >
                      {row.map((field) =>
                        renderField(field, item, (next) => update(index, next))
                      )}
                    </div>
                  ) : (
                    renderField(row[0], item, (next) => update(index, next))
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </SurfacePanel>
    </PageSection>
  );
}
