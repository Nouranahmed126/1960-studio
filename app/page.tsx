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
   <HomeHonorShowcase/>
   <AssignmentCheckin/>
   <div className="cinema-dual-marquees minimalist-home-reels"><HomeCrewStrip/><MuseumTeaser/></div>
  </div>
 </main>
}