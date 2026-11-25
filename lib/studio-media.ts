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

  const { data } = await db.storage.from(bucket).createSignedUrls(validPaths, 300);
  const urls = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && !item.error && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
