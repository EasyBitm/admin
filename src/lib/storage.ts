import { supabase } from "./supabase";

export async function uploadResourceFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("resources").upload(path, file);
  if (error) {
    // Supabase rejects files above the bucket/project file size limit with this message.
    if (/maximum allowed size/i.test(error.message)) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(
        `"${file.name}" (${sizeMb} MB) is larger than the Supabase storage upload limit. ` +
          `Raise the limit in Supabase → Storage → Settings and the "resources" bucket settings, ` +
          `or compress the PDF and try again.`,
      );
    }
    throw error;
  }

  const { data } = supabase.storage.from("resources").getPublicUrl(path);
  return data.publicUrl;
}
