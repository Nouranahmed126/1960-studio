import { readFileSync } from "node:fs";
import { join } from "node:path";
import StudentHome from "./student-home";

export default function Home() {
  const bannerData = "data:image/jpeg;base64," + readFileSync(join(process.cwd(), "app/plateau-home-banner.b64"), "utf8").trim();
  return <StudentHome bannerData={bannerData} />;
}
