# 1960 STUDIO

منصة عربية متجاوبة مع الهاتف لمشروع التخرج «1960»، مبنية بـ Next.js وSupabase.

## الوظائف الموجودة في المستودع

- واجهة رئيسية عربية.
- تسجيل دخول بالبريد وكلمة المرور.
- تسجيل طالب بالاسم الثلاثي واختيار فريقين أو ثلاثة.
- لوحة الطالب لعرض طلبات الفرق وعضوياته والتكليفات.
- لوحة المشرفة لمراجعة طلبات الانضمام واعتمادها.
- إنشاء تكليف وتحديد الفرق المستهدفة.
- دوال SQL لطلبات الفرق والموافقة عليها.

## خطوات التشغيل

1. `npm ci` ثم `npm run dev`.
2. ضعي `NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_ANON_KEY` في `.env.local` (لا ترفعي الملف).
3. راجعي الجداول والسياسات الموجودة في Supabase ثم نفذي `supabase/team-approval.sql`.
4. اختبري التسجيل وتأكيد البريد واختيار الفرق والموافقة عليها بحسابات تجريبية.
5. اختبري RLS بعناية: طالب غير معتمد، طالب معتمد، مشرفة، وعضوية فريقين أو ثلاثة.
6. اضبطي متغيرات البيئة في Vercel وانشري الموقع بعد نجاح الاختبارات.

## الحالة الفعلية

**تم رفع الكود إلى GitHub، وليس هناك تأكيد بعد أن قاعدة بيانات Supabase اتحدثت أو أن الموقع اتنشر على Vercel أو أن اختبارات البناء والصلاحيات نجحت.**

## المتبقي

- رفع الملفات والمرفقات وربطها بالتكليفات بمسارات تخزين محمية.
- مساهمات الطلاب والمراجعات واعتماد التسليمات.
- محادثات الفرق والمحاضرات والملاحظات الخاصة بالمشرفة.
- استكمال اختبار البريد وRLS والبناء والنشر.

لا تضعي `service_role` في الواجهة أو GitHub، ولا تشاركي رابط الموقع مع الطلاب قبل اختبار الصلاحيات.

### Plateau | Crew Hub timeline

The homepage uses the existing approved student and supervisor accounts. Copy
`.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` to the corresponding Supabase project values.
For a separate copy of the studio database, apply the gallery interactions
migration and then the Plateau feed migration after the studio schema is in place.
The feed migration creates the private `post-media` bucket and copies existing
community posts and interactions. Access to media uses renewable signed URLs
generated from persisted storage paths.
