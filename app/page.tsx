import MuseumTeaser from "./museum-teaser";
import HomeCrewStrip from "./home-crew-strip";
import AssignmentCheckin from "./assignment-checkin";
import SubmissionRadar from "./submission-radar";
import HomeHonorShowcase from "./home-honor-showcase";

export default function Home(){
 return <main dir="rtl" className="studio-shell cinema-home-page cinema-broadcast-home minimalist-home">
  <header className="studio-nav cinema-home-header minimalist-home-header">
   <a className="studio-logo" href="/" aria-label="1960 Studio الرئيسية">STUDIO 1960</a>
   <span className="minimalist-home-tagline">مساحة صُنّاع فيلم 1960 <span aria-hidden="true">✦</span></span>
  </header>
  <SubmissionRadar compact/>
  <div className="minimalist-home-sections">
   <AssignmentCheckin/>
   <section className="home-quick-submit" aria-label="التسليم السريع"><div className="home-quick-submit-copy"><span className="home-quick-submit-kicker">QUICK SUBMISSION · STUDIO 1960</span><h2>📤 سلّم تكليفك بسرعة</h2><p>اكتبي عنوان التكليف واختاري فريقك أولًا، وبعدها ارفعي الملف أو الصورة أو الرابط أو الريكورد. استني رسالة نجاح الحفظ قبل ما تقفلي الصفحة.</p></div><div className="home-quick-submit-actions"><a href="/submissions?kind=file">📎 رفع ملف</a><a href="/submissions?kind=media">🖼️ صور وفيديو</a><a href="/submissions?kind=link">🔗 إضافة رابط</a><a href="/submissions?kind=voice">🎙️ تسجيل صوتي</a></div><a className="home-quick-submit-main" href="/submissions">فتح صفحة التسليم السريع ←</a></section>
   <HomeHonorShowcase/>
   <div className="cinema-dual-marquees minimalist-home-reels"><HomeCrewStrip/><MuseumTeaser/></div>
  </div>
 </main>
}