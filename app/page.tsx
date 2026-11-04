const features = [
  { title: "الفرق", text: "تنظيم أعضاء فرق العمل ومتابعة طلبات الانضمام." },
  { title: "التكليفات", text: "متابعة المهام والمواعيد والتسليمات." },
  { title: "المساهمات", text: "جمع أعمال الطلاب ومراجعتها في مكان واحد." },
  { title: "الإشراف", text: "متابعة طلبات الطلاب وموافقات المشرفة." },
];
export default function Home() {
  return <main style={{ minHeight: "100vh", maxWidth: 960, margin: "auto", padding: "36px 22px" }}>
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <strong style={{ letterSpacing: 2, fontSize: 19 }}>1960 STUDIO</strong>
      <a href="/login" style={{ color: "#d5a66d", fontSize: 14, textDecoration: "none" }}>تسجيل الدخول ←</a>
    </header>
    <section style={{ padding: "90px 0 65px" }}>
      <p style={{ color: "#d5a66d", fontSize: 14 }}>من الفكرة إلى الشاشة</p>
      <h1 style={{ fontSize: "clamp(42px, 9vw, 88px)", lineHeight: 1.15, margin: "15px 0" }}>كل حكاية<br/>بتبدأ بفريق.</h1>
      <p style={{ color: "#bac2d0", maxWidth: 500, lineHeight: 2 }}>مكان واحد يجمع فريق فيلم 1960، ويساعدنا ننظم الشغل ونوثّق كل خطوة في رحلتنا.</p>
      <p style={{ color: "#d5a66d", fontSize: 13 }}>المنصة قيد التجهيز — التسجيل والتسليمات هتتفعل بعد اختبار الصلاحيات.</p>
    </section>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
      {features.map((item, i) => <article key={item.title} style={{ padding: 24, border: "1px solid #343a49", borderRadius: 18, background: "#191e2a" }}>
        <span style={{ color: "#d5a66d", fontSize: 13 }}>0{i + 1}</span>
        <h2 style={{ fontSize: 22 }}>{item.title}</h2>
        <p style={{ color: "#aeb8ca", lineHeight: 1.8, fontSize: 14 }}>{item.text}</p>
      </article>)}
    </section>
    <footer style={{ marginTop: 65, paddingTop: 20, borderTop: "1px solid #343a49", color: "#8e98ab", fontSize: 12 }}>1960 STUDIO · مشروع تخرج</footer>
  </main>;
}