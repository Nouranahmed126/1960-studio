/** Normalize titles so written work and uploaded files share an assignment group. */
export function assignmentLabel(item: { title: string }): string {
  const text = item.title
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const match = text.match(/(?:التكليف|تكليف|assignment|task)\s*(?:رقم\s*)?[#№:.\- ]*([0-9]+)/i);
  return match ? "التكليف " + match[1] : text
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[\s_-]*\(?\d+\)?$/, "")
    .trim().slice(0, 85) || "تسليم بدون عنوان";
}
