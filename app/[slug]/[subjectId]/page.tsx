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
  question_paper: "Question Paper (PNG)",
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
      <div className="mx-auto w-full max-w-4xl px-6 py-16 text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        <p className="text-sm text-muted">Subject not found.</p>
        <div className="mt-4">
          <Breadcrumbs
            items={[{ label: "Admin", href: "/" }, { label: slug, href: `/${slug}` }]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/" },
          { label: slug, href: `/${slug}` },
          { label: subject.name },
        ]}
      />

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <h1 className="mt-6 text-3xl font-bold tracking-tight">{subject.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {subject.code} · Manage notes, syllabus, videos, and question papers.
      </p>

      <form
        onSubmit={handleSaveOneshotVideo}
        className="mt-8 rounded-xl border border-border bg-surface p-4"
      >
        <h2 className="font-semibold">One-shot video</h2>
        <p className="mt-1 text-sm text-muted">
          Add one YouTube or video URL for this subject.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={oneshotVideoUrl}
            onChange={(e) => setOneshotVideoUrl(e.target.value)}
            placeholder="YouTube video URL"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            Save video
          </button>
        </div>
      </form>

      <form
        onSubmit={handleSaveOverallNotes}
        className="mt-4 rounded-xl border border-border bg-surface p-4"
      >
        <h2 className="font-semibold">Overall notes</h2>
        <p className="mt-1 text-sm text-muted">
          Add the complete notes PDF for this subject.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={overallNotesUrl}
            onChange={(e) => setOverallNotesUrl(e.target.value)}
            placeholder="PDF URL (or upload a file)"
            disabled={uploadingNotes}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
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
          <button
            type="submit"
            disabled={saving || uploadingNotes}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            Save notes
          </button>
        </div>
      </form>

      <h2 className="mt-10 text-lg font-semibold">Course Outline (Lessons)</h2>
      <form
        onSubmit={handleAddLesson}
        className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-6"
      >
        <input
          value={lessonTitle}
          onChange={(e) => setLessonTitle(e.target.value)}
          placeholder="Unit title (e.g. Unit 1: Computer Fundamentals)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-4"
        />
        <input
          type="number"
          value={lessonHours}
          onChange={(e) => setLessonHours(e.target.value)}
          placeholder="Hours (LHs)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-1"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover-primary disabled:opacity-50 sm:col-span-1"
        >
          Add Unit
        </button>
      </form>

      <div className="mt-3 flex flex-col gap-2">
        {subject.lessons.length === 0 && (
          <div className="text-sm text-muted">No units added yet.</div>
        )}
        {subject.lessons.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <span className="text-sm text-muted">{i + 1}.</span>
            <input
              defaultValue={item.title}
              onBlur={(e) => {
                if (e.target.value !== item.title)
                  action(() => updateLesson(item.id, { title: e.target.value }));
              }}
              className="flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm font-medium outline-none focus:border-border focus:bg-background"
            />
            <input
              type="number"
              defaultValue={item.hours ?? ""}
              onBlur={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                if (val !== item.hours) action(() => updateLesson(item.id, { hours: val }));
              }}
              placeholder="LHs"
              className="w-16 rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background"
            />
            <button
              onClick={() => handleDeleteLesson(item.id)}
              aria-label="Delete unit"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Resources</h2>
      <form
        onSubmit={handleAdd}
        className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-6"
      >
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ResourceKind)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
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
              ? "Title (e.g. Page 1)"
              : kind === "notes"
                ? "Title (e.g. Lesson 1 Notes)"
                : "Title"
          }
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
        />
        {kind === "question_paper" && (
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        )}
        {usesLesson(kind) && (
          <input
            type="number"
            min={1}
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            placeholder="Lesson #"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
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
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50 ${
            kind === "question_paper" || usesLesson(kind)
              ? "sm:col-span-1"
              : "sm:col-span-2"
          }`}
        />
        {kind !== "video" && (
          <label
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-background ${
              uploading ? "opacity-50" : ""
            }`}
          >
            <Upload size={14} />
            {uploading ? "Uploading…" : "Upload file"}
            <input
              type="file"
              accept={kind === "question_paper" ? "image/png" : "application/pdf"}
              disabled={uploading}
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />
          </label>
        )}
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover-primary disabled:opacity-50 sm:col-span-6"
        >
          Add Resource
        </button>
      </form>

      <div className="mt-8 flex flex-col gap-2">
        {subject.resources.length === 0 && (
          <div className="text-sm text-muted">No resources yet.</div>
        )}
        {subject.resources.map((resource) => (
          <div
            key={resource.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
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
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs sm:w-40"
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
                className="rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm font-medium outline-none focus:border-border focus:bg-background sm:w-48"
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
                  className="rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background sm:w-16"
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
                  className="rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background sm:w-20"
                />
              )}
              <input
                defaultValue={resource.url}
                onBlur={(e) => {
                  if (e.target.value !== resource.url)
                    action(() => updateResource(resource.id, { url: e.target.value }));
                }}
                className="flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background"
              />
            </div>
            <button
              onClick={() => handleDelete(resource.id)}
              aria-label="Delete resource"
              className="flex h-8 w-8 items-center justify-center self-end rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 sm:self-center"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
