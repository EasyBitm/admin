"use client";

import { useEffect, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { replaceLessonsWithUnits, updateSubject, type SubjectWithResources } from "../lib/data";
import { supabase } from "../lib/supabase";
import { normalizeSyllabus, type SyllabusContent } from "../lib/syllabus";

// Form state: list fields are edited as one item per line.
type UnitDraft = { title: string; hours: string; topics: string };
type Draft = {
  credit_hours: string;
  lecture_hours: string;
  description: string;
  objectives: string;
  units: UnitDraft[];
  references: string;
  source_url: string | null;
};

function toDraft(content: SyllabusContent): Draft {
  return {
    credit_hours: content.credit_hours?.toString() ?? "",
    lecture_hours: content.lecture_hours?.toString() ?? "",
    description: content.description ?? "",
    objectives: content.objectives.join("\n"),
    units: content.units.map((u) => ({
      title: u.title,
      hours: u.hours?.toString() ?? "",
      topics: u.topics.join("\n"),
    })),
    references: content.references.join("\n"),
    source_url: content.source_url,
  };
}

function lines(text: string) {
  return text.split("\n");
}

function fromDraft(draft: Draft): SyllabusContent {
  return normalizeSyllabus({
    credit_hours: draft.credit_hours,
    lecture_hours: draft.lecture_hours,
    description: draft.description,
    objectives: lines(draft.objectives),
    units: draft.units.map((u) => ({ title: u.title, hours: u.hours, topics: lines(u.topics) })),
    references: lines(draft.references),
    source_url: draft.source_url,
  });
}

const inputClass =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50";
const labelClass = "text-xs font-medium text-muted";

export default function SyllabusEditor({
  subject,
  syllabusUrl,
  autoExtractUrl,
  onChanged,
  onError,
}: {
  subject: SubjectWithResources;
  // URL of the subject's syllabus PDF resource, if any.
  syllabusUrl: string | null;
  // Set by the parent right after a syllabus PDF is added, to extract it automatically.
  autoExtractUrl: string | null;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(() =>
    subject.syllabus_content ? toDraft(normalizeSyllabus(subject.syllabus_content)) : null,
  );
  const [dirty, setDirty] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function extract(url: string) {
    setExtracting(true);
    onError("");
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/extract-syllabus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ url }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `Extraction failed (${response.status}).`);
      setDraft(toDraft(body.syllabus));
      setDirty(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  useEffect(() => {
    if (autoExtractUrl) queueMicrotask(() => void extract(autoExtractUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExtractUrl]);

  async function run(work: () => Promise<unknown>) {
    setSaving(true);
    onError("");
    try {
      await work();
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSaving(false);
    }
  }

  function update(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  }

  function updateUnit(index: number, patch: Partial<UnitDraft>) {
    if (!draft) return;
    update({ units: draft.units.map((u, i) => (i === index ? { ...u, ...patch } : u)) });
  }

  async function handleSave() {
    if (!draft) return;
    const content = fromDraft(draft);
    await run(() => updateSubject(subject.id, { syllabus_content: content }));
    setDraft(toDraft(content));
    setDirty(false);
  }

  async function handleUseAsOutline() {
    if (!draft) return;
    const { units } = fromDraft(draft);
    if (units.length === 0) return onError("There are no units to copy.");
    const message =
      `Replace the course outline (${subject.lessons.length} units) with these ${units.length} units? ` +
      "Notes and videos stay tagged by lesson number.";
    if (!confirm(message)) return;
    await run(() => replaceLessonsWithUnits(subject.id, units));
  }

  async function handleRemove() {
    if (!confirm("Remove the formatted syllabus? The site will show the PDF again.")) return;
    await run(() => updateSubject(subject.id, { syllabus_content: null }));
    setDraft(null);
    setDirty(false);
  }

  const saved = Boolean(subject.syllabus_content);
  const busy = extracting || saving;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Formatted syllabus</h2>
        <span className="text-xs text-muted">
          {dirty ? "Unsaved changes" : saved ? "Saved · shown on site instead of the PDF" : "Not set"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Read the syllabus PDF with Gemini, review the result, and save it.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => syllabusUrl && void extract(syllabusUrl)}
          disabled={!syllabusUrl || busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-background disabled:opacity-50"
        >
          <Sparkles size={14} />
          {extracting ? "Reading PDF…" : draft ? "Re-extract from PDF" : "Extract from syllabus PDF"}
        </button>
        {!syllabusUrl && (
          <span className="text-xs text-muted">Add a Syllabus (PDF) resource below first.</span>
        )}
        {extracting && (
          <span className="text-xs text-muted">This can take up to a minute.</span>
        )}
      </div>

      {draft && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Credit hours</span>
              <input
                type="number"
                value={draft.credit_hours}
                onChange={(e) => update({ credit_hours: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Lecture hours</span>
              <input
                type="number"
                value={draft.lecture_hours}
                onChange={(e) => update({ lecture_hours: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Course description</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Objectives (one per line)</span>
            <textarea
              rows={4}
              value={draft.objectives}
              onChange={(e) => update({ objectives: e.target.value })}
              className={inputClass}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className={labelClass}>Units</span>
            {draft.units.map((unit, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 p-2">
                <div className="flex gap-2">
                  <input
                    value={unit.title}
                    onChange={(e) => updateUnit(i, { title: e.target.value })}
                    placeholder="Unit title"
                    aria-label={`Unit ${i + 1} title`}
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    type="number"
                    value={unit.hours}
                    onChange={(e) => updateUnit(i, { hours: e.target.value })}
                    placeholder="LHs"
                    aria-label={`Unit ${i + 1} hours`}
                    className={`${inputClass} w-20! shrink-0`}
                  />
                  <button
                    type="button"
                    onClick={() => update({ units: draft.units.filter((_, j) => j !== i) })}
                    aria-label={`Remove unit ${i + 1}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={unit.topics}
                  onChange={(e) => updateUnit(i, { topics: e.target.value })}
                  placeholder="Topics, one per line"
                  aria-label={`Unit ${i + 1} topics`}
                  className={inputClass}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => update({ units: [...draft.units, { title: "", hours: "", topics: "" }] })}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-background"
            >
              <Plus size={14} />
              Add unit
            </button>
          </div>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>References (one per line)</span>
            <textarea
              rows={3}
              value={draft.references}
              onChange={(e) => update({ references: e.target.value })}
              className={inputClass}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              Save syllabus
            </button>
            <button
              type="button"
              onClick={() => void handleUseAsOutline()}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background disabled:opacity-50"
            >
              Use units as course outline
            </button>
            {saved && (
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={busy}
                className="ml-auto rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
