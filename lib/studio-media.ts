import type { SupabaseClient } from "@supabase/supabase-js";

export async function signStudioImages(
  db: SupabaseClient,
  bucket: "crew-photos" | "studio-gallery",
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const validPaths = [...new Set(paths.filter((path): path is string =>
    !!path && !/^[a-z][a-z0-9+.-]*:|^\/\//i.test(path)
  ))];
  if (!validPaths.length) return new Map();

  // The existing crew bucket is public; signing requires SELECT policies that it lacks.
  // Only resolve paths supplied by the caller after its existing record-access checks.
  if (bucket === "crew-photos") {
    return new Map(validPaths.map(path => [path, db.storage.from(bucket).getPublicUrl(path).data.publicUrl]));
  }
  const { data } = await db.storage.from(bucket).createSignedUrls(validPaths, 300);
  const urls = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && !item.error && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
