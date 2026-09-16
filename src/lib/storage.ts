import { supabase } from "./supabase";

export async function uploadResourceFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("resources").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("resources").getPublicUrl(path);
  return data.publicUrl;
}
