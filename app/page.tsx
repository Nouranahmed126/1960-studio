import Link from "next/link";
const destinations=[
 {href:"/timeline",label:"Timeline",desc:"Studio updates and crew activity",icon:"◷",tone:"lavender"},
 {href:"/assignments",label:"Assignments",desc:"Tasks, deadlines and progress",icon:"▤",tone:"violet"},
 {href:"/submissions",label:"Quick Submit",desc:"Send files, voice notes or written work",icon:"↥",tone:"gold"},
 {href:"/honor-board",label:"Film Stars & Honors",desc:"Meet the crew and celebrate achievements",icon:"✧",tone:"gold"},
 {href:"/dashboard",label:"My Account",desc:"Your profile and personal submissions",icon:"◎",tone:"lavender"}
];
export default function Home(){return <main className="studio-shell studio-hub-page" dir="ltr">
 <header className="studio-hub-header"><span className="studio-hub-mark">P<span>✦</span></span><div><p className="studio-hub-kicker">A CREATIVE PRODUCTION COMMUNITY</p><h1>Plateau <em>Crew Hub</em></h1><p className="studio-hub-lead">One crew. One vision. A story in the making.</p></div><span className="studio-hub-year">1960</span></header>

 <section className="studio-hub-grid" aria-label="Studio sections">{destinations.map((item,i)=><Link className={"studio-hub-card tone-"+item.tone} href={item.href} key={item.href}><span className="studio-hub-card-icon">{item.icon}</span><span className="studio-hub-card-copy"><strong>{item.label}</strong><small>{item.desc}</small></span><span className="studio-hub-card-arrow">↗</span><span className="studio-hub-card-index">{String(i+1).padStart(2,"0")}</span></Link>)}</section>
 <footer className="studio-hub-credits"><span>Academic Supervision <strong>Dr. Ahmed Abdelmoneim</strong></span><span>Designed &amp; Developed by <strong>Nouran Ahmed</strong></span></footer>
 </main>
