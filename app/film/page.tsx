import { redirect } from "next/navigation";

// The former standalone showcase duplicated the three strips already on the main experience.
// Keep old bookmarks working by sending visitors to the homepage; no gallery or archive data is deleted.
export default function FilmPage() {
  redirect("/");
}
