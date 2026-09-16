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
