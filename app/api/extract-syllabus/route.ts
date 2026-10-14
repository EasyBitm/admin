import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeSyllabus } from "../../../src/lib/syllabus";

export const runtime = "nodejs";
export const maxDuration = 60;

// Inline request limit for Gemini is ~20 MB; base64 adds a third on top of the file size.
const MAX_PDF_BYTES = 14 * 1024 * 1024;

const PROMPT = `You are given a university course syllabus PDF (Tribhuvan University BITM programme).
Extract it into JSON with exactly this shape:
{
  "credit_hours": number | null,
  "lecture_hours": number | null,        // total lecture hours for the course, if stated
  "description": string | null,          // the course description paragraph
  "objectives": string[],                // one entry per course objective
  "units": [                             // course contents, in order
    { "title": string, "hours": number | null, "topics": string[] }
  ],
  "references": string[]                 // textbooks and reference books, one entry each
}
Rules:
- Copy wording from the document; do not invent or summarize content that is not there.
- "title" is the unit heading without the hours, e.g. "Unit 1: Introduction to Computers".
- "topics" are the individual topics listed under that unit, split on commas/semicolons/bullets.
- Use null or [] when a section is missing. Output only the JSON object.`;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!apiKey) return jsonError("GEMINI_API_KEY is not set on the admin server.", 500);
  if (!supabaseUrl || !anonKey) return jsonError("Supabase env vars are missing.", 500);

  // Only signed-in admins may spend API quota.
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Not signed in.", 401);
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) return jsonError(`Could not verify admin access: ${adminError.message}`, 403);
  if (!isAdmin) return jsonError("Not authorized.", 403);

  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!url || !/^https:\/\//i.test(url)) return jsonError("A https PDF URL is required.", 400);

  const pdfResponse = await fetch(url);
  if (!pdfResponse.ok) return jsonError(`Could not download the PDF (${pdfResponse.status}).`, 400);
  const pdf = Buffer.from(await pdfResponse.arrayBuffer());
  if (pdf.length > MAX_PDF_BYTES) return jsonError("The PDF is too large to extract (max 14 MB).", 400);
  if (pdf.subarray(0, 5).toString() !== "%PDF-") return jsonError("That file is not a PDF.", 400);

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: "application/pdf", data: pdf.toString("base64") } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    },
  );

  const result = await geminiResponse.json().catch(() => null);
  if (!geminiResponse.ok) {
    const message = result?.error?.message ?? `Gemini request failed (${geminiResponse.status}).`;
    // 429 = free-tier rate limit; pass it through so the admin knows to wait.
    return jsonError(message, geminiResponse.status === 429 ? 429 : 502);
  }

  const text: string = (result?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim()
    .replace(/^```(?:json)?\s*|\s*```$/g, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return jsonError("Gemini did not return valid JSON. Try again.", 502);
  }

  return NextResponse.json({ syllabus: normalizeSyllabus(parsed, url) });
}
