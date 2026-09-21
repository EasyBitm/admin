"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Upload } from "lucide-react";
import {
  getSemesters,
  getSiteSettings,
  updateSemester,
  updateSiteSettings,
  type Semester,
} from "../src/lib/data";
import { uploadResourceFile } from "../src/lib/storage";

export default function AdminPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseStructureUrl, setCourseStructureUrl] = useState("");
  const [savingCourseStructure, setSavingCourseStructure] = useState(false);
  const [uploadingCourseStructure, setUploadingCourseStructure] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [data, settings] = await Promise.all([getSemesters(), getSiteSettings()]);
      setSemesters(data);
      setCourseStructureUrl(settings.course_structure_url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  async function handleToggleVisible(s: Semester) {
    await updateSemester(s.id, { is_visible: !s.is_visible });
    load();
  }

  async function handleCourseStructureUpload(file: File | undefined) {
    if (!file) return;
    setUploadingCourseStructure(true);
    setError("");
    try {
      setCourseStructureUrl(await uploadResourceFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingCourseStructure(false);
    }
  }

  async function handleSaveCourseStructure(e: React.FormEvent) {
    e.preventDefault();
    setSavingCourseStructure(true);
    setError("");
    try {
      await updateSiteSettings({ course_structure_url: courseStructureUrl.trim() || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSavingCourseStructure(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-muted">
        Manage subjects and show/hide semesters on the site.
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSaveCourseStructure}
        className="mt-8 rounded-xl border border-border bg-surface p-4"
      >
        <h2 className="font-semibold">BITM course structure</h2>
        <p className="mt-1 text-sm text-muted">
          Add the course structure PDF shown beside Semesters on the homepage.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={courseStructureUrl}
            onChange={(e) => setCourseStructureUrl(e.target.value)}
            placeholder="PDF URL (or upload a file)"
            disabled={uploadingCourseStructure}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
          />
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-background">
            <Upload size={14} />
            {uploadingCourseStructure ? "Uploading…" : "Upload PDF"}
            <input
              type="file"
              accept="application/pdf"
              disabled={uploadingCourseStructure}
              onChange={(e) => void handleCourseStructureUpload(e.target.files?.[0])}
              className="hidden"
            />
          </label>
          <button
            type="submit"
            disabled={savingCourseStructure || uploadingCourseStructure}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            Save structure
          </button>
        </div>
      </form>

      <h2 className="mt-10 text-sm font-semibold text-muted">Semesters</h2>
      <div className="mt-3 flex flex-col gap-2">
        {loading && <div className="text-sm text-muted">Loading…</div>}
        {!loading && semesters.length === 0 && (
          <div className="text-sm text-muted">No semesters found.</div>
        )}
        {semesters.map((s) => (
          <div
            key={s.id}
            className={`flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4 ${
              s.is_visible ? "" : "opacity-60"
            }`}
          >
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-muted">
                /{s.slug} · {s.subjects.length} subjects ·{" "}
                {s.is_visible ? "visible" : "hidden"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/${s.slug}`}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover-primary"
              >
                Manage
              </Link>
              <button
                onClick={() => handleToggleVisible(s)}
                aria-label={s.is_visible ? "Hide semester" : "Show semester"}
                title={s.is_visible ? "Hide from site" : "Show on site"}
                className="no-red-hover flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                {s.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
