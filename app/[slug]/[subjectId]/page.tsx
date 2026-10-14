"use client";

import { use, useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import Breadcrumbs from "../../../src/components/Breadcrumbs";
import {
  createLesson,
  createResource,
  deleteLesson,
  deleteResource,
  getSubject,
  updateLesson,
  updateSubject,
  updateResource,
  type Resource,
  type ResourceKind,
  type SubjectWithResources,
} from "../../../src/lib/data";
import { uploadResourceFile } from "../../../src/lib/storage";

const kinds: ResourceKind[] = ["notes", "handwritten_notes", "syllabus", "video", "question_paper"];

const kindLabels: Record<ResourceKind, string> = {
  notes: "Notes (PDF)",
  handwritten_notes: "Handwritten Notes (PDF)",
  syllabus: "Syllabus (PDF)",
  video: "Video (URL)",
  question_paper: "Question Paper (PDF)",
};

// Kinds that are tagged with a lesson number.
function usesLesson(kind: ResourceKind) {
  return kind === "notes" || kind === "video";
}

// A subject has a single handwritten notes PDF.
function hasHandwrittenNotes(subject: SubjectWithResources) {
  return subject.resources.some((r) => r.kind === "handwritten_notes");
}

const handwrittenNotesTakenMessage =
  "This subject already has handwritten notes. Delete or change the existing one first.";

export default function AdminSubjectPage({
  params,
}: {
  params: Promise<{ slug: string; subjectId: string }>;
}) {
  const { slug, subjectId } = use(params);
  const [subject, setSubject] = useState<SubjectWithResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [year, setYear] = useState("");
  const [lesson, setLesson] = useState("");
  const [kind, setKind] = useState<ResourceKind>("notes");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonHours, setLessonHours] = useState("");
  const [oneshotVideoUrl, setOneshotVideoUrl] = useState("");
  const [overallNotesUrl, setOverallNotesUrl] = useState("");
  const [uploadingNotes, setUploadingNotes] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getSubject(subjectId);
      setSubject(data);
      setOneshotVideoUrl(data?.oneshot_video_url ?? "");
      setOverallNotesUrl(data?.overall_notes_url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subject.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  async function action(work: () => Promise<unknown>) {
    setError("");
    try {
      await work();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setUrl(await uploadResourceFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleOverallNotesUpload(file: File | undefined) {
    if (!file) return;
    setUploadingNotes(true);
    setError("");
    try {
      setOverallNotesUrl(await uploadResourceFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingNotes(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !title.trim() || !url.trim()) return;
    if (kind === "question_paper" && !year.trim()) return;
    if (usesLesson(kind) && !lesson.trim()) return;
    if (kind === "handwritten_notes" && hasHandwrittenNotes(subject)) {
      setError(handwrittenNotesTakenMessage);
      return;
    }
    setSaving(true);
    await action(() =>
      createResource({
        subject_id: subject.id,
        kind,
        title: title.trim(),
        url: url.trim(),
        year: kind === "question_paper" ? Number(year) : null,
        lesson: usesLesson(kind) ? Number(lesson) : null,
        sort_order: subject.resources.length + 1,
      }),
    );
    setTitle("");
    setUrl("");
    setYear("");
    setLesson("");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this resource?")) return;
    await action(() => deleteResource(id));
  }

  async function handleAddLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !lessonTitle.trim()) return;
    setSaving(true);
    await action(() =>
      createLesson({
        subject_id: subject.id,
        title: lessonTitle.trim(),
        hours: lessonHours.trim() ? Number(lessonHours) : null,
        sort_order: subject.lessons.length + 1,
      }),
    );
    setLessonTitle("");
    setLessonHours("");
    setSaving(false);
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm("Delete this lesson?")) return;
    await action(() => deleteLesson(id));
  }

  async function handleSaveOneshotVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!subject) return;
    setSaving(true);
    await action(() =>
      updateSubject(subject.id, { oneshot_video_url: oneshotVideoUrl.trim() || null }),
    );
    setSaving(false);
  }

  async function handleSaveOverallNotes(e: React.FormEvent) {
    e.preventDefault();
    if (!subject) return;
    setSaving(true);
    await action(() =>
      updateSubject(subject.id, { overall_notes_url: overallNotesUrl.trim() || null }),
    );
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-12 text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-12">
        <p className="text-sm text-muted">Subject not found.</p>
        <div className="mt-4">
          <Breadcrumbs
            items={[{ label: "Admin", href: "/" }, { label: slug, href: `/${slug}` }]}
          />
        </div>
      </div>
    );
  }

  const inputClass =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50";
  const primaryButtonClass =
    "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50";

  const questionPapers = subject.resources.filter((r) => r.kind === "question_paper");
  const otherResources = subject.resources.filter((r) => r.kind !== "question_paper");
  // Newest year first; papers without a year go last.
  const questionPaperYears = Array.from(new Set(questionPapers.map((r) => r.year ?? 0))).sort(
    (a, b) => b - a,
  );

  const renderResource = (resource: Resource) => (
    <div
      key={resource.id}
      className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 p-3 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={resource.kind}
          onChange={(e) => {
            const nextKind = e.target.value as ResourceKind;
            if (nextKind === "handwritten_notes" && hasHandwrittenNotes(subject)) {
              setError(handwrittenNotesTakenMessage);
              return;
            }
            action(() =>
              updateResource(resource.id, {
                kind: nextKind,
                lesson: usesLesson(nextKind) ? resource.lesson : null,
              }),
            );
          }}
          className="shrink-0 rounded-lg border border-border bg-background px-2 py-1 text-xs sm:w-40"
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {kindLabels[k]}
            </option>
          ))}
        </select>
        <input
          defaultValue={resource.title}
          onBlur={(e) => {
            if (e.target.value !== resource.title)
              action(() => updateResource(resource.id, { title: e.target.value }));
          }}
          className="min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm font-medium outline-none focus:border-border focus:bg-background sm:w-44"
        />
        {resource.kind === "question_paper" && (
          <input
            type="number"
            defaultValue={resource.year ?? ""}
            onBlur={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              if (val !== resource.year)
                action(() => updateResource(resource.id, { year: val }));
            }}
            placeholder="Year"
            className="shrink-0 rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background sm:w-16"
          />
        )}
        {usesLesson(resource.kind) && (
          <input
            type="number"
            min={1}
            defaultValue={resource.lesson ?? ""}
            onBlur={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              if (val !== resource.lesson)
                action(() => updateResource(resource.id, { lesson: val }));
            }}
            placeholder="Lesson #"
            className="shrink-0 rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background sm:w-20"
          />
        )}
        <input
          defaultValue={resource.url}
          onBlur={(e) => {
            if (e.target.value !== resource.url)
              action(() => updateResource(resource.id, { url: e.target.value }));
          }}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background"
        />
      </div>
      <button
        onClick={() => handleDelete(resource.id)}
        aria-label="Delete resource"
        className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 sm:self-center"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/" },
          { label: slug, href: `/${slug}` },
          { label: subject.name },
        ]}
      />

      <h1 className="mt-6 text-3xl font-bold tracking-tight">{subject.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {subject.code} · Manage notes, syllabus, videos, and question papers.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Left: course outline */}
        <aside className="rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100vh-3rem)] lg:flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Course Outline</h2>
            <span className="text-xs text-muted">
              {subject.lessons.length} {subject.lessons.length === 1 ? "unit" : "units"}
            </span>
          </div>

          <form onSubmit={handleAddLesson} className="mt-3 flex flex-col gap-2">
            <input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Unit title (e.g. Unit 1: Computer Fundamentals)"
              className={inputClass}
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={lessonHours}
                onChange={(e) => setLessonHours(e.target.value)}
                placeholder="Hours (LHs)"
                className={`${inputClass} min-w-0 flex-1`}
              />
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                Add Unit
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-col gap-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {subject.lessons.length === 0 && (
              <div className="py-2 text-sm text-muted">No units added yet.</div>
            )}
            {subject.lessons.map((item, i) => {
              const linked = subject.resources.filter(
                (r) => usesLesson(r.kind) && r.lesson === i + 1,
              ).length;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2"
                >
                  <span className="w-6 shrink-0 text-center text-sm text-muted">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <input
                      defaultValue={item.title}
                      onBlur={(e) => {
                        if (e.target.value !== item.title)
                          action(() => updateLesson(item.id, { title: e.target.value }));
                      }}
                      className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium outline-none focus:border-border focus:bg-background"
                    />
                    <div className="px-1 text-xs text-muted">
                      {linked} {linked === 1 ? "resource" : "resources"}
                    </div>
                  </div>
                  <input
                    type="number"
                    defaultValue={item.hours ?? ""}
                    onBlur={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      if (val !== item.hours) action(() => updateLesson(item.id, { hours: val }));
                    }}
                    placeholder="LHs"
                    aria-label="Lecture hours"
                    className="w-14 shrink-0 rounded-md border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background"
                  />
                  <button
                    onClick={() => handleDeleteLesson(item.id)}
                    aria-label="Delete unit"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right: uploads */}
        <div className="flex min-w-0 flex-col gap-4">
          <form
            onSubmit={handleSaveOneshotVideo}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <h2 className="font-semibold">One-shot video</h2>
            <p className="mt-1 text-sm text-muted">Add one YouTube or video URL for this subject.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={oneshotVideoUrl}
                onChange={(e) => setOneshotVideoUrl(e.target.value)}
                placeholder="YouTube video URL"
                className={`${inputClass} min-w-0 flex-1`}
              />
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                Save video
              </button>
            </div>
          </form>

          <form
            onSubmit={handleSaveOverallNotes}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <h2 className="font-semibold">Overall notes</h2>
            <p className="mt-1 text-sm text-muted">Add the complete notes PDF for this subject.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={overallNotesUrl}
                onChange={(e) => setOverallNotesUrl(e.target.value)}
                placeholder="PDF URL (or upload a file)"
                disabled={uploadingNotes}
                className={`${inputClass} min-w-0`}
              />
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-background">
                <Upload size={14} />
                {uploadingNotes ? "Uploading…" : "Upload PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={uploadingNotes}
                  onChange={(e) => handleOverallNotesUpload(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
              <button type="submit" disabled={saving || uploadingNotes} className={primaryButtonClass}>
                Save notes
              </button>
            </div>
          </form>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="font-semibold">Resources</h2>
            <p className="mt-1 text-sm text-muted">
              Notes and videos are tagged with a lesson from the outline.
            </p>
            <form onSubmit={handleAdd} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-6">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ResourceKind)}
                className={`${inputClass} sm:col-span-2`}
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {kindLabels[k]}
                  </option>
                ))}
              </select>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  kind === "question_paper"
                    ? "Title (e.g. Board Exam 2023)"
                    : kind === "notes"
                      ? "Title (e.g. Lesson 1 Notes)"
                      : "Title"
                }
                className={`${inputClass} ${
                  kind === "question_paper" || usesLesson(kind) ? "sm:col-span-3" : "sm:col-span-4"
                }`}
              />
              {kind === "question_paper" && (
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Year"
                  className={inputClass}
                />
              )}
              {usesLesson(kind) && (
                <input
                  type="number"
                  min={1}
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  placeholder="Lesson #"
                  className={inputClass}
                />
              )}
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  kind === "video"
                    ? "YouTube video URL"
                    : uploading
                      ? "Uploading…"
                      : "URL (or upload a file →)"
                }
                disabled={uploading}
                className={`${inputClass} min-w-0 ${kind === "video" ? "sm:col-span-6" : "sm:col-span-4"}`}
              />
              {kind !== "video" && (
                <label
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-background sm:col-span-2 ${
                    uploading ? "opacity-50" : ""
                  }`}
                >
                  <Upload size={14} />
                  {uploading ? "Uploading…" : "Upload file"}
                  <input
                    type="file"
                    accept="application/pdf"
                    disabled={uploading}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
              )}
              <button
                type="submit"
                disabled={saving || uploading}
                className={`${primaryButtonClass} sm:col-span-6`}
              >
                Add Resource
              </button>
            </form>

            <div className="mt-5 flex flex-col gap-2">
              {subject.resources.length === 0 && (
                <div className="text-sm text-muted">No resources yet.</div>
              )}
              {otherResources.map(renderResource)}
              {questionPapers.length > 0 && (
                <div className={otherResources.length > 0 ? "mt-4" : ""}>
                  <h3 className="text-sm font-semibold">Question Papers</h3>
                  <div className="mt-2 flex flex-col gap-4">
                    {questionPaperYears.map((year) => {
                      const papers = questionPapers.filter((r) => (r.year ?? 0) === year);
                      return (
                        <div key={year}>
                          <div className="text-xs font-medium text-muted">
                            {year || "Year unspecified"} · {papers.length}{" "}
                            {papers.length === 1 ? "paper" : "papers"}
                          </div>
                          <div className="mt-2 flex flex-col gap-2">{papers.map(renderResource)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
