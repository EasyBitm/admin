import { supabase } from "./supabase";

export type Difficulty = "Easy" | "Medium" | "Hard";
export type Subject = {
  id: string;
  semester_id: string;
  name: string;
  code: string;
  chapters: number;
  difficulty: Difficulty;
  sort_order: number;
  oneshot_video_url?: string | null;
  overall_notes_url?: string | null;
};
export type Semester = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_visible: boolean;
  overall_syllabus_url: string | null;
  subjects: Subject[];
};

export type ResourceKind = "notes" | "syllabus" | "video" | "question_paper";

export type Resource = {
  id: string;
  subject_id: string;
  kind: ResourceKind;
  title: string;
  url: string;
  year: number | null;
  lesson: number | null;
  sort_order: number;
};

export type Lesson = {
  id: string;
  subject_id: string;
  title: string;
  hours: number | null;
  sort_order: number;
};

export type SubjectWithResources = Subject & {
  oneshot_video_url: string | null;
  resources: Resource[];
  lessons: Lesson[];
};

export async function getSemesters(): Promise<Semester[]> {
  const [{ data: semesters, error: semesterError }, { data: subjects, error: subjectError }] =
    await Promise.all([
      supabase.from("semesters").select("*").order("sort_order"),
      supabase.from("subjects").select("*").order("sort_order"),
    ]);
  if (semesterError) throw semesterError;
  if (subjectError) throw subjectError;
  return (semesters ?? []).map((semester) => ({
    ...semester,
    subjects: (subjects ?? []).filter((subject) => subject.semester_id === semester.id),
  }));
}

export async function getSemester(slug: string): Promise<Semester | null> {
  const { data: semester, error } = await supabase
    .from("semesters")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!semester) return null;

  const { data: subjects, error: subjectError } = await supabase
    .from("subjects")
    .select("*")
    .eq("semester_id", semester.id)
    .order("sort_order");
  if (subjectError) throw subjectError;
  return { ...semester, subjects: subjects ?? [] } as Semester;
}

export async function getSubject(id: string): Promise<SubjectWithResources | null> {
  const { data: subject, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!subject) return null;

  const [{ data: resources, error: resourceError }, { data: lessons, error: lessonError }] =
    await Promise.all([
      supabase.from("resources").select("*").eq("subject_id", id).order("sort_order"),
      supabase.from("lessons").select("*").eq("subject_id", id).order("sort_order"),
    ]);
  if (resourceError) throw resourceError;
  if (lessonError) throw lessonError;
  return { ...subject, resources: resources ?? [], lessons: lessons ?? [] } as SubjectWithResources;
}

export async function updateSemester(
  id: string,
  input: Partial<Pick<Semester, "name" | "is_visible" | "overall_syllabus_url">>,
) {
  const { error } = await supabase.from("semesters").update(input).eq("id", id);
  if (error) throw error;
}

export async function createSubject(input: Omit<Subject, "id">) {
  const { error } = await supabase.from("subjects").insert(input);
  if (error) throw error;
}

export async function updateSubject(id: string, input: Partial<Omit<Subject, "id" | "semester_id">>) {
  const { error } = await supabase.from("subjects").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

export async function createResource(input: Omit<Resource, "id">) {
  const { error } = await supabase.from("resources").insert(input);
  if (error) throw error;
}

export async function updateResource(id: string, input: Partial<Omit<Resource, "id" | "subject_id">>) {
  const { error } = await supabase.from("resources").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteResource(id: string) {
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw error;
}

export async function createLesson(input: Omit<Lesson, "id">) {
  const { error } = await supabase.from("lessons").insert(input);
  if (error) throw error;
}

export async function updateLesson(id: string, input: Partial<Omit<Lesson, "id" | "subject_id">>) {
  const { error } = await supabase.from("lessons").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteLesson(id: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw error;
}
