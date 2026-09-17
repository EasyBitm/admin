"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getSemesters, updateSemester, type Semester } from "../../src/lib/data";

export default function AdminPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await getSemesters({ includeHidden: true });
    setSemesters(data);
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  async function handleToggleVisible(s: Semester) {
    await updateSemester(s.id, { is_visible: !s.is_visible });
    load();
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-muted">
        Manage subjects and show/hide semesters on the site.
      </p>

      <div className="mt-8 flex flex-col gap-2">
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
                href={`/admin/${s.slug}`}
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
