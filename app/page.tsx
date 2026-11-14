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
   <section className="home-quick-submit" aria-label="التسليم السريع">
    <div className="home-quick-submit-copy"><span className="home-quick-submit-kicker">QUICK SUBMISSION · STUDIO 1960</span><h2>📤 سلّم تكليفك بسرعة</h2></div>
    <div className="home-chat-submit" role="group" aria-label="اختصارات تسليم التكليف">
     <details className="home-chat-submit-menu"><summary aria-label="خيارات المرفقات" title="إضافة مرفق">＋</summary>
      <div className="home-chat-submit-options"><a href="/submissions?kind=file">📎 رفع ملف</a><a href="/submissions?kind=media">🖼️ صورة أو فيديو</a><a href="/submissions?kind=link">🔗 إضافة رابط</a></div>
     </details>
     <a className="home-chat-submit-field" href="/submissions" aria-label="كتابة عنوان التكليف واختيار الفريق">اكتبي عنوان التكليف وابدئي التسليم…</a>
     <a className="home-chat-submit-mic" href="/submissions?kind=voice" aria-label="فتح التسجيل الصوتي" title="تسجيل صوتي">🎙️</a>
    </div>
    <p className="home-chat-submit-hint">حددي عنوان التكليف والفريق قبل الإرسال · انتظري تأكيد الحفظ</p>
   </section>
   <HomeHonorShowcase/>
   <div className="cinema-dual-marquees minimalist-home-reels"><HomeCrewStrip/><MuseumTeaser/></div>
  </div>
 </main>
}