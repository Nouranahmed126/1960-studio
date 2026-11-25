import Link from 'next/link';
import './reference-hub.css';
import Ribbons from './reference-ribbons';
const destinations = [
 {href:'/timeline', label:'Timeline', desc:'Studio updates and crew activity', icon:'timeline'},
 {href:'/assignments', label:'Assignments', desc:'Tasks, deadlines and progress', icon:'assignments'},
 {href:'/submissions', label:'Quick Submit', desc:'Send files, voice notes or written work', icon:'submit'},
 {href:'/honor-board', label:'Film Stars & Honors', desc:'Meet the crew and celebrate achievements', icon:'honors'},
 {href:'/dashboard', label:'My Account', desc:'Your profile and personal submissions', icon:'account'},
];
export default function Home(){return <main className="reference-hub" dir="ltr">
<header className="reference-frame reference-hero">
<div className="reference-scene" aria-hidden="true"/>
<div className="reference-identity"><p className="reference-kicker">A CREATIVE PRODUCTION COMMUNITY</p><div className="reference-brand"><span className="reference-mark">P</span><h1>Plateau<br/><em>Crew Hub</em></h1><span className="reference-spark" aria-hidden="true">✦</span></div><p className="reference-lead">One crew. One vision.<br/>A story in the making.</p><p className="reference-studio">◉ &nbsp; — STUDIO 1960</p></div><div className="reference-film" aria-hidden="true"/></header>
<section className="reference-grid" aria-label="Studio sections">{destinations.map((item,i)=><Link className="reference-frame reference-card" href={item.href} key={item.href}><span className="reference-icon" aria-hidden="true"><img src={'/icon-'+item.icon+'.png'} alt="" width={130} height={130}/></span><span className="reference-copy">{i===4&&<span className="reference-crown" aria-hidden="true">♛</span>}<strong>{item.label}</strong><small>{item.desc}</small></span>{i!==4&&<span className="reference-index" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>}<span className="reference-arrow" aria-hidden="true">↗︎</span>{i===4&&<span className="reference-film" aria-hidden="true"/>}</Link>)}</section><Ribbons/>
<footer className="reference-credits" dir="ltr"><div><small>Academic Supervision</small><b>Dr. Ahmed Abdelmoneim</b></div><div><small>Designed &amp; Developed by</small><b>Nouran Ahmed</b></div></footer></main>}
