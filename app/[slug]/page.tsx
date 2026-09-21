"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import Breadcrumbs from "../../src/components/Breadcrumbs";
import {
  createSubject,
  deleteSubject,
  getSemester,
  updateSemester,
  updateSubject,
  type Difficulty,
  type Semester,
} from "../../src/lib/data";
import { uploadResourceFile } from "../../src/lib/storage";

const difficulties: Difficulty[] = ["Easy", "Medium", "Hard"];

export default function AdminSemesterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [chapters, setChapters] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [saving, setSaving] = useState(false);
  const [overallSyllabusUrl, setOverallSyllabusUrl] = useState("");
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getSemester(slug);
      setSemester(data);
      setOverallSyllabusUrl(data?.overall_syllabus_url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load semester.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function action(work: () => Promise<unknown>) {
    setError("");
    try {
      await work();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!semester || !name.trim() || !code.trim()) return;
    setSaving(true);
    await action(() =>
      createSubject({
        semester_id: semester.id,
        name: name.trim(),
        code: code.trim(),
        chapters,
        difficulty,
        sort_order: semester.subjects.length + 1,
      }),
    );
    setName("");
    setCode("");
    setChapters(1);
    setDifficulty("Medium");
    setSaving(false);
  }

  async function handleDeleteSubject(id: string) {
    if (!confirm("Delete this subject?")) return;
    await action(() => deleteSubject(id));
  }

  async function handleRenameSemester(newName: string) {
    if (!semester || !newName.trim() || newName === semester.name) return;
    await action(() => updateSemester(semester.id, { name: newName.trim() }));
  }

  async function handleToggleVisible() {
    if (!semester) return;
    await action(() => updateSemester(semester.id, { is_visible: !semester.is_visible }));
  }

  async function handleOverallSyllabusUpload(file: File | undefined) {
    if (!file) return;
    setUploadingSyllabus(true);
    setError("");
    try {
      setOverallSyllabusUrl(await uploadResourceFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingSyllabus(false);
    }
  }

  async function handleSaveOverallSyllabus(e: React.FormEvent) {
    e.preventDefault();
    if (!semester) return;
    setSaving(true);
    await action(() =>
      updateSemester(semester.id, {
        overall_syllabus_url: overallSyllabusUrl.trim() || null,
      }),
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

  if (!semester) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        <p className="text-sm text-muted">Semester not found.</p>
        <div className="mt-4">
          <Breadcrumbs items={[{ label: "Admin", href: "/" }]} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <Breadcrumbs items={[{ label: "Admin", href: "/" }, { label: semester.name }]} />

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <input
            defaultValue={semester.name}
            onBlur={(e) => handleRenameSemester(e.target.value)}
            className="w-full rounded-lg border border-transparent bg-transparent text-3xl font-bold tracking-tight outline-none focus:border-border focus:bg-surface focus:px-2 focus:py-1"
          />
          <p className="mt-1 text-sm text-muted">/{semester.slug}</p>
        </div>
        <button
          onClick={handleToggleVisible}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface"
        >
          {semester.is_visible ? "Hide semester" : "Show semester"}
        </button>
      </div>

      <form
        onSubmit={handleSaveOverallSyllabus}
        className="mt-8 rounded-xl border border-border bg-surface p-4"
      >
        <h2 className="font-semibold">Overall syllabus</h2>
        <p className="mt-1 text-sm text-muted">
          Add the syllabus PDF for the whole semester.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={overallSyllabusUrl}
            onChange={(e) => setOverallSyllabusUrl(e.target.value)}
            placeholder="PDF URL (or upload a file)"
            disabled={uploadingSyllabus}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
          />
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-background">
            <Upload size={14} />
            {uploadingSyllabus ? "Uploading…" : "Upload PDF"}
            <input
              type="file"
              accept="application/pdf"
              disabled={uploadingSyllabus}
              onChange={(e) => handleOverallSyllabusUpload(e.target.files?.[0])}
              className="hidden"
            />
          </label>
          <button
            type="submit"
            disabled={saving || uploadingSyllabus}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            Save syllabus
          </button>
        </div>
      </form>

      <form
        onSubmit={handleAddSubject}
        className="mt-8 grid grid-cols-1 gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-5"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Subject name"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          type="number"
          min={1}
          value={chapters}
          onChange={(e) => setChapters(Number(e.target.value))}
          placeholder="Chapters"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {difficulties.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover-primary disabled:opacity-50 sm:col-span-5"
        >
          Add Subject
        </button>
      </form>

      <div className="mt-8 flex flex-col gap-2">
        {semester.subjects.length === 0 && (
          <div className="text-sm text-muted">No subjects yet.</div>
        )}
        {semester.subjects.map((subject) => (
          <div
            key={subject.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                defaultValue={subject.name}
                onBlur={(e) => {
                  if (e.target.value !== subject.name)
                    action(() => updateSubject(subject.id, { name: e.target.value }));
                }}
                className="rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm font-medium outline-none focus:border-border focus:bg-background sm:w-48"
              />
              <input
                defaultValue={subject.code}
                onBlur={(e) => {
                  if (e.target.value !== subject.code)
                    action(() => updateSubject(subject.id, { code: e.target.value }));
                }}
                className="rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background sm:w-24"
              />
              <input
                type="number"
                min={1}
                defaultValue={subject.chapters}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val !== subject.chapters)
                    action(() => updateSubject(subject.id, { chapters: val }));
                }}
                className="rounded-lg border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background sm:w-20"
              />
              <select
                defaultValue={subject.difficulty}
                onChange={(e) =>
                  action(() =>
                    updateSubject(subject.id, { difficulty: e.target.value as Difficulty }),
                  )
                }
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs sm:w-28"
              >
                {difficulties.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <Link
                href={`/${slug}/${subject.id}`}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover-primary"
              >
                Resources
              </Link>
              <button
                onClick={() => handleDeleteSubject(subject.id)}
                aria-label="Delete subject"
                className="no-red-hover flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
