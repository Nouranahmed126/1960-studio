import type { SupabaseClient } from "@supabase/supabase-js";

/** The storage DELETE policy only permits removal of this user's unreferenced files.
 * If the metadata insert committed but its response was lost, the policy preserves it.
 */
export async function cleanupFailedUpload(db: SupabaseClient, path: string): Promise<boolean> {
  try {
    const { data, error } = await db.storage.from("studio-files").remove([path]);
    return !error && !!data?.some(file => file.name === path);
  } catch {
    return false;
  }
}
