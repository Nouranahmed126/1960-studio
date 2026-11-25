import HomeCrewStrip from "../home-crew-strip";
import HomeHonorShowcase from "../home-honor-showcase";
import MuseumTeaser from "../museum-teaser";
import WelcomeGate from "../welcome-gate";

export default function TimelinePage(){
 return <><WelcomeGate/><main dir="rtl" className="studio-shell cinema-home-page cinema-broadcast-home minimalist-home studio-route-page studio-timeline-page">
  <header className="studio-nav cinema-home-header minimalist-home-header">
   <a className="studio-logo" href="/" aria-label="1960 Studio الرئيسية">STUDIO 1960</a>
   <span className="minimalist-home-tagline">مساحة صُنّاع فيلم 1960 <span aria-hidden="true">✦</span></span>
  </header>
  <section className="studio-timeline-intro" aria-labelledby="timeline-heading">
   <span>1960 STUDIO · THE JOURNEY</span>
   <h1 id="timeline-heading">Timeline · رحلة الفيلم</h1>
   <p>تابعوا نجوم الفيلم، لقطات من الكواليس، وذكريات رحلة الإنتاج في مكان واحد.</p>
  </section>
  <div className="minimalist-home-sections studio-timeline-sections">
   <HomeHonorShowcase/>
   <div className="cinema-dual-marquees minimalist-home-reels"><HomeCrewStrip/><MuseumTeaser/></div>
  </div>
 </main></>
}
