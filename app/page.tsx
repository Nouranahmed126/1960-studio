import Link from 'next/link';
import './reference-hub.css';
import './reference-home-fixes.css';
import Ribbons from './reference-ribbons';

const destinations = [
 {href:'/timeline', label:'Timeline', desc:'Studio updates and crew activity', icon:'timeline'},
 {href:'/assignments', label:'Assignments', desc:'Tasks, deadlines and progress', icon:'assignments'},
 {href:'/submissions', label:'Quick Submit', desc:'Send files, voice notes or written work', icon:'submit'},
 {href:'/honor-board', label:'Film Stars & Honors', desc:'Meet the crew and celebrate achievements', icon:'honors'},
 {href:'/dashboard', label:'My Account', desc:'Your profile and personal submissions', icon:'account'},
];

export default function Home(){
 return <main className="reference-hub" dir="ltr">
  <header>
   <h1 className="reference-hero-artwork">
    <img
     src="/plateau-crew-hub-hero-reference.jpg"
     alt="Plateau Crew Hub — Crafted together, frame by frame."
     width={1584}
     height={672}
     fetchPriority="high"
    />
   </h1>
  </header>
  <section className="reference-grid" aria-label="Studio sections">
   {destinations.map((item,i)=><Link className="reference-frame reference-card" href={item.href} key={item.href}>
    <span className="reference-icon" aria-hidden="true"><img src={'/icon-'+item.icon+'.png'} alt="" width={130} height={130}/></span>
    <span className="reference-copy">{i===4&&<span className="reference-crown" aria-hidden="true">♛</span>}<strong>{item.label}</strong><small>{item.desc}</small></span>
    {i!==4&&<span className="reference-index" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>}
    <span className="reference-arrow" aria-hidden="true">↗︎</span>
    {i===4&&<span className="reference-film" aria-hidden="true"/>}
   </Link>)}
  </section>
  <Ribbons/>
  <footer className="reference-credits" dir="ltr">
   <div><small>Academic Supervision</small><b>Dr. Ahmed Abdelmoneim</b></div>
   <span className="reference-credit-star" aria-hidden="true">✦</span>
   <div><small>Designed &amp; Developed by</small><b>Nouran Ahmed</b></div>
  </footer>
 </main>;
}
