"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Plus, Save, Trash2, Upload } from "lucide-react";
import {
  createSubject,
  deleteSubject,
  getSemesters,
  getSiteSettings,
  updateSemester,
  updateSiteSettings,
  updateSubject,
  type Difficulty,
  type Semester,
} from "../src/lib/data";
import { uploadResourceFile } from "../src/lib/storage";

const difficulties: Difficulty[] = ["Easy", "Medium", "Hard"];

export default function AdminDashboard() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overallSyllabusUrl, setOverallSyllabusUrl] = useState("");
  const [courseStructureUrl, setCourseStructureUrl] = useState("");
  const [uploadingCourseStructure, setUploadingCourseStructure] = useState(false);
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", code: "", chapters: 1, difficulty: "Medium" as Difficulty });

  async function load() {
    setError("");
    try {
      const [next, settings] = await Promise.all([getSemesters(), getSiteSettings()]);
      setSemesters(next);
      const nextSelectedId = selectedId ?? next[0]?.id ?? null;
      setSelectedId((current) => current ?? next[0]?.id ?? null);
      setOverallSyllabusUrl(
        next.find((semester) => semester.id === nextSelectedId)?.overall_syllabus_url ?? "",
      );
      setCourseStructureUrl(settings.course_structure_url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // load is intentionally recreated after mutations; this effect only runs on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(action: () => Promise<unknown>) {
    setError("");
    try { await action(); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Action failed."); }
  }

  const selected = semesters.find((semester) => semester.id === selectedId) ?? null;

  async function uploadSyllabus(file: File | undefined) {
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

  async function saveSyllabus(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    await run(() => updateSemester(selected.id, {
      overall_syllabus_url: overallSyllabusUrl.trim() || null,
    }));
  }

  async function uploadCourseStructure(file: File | undefined) {
    if (!file) return;
    setUploadingCourseStructure(true);
    setError("");
    try { setCourseStructureUrl(await uploadResourceFile(file)); }
    catch (err) { setError(err instanceof Error ? err.message : "Upload failed."); }
    finally { setUploadingCourseStructure(false); }
  }

  async function saveCourseStructure(event: React.FormEvent) {
    event.preventDefault();
    await run(() => updateSiteSettings({ course_structure_url: courseStructureUrl.trim() || null }));
  }

  async function addSubject(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !newSubject.name.trim() || !newSubject.code.trim()) return;
    await run(() => createSubject({
      semester_id: selected.id,
      name: newSubject.name.trim(),
      code: newSubject.code.trim(),
      chapters: newSubject.chapters,
      difficulty: newSubject.difficulty,
      sort_order: selected.subjects.length + 1,
    }));
    setNewSubject({ name: "", code: "", chapters: 1, difficulty: "Medium" });
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div><p className="text-sm font-semibold uppercase tracking-widest text-accent">easyBITM</p><h1 className="mt-2 text-3xl font-bold">Admin dashboard</h1><p className="mt-2 text-sm text-muted">Manage the content shown in the student app.</p></div>
        <button onClick={() => void load()} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"><Save size={15} className="mr-2 inline" />Refresh</button>
      </header>
      <form onSubmit={saveCourseStructure} className="mb-6 rounded-xl border border-border bg-surface p-4">
        <h2 className="font-semibold">BITM course structure</h2>
        <p className="mt-1 text-sm text-muted">Add the course structure PDF shown beside Semesters on the homepage.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input value={courseStructureUrl} onChange={(event) => setCourseStructureUrl(event.target.value)} disabled={uploadingCourseStructure} placeholder="PDF URL (or upload a file)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted hover:bg-background"><Upload size={14} />{uploadingCourseStructure ? "Uploading…" : "Upload PDF"}<input type="file" accept="application/pdf" disabled={uploadingCourseStructure} onChange={(event) => void uploadCourseStructure(event.target.files?.[0])} className="hidden" /></label>
          <button type="submit" disabled={uploadingCourseStructure} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save structure</button>
        </div>
      </form>
      {error && <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {loading ? <p className="text-sm text-muted">Loading content…</p> : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <section className="rounded-xl border border-border bg-surface p-3">
            <h2 className="px-3 pb-3 text-sm font-semibold text-muted">Semesters</h2>
            <div className="space-y-1">{semesters.map((semester) => (
              <button key={semester.id} onClick={() => { setSelectedId(semester.id); setOverallSyllabusUrl(semester.overall_syllabus_url ?? ""); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm ${selectedId === semester.id ? "bg-accent/15 text-accent" : "text-muted hover:bg-background"}`}>
                <span><span className="block font-medium text-foreground">{semester.name}</span><span className="text-xs">{semester.subjects.length} subjects</span></span>{semester.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            ))}</div>
          </section>
          {selected ? <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-muted">/{selected.slug}</p><h2 className="text-2xl font-semibold">{selected.name}</h2></div><button onClick={() => void run(() => updateSemester(selected.id, { is_visible: !selected.is_visible }))} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface">{selected.is_visible ? "Hide semester" : "Show semester"}</button></div>
            <form onSubmit={saveSyllabus} className="mb-6 rounded-xl border border-border bg-surface p-4">
              <h3 className="font-semibold">Overall syllabus</h3>
              <p className="mt-1 text-sm text-muted">Add the syllabus PDF for the whole semester.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input value={overallSyllabusUrl} onChange={(event) => setOverallSyllabusUrl(event.target.value)} placeholder="PDF URL (or upload a file)" disabled={uploadingSyllabus} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted hover:bg-background">
                  <Upload size={14} />{uploadingSyllabus ? "Uploading…" : "Upload PDF"}
                  <input type="file" accept="application/pdf" disabled={uploadingSyllabus} onChange={(event) => void uploadSyllabus(event.target.files?.[0])} className="hidden" />
                </label>
                <button type="submit" disabled={uploadingSyllabus} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">Save syllabus</button>
              </div>
            </form>
            <form onSubmit={addSubject} className="mb-6 grid gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-5"><input required value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} placeholder="Subject name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2" /><input required value={newSubject.code} onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })} placeholder="Code" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /><input type="number" min={1} value={newSubject.chapters} onChange={(e) => setNewSubject({ ...newSubject, chapters: Number(e.target.value) })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" /><button className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={15} className="mr-1 inline" />Add subject</button></form>
            <div className="space-y-2">{selected.subjects.map((subject) => <div key={subject.id} className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_7rem_6rem_6rem_auto_auto]"><input defaultValue={subject.name} onBlur={(e) => e.target.value !== subject.name && void run(() => updateSubject(subject.id, { name: e.target.value }))} className="rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium focus:border-border" /><input defaultValue={subject.code} onBlur={(e) => e.target.value !== subject.code && void run(() => updateSubject(subject.id, { code: e.target.value }))} className="rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-muted focus:border-border" /><input type="number" min={1} defaultValue={subject.chapters} onBlur={(e) => Number(e.target.value) !== subject.chapters && void run(() => updateSubject(subject.id, { chapters: Number(e.target.value) }))} className="rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-muted focus:border-border" /><select defaultValue={subject.difficulty} onChange={(e) => void run(() => updateSubject(subject.id, { difficulty: e.target.value as Difficulty }))} className="rounded-lg border border-border bg-background px-2 py-1 text-sm">{difficulties.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}</select><Link href={`/${selected.slug}/${subject.id}`} className="rounded-lg border border-border px-2 py-1 text-center text-sm hover:bg-background">Resources</Link><button onClick={() => window.confirm(`Delete ${subject.name}?`) && void run(() => deleteSubject(subject.id))} aria-label={`Delete ${subject.name}`} className="rounded-lg px-2 text-muted hover:bg-red-500/10 hover:text-red-400"><Trash2 size={16} /></button></div>)}</div>
          </section> : <p className="text-sm text-muted">No semesters found.</p>}
        </div>
      )}
    </main>
  );
}
