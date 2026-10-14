// Formatted syllabus stored in subjects.syllabus_content.
// The student site keeps a copy of these types in bitm-app/src/lib/data.ts.

export type SyllabusUnit = { title: string; hours: number | null; topics: string[] };

export type SyllabusContent = {
  credit_hours: number | null;
  lecture_hours: number | null;
  description: string | null;
  objectives: string[];
  units: SyllabusUnit[];
  references: string[];
  source_url: string | null;
};

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text || null;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

function toTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(toText).filter((v): v is string => v !== null);
}

// Coerces untrusted JSON (model output or a stored row) into a valid SyllabusContent.
export function normalizeSyllabus(raw: unknown, sourceUrl: string | null = null): SyllabusContent {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const units = Array.isArray(data.units) ? data.units : [];
  return {
    credit_hours: toNumber(data.credit_hours),
    lecture_hours: toNumber(data.lecture_hours),
    description: toText(data.description),
    objectives: toTextList(data.objectives),
    units: units
      .map((unit) => {
        const u = (unit && typeof unit === "object" ? unit : {}) as Record<string, unknown>;
        return { title: toText(u.title) ?? "", hours: toNumber(u.hours), topics: toTextList(u.topics) };
      })
      .filter((unit) => unit.title || unit.topics.length > 0),
    references: toTextList(data.references),
    source_url: toText(data.source_url) ?? sourceUrl,
  };
}
