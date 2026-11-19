/* Family Trip app — plain JavaScript, no build step. Talks to Supabase through one RPC: public.api(token, action, data). */
(() => {
'use strict';
const CFG = window.TRIP_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem('trip.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('trip.' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('trip.' + k); } catch {} }
};

const S = {
  token: LS.get('token', null), lang: LS.get('lang', 'en'), tab: LS.get('tab', 'home'), data: null,
  cur: LS.get('cur', 'JOD'), moneyTab: 'overview', q: '', ideasSort: 'top', city: 'all', placesSeg: 'places',
  byHouse: LS.get('byHouse', false), trOn: new Set(), openAnn: new Set(), preview: false, planDay: 'all', openIdeas: new Set(), mode: 'login', status: null
};
let F = null;            // the form currently open in a sheet
let sheetRender = null;  // function that renders the open sheet

/* ---------------- i18n ---------------- */
const AR = {
  'Home':'الرئيسية','Plan':'البرنامج','Places':'الأماكن','Ideas':'اقتراحات','Money':'المصاريف','More':'المزيد',
  'Username':'اسم المستخدم','Password':'كلمة المرور','Log in':'تسجيل الدخول','Log out':'تسجيل الخروج',
  'Your name':'اسمك','Create organizer account':'إنشاء حساب المنظم','Welcome! Create the organizer account first. Only you will be able to add family members.':'أهلاً! أنشئ حساب المنظم أولاً. أنت فقط من يستطيع إضافة أفراد العائلة.',
  'Ask the trip organizer for your username and password.':'اطلب اسم المستخدم وكلمة المرور من منظم الرحلة.',
  'days to go':'يوم متبقي','Day {a} of {b}':'اليوم {a} من {b}','The trip is over. What a trip!':'انتهت الرحلة. كانت رحلة رائعة!','Starts today!':'الرحلة تبدأ اليوم!',
  "Today's brief":'ملخص اليوم',"Tomorrow's brief":'ملخص الغد','First day brief':'ملخص اليوم الأول','Meet at':'التجمع','Wear':'اللبس','Bring':'أحضر معك',
  'Announcements':'الإعلانات','New announcement':'إعلان جديد','No announcements yet.':'لا توجد إعلانات بعد.','Pinned':'مثبت','NEW':'جديد',
  'Who is coming':'المسافرون','people':'أشخاص','Your balance':'رصيدك','You are owed':'لك','You owe':'عليك','All settled':'لا شيء عليك',
  'All days':'كل الأيام','Day':'اليوم','Edit day':'تعديل اليوم','Add activity':'إضافة نشاط','Nothing planned yet.':'لا يوجد شيء مخطط بعد.',
  'Title':'العنوان','Time':'الوقت','Details':'التفاصيل','Place':'المكان','Location note':'ملاحظة عن الموقع','Save':'حفظ','Cancel':'إلغاء','Delete':'حذف','Edit':'تعديل','Close':'إغلاق',
  'Brief':'الملخص','Meeting time':'وقت التجمع','Meeting point':'مكان التجمع','What to wear':'ماذا نلبس','What to bring':'ماذا نحضر','Cover photo':'صورة الغلاف','Upload photo':'رفع صورة','Remove cover':'إزالة الغلاف',
  'Photos':'الصور','Add photos':'إضافة صور','All':'الكل','Open in Maps':'افتح في الخرائط','Good to know':'معلومات مهمة','When we go':'متى نذهب','New place':'مكان جديد','Name':'الاسم','City':'المدينة','Short description':'وصف قصير','Map link':'رابط الخريطة','No photos yet.':'لا توجد صور بعد.','Caption (optional)':'تعليق (اختياري)','Upload':'رفع','Set as cover':'اجعلها غلافاً','Uploading…':'جارٍ الرفع…',
  'Top':'الأعلى','Newest':'الأحدث','New idea':'اقتراح جديد','Suggest something':'اقترح شيئاً','For which day? (optional)':'لأي يوم؟ (اختياري)','Any day':'أي يوم','Write a comment…':'اكتب تعليقاً…','Send':'إرسال','comments':'تعليقات','Open':'مفتوح','Planned':'في البرنامج','Declined':'مرفوض','Add to plan':'أضف للبرنامج','No ideas yet. Be the first!':'لا توجد اقتراحات. كن الأول!',
  'Expenses':'المصاريف','Balances':'الأرصدة','Settle up':'التسوية','Add expense':'إضافة مصروف','Amount':'المبلغ','Currency':'العملة','Paid by':'دفع','Date':'التاريخ','Category':'الفئة','Note':'ملاحظة',
  'Split':'التقسيم','Equally':'بالتساوي','Who ate what':'مين أكل شو','By shares':'بالحصص','Exact amounts':'مبالغ محددة','Everyone':'الجميع','Nobody':'لا أحد',
  'Item':'الصنف','Price':'السعر','Add item':'إضافة صنف','Bill total incl. tax, service and tip (optional)':'المجموع مع الضريبة والخدمة والبقشيش (اختياري)','Items add up to {a}. The extra {b} is shared in proportion.':'مجموع الأصناف {a}. الفرق {b} يُقسم بالنسبة.',
  'Each person pays':'حصة كل شخص','Left to assign':'المتبقي','Total':'المجموع','your share':'حصتك','paid':'دفع','No expenses yet.':'لا توجد مصاريف بعد.',
  'Group by family':'حسب العائلة','Suggested payments':'الدفعات المقترحة','Everyone is settled up.':'الكل متساوٍ، لا ديون.','Mark as paid':'تم الدفع','Payment history':'سجل الدفعات','pays':'يدفع لـ','Record payment':'تسجيل دفعة','From':'من','To':'إلى',
  'Statement':'كشف حساب','Send bills':'إرسال الفواتير','Email':'إيميل','WhatsApp':'واتساب','Copy':'نسخ','Copied':'تم النسخ','Print':'طباعة','Share':'مشاركة','Final statements':'الكشوفات النهائية','Export CSV':'تصدير CSV',
  'Total share':'مجموع الحصص','Total paid':'مجموع ما دفع','Payments sent':'دفعات أرسلها','Payments received':'دفعات استلمها','Net':'الصافي','No email saved':'لا يوجد إيميل',
  'Profile':'الملف الشخصي','Change password':'تغيير كلمة المرور','Current password':'كلمة المرور الحالية','New password':'كلمة المرور الجديدة','Language':'اللغة','Appearance':'المظهر','Auto':'تلقائي','Light':'فاتح','Dark':'داكن',
  'Install on your phone':'ثبّت التطبيق على هاتفك','Family':'العائلة','Organizer tools':'أدوات المنظم','Members':'الأعضاء','Add member':'إضافة عضو','Family / household':'العائلة / الأسرة','Organizer (full access)':'منظم (صلاحيات كاملة)','Member':'عضو',
  'Permissions':'الصلاحيات','Trip settings':'إعدادات الرحلة','Trip name':'اسم الرحلة','Start date':'تاريخ البداية','End date':'تاريخ النهاية','Welcome message':'رسالة الترحيب','App color':'لون التطبيق','Exchange rates':'أسعار الصرف','1 JOD equals':'1 دينار يساوي',
  'Set a new password (leave empty to keep)':'كلمة مرور جديدة (اتركها فارغة للإبقاء)','Saved':'تم الحفظ','Deleted':'تم الحذف','Are you sure?':'هل أنت متأكد؟','Yes, delete':'نعم، احذف',
  'See the plan':'رؤية البرنامج','See places':'رؤية الأماكن','See photos':'رؤية الصور','See ideas':'رؤية الاقتراحات','See money':'رؤية المصاريف','See everyone\'s money (off = only their own)':'رؤية مصاريف الجميع (إيقاف = مصاريفه فقط)',
  'Add expenses':'إضافة مصاريف','Suggest ideas':'تقديم اقتراحات','Comment':'التعليق','Upload photos':'رفع صور','Edit plan and briefs':'تعديل البرنامج والملخصات','Edit places':'تعديل الأماكن','Post announcements':'نشر إعلانات',
  'Food':'أكل','Transport':'مواصلات','Tickets':'تذاكر','Hotel':'فندق','Shopping':'تسوق','Other':'أخرى','Display currency':'عملة العرض',
  'App not connected yet':'التطبيق غير متصل بعد','Refresh':'تحديث','Pay {a} to {b}':'ادفع {a} لـ {b}','{a} pays you {b}':'{a} يدفع لك {b}','by':'بواسطة','Hi {a},':'مرحباً {a}،',
  'Only you can see this.':'أنت فقط تستطيع رؤية هذا.','Your money':'مصاريفك','Ask the organizer who to pay at the end of the trip.':'سيخبرك المنظم لمن تدفع في نهاية الرحلة.','Tap Share then "Add to Home Screen" on iPhone, or the menu then "Install app" on Android.':'على الآيفون: اضغط مشاركة ثم "إضافة إلى الشاشة الرئيسية". على أندرويد: القائمة ثم "تثبيت التطبيق".',
  'Need at least 6 characters':'6 أحرف على الأقل','Choose from photos':'اختر من الصور','Saving…':'جارٍ الحفظ…','you':'أنت','Weight':'الحصة','Payment method':'طريقة الدفع','Cash':'نقداً','Card':'بطاقة','Bank transfer':'تحويل بنكي','Receipt photo':'صورة الإيصال','Add receipt':'إضافة إيصال','Flights':'طيران','bills':'فواتير','Days':'الأيام','Groups':'المجموعات','To-dos':'المهام','New grouping (cars, rooms, activity)':'تقسيم جديد (سيارات، غرف، نشاط)','No groups yet.':'لا توجد مجموعات بعد.','New to-do for the family':'مهمة جديدة للعائلة','Nothing to do yet.':'لا توجد مهام بعد.','Cars':'السيارات','Hotel rooms':'غرف الفندق','Activity':'نشاط','You are in':'أنت في','done':'تم','Due date':'آخر موعد','Who must do it':'من عليه القيام بها','Who has done it':'من أنجزها','Split by family':'قسّم حسب العائلة','Notes':'ملاحظات','tap a group, then tap people to put them in it':'اختر مجموعة ثم اضغط على الأشخاص لإضافتهم','Add group':'إضافة مجموعة','Note (driver, phone, room number…)':'ملاحظة (السائق، الهاتف، رقم الغرفة…)','Not placed yet':'لم يُوزّع بعد','Everyone is placed':'تم توزيع الجميع','Car':'سيارة','Room':'غرفة','Group':'مجموعة','copy':'نسخة','Copied. Change the day and save.':'تم النسخ. غيّر اليوم واحفظ.','Add trip info':'إضافة معلومة','Your to-dos':'مهامك','See all':'عرض الكل','Your groups':'مجموعاتك','Trip info':'معلومات الرحلة','Add flights, hotel addresses, emergency numbers and anything the family should be able to find quickly.':'أضف الرحلات وعناوين الفنادق وأرقام الطوارئ وكل ما تحتاجه العائلة بسرعة.','Who can see this announcement':'من يرى هذا الإعلان','Most liked':'الأكثر دعماً','Shared with everyone':'للجميع','Private to me':'خاصة بي','Mine':'اقتراحاتي','Alone':'وحدي','With a group':'مع مجموعة','Only the organizer sees this':'يراها المنظم فقط','Why':'لماذا','Organizer reply':'رد المنظم','Support':'أدعم','Reply / status':'رد / حالة','Suggest a place':'اقترح مكاناً','Name of the place':'اسم المكان','Why do you want to go?':'لماذا تريد الذهاب؟','Do you want to do it alone or with a group?':'تريد الذهاب وحدك أم مع مجموعة؟','Who should see it?':'من يرى الاقتراح؟','Only the organizer':'المنظم فقط','A private request just for the organizer':'طلب خاص للمنظم فقط','The family can see it, support it and comment':'العائلة تراه وتدعمه وتعلّق عليه','Your reply (everyone who can see the idea will read it)':'ردك (يراه كل من يرى الاقتراح)','Write the name of the place':'اكتب اسم المكان','Address':'العنوان','Opening hours':'ساعات العمل','Tickets & prices':'التذاكر والأسعار','Phone':'الهاتف','Website':'الموقع','Booking / reservation':'الحجز','How long we stay':'مدة البقاء','Best time to go':'أفضل وقت','How we get there':'كيف نصل','Dress code':'اللباس','For the kids':'للأطفال','Food & drinks':'الأكل والشرب','Walking / accessibility':'المشي وسهولة الوصول','Rules & warnings':'قواعد وتحذيرات','Our contact person':'الشخص المسؤول','Map':'الخريطة','Links':'روابط','(leave empty what you do not need)':'(اترك الفارغ إن لم تحتجه)','Your own fields':'حقول إضافية','Label':'العنوان','Value':'القيمة','Add field':'إضافة حقل','Add link':'إضافة رابط','Add your photo':'أضف صورتك','So the family can see who is who.':'حتى تعرف العائلة من هو من.','Add':'إضافة','Change photo':'تغيير الصورة','Add photo':'إضافة صورة','Remove':'إزالة','Bill for':'فاتورة','Shares':'الحصص','Visible to':'من يرى','Everything':'كل شيء'
};
const t = (s, v) => { let r = S.lang === 'ar' ? (AR[s] || s) : s; if (v) for (const k in v) r = r.replace('{' + k + '}', v[k]); return r; };
const ERR = {
  bad_login: 'Wrong username or password', password_too_short: 'Need at least 6 characters', username_taken: 'That username is taken',
  not_allowed: 'You do not have permission for this', admin_only: 'Only the organizer can do this', shares_do_not_add_up: 'The split does not add up to the total',
  no_people: 'Choose who shares this', bad_amount: 'Enter an amount', missing_title: 'Add a title', member_has_expenses: 'This person has expenses. Delete those first.',
  photo_too_big: 'Photo is too big', cannot_demote_self: 'You cannot remove your own organizer role', cannot_change_main_organizer: 'The main organizer cannot be removed', main_organizer_only: 'Only the main organizer can do this', missing_name: 'Fill in name and username', already_set_up: 'Already set up. Please log in.'
};
Object.assign(AR, { 'Wrong username or password':'اسم المستخدم أو كلمة المرور غير صحيحة','That username is taken':'اسم المستخدم مستخدم','You do not have permission for this':'ليس لديك صلاحية','Only the organizer can do this':'فقط المنظم يستطيع ذلك','The split does not add up to the total':'التقسيم لا يساوي المجموع','Choose who shares this':'اختر من يشارك','Enter an amount':'أدخل المبلغ','Add a title':'أضف عنواناً','This person has expenses. Delete those first.':'لهذا الشخص مصاريف. احذفها أولاً.','Photo is too big':'الصورة كبيرة جداً','Fill in name and username':'أدخل الاسم واسم المستخدم' });

/* ---------------- helpers ---------------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const locale = () => S.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
const fmtDay = (s, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat(locale(), o).format(pd(s));
const today = () => iso(new Date());
const ago = ts => { const s = (Date.now() - new Date(ts)) / 1000; const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  if (s < 60) return rtf.format(0, 'second'); if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour'); return rtf.format(-Math.round(s / 86400), 'day'); };
const D = () => S.data;
const trip = () => Object.assign({ name: 'Family Trip', start: '2026-12-18', end: '2026-12-25' }, D()?.settings?.trip);
const OLD_SW = ['#0f766e', '#0e7490', '#1d4ed8', '#6d28d9', '#be185d', '#b45309', '#15803d', '#334155', '#0f5e6e', '#1b6f8a', '#2e4a8c', '#6b4c9a', '#b4536a', '#b7791f', '#2f7d4f', '#3b4252'];
const SWATCHES = [['#0e6ba8', 'Nile'], ['#0d9488', 'Water'], ['#2f9e58', 'Palm'], ['#0a74da', 'Sea'], ['#e8705a', 'Sunset'], ['#4f46e5', 'Indigo'], ['#7c3aed', 'Violet'], ['#1e293b', 'Night']];
const theme = () => { const th = Object.assign({ color: '#0e6ba8', welcome: '', cover: '' }, D()?.settings?.theme); if (!th.color || OLD_SW.includes(th.color.toLowerCase()) || th.color.toLowerCase() === '#0a74da') th.color = '#0e6ba8'; return th; };
const rates = () => Object.assign({ JOD: 1, EGP: 68, USD: 1.41 }, D()?.settings?.rates);
const CURS = ['JOD', 'EGP', 'USD'];
const CATS = { food: '🍽️', transport: '🚐', tickets: '🎟️', hotel: '🏨', flights: '✈️', shopping: '🛍️', other: '💸' };
const METHODS = { cash: ['💵', 'Cash'], card: ['💳', 'Card'], cliq: ['📲', 'CliQ'], transfer: ['🏦', 'Bank transfer'], instapay: ['📱', 'InstaPay'], other: ['🔹', 'Other'] };
const CAT_NAME = { flights: 'Flights', food: 'Food', transport: 'Transport', tickets: 'Tickets', hotel: 'Hotel', shopping: 'Shopping', other: 'Other' };
const tripDays = () => { const out = []; const e = pd(trip().end); for (let d = pd(trip().start); d <= e; d.setDate(d.getDate() + 1)) out.push(iso(d)); return out; };
const member = id => D().members.find(m => m.id === id);
const nameOf = id => member(id)?.name || '—';
const hue = id => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const avatar = (id, cls = '') => { const n = nameOf(id); const ph = member(id)?.avatar;
  return `<span class="avatar ${cls}" style="background:hsl(${hue(id)} 55% 45%)" title="${esc(n)}">${ph ? `<img data-photo="${esc(ph)}" alt="${esc(n)}">` : esc(n.trim().charAt(0).toUpperCase())}</span>`; };
const DEF_ON = ['view_plan', 'view_places', 'view_ideas', 'view_money', 'view_photos', 'money_all', 'suggest', 'comment', 'add_photos'];
const canM = (m, k) => { if (!m) return false; if (m.role === 'admin') return true; const v = (m.perms || {})[k]; return v == null ? DEF_ON.includes(k) : !!v; };
const realAdmin = () => D()?.me?.role === 'admin';
const can = k => S.preview && realAdmin() ? canM({ role: 'member', perms: {} }, k) : canM(D()?.me, k);
const isAdmin = () => realAdmin() && !S.preview;
const isMain = () => isAdmin() && D()?.main_organizer === D()?.me?.id;
const me = () => D().me.id;
const money = (x, cur = S.cur) => {
  const n = new Intl.NumberFormat(locale(), { minimumFractionDigits: cur === 'EGP' ? 0 : 2, maximumFractionDigits: 2 }).format(Math.abs(x) < 0.005 ? 0 : x);
  return `${n} ${cur}`;
};
const toBase = (a, c) => Number(a) / (rates()[c] || 1);
const fromBase = (a, c = S.cur) => a * (rates()[c] || 1);
const nl2br = s => esc(s).replace(/\n/g, '<br>');
const linkify = s => nl2br(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

const ICON = {
  home: '<path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  places: '<path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  ideas: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  money: '<rect x="2.5" y="6" width="19" height="13" rx="3"/><path d="M2.5 10h19M16 15h2"/>',
  more: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5 7-5s5.8 1.4 7 5"/>',
  photos: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  organize: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>'
};
const ico = (n, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2400); }
const errText = e => t(ERR[e.message] || e.message || 'Error');

/* ---------------- API ---------------- */
async function api(action, data) {
  const r = await fetch(String(CFG.supabaseUrl).replace(/\/$/, '') + '/rest/v1/rpc/api', {
    method: 'POST',
    // Legacy anon keys are JWTs and go in both headers; new "sb_publishable_" keys go only in apikey.
    headers: Object.assign({ 'Content-Type': 'application/json', apikey: CFG.supabaseAnonKey },
      String(CFG.supabaseAnonKey).startsWith('eyJ') ? { Authorization: 'Bearer ' + CFG.supabaseAnonKey } : {}),
    body: JSON.stringify({ p_token: S.token, p_action: action, p_data: data || {} })
  });
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok) { const m = (j && j.message) || ('HTTP ' + r.status); if (m === 'not_logged_in') { logoutLocal(); } throw new Error(m); }
  return j;
}
async function refresh() {
  if (!S.token) return;
  S.data = await api('state');
  applyTheme();
  const a = document.activeElement;
  if (!(a && $('#app').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) render();
  if (sheetRender && !F) rerenderSheet();
}
async function act(action, data, okMsg) {
  try { const r = await api(action, data); await refresh(); if (okMsg) toast(t(okMsg)); return r; }
  catch (e) { toast(errText(e)); throw e; }
}
function logoutLocal() { S.token = null; S.data = null; LS.del('token'); closeSheet(); render(); }

/* ---------------- photos ---------------- */
const photoCache = new Map();
function getPhoto(id) {
  if (!photoCache.has(id)) {
    photoCache.set(id, (async () => {
      const key = new Request(location.origin + '/__photo/' + id);
      try { const c = await caches.open('trip-photos'); const hit = await c.match(key); if (hit) return await hit.text(); } catch {}
      const r = await api('photo', { id }); if (!r.data) throw new Error('missing');
      try { const c = await caches.open('trip-photos'); await c.put(key, new Response(r.data)); } catch {}
      return r.data;
    })().catch(e => { photoCache.delete(id); throw e; }));
  }
  return photoCache.get(id);
}
function hydratePhotos(root = document) {
  $$('img[data-photo]:not([src])', root).forEach(img => getPhoto(img.dataset.photo).then(src => { img.src = src; }).catch(() => {}));
}
const pimg = (id, alt = '') => id ? `<img data-photo="${esc(id)}" alt="${esc(alt)}" loading="lazy">` : '';
function resizeImage(file, max = 1400, q = 0.82) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      let out = c.toDataURL('image/jpeg', q);
      if (out.length > 1400000) out = c.toDataURL('image/jpeg', 0.6);
      res(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad_photo')); };
    img.src = url;
  });
}
function squarePhoto(file, size = 400) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height); const c = document.createElement('canvas'); c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad_photo')); };
    img.src = url;
  });
}
async function changeAvatar(memberId) {
  const [f] = await pickFiles(false); if (!f) return;
  toast(t('Uploading…'));
  try { const data = await squarePhoto(f); await act('set_avatar', { member_id: memberId || '', data }, 'Saved'); rerenderSheet(); } catch (e) { toast(errText(e)); }
}
function pickFiles(multiple = true) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = multiple;
    i.onchange = () => res([...i.files]); i.click();
  });
}
async function uploadPhotos({ place_id = '', day = '', multiple = true } = {}) {
  const files = await pickFiles(multiple); if (!files.length) return [];
  toast(t('Uploading…')); const ids = [];
  for (const f of files) {
    try { const data = await resizeImage(f); const r = await api('add_photo', { data, place_id, day }); ids.push(r.id); }
    catch (e) { toast(errText(e)); }
  }
  await refresh(); if (ids.length) toast(t('Saved'));
  return ids;
}

/* ---------------- money math ---------------- */
function splitCents(total, weights) {
  const ids = Object.keys(weights).filter(i => weights[i] > 0); const W = ids.reduce((a, i) => a + weights[i], 0);
  if (!ids.length || W <= 0 || total <= 0) return null;
  const raw = ids.map(i => ({ i, v: total * weights[i] / W })); const out = {}; let used = 0;
  raw.forEach(r => { out[r.i] = Math.floor(r.v + 1e-9); used += out[r.i]; });
  raw.sort((a, b) => (b.v - Math.floor(b.v)) - (a.v - Math.floor(a.v)));
  for (let k = 0; k < total - used; k++) out[raw[k % raw.length].i]++;
  return out;
}
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
function computeSplit(f) {
  let weights = {}, total = Math.round(num(f.amount) * 100), info = '';
  if (f.mode === 'equal') f.people.forEach(id => weights[id] = 1);
  else if (f.mode === 'weights') f.people.forEach(id => weights[id] = num(f.weights[id] ?? 1));
  else if (f.mode === 'items') {
    let itemSum = 0;
    for (const it of f.items) {
      const p = Math.round(num(it.price) * 100); if (!p) continue;
      if (!it.people.length) return { error: t('Choose who shares this') + ': ' + (it.name || t('Item')) };
      itemSum += p; it.people.forEach(id => weights[id] = (weights[id] || 0) + p / it.people.length);
    }
    if (!total) total = itemSum;
    if (itemSum && total !== itemSum) info = t('Items add up to {a}. The extra {b} is shared in proportion.', { a: money(itemSum / 100, f.currency), b: money((total - itemSum) / 100, f.currency) });
  } else if (f.mode === 'exact') {
    const shares = {}; let sum = 0;
    for (const id in f.exact) { const c = Math.round(num(f.exact[id]) * 100); if (c > 0) { shares[id] = c; sum += c; } }
    return { shares, total, left: total - sum, error: total - sum !== 0 ? t('Left to assign') + ': ' + money((total - sum) / 100, f.currency) : null };
  }
  const shares = splitCents(total, weights);
  if (!total) return { error: t('Enter an amount'), total };
  if (!shares) return { error: t('Choose who shares this'), total };
  return { shares, total, info };
}
function balances() {
  const b = {}; const get = id => b[id] || (b[id] = { paid: 0, share: 0, sent: 0, recv: 0 });
  D().members.forEach(m => get(m.id));
  for (const e of D().expenses) {
    get(e.paid_by).paid += toBase(e.amount, e.currency);
    for (const id in e.shares) get(id).share += toBase(e.shares[id], e.currency);
  }
  for (const s of D().settlements) { get(s.from_member).sent += toBase(s.amount, s.currency); get(s.to_member).recv += toBase(s.amount, s.currency); }
  for (const id in b) b[id].net = b[id].paid - b[id].share + b[id].sent - b[id].recv;
  return b;
}
const houseKey = id => { const m = member(id); return m && m.household ? 'h:' + m.household : id; };
const houseName = k => k.startsWith('h:') ? k.slice(2) : nameOf(k);
function grouped(b) {
  if (!S.byHouse) return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.net]));
  const g = {}; for (const id in b) { const k = houseKey(id); g[k] = (g[k] || 0) + b[id].net; } return g;
}
function transfers(nets) {
  const cr = [], dr = []; for (const k in nets) { const v = Math.round(nets[k] * 1000) / 1000; if (v > 0.005) cr.push([k, v]); else if (v < -0.005) dr.push([k, -v]); }
  cr.sort((a, b) => b[1] - a[1]); dr.sort((a, b) => b[1] - a[1]); const out = []; let i = 0, j = 0;
  while (i < dr.length && j < cr.length) {
    const x = Math.min(dr[i][1], cr[j][1]); if (x > 0.005) out.push({ from: dr[i][0], to: cr[j][0], amount: x });
    dr[i][1] -= x; cr[j][1] -= x; if (dr[i][1] < 0.005) i++; if (cr[j][1] < 0.005) j++;
  }
  return out;
}
const labelOf = k => S.byHouse ? houseName(k) : nameOf(k);
/* who a group key pays to: settlements are recorded between people, so pick the first member of a household */
const personOf = k => k.startsWith('h:') ? (D().members.find(m => 'h:' + m.household === k) || {}).id : k;

/* ---------------- theme ---------------- */
function applyTheme() {
  const c = theme().color; document.documentElement.style.setProperty('--brand', c);
  $('meta[name=theme-color]').setAttribute('content', c);
  document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  const ap = LS.get('appearance', 'auto'); if (ap === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = ap;
  document.title = D() ? trip().name : 'Family Trip';
}

/* ---------------- render ---------------- */
function tabs() {
  const list = [['home', 'Home']];
  if (can('view_plan') || can('view_places')) list.push(['plan', 'Plan']);
  if (can('view_ideas')) list.push(['ideas', 'Ideas']);
  if (can('view_money')) list.push(['money', 'Money']);
  list.push(['more', isAdmin() ? 'Organize' : 'Me']);
  return list;
}
function unseenAnnouncements() { const seen = LS.get('seenAnn', ''); return D().announcements.filter(a => a.created_at > seen && a.author !== me()); }

function render() {
  applyTheme();
  const app = $('#app');
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) { app.innerHTML = notConfigured(); return; }
  if (!S.token || !D()) { app.innerHTML = loginView(); if (!S.status) checkStatus(); return; }
  const tl = tabs(); if (!tl.find(x => x[0] === S.tab)) S.tab = 'home';
  const views = { home: homeView, plan: planView, photos: photosView, ideas: ideasView, money: moneyView, more: moreView };
  const enter = S.anim ? ' enter' : ''; S.anim = false;
  const unseen = unseenAnnouncements().length;
  app.innerHTML = `
  <header class="top"><div class="in">
    <div class="logo">${esc(trip().name.trim().charAt(0) || '✈')}</div>
    <h1>${esc(trip().name)}</h1>
    ${realAdmin() ? `<button class="icon-btn eye ${S.preview ? 'on' : ''}" data-a="preview" title="${t('See the app like a family member')}">👁️</button>` : ''}
    <button class="icon-btn" data-a="lang" title="${t('Language')}" style="font-weight:800">${S.lang === 'ar' ? 'EN' : 'ع'}</button>
    <button class="icon-btn" data-a="refresh" title="${t('Refresh')}">${ico('refresh')}</button>
  </div></header>
  ${S.preview ? `<div class="preview-bar"><span>👁️ ${t('You are seeing the app like a family member')}</span><button class="btn sm" data-a="preview">${t('Back to organizer')}</button></div>` : ''}
  <main class="wrap${enter}">${tabHint()}${views[S.tab]()}</main>
  <nav class="tabs"><div class="in" style="--n:${tl.length}">
    ${tl.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-a="tab" data-k="${k}"><span class="ti">${ico(k === 'more' && isAdmin() ? 'organize' : k, 24)}</span><span>${t(l)}</span>${k === 'home' && unseen && S.tab !== 'home' ? '<i class="dot"></i>' : ''}</button>`).join('')}
  </div></nav>`;
  hydratePhotos(app);
  celebrate();
  if (S.tab === 'home' && unseen) setTimeout(() => LS.set('seenAnn', D().announcements.reduce((m, a) => a.created_at > m ? a.created_at : m, LS.get('seenAnn', ''))), 4000);
}

function notConfigured() {
  return `<div class="login"><div class="box card"><h2>${t('App not connected yet')}</h2>
  <p class="muted">Open <b>config.js</b> and paste your Supabase project URL and anon key, then upload the site again. The setup guide (SETUP.md) has the steps.</p></div></div>`;
}
async function checkStatus() {
  try { S.status = await api('status'); S.mode = S.status.needs_setup ? 'setup' : 'login'; render(); } catch (e) { S.status = { error: e.message }; render(); }
}
function loginView() {
  const setup = S.mode === 'setup';
  return `<div class="login"><form class="box" data-form="${setup ? 'setup' : 'login'}">
    <div class="row" style="justify-content:center;margin-bottom:8px"><div class="logo" style="width:64px;height:64px;font-size:30px;border-radius:20px">✈</div></div>
    <h2 style="text-align:center;margin-top:8px">${setup ? t('Create organizer account') : esc(LS.get('tripName', 'Family Trip'))}</h2>
    <p class="muted" style="text-align:center">${setup ? t('Welcome! Create the organizer account first. Only you will be able to add family members.') : t('Ask the trip organizer for your username and password.')}</p>
    <div class="card">
      ${setup ? `<label class="f"><span>${t('Your name')}</span><input class="i" name="name" required autocomplete="name"></label>` : ''}
      <label class="f"><span>${t('Username')}</span><input class="i" name="username" required autocapitalize="none" autocomplete="username" spellcheck="false"></label>
      <label class="f"><span>${t('Password')}</span><input class="i" name="password" type="password" required autocomplete="${setup ? 'new-password' : 'current-password'}" minlength="${setup ? 6 : 1}"></label>
      <button class="btn block" style="margin-top:16px">${setup ? t('Create organizer account') : t('Log in')}</button>
    </div>
    <p style="text-align:center"><button type="button" class="btn ghost" data-a="lang">${S.lang === 'ar' ? 'English' : 'العربية'}</button></p>
    ${S.status?.error ? `<p class="bad small" style="text-align:center">${esc(S.status.error)}</p>` : ''}
  </form></div>`;
}

Object.assign(AR, {"Photos": "الصور", "Organize": "التنظيم", "Me": "حسابي", "Got it": "فهمت", "This is your trip home. The day brief, your to-dos, your groups and news from the organizer all show up here.": "هذه صفحة الرحلة الرئيسية. ملخص اليوم ومهامك ومجموعاتك وأخبار المنظم تظهر هنا.", "The day-by-day schedule. Each day has a brief: when and where we meet, what to wear and what to bring.": "برنامج الرحلة يوماً بيوم. لكل يوم ملخص: متى وأين نتجمع، ماذا نلبس وماذا نحضر.", "Tap ✏️ on a day to write its brief, then \"Add activity\" to add times. Everyone sees it right away.": "اضغط ✏️ على اليوم لكتابة الملخص، ثم \"إضافة نشاط\" لإضافة الأوقات. الجميع يراه فوراً.", "Every place we will visit, with address, hours, prices and tips. Tap a place to see everything.": "كل الأماكن التي سنزورها مع العنوان والمواعيد والأسعار والنصائح. اضغط على المكان لرؤية كل شيء.", "Who rides in which car, who sleeps in which room, and who joins which activity. Look for your name.": "من يركب في أي سيارة، ومن ينام في أي غرفة، ومن يشارك في أي نشاط. ابحث عن اسمك.", "Things to get done before and during the trip. Flip the switch when you finish one.": "أشياء يجب إنجازها قبل الرحلة وخلالها. فعّل المفتاح عندما تنهي واحدة.", "Share your trip photos with the whole family. Tap a photo to see it big.": "شارك صور الرحلة مع كل العائلة. اضغط على الصورة لتكبيرها.", "Want to go somewhere? Suggest it here. Tap ❤️ on the ideas you love so the organizer sees what is popular.": "تريد الذهاب لمكان؟ اقترحه هنا. اضغط ❤️ على الأفكار التي تحبها ليعرف المنظم ما يحبه الجميع.", "Every bill, who paid and what each person owes. \"Settle up\" shows the easiest way to pay each other back.": "كل فاتورة، من دفع، وكم على كل شخص. \"التسوية\" تعرض أسهل طريقة لتسديد المبالغ.", "Your profile, photo, password and language.": "ملفك الشخصي وصورتك وكلمة المرور واللغة.", "Everything you control as the organizer is here. Follow the steps at the top, then use the big buttons below.": "كل ما تتحكم به كمنظم موجود هنا. اتبع الخطوات في الأعلى ثم استخدم الأزرار الكبيرة بالأسفل.", "Good morning": "صباح الخير", "Good afternoon": "مساء الخير", "Good evening": "مساء الخير", "Start here": "ابدأ من هنا", "All set! Your trip is ready 🎉": "كل شيء جاهز! رحلتك جاهزة 🎉", "{a} of {b} done. Tap a step to do it.": "تم {a} من {b}. اضغط على خطوة لتنفيذها.", "Hide": "إخفاء", "Next": "التالي", "Name the trip, set the dates and colours": "سمِّ الرحلة وحدد التواريخ والألوان", "Add your family members": "أضف أفراد العائلة", "Plan the days": "خطط الأيام", "Add the places you will visit": "أضف الأماكن التي ستزورونها", "Split people into cars and rooms": "وزّع الناس على السيارات والغرف", "Add trip info (flights, hotels, phone numbers)": "أضف معلومات الرحلة (الطيران، الفنادق، الأرقام)", "Send your first announcement": "أرسل أول إعلان", "Tell the family what is coming up. You choose who sees each one.": "أخبر العائلة بما هو قادم. أنت تختار من يرى كل إعلان.", "News from the organizer will show up here.": "أخبار المنظم ستظهر هنا.", "Days": "الأيام", "Groups": "المجموعات", "To-dos": "المهام", "Make groups for each car ride, hotel rooms or an activity. Everyone will see which group they are in.": "اعمل مجموعات لكل مشوار سيارة أو غرف الفندق أو نشاط. كل شخص سيرى مجموعته.", "Make the first groups": "اعمل أول مجموعات", "For example: renew passports, bring sunscreen, pay the hotel deposit.": "مثلاً: تجديد الجوازات، إحضار واقي الشمس، دفع عربون الفندق.", "Add the first to-do": "أضف أول مهمة", "No places yet.": "لا توجد أماكن بعد.", "Add the hotels, beaches and sights you will visit, with address, hours, prices and tips.": "أضف الفنادق والشواطئ والمعالم مع العنوان والمواعيد والأسعار والنصائح.", "Add the first place": "أضف أول مكان", "Snap the fun moments and share them with the whole family.": "صوّر اللحظات الحلوة وشاركها مع العائلة.", "Tell us a place you would love to visit and why.": "أخبرنا عن مكان تحب زيارته ولماذا.", "Organize the trip": "نظّم الرحلة", "People": "الأشخاص", "Add a family member": "أضف فرداً من العائلة", "Co-organizers": "المنظمون المشاركون", "organizers": "منظمين", "Cars, rooms & groups": "السيارات والغرف والمجموعات", "groupings": "توزيعات", "to-dos": "مهام", "Days & activities": "الأيام والأنشطة", "activities": "أنشطة", "places": "أماكن", "Trip info": "معلومات الرحلة", "cards": "بطاقات", "photos": "صور", "Talk to the family": "تواصل مع العائلة", "sent": "مرسلة", "Ideas inbox": "صندوق الاقتراحات", "waiting for you": "بانتظارك", "Add a bill": "أضف فاتورة", "bills": "فواتير", "Trip": "الرحلة", "Name, dates, colours, cover": "الاسم والتواريخ والألوان والغلاف", "My account": "حسابي", "Co-organizers have the same powers as you: they can add members, edit the plan, places, groups, bills and announcements. Switch someone on to make them a co-organizer.": "المنظم المشارك له نفس صلاحياتك: يضيف أعضاء ويعدل البرنامج والأماكن والمجموعات والفواتير والإعلانات. فعّل المفتاح لتجعل شخصاً منظماً مشاركاً.", "Organizer": "منظم", "You": "أنت", "Co-organizer added": "تمت إضافة منظم مشارك", "Tips on each screen": "نصائح في كل صفحة", "Show tips again": "أظهر النصائح مجدداً", "Tips are back on every screen": "عادت النصائح لكل الصفحات", "You can find the steps in the Organize tab": "تجد الخطوات في تبويب التنظيم", "Role": "الدور", "Family member": "فرد من العائلة", "Sees what you allow below": "يرى ما تسمح به بالأسفل", "Co-organizer": "منظم مشارك", "Same powers as you": "نفس صلاحياتك", "Co-organizers can do everything you can, except remove you.": "المنظم المشارك يستطيع فعل كل ما تفعله، إلا حذفك."});
/* ----- translation (organizer writes in English, anyone can read it in Arabic) ----- */
const TR = LS.get('tr', {}); const TRQ = {};
function hashS(x) { let h = 0; for (const c of x) h = (h * 31 + c.codePointAt(0)) | 0; return 'h' + (h >>> 0).toString(36) + x.length; }
function trT(x) { if (!x) return x; const k = hashS(x); return S.trOn.has(k) && TR[k] ? TR[k] : x; }
function trBtn(...texts) {
  const list = texts.filter(x => x && String(x).trim()); if (!list.length) return '';
  const g = hashS(list.join('\u0001')); TRQ[g] = list; const on = S.trOn.has(g);
  return `<button class="trbtn" data-a="translate" data-k="${g}">🌐 ${on ? t('Show original') : t('Translate')}</button>`;
}
const isArabic = x => (x.match(/[\u0600-\u06FF]/g) || []).length > (x.match(/[A-Za-z]/g) || []).length;
async function translateText(x, to) {
  try {
    const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + to + '&dt=t&q=' + encodeURIComponent(x));
    if (!r.ok) throw 0; const j = await r.json(); return j[0].map(y => y[0]).join('');
  } catch {
    const r = await fetch('https://api.mymemory.translated.net/get?langpair=' + (to === 'ar' ? 'en|ar' : 'ar|en') + '&q=' + encodeURIComponent(x.slice(0, 480)));
    const j = await r.json(); return j.responseData.translatedText;
  }
}

Object.assign(AR, {"Show original": "عرض النص الأصلي", "Translate": "ترجمة", "Translating…": "جارٍ الترجمة…", "Translation is not available right now": "الترجمة غير متاحة الآن", "Nothing here yet": "لا يوجد شيء بعد", "Add what the family needs to know before coming: internet and SIM cards, money and cash, visa and passports, weather and clothes, power plugs, emergency numbers.": "أضف ما تحتاج العائلة معرفته قبل السفر: الإنترنت وشرائح الاتصال، المال والكاش، التأشيرة والجوازات، الطقس والملابس، القوابس الكهربائية، أرقام الطوارئ.", "Add the first card": "أضف أول بطاقة", "Before you travel & trip info": "قبل السفر ومعلومات الرحلة", "Before you travel": "قبل السفر", "Write \"Before you travel\" (internet, money, visa…)": "اكتب \"قبل السفر\" (الإنترنت، المال، التأشيرة…)"});
Object.assign(AR, {"📊 Overview": "📊 نظرة عامة", "🧾 Bills": "🧾 الفواتير", "⚖️ Balances": "⚖️ الأرصدة", "🤝 Settle up": "🤝 التسوية", "Search bills…": "ابحث في الفواتير…", "Add every bill: who paid, how they paid, and who it was for. The app works out who owes whom.": "أضف كل فاتورة: من دفع، وكيف دفع، ولمن كانت. التطبيق يحسب من يدين لمن.", "Green = gets money back. Red = still has to pay. Tap a person to see their full statement.": "الأخضر = له مال. الأحمر = عليه أن يدفع. اضغط على الشخص لرؤية كشف حسابه.", "Send a reminder": "أرسل تذكيراً", "Copy all": "نسخ الكل", "The fewest payments that settle everyone. Tap ✓ when a payment is made, or 🔔 to send a reminder.": "أقل عدد من الدفعات لتسوية الجميع. اضغط ✓ عند الدفع، أو 🔔 لإرسال تذكير.", "Trip total": "مجموع الرحلة", "Per person": "للشخص", "Bills": "فواتير", "Spent today": "مصروف اليوم", "Budget": "الميزانية", "Set a budget": "حدد ميزانية", "of": "من", "Over budget by {a}": "تجاوزنا الميزانية بـ {a}", "{a} left": "متبقٍ {a}", "Set a total budget (and per category if you like) to see how much is left at a glance.": "حدد ميزانية إجمالية (ولكل فئة إن أردت) لترى المتبقي بلمحة.", "No budget set yet.": "لم تُحدد ميزانية بعد.", "Where the money goes": "أين تذهب الأموال", "Spending by day": "المصروف حسب اليوم", "Before": "قبل", "After": "بعد", "Who paid so far": "من دفع حتى الآن", "Trip budget": "ميزانية الرحلة", "Total budget": "الميزانية الإجمالية", "Per category (optional)": "لكل فئة (اختياري)", "Hi {a}, a friendly reminder from the {trip} app: please pay {b} {c}. Thank you!": "مرحباً {a}، تذكير لطيف من تطبيق {trip}: الرجاء دفع {c} لـ {b}. شكراً!", "Copied. Paste it in WhatsApp.": "تم النسخ. الصقه في واتساب.", "Food": "طعام", "Transport": "مواصلات", "Tickets": "تذاكر", "Hotel": "فندق", "Flights": "طيران", "Shopping": "تسوق", "Other": "أخرى"});
Object.assign(AR, {"You are seeing the app like a family member": "أنت ترى التطبيق كفرد من العائلة", "Back to organizer": "العودة للمنظم", "This is what your family sees": "هذا ما تراه عائلتك", "See the app like a family member": "شاهد التطبيق كفرد من العائلة", "Check exactly what your family sees, then come back.": "تحقق مما تراه عائلتك بالضبط ثم ارجع.", "See it as family": "شاهده كالعائلة", "Preview the member view": "معاينة واجهة الأعضاء", "You will get money back": "سيُعاد لك مال", "You need to pay": "عليك أن تدفع", "You are all settled 🎉": "حسابك مسوّى 🎉", "Your share": "حصتك", "You paid": "دفعت", "My full statement": "كشف حسابي الكامل", "What to do": "ماذا تفعل", "Pay": "ادفع لـ", "pays you": "يدفع لك", "Your bills": "فواتيرك", "No bills yet.": "لا توجد فواتير بعد.", "When the organizer adds a bill you are part of, it shows up here with your share.": "عندما يضيف المنظم فاتورة تخصك ستظهر هنا مع حصتك.", "Your share of every bill and who you need to pay. Tap a bill to see the details.": "حصتك من كل فاتورة ولمن تدفع. اضغط على الفاتورة لرؤية التفاصيل."});
Object.assign(AR, {"Four quick questions. It takes less than a minute.": "أربعة أسئلة سريعة. أقل من دقيقة.", "Where do you want to go?": "إلى أين تريد الذهاب؟", "e.g. The kids would love to see the dolphins": "مثلاً: الأطفال سيحبون رؤية الدلافين", "Alone or with a group?": "وحدك أم مع مجموعة؟", "Send my idea": "أرسل اقتراحي", "Sent to the organizer": "تم الإرسال للمنظم", "Idea shared! The family can now like it": "تمت مشاركة الاقتراح! يمكن للعائلة الإعجاب به", "Have an idea? Suggest a place": "عندك فكرة؟ اقترح مكاناً", "Tell us where you want to go. The family can like it.": "أخبرنا أين تريد الذهاب. العائلة تستطيع الإعجاب به.", "Suggest": "اقترح"});
Object.assign(AR, {"Add a vote": "أضف تصويتاً", "Everyone picks one option. They can change it any time. You see who chose what.": "كل شخص يختار خياراً واحداً ويمكنه تغييره في أي وقت. وأنت ترى من اختار ماذا.", "Option": "خيار", "Add option": "أضف خياراً", "Changing the options keeps the votes by number.": "تغيير الخيارات يحتفظ بالأصوات حسب الرقم.", "A vote needs at least 2 options": "التصويت يحتاج خيارين على الأقل", "Tap your choice": "اضغط على اختيارك", "Your vote is saved. Tap another to change it.": "تم حفظ صوتك. اضغط على خيار آخر لتغييره.", "voted": "صوّتوا", "Not voted yet": "لم يصوّت بعد"});
Object.assign(AR, {"Price (optional), e.g. about $3,000": "السعر (اختياري)، مثلاً حوالي 3,000$", "Add photos": "أضف صوراً"});
/* ----- guidance & joy ----- */
const HINTS = {
  home: 'This is your trip home. The day brief, your to-dos, your groups and news from the organizer all show up here.',
  'plan-days': 'The day-by-day schedule. Each day has a brief: when and where we meet, what to wear and what to bring.',
  'plan-days-org': 'Tap ✏️ on a day to write its brief, then "Add activity" to add times. Everyone sees it right away.',
  'plan-places': 'Every place we will visit, with address, hours, prices and tips. Tap a place to see everything.',
  'plan-groups': 'Who rides in which car, who sleeps in which room, and who joins which activity. Look for your name.',
  'plan-todo': 'Things to get done before and during the trip. Flip the switch when you finish one.',
  photos: 'Share your trip photos with the whole family. Tap a photo to see it big.',
  ideas: 'Want to go somewhere? Suggest it here. Tap ❤️ on the ideas you love so the organizer sees what is popular.',
  'money-member': 'Your share of every bill and who you need to pay. Tap a bill to see the details.',
  money: 'Every bill, who paid and what each person owes. "Settle up" shows the easiest way to pay each other back.',
  more: 'Your profile, photo, password and language.',
  'more-org': 'Everything you control as the organizer is here. Follow the steps at the top, then use the big buttons below.'
};
function tabHint() {
  let k = S.tab;
  if (k === 'plan') k = 'plan-' + planSeg();
  if (isAdmin() && HINTS[k + '-org']) k += '-org';
  if (k === 'money' && !isAdmin() && !can('add_expense')) k = 'money-member';
  if (!HINTS[k] || LS.get('hints', {})[k]) return '';
  return `<div class="hint"><span class="he">💡</span><div class="grow small">${t(HINTS[k])}</div><button class="btn ghost sm" data-a="hint" data-k="${k}">${t('Got it')}</button></div>`;
}
const emptyState = (e, title, sub = '', btn = '') => `<div class="empty card"><div class="e bob">${e}</div><b>${title}</b>${sub ? `<p class="small muted" style="margin:6px auto 12px;max-width:340px">${sub}</p>` : ''}${btn}</div>`;
function confetti(n = 90) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const em = ['🎉', '🌴', '☀️', '🐪', '⭐', '💛', '🏝️', '🐬'], cols = ['#f59e0b', '#0ea5e9', '#ef4444', '#22c55e', '#a855f7', '#eab308', '#ec4899'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    if (i % 5 === 0) { s.textContent = em[i % em.length]; s.className = 'em'; } else s.style.background = cols[i % cols.length];
    s.style.left = Math.random() * 100 + 'vw'; s.style.animationDelay = Math.random() * .5 + 's'; s.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    s.style.setProperty('--x', (Math.random() * 200 - 100) + 'px'); s.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    box.appendChild(s);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
}
function celebrate() {
  // once a day near the trip, and once when the organizer finishes the setup steps
  const p = tripPhase(), key = today();
  if (S.tab === 'home' && ((p.phase === 'before' && [100, 60, 30, 14, 7, 3, 2, 1].includes(p.days)) || p.phase === 'during') && LS.get('party', '') !== key) { LS.set('party', key); setTimeout(() => confetti(), 400); }
  if (isAdmin()) { const st = setupSteps(); if (st.every(x => x[4]) && !LS.get('setupParty', false)) { LS.set('setupParty', true); setTimeout(() => { confetti(140); toast(t('All set! Your trip is ready 🎉')); }, 400); } }
}
function greet() { const h = new Date().getHours(); return h < 12 ? t('Good morning') : h < 18 ? t('Good afternoon') : t('Good evening'); }
function setupSteps() {
  const d = D();
  return [
    ['🎨', 'Name the trip, set the dates and colours', 'tripsettings', '', !!(d.settings?.trip?.name && d.settings.trip.name !== 'Family Trip')],
    ['👨‍👩‍👧', 'Add your family members', 'member', '', d.members.length > 1],
    ['🗓️', 'Plan the days', 'planseg', 'days', d.days.length > 0 || d.itinerary.length > 0],
    ['📍', 'Add the places you will visit', 'planseg', 'places', d.places.length > 0],
    ['🚐', 'Split people into cars and rooms', 'planseg', 'groups', d.arrangements.length > 0],
    ['🧳', 'Write "Before you travel" (internet, money, visa…)', 'editinfo', '', d.info.length > 0],
    ['📣', 'Send your first announcement', 'announce', '', d.announcements.length > 0]
  ];
}
function startHere(full) {
  if (!isAdmin()) return '';
  const st = setupSteps(); const done = st.filter(x => x[4]).length; const all = done === st.length;
  if (!full && (all || LS.get('hideStart', false))) return '';
  const next = st.find(x => !x[4]);
  return `<div class="card start">
    <div class="row between"><div><b style="font-size:18px">🚀 ${t('Start here')}</b><div class="small muted">${all ? t('All set! Your trip is ready 🎉') : t('{a} of {b} done. Tap a step to do it.', { a: done, b: st.length })}</div></div>
    ${!full ? `<button class="btn ghost sm" data-a="hidestart">${t('Hide')}</button>` : ''}</div>
    <div class="progress"><i style="width:${Math.round(done / st.length * 100)}%"></i></div>
    ${st.map(x => `<div class="step tap ${x[4] ? 'ok' : ''} ${x === next ? 'next' : ''}" data-a="${x[2]}" ${x[3] ? `data-k="${x[3]}"` : ''}><span class="se">${x[4] ? '✅' : x[0]}</span><span class="grow">${t(x[1])}</span>${x === next ? `<span class="badge brand">${t('Next')}</span>` : x[4] ? '' : '<span class="muted">›</span>'}</div>`).join('')}
  </div>`;
}
const EGYPT = `<svg class="scene" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e6ba8"/><stop offset=".75" stop-color="#5ec8e5"/><stop offset="1" stop-color="#a7e8f0"/></linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#0e6ba8"/></linearGradient></defs>
  <rect width="400" height="200" fill="url(#sky)"/>
  <circle cx="300" cy="54" r="36" fill="#fff3c4" opacity=".3"/><circle class="sun" cx="300" cy="54" r="22" fill="#ffe08a"/>
  <g class="cloud" fill="#fff" opacity=".9"><ellipse cx="80" cy="40" rx="26" ry="9"/><ellipse cx="98" cy="34" rx="16" ry="9"/></g>
  <path d="M0 120Q50 113 100 120T200 120T300 120T400 120V200H0Z" fill="url(#sea)"/>
  <path class="wave" d="M0 136Q25 129 50 136T100 136T150 136T200 136T250 136T300 136T350 136T400 136T450 136V200H0Z" fill="#2dd4bf" opacity=".45"/>
  <g class="boat" transform="translate(200 96)"><path d="M0 22h40l-6 8H6z" fill="#fff"/><path d="M20 0v22M20 2l14 18H20z" stroke="#fff" stroke-width="2" fill="#ff8a65"/></g>
  <path d="M0 168Q100 150 200 160T400 156V200H0Z" fill="#f7e3b5"/>
  <path d="M0 176Q100 162 200 170T400 166" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>
  <g transform="translate(352 104) scale(1)"><path d="M6 60C9 40 9 22 3 4" stroke="#7c4a1e" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M3 4C-14-3-26 5-30 13M3 4C18-6 30-1 35 7M3 4C-6-10-3-19 2-24M3 4C13-8 23-10 30-7M3 4C-8 4-14 14-14 22" stroke="#22a04b" stroke-width="6" fill="none" stroke-linecap="round"/></g><g transform="translate(392 118) scale(0.8)"><path d="M6 60C9 40 9 22 3 4" stroke="#7c4a1e" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M3 4C-14-3-26 5-30 13M3 4C18-6 30-1 35 7M3 4C-6-10-3-19 2-24M3 4C13-8 23-10 30-7M3 4C-8 4-14 14-14 22" stroke="#22a04b" stroke-width="6" fill="none" stroke-linecap="round"/></g>
</svg>`;

function annSection() {
  const anns = D().announcements, seen = LS.get('seenAnn', '');
  return `<div class="row between"><h2>📣 ${t('Announcements')}</h2>${can('announce') ? `<button class="btn sm" data-a="announce">${ico('plus', 16)} ${t('New announcement')}</button>` : ''}</div>
  ${anns.length ? anns.map(a => `<div class="card">
      <div class="row between"><h3>${a.pinned ? '📌 ' : ''}${esc(trT(a.title))}</h3>${a.created_at > seen && a.author !== me() ? `<span class="badge new">${t('NEW')}</span>` : ''}</div>
      ${a.body ? `<div class="pre" style="margin-top:4px">${linkify(trT(a.body))}</div>` : ''}${trBtn(a.title, a.body)}
      <div class="row between" style="margin-top:8px"><span class="small muted">${esc(nameOf(a.author))} · ${ago(a.created_at)}${(a.audience || []).length ? ` · 👁️ ${(a.audience || []).length} ${t('people')}` : ''}</span>
      ${can('announce') ? `<button class="btn ghost sm" data-a="announce" data-k="${a.id}">${t('Edit')}</button>` : ''}</div>
      ${pollBlock(a)}${annReactions(a)}</div>`).join('')
    : emptyState('📣', t('No announcements yet.'), can('announce') ? t('Tell the family what is coming up. You choose who sees each one.') : t('News from the organizer will show up here.'), can('announce') ? `<button class="btn" data-a="announce">${ico('plus', 16)} ${t('New announcement')}</button>` : '')}`;
}
/* ----- Home ----- */
function tripPhase() {
  const td = today(), s = trip().start, e = trip().end;
  if (td < s) return { phase: 'before', days: Math.round((pd(s) - pd(td)) / 864e5) };
  if (td > e) return { phase: 'after' };
  return { phase: 'during', n: tripDays().indexOf(td) + 1, of: tripDays().length };
}
function briefCard(day, label) {
  const d = D().days.find(x => x.day === day) || { day };
  const items = D().itinerary.filter(i => i.day === day);
  const n = tripDays().indexOf(day) + 1;
  return `<div class="card brief tap" data-a="goday" data-k="${day}">
    <div class="row between"><span class="badge brand">${esc(label)}</span><span class="muted small">${t('Day')} ${n} · ${fmtDay(day)}</span></div>
    ${d.cover ? `<div class="day-cover" style="margin-top:10px">${pimg(d.cover)}</div>` : ''}
    <h3 style="margin-top:8px;font-size:18px">${esc(trT(d.title || items[0]?.title || ''))}</h3>
    ${d.brief ? `<div class="pre">${linkify(trT(d.brief))}</div>` : ''}
    <div class="grid">
      ${d.meet_time || d.meet_place ? `<div><div class="k">${t('Meet at')}</div><b>${esc(d.meet_time)}</b> ${esc(d.meet_place)}</div>` : ''}
      ${d.wear ? `<div><div class="k">${t('Wear')}</div>${esc(trT(d.wear))}</div>` : ''}
      ${d.bring ? `<div style="grid-column:1/-1"><div class="k">${t('Bring')}</div>${esc(trT(d.bring))}</div>` : ''}
    </div>
    ${items.length ? `<div class="timeline">${items.map(i => `<div class="tl" style="padding-bottom:4px"><span class="time">${esc(i.time)}</span> ${esc(i.title)}</div>`).join('')}</div>` : ''}
  </div>`;
}
function homeView() {
  const p = tripPhase(), th = theme(), td = today();
  LS.set('tripName', trip().name);
  let big = '', sub = '';
  if (p.phase === 'before') { big = p.days; sub = t('days to go'); }
  else if (p.phase === 'during') { big = '🌴'; sub = t('Day {a} of {b}', { a: p.n, b: p.of }); }
  else { big = '❤️'; sub = t('The trip is over. What a trip!'); }
  let briefs = '';
  if (can('view_plan')) {
    if (p.phase === 'before') briefs = briefCard(trip().start, t('First day brief'));
    if (p.phase === 'during') {
      briefs = briefCard(td, t("Today's brief"));
      const tm = new Date(); tm.setDate(tm.getDate() + 1);
      if (new Date().getHours() >= 16 && iso(tm) <= trip().end) briefs = briefCard(iso(tm), t("Tomorrow's brief")) + briefs;
    }
  }
  const seen = LS.get('seenAnn', '');
  const anns = D().announcements;
  let bal = '';
  if (can('view_money')) {
    const b = balances()[me()]; const n = b ? fromBase(b.net) : 0;
    bal = `<div class="card tap" data-a="tab" data-k="money"><div class="muted small">${t('Your balance')}</div>
      <div class="money-big ${n > 0.01 ? 'good' : n < -0.01 ? 'bad' : ''}">${money(Math.abs(n))}</div>
      <div class="small muted">${n > 0.01 ? t('You are owed') : n < -0.01 ? t('You owe') : t('All settled')}</div></div>`;
  }
  return `
  <div class="greet"><b>${greet()}, ${esc(D().me.name.split(' ')[0])} 👋</b></div>
  ${startHere(false)}
  <div class="hero tap" data-a="party">${th.cover ? pimg(th.cover) : EGYPT}<div class="shade"></div>
    <div class="txt"><div class="big ${p.phase === 'before' ? 'count' : ''}">${esc(big)}</div><div style="font-weight:700;font-size:18px">${esc(sub)}</div>
    <p class="small">${fmtDay(trip().start, { day: 'numeric', month: 'long' })} – ${fmtDay(trip().end, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div></div>
  ${th.welcome ? `<div class="card"><div class="row"><span style="font-size:24px">👋</span><div class="grow"><div class="pre">${linkify(trT(th.welcome))}</div>${trBtn(th.welcome)}</div></div></div>` : ''}
  ${!D().me.avatar ? `<div class="card tap" data-a="myavatar"><div class="row">${avatar(me(), 'lg')}<div class="grow"><b>📸 ${t('Add your photo')}</b><div class="small muted">${t('So the family can see who is who.')}</div></div><span class="btn sm">${t('Add')}</span></div></div>` : ''}
  ${briefs}
  ${!isAdmin() ? annSection() + ideaCTA() : ''}
  ${(() => { const open = myTasks().filter(tk => !tk.done[me()]); return open.length ? `<div class="row between"><h2>✅ ${t('Your to-dos')}</h2><button class="btn ghost sm" data-a="planseg" data-k="todo">${t('See all')}</button></div><div class="card list">${open.slice(0, 4).map(taskRow).join('')}</div>` : ''; })()}
  ${(() => { const up = D().arrangements.filter(a => myGroup(a) && (!a.day || a.day >= today())).slice(0, 3); return up.length ? `<div class="row between"><h2>👥 ${t('Your groups')}</h2><button class="btn ghost sm" data-a="planseg" data-k="groups">${t('See all')}</button></div>${up.map(a => arrangementCard(a, true)).join('')}` : ''; })()}
  ${D().info.length || can('announce') ? `<div class="row between"><h2>🧳 ${t('Before you travel & trip info')}</h2>${can('announce') ? `<button class="btn sm" data-a="editinfo">${ico('plus', 16)} ${t('Add')}</button>` : ''}</div>
    ${D().info.map(ic => `<details class="card" ${S.trOn.has(hashS([ic.title, ic.body].filter(x => x && String(x).trim()).join('\u0001'))) ? 'open' : ''}><summary class="row" style="cursor:pointer;list-style:none"><span style="font-size:22px">${esc(ic.icon)}</span><b class="grow">${esc(trT(ic.title))}</b>${can('announce') ? `<button class="btn ghost sm" data-a="editinfo" data-k="${ic.id}">${t('Edit')}</button>` : '›'}</summary><div class="pre" style="margin-top:8px">${linkify(trT(ic.body))}</div>${trBtn(ic.title, ic.body)}</details>`).join('') || (can('announce') ? emptyState('🧳', t('Nothing here yet'), t('Add what the family needs to know before coming: internet and SIM cards, money and cash, visa and passports, weather and clothes, power plugs, emergency numbers.'), `<button class="btn" data-a="editinfo">${ico('plus', 16)} ${t('Add the first card')}</button>`) : '')}` : ''}
  ${bal}
  ${isAdmin() ? annSection() : ''}
  <h2>${t('Who is coming')} <span class="muted small">${D().members.length} ${t('people')}</span></h2>
  <div class="card"><div class="row wrap-r" style="gap:12px">${D().members.map(m => `<div style="text-align:center;width:62px">${avatar(m.id, 'lg')}<div class="small" style="margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name.split(' ')[0])}</div></div>`).join('')}</div></div>`;
}

const ideaCTA = () => can('suggest') ? `<div class="card cta tap" data-a="newidea"><span class="cta-e">💡</span><div class="grow"><b>${t('Have an idea? Suggest a place')}</b><div class="small muted">${t('Tell us where you want to go. The family can like it.')}</div></div><span class="btn sm">${t('Suggest')}</span></div>` : '';
const po = o => (o && typeof o === 'object') ? { text: o.text || '', price: o.price || '', photos: Array.isArray(o.photos) ? o.photos : [] } : { text: String(o || ''), price: '', photos: [] };
const isUrl = x => /^https:\/\//.test(x || '');
const pthumb = x => isUrl(x) ? `<img src="${esc(x)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : pimg(x);
function optGallery(list, i, title) {
  const x = list[i]; if (!x) return;
  const root = document.createElement('div'); root.className = 'lightbox';
  root.innerHTML = `<div class="row between" style="padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;color:#fff">
      <span class="small">${esc(title || '')} · ${i + 1} / ${list.length}</span><button class="icon-btn" data-lb="x" style="background:#333;color:#fff">${ico('x', 18)}</button></div>
    ${pthumb(x)}
    <div class="cap"><div class="grow"></div>${i > 0 ? `<button class="icon-btn" data-lb="prev" style="background:#333;color:#fff"><span class="flip">‹</span></button>` : ''}
      ${i < list.length - 1 ? `<button class="icon-btn" data-lb="next" style="background:#333;color:#fff"><span class="flip">›</span></button>` : ''}</div>`;
  document.body.appendChild(root); hydratePhotos(root);
  let x0 = null; root.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; const rtl = S.lang === 'ar';
    if (Math.abs(dx) > 60) { const n = (dx < 0) !== rtl ? i + 1 : i - 1; if (list[n]) { root.remove(); optGallery(list, n, title); } } x0 = null; });
  root.addEventListener('click', e => { const b = e.target.closest('[data-lb]'); if (!b) return; const k = b.dataset.lb; root.remove();
    if (k === 'prev') optGallery(list, i - 1, title); if (k === 'next') optGallery(list, i + 1, title); });
}
function pollBlock(a) {
  if (!a.poll || !a.poll.length) return '';
  const votes = a.votes || {}, mine = votes[me()], total = Object.keys(votes).length, org = can('announce');
  const who = i => Object.entries(votes).filter(([, c]) => c === i).map(([id]) => id);
  const aud = (a.audience || []).length ? a.audience : D().members.map(m => m.id);
  const missing = aud.filter(id => votes[id] == null);
  return `<div class="poll"><div class="small muted" style="font-weight:700;margin-bottom:6px">🗳️ ${mine == null ? t('Tap your choice') : t('Your vote is saved. Tap another to change it.')}</div>
    ${a.poll.map((o, i) => { const n = who(i).length, pc = total ? Math.round(n / total * 100) : 0;
      const q = po(o);
      return `${q.photos.length ? `<div class="pgal">${q.photos.map((x, j) => `<div class="g" data-a="optphoto" data-k="${a.id}" data-v="${i}" data-i="${j}">${pthumb(x)}</div>`).join('')}</div>` : ''}
        <button class="popt ${mine === i ? 'on' : ''} ${q.photos.length ? 'big' : ''}" data-a="pollvote" data-k="${a.id}" data-v="${i}"><i style="width:${pc}%"></i>
        <span class="stepn">${i + 1}</span><span class="grow"><span class="ptext">${esc(trT(q.text))}</span>${q.price ? `<span class="pprice">${esc(trT(q.price))}</span>` : ''}</span>${mine === i ? '✅' : ''}<b>${n ? n + ' · ' + pc + '%' : ''}</b></button>
        ${org && n ? `<div class="row" style="gap:2px;margin:2px 0 6px 32px">${who(i).map(id => avatar(id, 'sm')).join('')}</div>` : ''}`; }).join('')}
    <div class="small muted" style="margin-top:6px">${total} ${t('voted')}${org && missing.length ? ` · ${t('Not voted yet')}: ${missing.map(id => esc(nameOf(id).split(' ')[0])).join(', ')}` : ''}</div>
    ${trBtn(...a.poll.flatMap(o => { const q = po(o); return [q.text, q.price]; }))}</div>`;
}
const REACTS = ['❤️', '👍', '😂', '😮', '🙏', '🎉'];
function annReactions(a) {
  const r = a.reactions || {}, mine = r[me()], cs = a.comments || [], open = S.openAnn.has(a.id);
  const counts = {}; Object.values(r).forEach(e => counts[e] = (counts[e] || 0) + 1);
  return `<div class="reacts">${REACTS.map(e => `<button class="react ${mine === e ? 'on' : ''}" data-a="annreact" data-k="${a.id}" data-v="${e}">${e}${counts[e] ? `<b>${counts[e]}</b>` : ''}</button>`).join('')}
    <button class="react cm" data-a="anncomments" data-k="${a.id}">💬 ${cs.length || ''}</button></div>
    ${Object.keys(r).length && can('announce') ? `<div class="small muted" style="margin-top:4px">${Object.entries(r).map(([id, e]) => `${e} ${esc(nameOf(id).split(' ')[0])}`).join(' · ')}</div>` : ''}
    ${open ? `<div>${cs.map(c => `<div class="comment row" style="align-items:flex-start">${avatar(c.author, 'sm')}<div class="grow"><b>${esc(nameOf(c.author))}</b> <span class="muted small">${ago(c.created_at)}</span><div class="pre">${linkify(trT(c.body))}</div></div>
        ${c.author === me() || can('announce') ? `<button class="btn danger sm" style="min-height:0;padding:0 4px" data-a="delanncomment" data-k="${c.id}">×</button>` : ''}</div>`).join('')}
      <form class="row" style="margin-top:8px" data-form="anncomment" data-k="${a.id}"><input class="i grow" name="body" placeholder="${t('Write a comment…')}" required><button class="btn sm">${t('Send')}</button></form></div>` : ''}`;
}
/* ----- groups, to-dos, info helpers ----- */
const KINDS = { car: ['🚐', 'Cars'], room: ['🏨', 'Hotel rooms'], activity: ['🎯', 'Activity'], other: ['👥', 'Other'] };
function myGroup(ar) { return (ar.groups || []).find(g => (g.members || []).includes(me())); }
function myTasks() { return D().tasks.filter(tk => !tk.assignees.length || tk.assignees.includes(me())); }
function taskPeople(tk) { return tk.assignees.length ? tk.assignees : D().members.map(m => m.id); }
function taskRow(tk) {
  const ppl = taskPeople(tk); const doneN = ppl.filter(id => tk.done[id]).length; const mineDone = !!tk.done[me()]; const assigned = ppl.includes(me());
  const overdue = tk.due && tk.due < today() && !mineDone && assigned;
  return `<div class="li">
    ${assigned ? `<input type="checkbox" class="switch" data-a2="tasktoggle" data-k="${tk.id}" ${mineDone ? 'checked' : ''}>` : '<span style="width:44px"></span>'}
    <div class="grow ${can('edit_plan') ? 'tap' : ''}" ${can('edit_plan') ? `data-a="edittask" data-k="${tk.id}" style="cursor:pointer"` : ''}>
      <b style="${mineDone ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(tk.title)}</b>
      ${tk.notes ? `<div class="small muted pre">${linkify(trT(tk.notes))}</div>${trBtn(tk.notes)}` : ''}
      <div class="small ${overdue ? 'bad' : 'muted'}">${tk.due ? '⏰ ' + fmtDay(tk.due) + ' · ' : ''}${doneN}/${ppl.length} ${t('done')}</div>
      ${can('edit_plan') ? `<div class="bar" style="margin-top:4px"><i style="width:${ppl.length ? doneN / ppl.length * 100 : 0}%"></i></div>` : ''}
    </div></div>`;
}
function arrSheet(id) {
  const ar = D().arrangements.find(x => x.id === id) || { kind: 'car', title: '', day: '', notes: '', groups: [] };
  F = { id: ar.id || '', kind: ar.kind, title: ar.title, day: ar.day || '', notes: ar.notes, groups: JSON.parse(JSON.stringify(ar.groups || [])), cur: 0 };
  if (!F.groups.length) F.groups.push({ name: t('Car') + ' 1', note: '', members: [] });
  openSheet(() => {
    const assigned = new Set(F.groups.flatMap(g => g.members)); const free = D().members.filter(m => !assigned.has(m.id));
    const g = F.groups[F.cur];
    return `${sheetHead(id ? t('Edit') : t('New grouping (cars, rooms, activity)'))}
    <div class="chips wrapc">${Object.entries(KINDS).map(([k, [ic, l]]) => `<span class="chip ${F.kind === k ? 'on' : ''}" data-a="arrkind" data-k="${k}">${ic} ${t(l)}</span>`).join('')}</div>
    ${field(t('Title'), inp('title', F.title, 'placeholder="e.g. Airport → Hotel, Rooms at the Hurghada resort, Desert safari"'))}
    <div class="two">${field(t('Day'), `<select class="i" data-bind="day"><option value="">—</option>${tripDays().map(d => `<option value="${d}" ${F.day === d ? 'selected' : ''}>${fmtDay(d)}</option>`).join('')}</select>`)}
    <div style="display:flex;align-items:flex-end;gap:6px"><button class="btn sec sm" data-a="byfamily">👪 ${t('Split by family')}</button></div></div>
    ${field(t('Notes'), txt('notes', F.notes, 'rows="2"'))}
    <label class="f"><span>${t('Groups')} · ${t('tap a group, then tap people to put them in it')}</span></label>
    <div class="chips wrapc">${F.groups.map((x, n) => `<span class="chip ${F.cur === n ? 'on' : ''}" data-a="arrgroup" data-n="${n}">${esc(x.name)} · ${x.members.length}</span>`).join('')}
      <span class="chip" data-a="addgroup">＋ ${t('Add group')}</span></div>
    ${g ? `<div class="item-row"><div class="row"><input class="i grow" data-bind="groups.${F.cur}.name" value="${esc(g.name)}"><button class="icon-btn" data-a="delgroup" data-n="${F.cur}">${ico('x', 16)}</button></div>
      <input class="i" style="margin-top:6px" placeholder="${t('Note (driver, phone, room number…)')}" data-bind="groups.${F.cur}.note" value="${esc(g.note || '')}">
      <div class="chips wrapc" style="margin-top:8px">${D().members.map(m => { const inG = g.members.includes(m.id); const other = !inG && assigned.has(m.id);
        return `<span class="chip ${inG ? 'on' : ''}" style="${other ? 'opacity:.45' : ''}" data-a="arrmember" data-k="${m.id}">${esc(m.name.split(' ')[0])}</span>`; }).join('')}</div></div>` : ''}
    ${free.length ? `<p class="small muted">${t('Not placed yet')}: ${free.map(m => esc(m.name.split(' ')[0])).join(', ')}</p>` : `<p class="small good">✓ ${t('Everyone is placed')}</p>`}
    <div class="actions">${id ? `<button class="btn danger" data-a="delarr">${t('Delete')}</button><button class="btn sec" data-a="copyarr">${t('Copy')}</button>` : ''}<button class="btn" data-a="savearr">${t('Save')}</button></div>`;
  });
}
function infoSheet(id) {
  const ic = D().info.find(x => x.id === id) || { icon: 'ℹ️', title: '', body: '', sort: D().info.length + 1 };
  F = { id: ic.id || '', icon: ic.icon, title: ic.title, body: ic.body, sort: ic.sort };
  const icons = ['ℹ️', '✈️', '🏨', '🚐', '📞', '🆘', '🛂', '💊', '💵', '🧳', '📶', '🕌', '🍽️', '⚠️'];
  openSheet(() => `${sheetHead(id ? t('Edit') : t('Add trip info'))}
    <div class="chips wrapc">${icons.map(x => `<span class="chip ${F.icon === x ? 'on' : ''}" data-a="infoicon" data-k="${x}">${x}</span>`).join('')}</div>
    ${field(t('Title'), inp('title', F.title, 'placeholder="e.g. Flights, Hotel addresses, Emergency numbers"'))}
    ${field(t('Details'), txt('body', F.body, 'rows="6"'))}
    <div class="actions">${id ? `<button class="btn danger" data-a="delinfo">${t('Delete')}</button>` : ''}<button class="btn" data-a="saveinfo">${t('Save')}</button></div>`);
}
function taskSheet(id) {
  const tk = D().tasks.find(x => x.id === id) || { title: '', notes: '', due: '', assignees: [], done: {} };
  F = { id: tk.id || '', title: tk.title, notes: tk.notes, due: tk.due || '', assignees: [...tk.assignees] };
  openSheet(() => {
    const cur = D().tasks.find(x => x.id === id) || tk;
    return `${sheetHead(id ? t('Edit') : t('New to-do for the family'))}
    ${field(t('Title'), inp('title', F.title, 'placeholder="e.g. Send me a photo of your passport"'))}
    ${field(t('Details'), txt('notes', F.notes, 'rows="2"'))}
    ${field(t('Due date'), inp('due', F.due, 'type="date"'))}
    <label class="f"><span>${t('Who must do it')}</span></label>${audiencePicker('assignees')}
    ${id ? `<h3 style="margin-top:16px">${t('Who has done it')}</h3><div class="card list">${taskPeople(cur).map(pid => `<div class="li">${avatar(pid)}<span class="grow">${esc(nameOf(pid))}</span>
      ${isAdmin() ? `<input type="checkbox" class="switch" data-a2="tasktoggle" data-k="${cur.id}" data-m="${pid}" ${cur.done[pid] ? 'checked' : ''}>` : (cur.done[pid] ? '✅' : '⏳')}</div>`).join('')}</div>` : ''}
    <div class="actions">${id ? `<button class="btn danger" data-a="deltask">${t('Delete')}</button>` : ''}<button class="btn" data-a="savetask">${t('Save')}</button></div>`;
  });
}
/* audience/assignee picker: F[key] = [] means everyone */
function audiencePicker(key) {
  const sel = F[key]; const houses = [...new Set(D().members.map(m => m.household).filter(Boolean))];
  return `<div class="chips wrapc"><span class="chip ${!sel.length ? 'on' : ''}" data-a="aud" data-f="${key}" data-k="__all">👥 ${t('Everyone')}</span>
    ${houses.map(h => `<span class="chip" data-a="aud" data-f="${key}" data-k="h:${esc(h)}">👪 ${esc(h)}</span>`).join('')}</div>
    <div class="chips wrapc">${D().members.map(m => `<span class="chip ${sel.includes(m.id) ? 'on' : ''}" data-a="aud" data-f="${key}" data-k="${m.id}">${esc(m.name.split(' ')[0])}</span>`).join('')}</div>
    <div class="small muted">${sel.length ? sel.length + ' ' + t('people') : t('Everyone')}</div>`;
}
function arrangementCard(ar, compact = false) {
  const mine = myGroup(ar); const [icon, kindName] = KINDS[ar.kind] || KINDS.other;
  return `<div class="card">
    <div class="row between"><div class="grow"><span class="badge brand">${icon} ${t(kindName)}</span>${ar.day ? ` <span class="small muted">${fmtDay(ar.day)}</span>` : ''}<h3 style="margin-top:6px">${esc(ar.title)}</h3></div>
      ${can('edit_plan') ? `<button class="icon-btn" data-a="editarr" data-k="${ar.id}">${ico('edit', 18)}</button>` : ''}</div>
    ${ar.notes ? `<div class="small pre muted">${linkify(trT(ar.notes))}</div>${trBtn(ar.notes)}` : ''}
    ${mine ? `<div class="comment" style="border-inline-start:4px solid var(--brand);margin-top:8px"><b>⭐ ${t('You are in')}: ${esc(mine.name)}</b>${mine.note ? `<div class="small pre">${linkify(mine.note)}</div>` : ''}</div>` : ''}
    ${compact ? '' : (ar.groups || []).map(g => `<div style="margin-top:10px"><div class="row between"><b>${esc(g.name)}</b><span class="small muted">${(g.members || []).length} ${t('people')}</span></div>
      ${g.note ? `<div class="small muted pre">${linkify(g.note)}</div>` : ''}
      <div class="row wrap-r" style="gap:8px;margin-top:6px">${(g.members || []).map(id => `<div style="text-align:center;width:52px">${avatar(id)}<div class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${id === me() ? 'font-weight:800' : ''}">${esc(nameOf(id).split(' ')[0])}</div></div>`).join('')}</div></div>`).join('')}
  </div>`;
}

/* ----- Plan ----- */
function dayBlock(day) {
  const d = D().days.find(x => x.day === day) || { day };
  const items = D().itinerary.filter(i => i.day === day);
  const photos = D().photos.filter(p => p.day === day);
  const n = tripDays().indexOf(day) + 1; const isToday = day === today();
  return `<div class="card brief" id="day-${day}">
    <div class="row between"><div><span class="badge ${isToday ? 'good' : 'brand'}">${n > 0 ? t('Day') + ' ' + n : ''}</span> <b>${fmtDay(day, { weekday: 'long', day: 'numeric', month: 'short' })}</b></div>
    ${can('edit_plan') ? `<button class="icon-btn" data-a="editday" data-k="${day}" title="${t('Edit day')}">${ico('edit', 18)}</button>` : ''}</div>
    ${d.cover ? `<div class="day-cover" style="margin-top:10px">${pimg(d.cover)}</div>` : ''}
    ${d.title ? `<h3 style="margin-top:8px;font-size:18px">${esc(trT(d.title))}</h3>` : ''}
    ${d.brief ? `<div class="pre">${linkify(trT(d.brief))}</div>` : ''}${trBtn(d.title, d.brief, d.wear, d.bring, ...items.map(i => i.title), ...items.map(i => i.details))}
    ${d.meet_time || d.meet_place || d.wear || d.bring ? `<div class="grid">
      ${d.meet_time || d.meet_place ? `<div><div class="k">${t('Meet at')}</div><b>${esc(d.meet_time)}</b> ${esc(d.meet_place)}</div>` : ''}
      ${d.wear ? `<div><div class="k">${t('Wear')}</div>${esc(trT(d.wear))}</div>` : ''}
      ${d.bring ? `<div style="grid-column:1/-1"><div class="k">${t('Bring')}</div>${esc(trT(d.bring))}</div>` : ''}</div>` : ''}
    ${D().arrangements.filter(a => a.day === day).map(ar => { const g = myGroup(ar); const [ic] = KINDS[ar.kind] || KINDS.other;
      return `<div class="comment tap" data-a="planseg" data-k="groups" style="margin-top:8px">${ic} <b>${esc(ar.title)}</b>${g ? ` · ${t('You are in')} <b>${esc(g.name)}</b>` : ''}</div>`; }).join('')}
    <div class="timeline">${items.map(i => {
      const pl = i.place_id && D().places.find(p => p.id === i.place_id);
      return `<div class="tl"><div class="row between"><div class="grow"><span class="time">${esc(i.time)}</span> <b>${esc(trT(i.title))}</b></div>
        ${can('edit_plan') ? `<button class="btn ghost sm" data-a="edititem" data-k="${i.id}">${t('Edit')}</button>` : ''}</div>
        ${i.details ? `<div class="small pre">${linkify(trT(i.details))}</div>` : ''}
        ${pl ? `<button class="chip" style="margin-top:6px" data-a="place" data-k="${pl.id}">📍 ${esc(pl.name)}</button>` : i.place ? `<div class="small muted">📍 ${esc(i.place)}</div>` : ''}</div>`;
    }).join('') || `<div class="muted small">${t('Nothing planned yet.')}</div>`}</div>
    ${photos.length ? `<div class="gallery" style="margin-top:10px">${photos.slice(0, 6).map((p, ix) => `<div class="g" data-a="lightbox" data-list="day:${day}" data-i="${ix}">${pimg(p.id)}</div>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:8px;gap:6px">
      ${can('edit_plan') ? `<button class="btn sec sm" data-a="edititem" data-day="${day}">${ico('plus', 16)} ${t('Add activity')}</button>` : ''}
      ${can('edit_plan') ? `<button class="btn sec sm" data-a="addphotos" data-day="${day}">${ico('cam', 16)} ${t('Add photos')}</button>` : ''}
    </div>
  </div>`;
}
function planSeg() {
  let seg = S.planSeg || 'days';
  if (seg === 'places' && !can('view_places')) seg = 'days';
  if (seg !== 'places' && !can('view_plan')) seg = 'places';
  return seg;
}
function planView() {
  const seg = planSeg();
  const segs = [can('view_plan') && ['days', '🗓️', 'Days'], can('view_places') && ['places', '📍', 'Places'], can('view_plan') && ['groups', '👥', 'Groups'], can('view_plan') && ['todo', '✅', 'To-dos']].filter(Boolean);
  const head = `<div class="seg seg4">${segs.map(([k, e, l]) => `<button class="${seg === k ? 'on' : ''}" data-a="planseg" data-k="${k}"><span>${e}</span>${t(l)}</button>`).join('')}</div>`;
  if (seg === 'places') return head + placesPart();
  if (seg === 'groups') {
    const list = D().arrangements;
    return head + (can('edit_plan') && list.length ? `<button class="btn block" data-a="editarr">${ico('plus', 18)} ${t('New grouping (cars, rooms, activity)')}</button>` : '') +
      (list.length ? list.map(ar => arrangementCard(ar)).join('') : emptyState('🚐', t('No groups yet.'), t('Make groups for each car ride, hotel rooms or an activity. Everyone will see which group they are in.'), can('edit_plan') ? `<button class="btn" data-a="editarr">${ico('plus', 18)} ${t('Make the first groups')}</button>` : ''));
  }
  if (seg === 'todo') {
    const list = can('edit_plan') ? D().tasks : myTasks();
    return head + (can('edit_plan') && list.length ? `<button class="btn block" data-a="edittask">${ico('plus', 18)} ${t('New to-do for the family')}</button>` : '') +
      (list.length ? `<div class="card list">${list.map(taskRow).join('')}</div>` : emptyState('✅', t('Nothing to do yet.'), t('For example: renew passports, bring sunscreen, pay the hotel deposit.'), can('edit_plan') ? `<button class="btn" data-a="edittask">${ico('plus', 18)} ${t('Add the first to-do')}</button>` : ''));
  }
  const days = tripDays(); const sel = S.planDay;
  return head + `<div class="chips">
    <span class="chip ${sel === 'all' ? 'on' : ''}" data-a="planday" data-k="all">${t('All days')}</span>
    ${days.map((d, i) => `<span class="chip ${sel === d ? 'on' : ''}" data-a="planday" data-k="${d}">${i + 1} · ${fmtDay(d, { weekday: 'short', day: 'numeric' })}</span>`).join('')}
  </div>${(sel === 'all' ? days : [sel]).map(dayBlock).join('')}`;
}

/* ----- Photos & places ----- */
function photosView() {
  return `<div style="height:12px"></div>` + (can('add_photos') ? `<button class="btn block" data-a="addphotos">${ico('cam', 18)} ${t('Add photos')}</button>` : '') +
    (D().photos.length ? `<div class="gallery" style="margin-top:12px">${D().photos.map((p, i) => `<div class="g" data-a="lightbox" data-list="all" data-i="${i}">${pimg(p.id)}</div>`).join('')}</div>`
      : emptyState('📷', t('No photos yet.'), t('Snap the fun moments and share them with the whole family.')));
}
function placesPart() {
  if (!D().places.length) return emptyState('🏝️', t('No places yet.'), t('Add the hotels, beaches and sights you will visit, with address, hours, prices and tips.'), can('edit_places') ? `<button class="btn" data-a="editplace">${ico('plus', 18)} ${t('Add the first place')}</button>` : '');
  const cities = [...new Set(D().places.map(p => p.city).filter(Boolean))];
  const list = D().places.filter(p => S.city === 'all' || p.city === S.city);
  return `<div class="row between"><div class="chips grow">
      <span class="chip ${S.city === 'all' ? 'on' : ''}" data-a="city" data-k="all">${t('All')}</span>
      ${cities.map(c => `<span class="chip ${S.city === c ? 'on' : ''}" data-a="city" data-k="${esc(c)}">${esc(c)}</span>`).join('')}</div>
      ${can('edit_places') ? `<button class="btn sm" data-a="editplace">${ico('plus', 16)} ${t('New place')}</button>` : ''}</div>
    <div class="grid2" style="margin-top:6px">${list.map(p => {
      const cover = p.cover || D().photos.find(x => x.place_id === p.id)?.id;
      return `<div class="place" data-a="place" data-k="${p.id}"><div class="ph">${cover ? pimg(cover, p.name) : '🏝️'}</div>
        <div class="b"><h3>${esc(p.name)}</h3><div class="small muted">${esc(p.city)}</div></div></div>`;
    }).join('')}</div>`;
}

/* ----- Ideas ----- */
const score = s => Object.values(s.votes || {}).reduce((a, b) => a + b, 0);
function ideasView() {
  const org = can('edit_plan');
  let list = [...D().suggestions];
  if (S.ideasFilter === 'private') list = list.filter(x => x.visibility === 'private');
  if (S.ideasFilter === 'public') list = list.filter(x => x.visibility !== 'private');
  if (S.ideasFilter === 'mine') list = list.filter(x => x.author === me());
  if (S.ideasSort === 'top') list.sort((a, b) => score(b) - score(a) || (b.created_at > a.created_at ? 1 : -1));
  const st = { open: ['', 'Open'], planned: ['good', 'Planned'], declined: ['bad', 'Declined'] };
  const filters = [['all', 'All'], ['public', 'Shared with everyone'], [org ? 'private' : 'mine', org ? 'Private to me' : 'Mine']];
  return `${ideaCTA()}<div class="seg"><button class="${S.ideasSort === 'top' ? 'on' : ''}" data-a="isort" data-k="top">❤️ ${t('Most liked')}</button><button class="${S.ideasSort === 'new' ? 'on' : ''}" data-a="isort" data-k="new">${t('Newest')}</button></div>
  <div class="chips">${filters.map(([k, l]) => `<span class="chip ${(S.ideasFilter || 'all') === k ? 'on' : ''}" data-a="ifilter" data-k="${k}">${t(l)}</span>`).join('')}</div>
  ${list.length ? list.map(s => {
    const liked = (s.votes || {})[me()] === 1; const open = S.openIdeas.has(s.id); const priv = s.visibility === 'private';
    const likers = Object.entries(s.votes || {}).filter(([, v]) => v === 1).map(([k]) => k);
    return `<div class="card">
      <div class="row between" style="align-items:flex-start"><div class="grow"><div class="small muted">📍 ${t('Place')}</div><h3 style="font-size:18px">${esc(s.title)}</h3></div>
        ${s.status !== 'open' ? `<span class="badge ${st[s.status][0]}">${t(st[s.status][1])}</span>` : ''}</div>
      <div class="row wrap-r" style="gap:6px;margin:6px 0">
        <span class="badge">${s.mode === 'alone' ? '🧍 ' + t('Alone') : '👨‍👩‍👧 ' + t('With a group')}</span>
        ${priv ? `<span class="badge bad">🔒 ${t('Only the organizer sees this')}</span>` : `<span class="badge brand">👥 ${t('Shared with everyone')}</span>`}
        ${s.day ? `<span class="badge">🗓️ ${fmtDay(s.day)}</span>` : ''}</div>
      ${s.body ? `<div class="small muted" style="font-weight:700">${t('Why')}</div><div class="pre">${linkify(trT(s.body))}</div>` : ''}
      ${s.reply ? `<div class="comment" style="border-inline-start:4px solid var(--brand)"><b>💬 ${t('Organizer reply')}</b><div class="pre">${linkify(trT(s.reply))}</div></div>` : ''}${trBtn(s.body, s.reply)}
      <div class="row" style="margin-top:8px">${avatar(s.author)}<span class="small muted grow">${esc(nameOf(s.author))} · ${ago(s.created_at)}</span></div>
      <div class="row wrap-r" style="gap:4px;margin-top:8px">
        ${!priv ? `<button class="btn ${liked ? '' : 'sec'} sm" data-a="like" data-k="${s.id}">${liked ? '❤️' : '🤍'} ${t('Support')} · ${likers.length}</button>` : ''}
        <button class="btn ghost sm" data-a="toggleidea" data-k="${s.id}">💬 ${s.comments.length}</button>
        ${org ? `<button class="btn ghost sm" data-a="ideareply" data-k="${s.id}">${t('Reply / status')}</button><button class="btn ghost sm" data-a="idea2plan" data-k="${s.id}">${t('Add to plan')}</button>` : ''}
        ${s.author === me() || isAdmin() ? `<button class="btn danger sm" data-a="delidea" data-k="${s.id}">${t('Delete')}</button>` : ''}
      </div>
      ${likers.length && !priv ? `<div class="row" style="gap:2px;margin-top:6px">${likers.slice(0, 12).map(id => avatar(id, 'sm')).join('')}</div>` : ''}
      ${open ? `<div>${s.comments.map(c => `<div class="comment"><b>${esc(nameOf(c.author))}</b> <span class="muted small">${ago(c.created_at)}</span>
          ${c.author === me() || isAdmin() ? `<button class="btn danger sm" style="float:inline-end;min-height:0;padding:0 4px" data-a="delcomment" data-k="${c.id}">×</button>` : ''}<div class="pre">${linkify(c.body)}</div></div>`).join('')}
        ${can('comment') ? `<form class="row" style="margin-top:8px" data-form="comment" data-k="${s.id}"><input class="i grow" name="body" placeholder="${t('Write a comment…')}" required><button class="btn sm">${t('Send')}</button></form>` : ''}</div>` : ''}
    </div>`;
  }).join('') : emptyState('💡', t('No ideas yet. Be the first!'), t('Tell us a place you would love to visit and why.'))}`;
}

/* ----- Money ----- */
function memberMoney() {
  const b = balances(); const mine = b[me()] || { paid: 0, share: 0, net: 0 };
  const tr = transfers(Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.net])));
  const pay = tr.filter(x => x.from === me()), get = tr.filter(x => x.to === me());
  const ex = D().expenses.filter(e => e.shares[me()] != null || e.paid_by === me());
  let lastDay = '';
  return `<div class="row between" style="margin-top:12px"><span class="small muted">${t('Display currency')}</span><div class="chips" style="padding:0">${CURS.map(c => `<span class="chip ${S.cur === c ? 'on' : ''}" data-a="cur" data-k="${c}">${c}</span>`).join('')}</div></div>
  <div class="card mybal ${mine.net > 0.005 ? 'good' : mine.net < -0.005 ? 'bad' : 'ok'}"><div class="muted small">${t('Your balance')}</div>
    <div class="money-big">${mine.net < -0.005 || mine.net > 0.005 ? money(Math.abs(fromBase(mine.net))) : '✅'}</div>
    <b>${mine.net > 0.005 ? t('You will get money back') : mine.net < -0.005 ? t('You need to pay') : t('You are all settled 🎉')}</b>
    <div class="row small muted" style="margin-top:8px;gap:16px"><span>${t('Your share')}: <b>${money(fromBase(mine.share))}</b></span><span>${t('You paid')}: <b>${money(fromBase(mine.paid))}</b></span></div>
    <button class="btn sec sm" style="margin-top:10px" data-a="statement" data-k="${me()}">📄 ${t('My full statement')}</button></div>
  ${pay.length || get.length ? `<h2>🤝 ${t('What to do')}</h2><div class="card list">${pay.map(x => `<div class="li">${avatar(x.to)}<div class="grow">${t('Pay')} <b>${esc(nameOf(x.to))}</b></div><span class="amount bad">${money(fromBase(x.amount))}</span></div>`).join('')}${get.map(x => `<div class="li">${avatar(x.from)}<div class="grow"><b>${esc(nameOf(x.from))}</b> ${t('pays you')}</div><span class="amount good">${money(fromBase(x.amount))}</span></div>`).join('')}</div>` : ''}
  <h2>🧾 ${t('Your bills')} <span class="muted small">${ex.length}</span></h2>
  ${ex.length ? ex.map(e => { const head = e.spent_on !== lastDay ? `<h3 class="muted small" style="margin:12px 0 0">${fmtDay(e.spent_on, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>` : ''; lastDay = e.spent_on; const my = e.shares[me()];
    return head + `<div class="card tap" data-a="expense" data-k="${e.id}" style="margin:6px 0"><div class="row"><span style="font-size:24px">${CATS[e.category] || '💸'}</span><div class="grow"><b>${esc(e.title)}</b><div class="small muted">${t('paid')}: ${esc(nameOf(e.paid_by))}</div></div>
      <div style="text-align:end"><div class="small muted">${t('your share')}</div><div class="amount">${my ? money(my, e.currency) : '—'}</div></div></div></div>`; }).join('')
    : emptyState('🧾', t('No bills yet.'), t('When the organizer adds a bill you are part of, it shows up here with your share.'))}`;
}
function moneyView() {
  if (!isAdmin() && !can('add_expense') && !can('edit_plan')) return memberMoney();
  const all = can('money_all');
  const b = balances(); const mine = b[me()] || { paid: 0, share: 0, net: 0 };
  const curChips = `<div class="row between" style="margin-top:12px"><span class="small muted">${t('Display currency')}</span><div class="chips" style="padding:0">${CURS.map(c => `<span class="chip ${S.cur === c ? 'on' : ''}" data-a="cur" data-k="${c}">${c}</span>`).join('')}</div></div>`;
  const summary = `<div class="card"><div class="row between"><div><div class="muted small">${t('Your balance')}</div>
    <div class="money-big ${mine.net > 0.005 ? 'good' : mine.net < -0.005 ? 'bad' : ''}">${money(Math.abs(fromBase(mine.net)))}</div>
    <div class="small muted">${mine.net > 0.005 ? t('You are owed') : mine.net < -0.005 ? t('You owe') : t('All settled')}</div></div>
    <button class="btn sec sm" data-a="statement" data-k="${me()}">${t('Statement')}</button></div>
    <div class="row small muted" style="margin-top:8px;gap:16px"><span>${t('Total paid')}: <b>${money(fromBase(mine.paid))}</b></span><span>${t('Total share')}: <b>${money(fromBase(mine.share))}</b></span></div></div>`;
  const segs = all ? [['overview', '📊 Overview'], ['expenses', '🧾 Bills'], ['balances', '⚖️ Balances'], ['settle', '🤝 Settle up']] : [['expenses', '🧾 Bills']];
  if (!segs.find(s => s[0] === S.moneyTab)) S.moneyTab = segs[0][0];
  let body = '';
  if (S.moneyTab === 'overview') body = moneyOverview();
  else if (S.moneyTab === 'expenses') {
    const q = (S.q || '').trim().toLowerCase();
    const ex = D().expenses.filter(e => (!S.fPayer || e.paid_by === S.fPayer) && (!S.fMethod || e.method === S.fMethod) && (!S.fCat || e.category === S.fCat) && (!q || (e.title + ' ' + (e.note || '')).toLowerCase().includes(q)));
    body += `<input class="i" style="margin-top:8px" data-a2="q" type="search" value="${esc(S.q || '')}" placeholder="🔎 ${t('Search bills…')}">
      <div class="chips" style="margin-top:6px"><span class="chip ${!S.fCat ? 'on' : ''}" data-a="fcat" data-k="">${t('All')}</span>${Object.entries(CATS).map(([k, e]) => `<span class="chip ${S.fCat === k ? 'on' : ''}" data-a="fcat" data-k="${k}">${e} ${t(k[0].toUpperCase() + k.slice(1))}</span>`).join('')}</div>`;
    const tot = ex.reduce((a, e) => a + toBase(e.amount, e.currency), 0);
    body += `<div class="row wrap-r" style="gap:6px;margin-top:4px"><select class="i" style="width:auto;flex:1" data-a2="fpayer"><option value="">${t('Paid by')}: ${t('Everyone')}</option>${D().members.map(m => `<option value="${m.id}" ${S.fPayer === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>
      <select class="i" style="width:auto;flex:1" data-a2="fmethod"><option value="">${t('Payment method')}: ${t('All')}</option>${Object.entries(METHODS).map(([k, [ic, l]]) => `<option value="${k}" ${S.fMethod === k ? 'selected' : ''}>${ic} ${t(l)}</option>`).join('')}</select></div>
      <div class="small muted" style="margin:6px 0">${ex.length} ${t('bills')} · ${t('Total')}: <b>${money(fromBase(tot))}</b></div>`;
    let lastDay = '';
    body += ex.length ? ex.map(e => {
      const head = e.spent_on !== lastDay ? `<h3 class="muted small" style="margin:14px 0 0">${fmtDay(e.spent_on, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>` : ''; lastDay = e.spent_on;
      const my = e.shares[me()];
      return head + `<div class="card tap" data-a="expense" data-k="${e.id}" style="margin:6px 0"><div class="row">
        <span style="font-size:24px">${CATS[e.category] || '💸'}</span>
        <div class="grow"><b>${esc(e.title)}</b><div class="small muted">${t('paid')}: ${esc(nameOf(e.paid_by))}${e.method && METHODS[e.method] ? ' ' + METHODS[e.method][0] : ''}${e.receipt ? ' 🧾' : ''} · ${Object.keys(e.shares).length} ${t('people')}</div></div>
        <div style="text-align:end"><div class="amount">${money(e.amount, e.currency)}</div>${my ? `<div class="small muted">${t('your share')}: ${money(my, e.currency)}</div>` : ''}</div>
      </div></div>`;
    }).join('') : emptyState('🧾', t('No expenses yet.'), t('Add every bill: who paid, how they paid, and who it was for. The app works out who owes whom.'), can('add_expense') ? `<button class="btn" data-a="expenseform">${ico('plus', 16)} ${t('Add expense')}</button>` : '');
    if (!all) body += `<p class="small muted">${t('Ask the organizer who to pay at the end of the trip.')}</p>`;
  } else if (S.moneyTab === 'balances') {
    const g = grouped(b); const max = Math.max(0.01, ...Object.values(g).map(Math.abs));
    body = `<label class="row" style="margin:8px 0"><input type="checkbox" class="switch" data-a2="byhouse" ${S.byHouse ? 'checked' : ''}> ${t('Group by family')}</label>
    <div class="card list">${Object.entries(g).sort((a, c) => c[1] - a[1]).map(([k, v]) => `<div class="li ${S.byHouse ? '' : 'tap'}" ${S.byHouse ? '' : `data-a="statement" data-k="${k}"`} style="cursor:pointer">
      ${S.byHouse ? `<span class="avatar" style="background:hsl(${hue(k)} 45% 45%)">${esc(labelOf(k).charAt(0))}</span>` : avatar(k)}
      <div class="grow"><b>${esc(labelOf(k))}</b><div class="bar" style="margin-top:4px"><i style="width:${Math.abs(v) / max * 100}%;background:${v >= 0 ? 'var(--good)' : 'var(--bad)'}"></i></div></div>
      <span class="amount ${v > 0.005 ? 'good' : v < -0.005 ? 'bad' : 'muted'}">${Math.abs(v) <= 0.005 ? '✅ ' : v > 0.005 ? '+' : '−'}${money(Math.abs(fromBase(v)))}</span></div>`).join('')}</div>
    <p class="small muted">${t('Green = gets money back. Red = still has to pay. Tap a person to see their full statement.')}</p>`;
  } else {
    const tr = transfers(grouped(b));
    body = `<label class="row" style="margin:8px 0"><input type="checkbox" class="switch" data-a2="byhouse" ${S.byHouse ? 'checked' : ''}> ${t('Group by family')}</label>
    <div class="row between"><h2>${t('Suggested payments')}</h2>${tr.length && isAdmin() ? `<button class="btn ghost sm" data-a="remindall">📋 ${t('Copy all')}</button>` : ''}</div>
    <p class="small muted" style="margin-top:-4px">${t('The fewest payments that settle everyone. Tap ✓ when a payment is made, or 🔔 to send a reminder.')}</p>
    ${tr.length ? `<div class="card list">${tr.map(x => `<div class="li">
      <div class="grow"><b>${esc(labelOf(x.from))}</b> <span class="muted">${t('pays')}</span> <b>${esc(labelOf(x.to))}</b>
        <div class="small muted">${money(fromBase(x.amount, 'JOD'), 'JOD')} · ${money(fromBase(x.amount, 'EGP'), 'EGP')}</div></div>
      <span class="amount">${money(fromBase(x.amount))}</span>
      <button class="btn sec sm" data-a="remind" data-from="${x.from}" data-to="${x.to}" data-amt="${fromBase(x.amount).toFixed(2)}" title="${t('Send a reminder')}">🔔</button>
      ${isAdmin() || [personOf(x.from), personOf(x.to)].includes(me()) || (S.byHouse && [x.from, x.to].includes(houseKey(me()))) ? `<button class="btn sm" data-a="settle" data-from="${personOf(x.from)}" data-to="${personOf(x.to)}" data-amt="${fromBase(x.amount).toFixed(2)}">✓</button>` : ''}
    </div>`).join('')}</div>` : `<div class="empty card"><div class="e">🎉</div>${t('Everyone is settled up.')}</div>`}
    <div class="row between"><h2>${t('Payment history')}</h2><button class="btn ghost sm" data-a="settle">${ico('plus', 16)} ${t('Record payment')}</button></div>
    <div class="card list">${D().settlements.map(s => `<div class="li"><div class="grow"><b>${esc(nameOf(s.from_member))}</b> → <b>${esc(nameOf(s.to_member))}</b><div class="small muted">${ago(s.created_at)}${s.note ? ' · ' + esc(s.note) : ''}</div></div>
      <span class="amount">${money(s.amount, s.currency)}</span>${isAdmin() || [s.from_member, s.to_member, s.created_by].includes(me()) ? `<button class="btn danger sm" data-a="delsettle" data-k="${s.id}">×</button>` : ''}</div>`).join('') || `<div class="muted small">—</div>`}</div>`;
  }
  return curChips + summary + (segs.length > 1 ? `<div class="seg seg4">${segs.map(([k, l]) => { const [e, ...w] = t(l).split(' '); return `<button class="${S.moneyTab === k ? 'on' : ''}" data-a="mtab" data-k="${k}"><span>${e}</span>${w.join(' ')}</button>`; }).join('')}</div>` : '') + body +
    (can('add_expense') ? `<button class="btn fab" data-a="expenseform">${ico('plus', 18)} ${t('Add expense')}</button>` : '');
}

const budget = () => Object.assign({ total: 0, currency: 'JOD', cats: {} }, D()?.settings?.budget);
function moneyOverview() {
  const ex = D().expenses; const b = budget();
  const total = ex.reduce((a, e) => a + toBase(e.amount, e.currency), 0);
  const people = D().members.length || 1;
  const byCat = {}; ex.forEach(e => byCat[e.category] = (byCat[e.category] || 0) + toBase(e.amount, e.currency));
  const days = tripDays(); const byDay = {}; ex.forEach(e => { const k = e.spent_on < days[0] ? 'before' : e.spent_on > days.at(-1) ? 'after' : e.spent_on; byDay[k] = (byDay[k] || 0) + toBase(e.amount, e.currency); });
  const payers = {}; ex.forEach(e => payers[e.paid_by] = (payers[e.paid_by] || 0) + toBase(e.amount, e.currency));
  const todayAmt = ex.filter(e => e.spent_on === today()).reduce((a, e) => a + toBase(e.amount, e.currency), 0);
  const bTotal = b.total ? toBase(b.total, b.currency) : 0; const pct = bTotal ? total / bTotal * 100 : 0;
  const bar = (v, max, col) => `<div class="bar" style="height:10px;margin-top:4px"><i style="width:${Math.min(100, v / Math.max(max, 0.0001) * 100)}%;background:${col}"></i></div>`;
  const pcol = p => p > 100 ? 'var(--bad)' : p > 85 ? 'var(--warn)' : 'var(--good)';
  const maxCat = Math.max(0, ...Object.values(byCat)); const dayKeys = [byDay.before ? 'before' : null, ...days, byDay.after ? 'after' : null].filter(Boolean); const maxDay = Math.max(0.01, ...Object.values(byDay));
  return `<div class="stats">
      <div class="stat"><span>💰</span><b>${money(fromBase(total))}</b><small>${t('Trip total')}</small></div>
      <div class="stat"><span>👤</span><b>${money(fromBase(total / people))}</b><small>${t('Per person')}</small></div>
      <div class="stat"><span>🧾</span><b>${ex.length}</b><small>${t('Bills')}</small></div>
      <div class="stat"><span>📅</span><b>${money(fromBase(todayAmt))}</b><small>${t('Spent today')}</small></div></div>
    <div class="card"><div class="row between"><b>🎯 ${t('Budget')}</b>${isAdmin() ? `<button class="btn ghost sm" data-a="budget">${b.total ? t('Edit') : t('Set a budget')}</button>` : ''}</div>
      ${b.total ? `<div class="row between small" style="margin-top:6px"><span>${money(fromBase(total))} ${t('of')} ${money(fromBase(bTotal))}</span><b style="color:${pcol(pct)}">${Math.round(pct)}%</b></div>${bar(total, bTotal, pcol(pct))}
        <div class="small muted" style="margin-top:6px">${pct > 100 ? '⚠️ ' + t('Over budget by {a}', { a: money(fromBase(total - bTotal)) }) : t('{a} left', { a: money(fromBase(bTotal - total)) })}</div>
        ${Object.entries(b.cats || {}).filter(([, v]) => +v > 0).map(([k, v]) => { const lim = toBase(v, b.currency), sp = byCat[k] || 0, pp = sp / lim * 100; return `<div style="margin-top:10px"><div class="row between small"><span>${CATS[k] || '💸'} ${t(k[0].toUpperCase() + k.slice(1))}</span><span>${money(fromBase(sp))} / ${money(fromBase(lim))}</span></div>${bar(sp, lim, pcol(pp))}</div>`; }).join('')}`
      : `<p class="small muted" style="margin:6px 0 0">${isAdmin() ? t('Set a total budget (and per category if you like) to see how much is left at a glance.') : t('No budget set yet.')}</p>`}</div>
    <div class="card"><b>🗂️ ${t('Where the money goes')}</b>
      ${Object.keys(byCat).length ? Object.entries(byCat).sort((a, c) => c[1] - a[1]).map(([k, v]) => `<div style="margin-top:10px"><div class="row between small"><span>${CATS[k] || '💸'} ${t(k[0].toUpperCase() + k.slice(1))}</span><span><b>${money(fromBase(v))}</b> · ${Math.round(v / total * 100)}%</span></div>${bar(v, maxCat, 'var(--brand)')}</div>`).join('') : `<p class="small muted">${t('No expenses yet.')}</p>`}</div>
    <div class="card"><b>📅 ${t('Spending by day')}</b>
      <div class="daychart">${dayKeys.map(k => `<div class="dc ${k === today() ? 'today' : ''}" title="${money(fromBase(byDay[k] || 0))}"><i style="height:${(byDay[k] || 0) / maxDay * 100}%"></i><small>${k === 'before' ? t('Before') : k === 'after' ? t('After') : fmtDay(k, { day: 'numeric' })}</small></div>`).join('')}</div></div>
    <div class="card"><b>🙌 ${t('Who paid so far')}</b><div class="list" style="margin-top:6px">${Object.entries(payers).sort((a, c) => c[1] - a[1]).map(([id, v]) => `<div class="li tap" data-a="statement" data-k="${id}" style="cursor:pointer">${avatar(id)}<b class="grow">${esc(nameOf(id))}</b><span class="amount">${money(fromBase(v))}</span></div>`).join('') || `<p class="small muted">—</p>`}</div></div>`;
}
function budgetSheet() {
  const b = budget(); F = { total: b.total || '', currency: b.currency || 'JOD', cats: Object.assign({}, b.cats) };
  openSheet(() => `${sheetHead('🎯 ' + t('Trip budget'))}
    <div class="two">${field(t('Total budget'), inp('total', F.total, 'type="number" inputmode="decimal" placeholder="0"'))}
    ${field(t('Currency'), `<select class="i" data-bind="currency">${CURS.map(c => `<option ${F.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}</div>
    <h3 style="margin-top:16px">${t('Per category (optional)')}</h3>
    ${Object.entries(CATS).map(([k, e]) => field(`${e} ${t(k[0].toUpperCase() + k.slice(1))}`, inp('cats.' + k, F.cats[k] || '', 'type="number" inputmode="decimal" placeholder="—"'))).join('')}
    <div class="actions"><button class="btn" data-a="savebudget">${t('Save')}</button></div>`);
}
function remindText(from, to, amt) {
  const f = S.byHouse && from.startsWith('h:') ? houseName(from) : nameOf(from), tt = S.byHouse && to.startsWith('h:') ? houseName(to) : nameOf(to);
  return t('Hi {a}, a friendly reminder from the {trip} app: please pay {b} {c}. Thank you!', { a: f, trip: trip().name, b: tt, c: money(+amt) });
}
async function shareText(text) {
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(text); toast(t('Copied. Paste it in WhatsApp.')); } catch { window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }
}

/* ----- More ----- */
const tile = (e, label, sub, a, k, c) => `<button class="tile" data-a="${a}" ${k ? `data-k="${k}"` : ''} style="--c:${c}"><span class="te">${e}</span><b>${t(label)}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}</button>`;
function organizeHub() {
  const d = D(); const openIdeas = d.suggestions.filter(x => x.status === 'open').length;
  const orgs = d.members.filter(x => x.role === 'admin').length;
  return `<h2 style="margin-top:14px">🧭 ${t('Organize the trip')}</h2>
  ${startHere(true)}
  <h3 class="sec-h" style="--c:var(--c-people)">👨‍👩‍👧 ${t('People')}</h3>
  <div class="tiles">
    ${tile('➕', 'Add a family member', d.members.length + ' ' + t('people'), 'member', '', 'var(--c-people)')}
    ${isMain() ? tile('⭐', 'Co-organizers', orgs + ' ' + t('organizers'), 'organizers', '', 'var(--c-people)') : ''}
    ${tile('🚐', 'Cars, rooms & groups', d.arrangements.length + ' ' + t('groupings'), 'planseg', 'groups', 'var(--c-people)')}
    ${tile('✅', 'To-dos', d.tasks.length + ' ' + t('to-dos'), 'planseg', 'todo', 'var(--c-people)')}
  </div>
  <h3 class="sec-h" style="--c:var(--c-plan)">🗓️ ${t('Plan')}</h3>
  <div class="tiles">
    ${tile('🗓️', 'Days & activities', d.itinerary.length + ' ' + t('activities'), 'planseg', 'days', 'var(--c-plan)')}
    ${tile('📍', 'Places', d.places.length + ' ' + t('places'), 'planseg', 'places', 'var(--c-plan)')}
    ${tile('🧳', 'Before you travel', d.info.length + ' ' + t('cards'), 'editinfo', '', 'var(--c-plan)')}
  </div>
  <h3 class="sec-h" style="--c:var(--c-talk)">💬 ${t('Talk to the family')}</h3>
  <div class="tiles">
    ${tile('📣', 'New announcement', d.announcements.length + ' ' + t('sent'), 'announce', '', 'var(--c-talk)')}
    ${tile('💡', 'Ideas inbox', openIdeas + ' ' + t('waiting for you'), 'tab', 'ideas', 'var(--c-talk)')}
  </div>
  <h3 class="sec-h" style="--c:var(--c-money)">💰 ${t('Money')}</h3>
  <div class="tiles">
    ${tile('🧾', 'Add a bill', d.expenses.length + ' ' + t('bills'), 'expenseform', '', 'var(--c-money)')}
    ${tile('📧', 'Final statements', '', 'finalbills', '', 'var(--c-money)')}
    ${tile('💱', 'Exchange rates', '', 'rates', '', 'var(--c-money)')}
    ${tile('📄', 'Export CSV', '', 'csv', '', 'var(--c-money)')}
  </div>
  <h3 class="sec-h" style="--c:var(--c-trip)">⚙️ ${t('Trip')}</h3>
  <div class="tiles">${tile('🎨', 'Trip settings', t('Name, dates, colours, cover'), 'tripsettings', '', 'var(--c-trip)')}${tile('👁️', 'See it as family', t('Preview the member view'), 'preview', '', 'var(--c-trip)')}</div>
  <h2>👤 ${t('My account')}</h2>`;
}
function organizersSheet() {
  openSheet(() => `${sheetHead('⭐ ' + t('Co-organizers'))}
    <p class="small muted">${t('Co-organizers have the same powers as you: they can add members, edit the plan, places, groups, bills and announcements. Switch someone on to make them a co-organizer.')}</p>
    <div class="card list">${D().members.map(x => `<label class="li">${avatar(x.id)}<div class="grow"><b>${esc(x.name)}</b><div class="small muted">${x.role === 'admin' ? '⭐ ' + t('Organizer') : t('Member')}</div></div>
      ${x.id === me() ? `<span class="badge brand">${t('You')}</span>` : `<input type="checkbox" class="switch" data-a2="orgtoggle" data-k="${x.id}" ${x.role === 'admin' ? 'checked' : ''}>`}</label>`).join('')}</div>`);
}
function moreView() {
  const m = D().me; const ap = LS.get('appearance', 'auto');
  return `${isAdmin() ? organizeHub() : ''}<div class="card" style="margin-top:14px"><div class="row"><button class="avatar-btn" data-a="myavatar" title="${t('Change photo')}">${avatar(m.id, 'lg')}<span class="cam">${ico('cam', 14)}</span></button><div class="grow"><h3>${esc(m.name)}</h3><div class="small muted">@${esc(m.username)}${m.household ? ' · ' + esc(m.household) : ''} · ${m.role === 'admin' ? t('Organizer (full access)') : t('Member')}</div></div></div>
    <div class="row wrap-r" style="margin-top:12px;gap:6px">
      <button class="btn sec sm" data-a="myavatar">📸 ${m.avatar ? t('Change photo') : t('Add your photo')}</button>
      <button class="btn sec sm" data-a="profile">${t('Profile')}</button>
      <button class="btn sec sm" data-a="password">${t('Change password')}</button>
      <button class="btn danger sm" data-a="logout">${t('Log out')}</button></div></div>
  <div class="card"><div class="row between"><b>${t('Language')}</b><div class="chips" style="padding:0"><span class="chip ${S.lang === 'en' ? 'on' : ''}" data-a="setlang" data-k="en">English</span><span class="chip ${S.lang === 'ar' ? 'on' : ''}" data-a="setlang" data-k="ar">العربية</span></div></div>
    <div class="row between" style="margin-top:10px"><b>${t('Appearance')}</b><div class="chips" style="padding:0">${['auto', 'light', 'dark'].map(k => `<span class="chip ${ap === k ? 'on' : ''}" data-a="appearance" data-k="${k}">${t(k[0].toUpperCase() + k.slice(1))}</span>`).join('')}</div></div></div>
  ${realAdmin() ? `<div class="card tap" data-a="preview"><div class="row"><span style="font-size:26px">👁️</span><div class="grow"><b>${S.preview ? t('Back to organizer') : t('See the app like a family member')}</b><div class="small muted">${t('Check exactly what your family sees, then come back.')}</div></div><span class="muted">›</span></div></div>` : ''}
  ${isAdmin() ? '' : '<!--'}<div class="card"><div class="row between"><b>💡 ${t('Tips on each screen')}</b><button class="btn sec sm" data-a="resethints">${t('Show tips again')}</button></div></div>${isAdmin() ? '' : '-->'}
  <div class="card"><b>📲 ${t('Install on your phone')}</b><p class="small muted" style="margin:4px 0 0">${t('Tap Share then "Add to Home Screen" on iPhone, or the menu then "Install app" on Android.')}</p></div>
  ${isAdmin() ? `<h2>${t('Family')}</h2>
  <div class="card list">${D().members.map(x => `<div class="li">${avatar(x.id)}<div class="grow"><b>${esc(x.name)}</b>${x.role === 'admin' ? ' <span class="badge brand">★</span>' : ''}<div class="small muted">${esc(x.household || '')}</div></div>
    <button class="btn ghost sm" data-a="member" data-k="${x.id}">${t('Edit')}</button></div>`).join('')}</div>` : ''}
  <p class="small muted" style="text-align:center;margin-top:24px">${esc(trip().name)} · v1</p>`;
}

/* ---------------- sheets ---------------- */
function openSheet(fn) { sheetRender = fn; rerenderSheet(); document.body.style.overflow = 'hidden'; }
function rerenderSheet() {
  if (!sheetRender) return;
  const root = $('#sheet-root'); const old = $('.sheet', root); const scroll = old ? old.scrollTop : 0;
  const a = document.activeElement; const focusKey = a && root.contains(a) ? (a.dataset.bind || a.name) : null; const sel = focusKey && a.selectionStart;
  root.innerHTML = `<div class="sheet-bg" data-a="bgclose"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${sheetRender()}</div></div>`;
  const sh = $('.sheet', root); sh.scrollTop = scroll;
  if (focusKey) { const el = $(`[data-bind="${focusKey}"],[name="${focusKey}"]`, root); if (el) { el.focus(); try { el.setSelectionRange(sel, sel); } catch {} } }
  hydratePhotos(root);
}
function closeSheet() { sheetRender = null; F = null; $('#sheet-root').innerHTML = ''; document.body.style.overflow = ''; }
const sheetHead = title => `<div class="sh"><h2>${title}</h2><button class="icon-btn" data-a="close" aria-label="${t('Close')}">${ico('x', 18)}</button></div>`;
const field = (label, html) => `<label class="f"><span>${label}</span>${html}</label>`;
const inp = (k, v, attrs = '') => `<input class="i" data-bind="${k}" value="${esc(v ?? '')}" ${attrs}>`;
const txt = (k, v, attrs = '') => `<textarea class="i" data-bind="${k}" ${attrs}>${esc(v ?? '')}</textarea>`;
function confirmSheet(text, onYes, yes = 'Yes, delete') {
  const prev = sheetRender, prevF = F;
  F = { __confirm: onYes, __prev: prev, __prevF: prevF };
  openSheet(() => `${sheetHead(t('Are you sure?'))}<p>${esc(text)}</p><div class="actions"><button class="btn sec" data-a="confirmno">${t('Cancel')}</button><button class="btn" style="background:var(--bad)" data-a="confirmyes">${t(yes)}</button></div>`);
}
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] ??= {}; o[ks.at(-1)] = val; }

/* announcement */
function announceSheet(id) {
  const a = D().announcements.find(x => x.id === id) || { title: '', body: '', pinned: false };
  F = { id: a.id || '', title: a.title, body: a.body, pinned: a.pinned, audience: [...(a.audience || [])], poll: a.poll ? a.poll.map(o => { const q = po(o); return { ...q, photos: [...q.photos] }; }) : null };
  openSheet(() => `${sheetHead(id ? t('Edit') : t('New announcement'))}
    ${field(t('Title'), inp('title', F.title))}${field(t('Details'), txt('body', F.body))}
    <label class="row" style="margin-top:12px"><input type="checkbox" class="switch" data-bind="pinned" ${F.pinned ? 'checked' : ''}> ${t('Pinned')}</label>
    <div class="card" style="margin-top:14px"><label class="row"><input type="checkbox" class="switch" data-a2="polltoggle" ${F.poll ? 'checked' : ''}> <b>🗳️ ${t('Add a vote')}</b></label>
      ${F.poll ? `<p class="small muted" style="margin:6px 0">${t('Everyone picks one option. They can change it any time. You see who chose what.')}</p>
        ${F.poll.map((o, i) => `<div class="popted"><div class="row"><span class="stepn">${i + 1}</span><input class="i grow" data-bind="poll.${i}.text" value="${esc(o.text)}" placeholder="${t('Option')} ${i + 1}">${F.poll.length > 2 ? `<button class="btn danger sm" data-a="pollrm" data-k="${i}">×</button>` : ''}</div>
          <input class="i" style="margin-top:6px" data-bind="poll.${i}.price" value="${esc(o.price)}" placeholder="${t('Price (optional), e.g. about $3,000')}">
          <div class="row wrap-r" style="gap:6px;margin-top:6px">${o.photos.map((x, j) => `<div class="pthumb">${pthumb(x)}<button data-a="pollphrm" data-k="${i}" data-v="${j}">×</button></div>`).join('')}
            <button class="btn ghost sm" data-a="pollph" data-k="${i}">${ico('cam', 16)} ${t('Add photos')}</button></div></div>`).join('')}
        <button class="btn ghost sm" style="margin-top:6px" data-a="polladd">${ico('plus', 16)} ${t('Add option')}</button>${id ? `<p class="small muted">${t('Changing the options keeps the votes by number.')}</p>` : ''}` : ''}</div>
    <label class="f"><span>👁️ ${t('Who can see this announcement')}</span></label>${audiencePicker('audience')}
    <div class="actions">${id ? `<button class="btn danger" data-a="delann">${t('Delete')}</button>` : ''}<button class="btn" data-a="saveann">${t('Save')}</button></div>`);
}
/* day */
function daySheet(day) {
  const d = D().days.find(x => x.day === day) || {};
  F = { day, title: d.title || '', brief: d.brief || '', meet_time: d.meet_time || '', meet_place: d.meet_place || '', wear: d.wear || '', bring: d.bring || '', cover: d.cover || '' };
  openSheet(() => `${sheetHead(t('Edit day') + ' · ' + fmtDay(day))}
    ${field(t('Title'), inp('title', F.title))}
    ${field(t('Brief'), txt('brief', F.brief, 'rows="5"'))}
    <div class="two">${field(t('Meeting time'), inp('meet_time', F.meet_time, 'placeholder="08:00"'))}${field(t('Meeting point'), inp('meet_place', F.meet_place))}</div>
    ${field(t('What to wear'), inp('wear', F.wear))}${field(t('What to bring'), inp('bring', F.bring))}
    ${coverPicker(D().photos.filter(p => p.day === day), { day })}
    <div class="actions"><button class="btn" data-a="saveday">${t('Save')}</button></div>`);
}
function coverPicker(photos, ctx) {
  return `<label class="f"><span>${t('Cover photo')}</span></label>
    ${F.cover ? `<div class="day-cover" style="margin:0 0 8px">${pimg(F.cover)}</div>` : ''}
    <div class="row wrap-r" style="gap:6px"><button class="btn sec sm" data-a="uploadcover" data-ctx='${esc(JSON.stringify(ctx))}'>${ico('cam', 16)} ${t('Upload photo')}</button>
    ${F.cover ? `<button class="btn danger sm" data-a="pickcover" data-k="">${t('Remove cover')}</button>` : ''}</div>
    ${photos.length ? `<div class="small muted" style="margin-top:8px">${t('Choose from photos')}</div><div class="gallery" style="margin-top:4px">${photos.slice(0, 12).map(p => `<div class="g" data-a="pickcover" data-k="${p.id}" style="${p.id === F.cover ? 'outline:3px solid var(--brand)' : ''}">${pimg(p.id)}</div>`).join('')}</div>` : ''}`;
}
/* itinerary item */
function itemSheet(id, preset = {}) {
  const i = D().itinerary.find(x => x.id === id) || Object.assign({ day: trip().start, time: '', title: '', details: '', place: '', place_id: '' }, preset);
  F = { id: i.id || '', day: i.day, time: i.time, title: i.title, details: i.details, place: i.place, place_id: i.place_id || '' };
  openSheet(() => `${sheetHead(id ? t('Edit') : t('Add activity'))}
    <div class="two">${field(t('Day'), `<select class="i" data-bind="day">${tripDays().map((d, n) => `<option value="${d}" ${F.day === d ? 'selected' : ''}>${n + 1} · ${fmtDay(d)}</option>`).join('')}</select>`)}
    ${field(t('Time'), inp('time', F.time, 'type="time"'))}</div>
    ${field(t('Title'), inp('title', F.title))}${field(t('Details'), txt('details', F.details))}
    ${field(t('Place'), `<select class="i" data-bind="place_id"><option value="">—</option>${D().places.map(p => `<option value="${p.id}" ${F.place_id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`)}
    ${field(t('Location note'), inp('place', F.place))}
    <div class="actions">${id ? `<button class="btn danger" data-a="delitem">${t('Delete')}</button>` : ''}<button class="btn" data-a="saveitem">${t('Save')}</button></div>`);
}
/* place */
const PLACE_FIELDS = [['address', '📍', 'Address'], ['hours', '🕘', 'Opening hours'], ['price', '🎟️', 'Tickets & prices'], ['phone', '📞', 'Phone'],
  ['website', '🌐', 'Website'], ['booking', '🧾', 'Booking / reservation'], ['duration', '⏱️', 'How long we stay'], ['best_time', '🌤️', 'Best time to go'],
  ['getting_there', '🚐', 'How we get there'], ['dress', '👗', 'Dress code'], ['bring', '🎒', 'What to bring'], ['kids', '🧒', 'For the kids'],
  ['food', '🍽️', 'Food & drinks'], ['accessibility', '♿', 'Walking / accessibility'], ['rules', '⚠️', 'Rules & warnings'], ['contact', '🙋', 'Our contact person']];
function detailValue(k, v) {
  if (k === 'phone') return v.split(/[,\n]/).map(x => x.trim()).filter(Boolean).map(x => `<a href="tel:${esc(x.replace(/[^+\d]/g, ''))}">${esc(x)}</a>`).join(', ');
  if (k === 'website' && /^https?:/.test(v)) return `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, ''))}</a>`;
  if (k === 'address') return `${nl2br(v)} · <a href="https://maps.google.com/?q=${encodeURIComponent(v)}" target="_blank" rel="noopener">${t('Map')}</a>`;
  return linkify(v);
}
function placeSheet(id) {
  sheetRender = null; F = null;
  openSheet(() => {
    const p = D().places.find(x => x.id === id); if (!p) return sheetHead('—');
    const photos = D().photos.filter(x => x.place_id === id); const cover = p.cover || photos[0]?.id;
    const when = D().itinerary.filter(i => i.place_id === id);
    return `${sheetHead(esc(p.name))}
      ${cover ? `<div class="day-cover" style="height:220px;margin:0" data-a="lightbox" data-list="place:${id}" data-i="${Math.max(0, photos.findIndex(x => x.id === cover))}">${pimg(cover)}</div>` : ''}
      <p class="muted small" style="margin:10px 0 0">📍 ${esc(p.city)}</p>
      ${p.summary ? `<p style="font-size:17px">${linkify(trT(p.summary))}</p>` : ''}${trBtn(p.summary, p.info)}
      ${(() => { const dt = p.details || {}; const rows = PLACE_FIELDS.filter(([k]) => (dt[k] || '').trim()).map(([k, ic, l]) => `<div class="li" style="align-items:flex-start"><span style="font-size:20px">${ic}</span><div class="grow"><div class="small muted" style="font-weight:700">${t(l)}</div><div class="pre">${detailValue(k, dt[k])}</div></div></div>`);
        (dt.fields || []).filter(f => (f.label || f.value)).forEach(f => rows.push(`<div class="li" style="align-items:flex-start"><span style="font-size:20px">▪️</span><div class="grow"><div class="small muted" style="font-weight:700">${esc(f.label)}</div><div class="pre">${linkify(f.value)}</div></div></div>`));
        return rows.length ? `<div class="card list">${rows.join('')}</div>` : ''; })()}
      ${p.info ? `<div class="card"><b>💡 ${t('Good to know')}</b><div class="pre" style="margin-top:4px">${linkify(trT(p.info))}</div></div>` : ''}
      ${(p.details?.links || []).filter(l => l.url).length ? `<div class="card"><b>🔗 ${t('Links')}</b>${p.details.links.filter(l => l.url).map(l => `<div style="margin-top:6px"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)}</a></div>`).join('')}</div>` : ''}
      ${when.length ? `<div class="card"><b>🗓️ ${t('When we go')}</b>${when.map(i => `<div class="small" style="margin-top:4px">${fmtDay(i.day)} ${esc(i.time)} · ${esc(i.title)}</div>`).join('')}</div>` : ''}
      <div class="row wrap-r" style="gap:6px;margin:10px 0">
        ${p.map_url ? `<a class="btn sec sm" href="${esc(p.map_url)}" target="_blank" rel="noopener">${ico('map', 16)} ${t('Open in Maps')}</a>` : ''}
        ${can('add_photos') ? `<button class="btn sec sm" data-a="addphotos" data-place="${id}">${ico('cam', 16)} ${t('Add photos')}</button>` : ''}
        ${can('edit_places') ? `<button class="btn sec sm" data-a="editplace" data-k="${id}">${ico('edit', 16)} ${t('Edit')}</button>` : ''}
      </div>
      <h3>${t('Photos')} (${photos.length})</h3>
      ${photos.length ? `<div class="gallery">${photos.map((x, i) => `<div class="g" data-a="lightbox" data-list="place:${id}" data-i="${i}">${pimg(x.id)}</div>`).join('')}</div>` : `<p class="muted small">${t('No photos yet.')}</p>`}`;
  });
}
function placeEditSheet(id) {
  const p = D().places.find(x => x.id === id) || { name: '', city: '', summary: '', info: '', map_url: '', cover: '', sort: D().places.length + 1 };
  const dt = Object.assign({}, p.details || {}); dt.fields = [...(dt.fields || [])]; dt.links = [...(dt.links || [])];
  F = { id: p.id || '', name: p.name, city: p.city, summary: p.summary, info: p.info, map_url: p.map_url, cover: p.cover || '', sort: p.sort, details: dt };
  openSheet(() => `${sheetHead(id ? t('Edit') : t('New place'))}
    ${field(t('Name'), inp('name', F.name))}${field(t('City'), inp('city', F.city, 'list="cities"'))}
    <datalist id="cities">${[...new Set(D().places.map(p => p.city))].map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    ${field(t('Short description'), txt('summary', F.summary, 'rows="3"'))}${field(t('Good to know'), txt('info', F.info, 'rows="5"'))}
    ${field(t('Map link'), inp('map_url', F.map_url, 'type="url" placeholder="https://maps.google.com/…"'))}
    <h3 style="margin-top:18px">📋 ${t('Details')} <span class="small muted">${t('(leave empty what you do not need)')}</span></h3>
    ${PLACE_FIELDS.map(([k, ic, l]) => field(ic + ' ' + t(l), ['address', 'hours', 'price', 'getting_there', 'bring', 'kids', 'food', 'rules', 'booking'].includes(k) ? txt('details.' + k, F.details[k], 'rows="2"') : inp('details.' + k, F.details[k]))).join('')}
    <h3 style="margin-top:18px">➕ ${t('Your own fields')}</h3>
    ${F.details.fields.map((f, n) => `<div class="item-row"><div class="row"><input class="i grow" placeholder="${t('Label')}" data-bind="details.fields.${n}.label" value="${esc(f.label)}"><button class="icon-btn" data-a="delfield" data-n="${n}">${ico('x', 16)}</button></div>
      <textarea class="i" style="margin-top:6px;min-height:60px" placeholder="${t('Value')}" data-bind="details.fields.${n}.value">${esc(f.value)}</textarea></div>`).join('')}
    <button class="btn sec sm" style="margin-top:8px" data-a="addfield">${ico('plus', 16)} ${t('Add field')}</button>
    <h3 style="margin-top:18px">🔗 ${t('Links')}</h3>
    ${F.details.links.map((l, n) => `<div class="item-row"><div class="row"><input class="i grow" placeholder="${t('Label')}" data-bind="details.links.${n}.label" value="${esc(l.label)}"><button class="icon-btn" data-a="dellink" data-n="${n}">${ico('x', 16)}</button></div>
      <input class="i" style="margin-top:6px" type="url" placeholder="https://…" data-bind="details.links.${n}.url" value="${esc(l.url)}"></div>`).join('')}
    <button class="btn sec sm" style="margin-top:8px" data-a="addlink">${ico('plus', 16)} ${t('Add link')}</button>
    ${id ? coverPicker(D().photos.filter(x => x.place_id === id), { place_id: id }) : ''}
    <div class="actions">${id ? `<button class="btn danger" data-a="delplace">${t('Delete')}</button>` : ''}<button class="btn" data-a="saveplace">${t('Save')}</button></div>`);
}
/* lightbox */
function photoList(key) {
  if (key === 'all') return D().photos;
  const [k, v] = key.split(':'); return D().photos.filter(p => (k === 'day' ? p.day === v : p.place_id === v));
}
function lightbox(key, i) {
  const list = photoList(key); const p = list[i]; if (!p) return;
  const root = document.createElement('div'); root.className = 'lightbox';
  const pl = p.place_id && D().places.find(x => x.id === p.place_id);
  root.innerHTML = `<div class="row between" style="padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;color:#fff">
      <span class="small">${i + 1} / ${list.length}</span><button class="icon-btn" data-lb="x" style="background:#333;color:#fff">${ico('x', 18)}</button></div>
    <img data-photo="${p.id}" alt="">
    <div class="cap"><div class="grow small">${p.caption ? esc(p.caption) + '<br>' : ''}${esc(nameOf(p.author))} · ${ago(p.created_at)}${pl ? ' · 📍 ' + esc(pl.name) : ''}${p.day ? ' · ' + fmtDay(p.day) : ''}</div>
      ${i > 0 ? `<button class="icon-btn" data-lb="prev" style="background:#333;color:#fff"><span class="flip">‹</span></button>` : ''}
      ${i < list.length - 1 ? `<button class="icon-btn" data-lb="next" style="background:#333;color:#fff"><span class="flip">›</span></button>` : ''}
      ${p.author === me() || isAdmin() ? `<button class="btn danger sm" data-lb="del">${t('Delete')}</button>` : ''}</div>`;
  document.body.appendChild(root); hydratePhotos(root);
  let x0 = null; root.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; const rtl = S.lang === 'ar';
    if (Math.abs(dx) > 60) { const next = (dx < 0) !== rtl ? i + 1 : i - 1; if (list[next]) { root.remove(); lightbox(key, next); } } x0 = null; });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-lb]'); if (!b) return; const k = b.dataset.lb; root.remove();
    if (k === 'prev') lightbox(key, i - 1); if (k === 'next') lightbox(key, i + 1);
    if (k === 'del') confirmSheet(t('Delete') + '?', async () => { await act('delete_photo', { id: p.id }, 'Deleted'); });
  });
}
/* ideas */
function ideaSheet() {
  F = { title: '', body: '', day: '', mode: 'group', visibility: 'public' };
  const opt = (k, v, icon, label, sub) => `<div class="card tap" data-a="ideaopt" data-k="${k}" data-v="${v}" style="margin:6px 0;${F[k] === v ? 'border-color:var(--brand);box-shadow:0 0 0 2px var(--brand)' : ''}">
    <div class="row"><span style="font-size:24px">${icon}</span><div class="grow"><b>${t(label)}</b>${sub ? `<div class="small muted">${t(sub)}</div>` : ''}</div>${F[k] === v ? '✅' : ''}</div></div>`;
  const n = x => `<span class="stepn">${x}</span>`;
  openSheet(() => `${sheetHead('💡 ' + t('Suggest a place'))}
    <p class="small muted" style="margin:0 0 4px">${t('Four quick questions. It takes less than a minute.')}</p>
    ${field(n(1) + t('Where do you want to go?'), inp('title', F.title, 'placeholder="e.g. Dolphin House, El Gouna, Al-Azhar Park"'))}
    ${field(n(2) + t('Why do you want to go?'), txt('body', F.body, `rows="3" placeholder="${t('e.g. The kids would love to see the dolphins')}"`))}
    <label class="f"><span>${n(3)}${t('Alone or with a group?')}</span></label>
    <div class="two">${opt('mode', 'alone', '🧍', 'Alone')}${opt('mode', 'group', '👨‍👩‍👧', 'With a group')}</div>
    <label class="f"><span>${n(4)}${t('Who should see it?')}</span></label>
    ${opt('visibility', 'public', '👥', 'Everyone', 'The family can see it, support it and comment')}
    ${opt('visibility', 'private', '🔒', 'Only the organizer', 'A private request just for the organizer')}
    ${field('🗓️ ' + t('For which day? (optional)'), `<select class="i" data-bind="day"><option value="">${t('Any day')}</option>${tripDays().map(d => `<option value="${d}" ${F.day === d ? 'selected' : ''}>${fmtDay(d)}</option>`).join('')}</select>`)}
    <div class="actions"><button class="btn" data-a="saveidea">🚀 ${t('Send my idea')}</button></div>`);
}
function ideaReplySheet(id) {
  const s0 = D().suggestions.find(x => x.id === id); F = { id, status: s0.status, reply: s0.reply || '' };
  const st = { open: 'Open', planned: 'Planned', declined: 'Declined' };
  openSheet(() => `${sheetHead(esc(s0.title))}
    <div class="chips wrapc">${Object.keys(st).map(k => `<span class="chip ${F.status === k ? 'on' : ''}" data-a="ideastatus" data-k="${k}">${t(st[k])}</span>`).join('')}</div>
    ${field(t('Your reply (everyone who can see the idea will read it)'), txt('reply', F.reply))}
    <div class="actions"><button class="btn" data-a="saveideareply">${t('Save')}</button></div>`);
}
/* expenses */
function expenseForm(id) {
  const e = D().expenses.find(x => x.id === id);
  const everyone = D().members.map(m => m.id);
  if (e) {
    const sp = e.split || {};
    F = { id: e.id, title: e.title, amount: String(e.amount), currency: e.currency, category: e.category, paid_by: e.paid_by, spent_on: e.spent_on, note: e.note, method: e.method || '', receipt: e.receipt || '',
      mode: sp.mode || 'exact', people: sp.people || Object.keys(e.shares), weights: sp.weights || {}, items: sp.items || [{ name: '', price: '', people: [] }],
      exact: sp.exact || Object.fromEntries(Object.entries(e.shares).map(([k, v]) => [k, String(v)])) };
    if (F.mode === 'items' && !sp.total) F.amount = '';
  } else {
    const td = today();
    F = { id: '', title: '', amount: '', currency: LS.get('lastCur', 'EGP'), category: 'food', paid_by: me(), spent_on: td, note: '', method: LS.get('lastMethod', 'cash'), receipt: '',
      mode: 'equal', people: everyone, weights: Object.fromEntries(everyone.map(i => [i, 1])), items: [{ name: '', price: '', people: [] }], exact: {} };
  }
  openSheet(expenseFormView);
}
function personChips(selected, act, extra = '') {
  return `<div class="chips wrapc">${D().members.map(m => `<span class="chip ${selected.includes(m.id) ? 'on' : ''}" data-a="${act}" data-k="${m.id}" ${extra}>${esc(m.name.split(' ')[0])}</span>`).join('')}</div>`;
}
function expenseFormView() {
  const houses = [...new Set(D().members.map(m => m.household).filter(Boolean))];
  let modeBody = '';
  if (F.mode === 'equal' || F.mode === 'weights') {
    modeBody = `<div class="chips wrapc" style="margin-top:8px"><span class="chip" data-a="ppl" data-k="__all">✓ ${t('Everyone')}</span><span class="chip" data-a="ppl" data-k="__none">${t('Nobody')}</span>
      ${houses.map(h => `<span class="chip" data-a="ppl" data-k="h:${esc(h)}">👪 ${esc(h)}</span>`).join('')}</div>
      ${F.mode === 'equal' ? personChips(F.people, 'ppl') :
      D().members.map(m => `<div class="split-person"><input type="checkbox" class="switch" data-a2="pplbox" data-k="${m.id}" ${F.people.includes(m.id) ? 'checked' : ''}>
        <span class="grow">${esc(m.name)}</span><span class="small muted">${t('Weight')}</span><input class="i" style="width:80px" inputmode="decimal" data-bind="weights.${m.id}" value="${esc(F.weights[m.id] ?? 1)}"></div>`).join('')}`;
  } else if (F.mode === 'items') {
    modeBody = F.items.map((it, n) => `<div class="item-row">
      <div class="row"><input class="i grow" placeholder="${t('Item')}" data-bind="items.${n}.name" value="${esc(it.name)}">
      <input class="i" style="width:110px" placeholder="${t('Price')}" inputmode="decimal" data-bind="items.${n}.price" value="${esc(it.price)}">
      <button class="icon-btn" data-a="delitemrow" data-k="${n}">${ico('x', 16)}</button></div>
      <div class="chips wrapc" style="margin-top:6px"><span class="chip" data-a="itemppl" data-n="${n}" data-k="__all">${t('Everyone')}</span>
      ${D().members.map(m => `<span class="chip ${it.people.includes(m.id) ? 'on' : ''}" data-a="itemppl" data-n="${n}" data-k="${m.id}">${esc(m.name.split(' ')[0])}</span>`).join('')}</div></div>`).join('') +
      `<button class="btn sec sm" style="margin-top:8px" data-a="additemrow">${ico('plus', 16)} ${t('Add item')}</button>`;
  } else {
    modeBody = D().members.map(m => `<div class="split-person"><span class="grow">${esc(m.name)}</span><input class="i" style="width:120px" inputmode="decimal" placeholder="0" data-bind="exact.${m.id}" value="${esc(F.exact[m.id] ?? '')}"></div>`).join('');
  }
  return `${sheetHead(F.id ? t('Edit') : t('Add expense'))}
    ${field(t('Title'), inp('title', F.title, 'placeholder="Dinner at the marina"'))}
    <div class="two">${field(F.mode === 'items' ? t('Bill total incl. tax, service and tip (optional)') : t('Amount'), inp('amount', F.amount, 'inputmode="decimal" placeholder="0"'))}
    ${field(t('Currency'), `<select class="i" data-bind="currency">${CURS.map(c => `<option ${F.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}</div>
    <div class="two">${field(t('Paid by'), `<select class="i" data-bind="paid_by">${D().members.map(m => `<option value="${m.id}" ${F.paid_by === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>`)}
    ${field(t('Date'), inp('spent_on', F.spent_on, 'type="date"'))}</div>
    ${field('💳 ' + t('Payment method'), `<div class="chips wrapc">${Object.entries(METHODS).map(([k, [ic, l]]) => `<span class="chip ${F.method === k ? 'on' : ''}" data-a="method" data-k="${k}">${ic} ${t(l)}</span>`).join('')}</div>`)}
    <label class="f"><span>🧾 ${t('Receipt photo')}</span></label>
    <div class="row">${F.receipt ? `<div class="g" style="width:72px;height:72px;border-radius:10px;overflow:hidden" data-a="receiptview" data-k="${F.receipt}">${pimg(F.receipt)}</div>` : ''}
      <button class="btn sec sm" data-a="receipt">${ico('cam', 16)} ${F.receipt ? t('Change photo') : t('Add receipt')}</button>${F.receipt ? `<button class="btn danger sm" data-a="rmreceipt">${t('Remove')}</button>` : ''}</div>
    ${field(t('Category'), `<div class="chips wrapc">${Object.keys(CATS).map(k => `<span class="chip ${F.category === k ? 'on' : ''}" data-a="cat" data-k="${k}">${CATS[k]} ${t(CAT_NAME[k])}</span>`).join('')}</div>`)}
    <label class="f"><span>${t('Split')}</span></label>
    <div class="seg" style="margin-top:0">${[['equal', 'Equally'], ['items', 'Who ate what'], ['weights', 'By shares'], ['exact', 'Exact amounts']].map(([k, l]) => `<button class="${F.mode === k ? 'on' : ''}" data-a="mode" data-k="${k}" style="font-size:13px;padding:8px 2px">${t(l)}</button>`).join('')}</div>
    ${modeBody}
    ${field(t('Note'), inp('note', F.note))}
    <div id="preview">${previewHtml()}</div>
    <div class="actions">${F.id ? `<button class="btn danger" data-a="delexpense">${t('Delete')}</button>` : ''}<button class="btn" data-a="saveexpense">${t('Save')}</button></div>`;
}
function previewHtml() {
  const r = computeSplit(F);
  const rows = r.shares ? Object.entries(r.shares).sort((a, b) => b[1] - a[1]) : [];
  return `<div class="card" style="margin-top:14px"><div class="row between"><b>${t('Each person pays')}</b><b>${money((r.total || 0) / 100, F.currency)}</b></div>
    ${r.info ? `<div class="small muted" style="margin-top:4px">${esc(r.info)}</div>` : ''}
    ${r.error ? `<div class="small bad" style="margin-top:4px">${esc(r.error)}</div>` : ''}
    <div class="list">${rows.map(([id, c]) => `<div class="li" style="padding:6px 0">${avatar(id)}<span class="grow">${esc(nameOf(id))}</span><span class="amount">${money(c / 100, F.currency)}</span></div>`).join('')}</div></div>`;
}
function expenseSheet(id) {
  sheetRender = null; F = null;
  openSheet(() => {
    const e = D().expenses.find(x => x.id === id); if (!e) return sheetHead('—');
    const canEdit = isAdmin() || [e.created_by, e.paid_by].includes(me());
    const sp = e.split || {};
    return `${sheetHead(`${CATS[e.category] || ''} ${esc(e.title)}`)}
      <div class="card"><div class="money-big">${money(e.amount, e.currency)}</div>
      <div class="small muted">${e.currency !== S.cur ? '≈ ' + money(fromBase(toBase(e.amount, e.currency))) + ' · ' : ''}${fmtDay(e.spent_on, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <div class="row" style="margin-top:8px">${avatar(e.paid_by)}<div class="grow">${t('Paid by')}: <b>${esc(nameOf(e.paid_by))}</b>${e.method && METHODS[e.method] ? `<div class="small muted">${METHODS[e.method][0]} ${t(METHODS[e.method][1])}</div>` : ''}</div></div>
      ${e.receipt ? `<div class="day-cover" style="margin-top:10px;height:180px;cursor:pointer" data-a="receiptview" data-k="${e.receipt}">${pimg(e.receipt)}</div>` : ''}${e.note ? `<div class="small pre" style="margin-top:4px">${linkify(e.note)}</div>` : ''}</div>
      ${sp.mode === 'items' && sp.items ? `<div class="card"><b>🧾 ${t('Who ate what')}</b>${sp.items.filter(i => num(i.price)).map(i => `<div class="row small" style="margin-top:6px"><span class="grow">${esc(i.name || t('Item'))} <span class="muted">· ${i.people.map(p => esc(nameOf(p).split(' ')[0])).join(', ')}</span></span><b>${money(num(i.price), e.currency)}</b></div>`).join('')}</div>` : ''}
      <div class="card list">${Object.entries(e.shares).sort((a, b) => b[1] - a[1]).map(([pid, v]) => `<div class="li">${avatar(pid)}<span class="grow">${esc(nameOf(pid))}</span><span class="amount">${money(v, e.currency)}</span>
        ${isAdmin() || e.paid_by === me() ? billLinks(pid, billText(e, pid)) : ''}</div>`).join('')}</div>
      ${canEdit ? `<div class="actions"><button class="btn sec" data-a="expenseform" data-k="${e.id}">${t('Edit')}</button></div>` : ''}`;
  });
}
function billText(e, pid) {
  const v = e.shares[pid];
  return { subject: `${t('Bill for')} ${e.title} · ${trip().name}`,
    body: `${t('Hi {a},', { a: nameOf(pid).split(' ')[0] })}\n\n${e.title} (${fmtDay(e.spent_on)})\n${t('Total')}: ${money(e.amount, e.currency)} · ${t('Paid by')}: ${nameOf(e.paid_by)}\n${t('your share')}: ${money(v, e.currency)}${e.currency !== 'JOD' ? ` (≈ ${money(fromBase(toBase(v, e.currency), 'JOD'), 'JOD')})` : ''}\n\n— ${trip().name}` };
}
function billLinks(pid, b) {
  const m = member(pid); const mail = `mailto:${encodeURIComponent(m?.email || '')}?subject=${encodeURIComponent(b.subject)}&body=${encodeURIComponent(b.body)}`;
  return `<a class="icon-btn" href="${mail}" title="${t('Email')}${m?.email ? '' : ' (' + t('No email saved') + ')'}" style="text-decoration:none">✉️</a>
    <a class="icon-btn" href="https://wa.me/?text=${encodeURIComponent(b.body)}" target="_blank" rel="noopener" title="${t('WhatsApp')}" style="text-decoration:none">💬</a>`;
}
/* statements */
function statementData(pid) {
  const lines = D().expenses.filter(e => e.shares[pid] || e.paid_by === pid).slice().sort((a, b) => a.spent_on < b.spent_on ? -1 : 1);
  const b = balances()[pid] || { paid: 0, share: 0, sent: 0, recv: 0, net: 0 };
  const tr = can('money_all') ? transfers(Object.fromEntries(Object.entries(balances()).map(([k, v]) => [k, v.net]))).filter(x => x.from === pid || x.to === pid) : [];
  const settl = D().settlements.filter(s => s.from_member === pid || s.to_member === pid);
  return { lines, b, tr, settl };
}
function statementText(pid) {
  const { lines, b, tr, settl } = statementData(pid); const C = 'JOD';
  let s = `${t('Hi {a},', { a: nameOf(pid).split(' ')[0] })}\n\n${t('Statement')} · ${trip().name}\n\n`;
  for (const e of lines) s += `${fmtDay(e.spent_on)} · ${e.title}: ${e.shares[pid] ? money(e.shares[pid], e.currency) : '—'}${e.paid_by === pid ? ` (${t('paid')} ${money(e.amount, e.currency)})` : ''}\n`;
  for (const x of settl) s += `${t('Payment history')}: ${nameOf(x.from_member)} → ${nameOf(x.to_member)} ${money(x.amount, x.currency)}\n`;
  s += `\n${t('Total share')}: ${money(fromBase(b.share, C), C)}\n${t('Total paid')}: ${money(fromBase(b.paid, C), C)}\n${t('Net')}: ${b.net >= 0 ? '+' : '−'}${money(Math.abs(fromBase(b.net, C)), C)}\n`;
  for (const x of tr) s += x.from === pid ? `\n👉 ${t('Pay {a} to {b}', { a: money(fromBase(x.amount, C), C), b: nameOf(x.to) })} (≈ ${money(fromBase(x.amount, 'EGP'), 'EGP')})` : `\n👉 ${t('{a} pays you {b}', { a: nameOf(x.from), b: money(fromBase(x.amount, C), C) })}`;
  return s + `\n\n— ${trip().name}`;
}
function statementSheet(pid) {
  sheetRender = null; F = null;
  openSheet(() => {
    const { lines, b, tr } = statementData(pid); const m = member(pid);
    const subj = `${t('Statement')} · ${trip().name} · ${nameOf(pid)}`; const body = statementText(pid);
    return `${sheetHead(t('Statement') + ' · ' + esc(nameOf(pid)))}
      <div class="card statement"><table>
      ${lines.map(e => `<tr><td>${fmtDay(e.spent_on)}<br><span class="muted">${esc(e.title)}${e.paid_by === pid ? ` · ${t('paid')} ${money(e.amount, e.currency)}` : ''}</span></td><td>${e.shares[pid] ? money(e.shares[pid], e.currency) : '—'}</td></tr>`).join('')}
      <tr><td><b>${t('Total share')}</b></td><td><b>${money(fromBase(b.share))}</b></td></tr>
      <tr><td><b>${t('Total paid')}</b></td><td><b>${money(fromBase(b.paid))}</b></td></tr>
      ${b.sent ? `<tr><td>${t('Payments sent')}</td><td>${money(fromBase(b.sent))}</td></tr>` : ''}${b.recv ? `<tr><td>${t('Payments received')}</td><td>${money(fromBase(b.recv))}</td></tr>` : ''}
      <tr><td><b>${t('Net')}</b></td><td class="${b.net >= 0 ? 'good' : 'bad'}"><b>${b.net >= 0 ? '+' : '−'}${money(Math.abs(fromBase(b.net)))}</b></td></tr></table>
      ${tr.map(x => `<p style="margin:10px 0 0"><b>👉 ${x.from === pid ? t('Pay {a} to {b}', { a: money(fromBase(x.amount)), b: esc(nameOf(x.to)) }) : t('{a} pays you {b}', { a: esc(nameOf(x.from)), b: money(fromBase(x.amount)) })}</b></p>`).join('')}</div>
      <div class="row wrap-r no-print" style="gap:6px">
        <a class="btn sm" href="mailto:${encodeURIComponent(m?.email || '')}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}">✉️ ${t('Email')}</a>
        <a class="btn sec sm" href="https://wa.me/?text=${encodeURIComponent(body)}" target="_blank" rel="noopener">💬 ${t('WhatsApp')}</a>
        <button class="btn sec sm" data-a="copy" data-text="${esc(body)}">📋 ${t('Copy')}</button>
        <button class="btn sec sm" data-a="print">🖨️ ${t('Print')}</button></div>
      ${!m?.email && isAdmin() ? `<p class="small muted">${t('No email saved')}</p>` : ''}`;
  });
}
function finalBillsSheet() {
  sheetRender = null; F = null;
  openSheet(() => {
    const b = balances();
    return `${sheetHead(t('Final statements'))}<div class="card list">${D().members.map(m => {
      const n = b[m.id]?.net || 0; const subj = `${t('Statement')} · ${trip().name}`;
      return `<div class="li">${avatar(m.id)}<div class="grow"><b>${esc(m.name)}</b><div class="small ${n > 0.005 ? 'good' : n < -0.005 ? 'bad' : 'muted'}">${n >= 0 ? '+' : '−'}${money(Math.abs(fromBase(n)))}</div><div class="small muted">${esc(m.email || t('No email saved'))}</div></div>
        <button class="btn ghost sm" data-a="statement" data-k="${m.id}">${t('Statement')}</button>
        <a class="icon-btn" style="text-decoration:none" href="mailto:${encodeURIComponent(m.email || '')}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(statementText(m.id))}">✉️</a></div>`;
    }).join('')}</div>`;
  });
}
function settleSheet(from, to, amt) {
  F = { from: from || me(), to: to || D().members.find(m => m.id !== (from || me()))?.id, amount: amt || '', currency: S.cur, note: '' };
  openSheet(() => `${sheetHead(t('Record payment'))}
    <div class="two">${field(t('From'), `<select class="i" data-bind="from">${D().members.map(m => `<option value="${m.id}" ${F.from === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>`)}
    ${field(t('To'), `<select class="i" data-bind="to">${D().members.map(m => `<option value="${m.id}" ${F.to === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>`)}</div>
    <div class="two">${field(t('Amount'), inp('amount', F.amount, 'inputmode="decimal"'))}${field(t('Currency'), `<select class="i" data-bind="currency">${CURS.map(c => `<option ${F.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}</div>
    ${field(t('Note'), inp('note', F.note, 'placeholder="Cash / CliQ / bank"'))}
    <div class="actions"><button class="btn" data-a="savesettle">${t('Mark as paid')}</button></div>`);
}
/* members & permissions */
const PERMS = [['view_plan', 'See the plan'], ['view_places', 'See places'], ['view_photos', 'See photos'], ['view_ideas', 'See ideas'], ['view_money', 'See money'],
  ['money_all', "See everyone's money (off = only their own)"], ['add_expense', 'Add expenses'], ['suggest', 'Suggest ideas'], ['comment', 'Comment'], ['add_photos', 'Upload photos'],
  ['edit_plan', 'Edit plan and briefs'], ['edit_places', 'Edit places'], ['announce', 'Post announcements']];
function memberSheet(id) {
  const m = D().members.find(x => x.id === id) || { name: '', username: '', household: '', email: '', role: 'member', perms: {} };
  F = { id: m.id || '', name: m.name, username: m.username, household: m.household, email: m.email || '', role: m.role, password: '',
    perms: Object.fromEntries(PERMS.map(([k]) => [k, canM({ role: 'member', perms: m.perms || {} }, k)])) };
  const houses = [...new Set(D().members.map(x => x.household).filter(Boolean))];
  openSheet(() => `${sheetHead(id ? esc(m.name) : t('Add member'))}
    ${id ? `<div class="row" style="margin-top:6px">${avatar(id, 'lg')}<button class="btn sec sm" data-a="memberavatar" data-k="${id}">📸 ${member(id)?.avatar ? t('Change photo') : t('Add photo')}</button>
      ${member(id)?.avatar ? `<button class="btn danger sm" data-a="rmavatar" data-k="${id}">${t('Remove')}</button>` : ''}</div>` : ''}
    ${field(t('Name'), inp('name', F.name))}
    ${field(t('Username'), inp('username', F.username, `autocapitalize="none" spellcheck="false" ${id ? 'disabled' : ''}`))}
    ${field(id ? t('Set a new password (leave empty to keep)') : t('Password'), inp('password', F.password, 'type="text" autocomplete="off" placeholder="min 6"'))}
    ${field(t('Email'), inp('email', F.email, 'type="email" autocapitalize="none"'))}
    ${field(t('Family / household'), inp('household', F.household, 'list="houses" placeholder="e.g. Abu Ahmad family"'))}
    <datalist id="houses">${houses.map(h => `<option value="${esc(h)}">`).join('')}</datalist>
    ${isMain() || F.role === 'admin' ? `<label class="f"><span>${t('Role')}</span></label>` : ''}
    <div class="two" style="${isMain() ? '' : 'display:none'}">${[['member', '🙂', 'Family member', 'Sees what you allow below'], ['admin', '⭐', 'Co-organizer', 'Same powers as you']].map(([k, e, l, sub]) => `<div class="card tap opt ${F.role === k ? 'on' : ''}" data-a="setrole" data-k="${k}" style="margin:0"><div style="font-size:26px">${e}</div><b>${t(l)}</b><div class="small muted">${t(sub)}</div></div>`).join('')}</div>
    ${F.role === 'admin' ? `<p class="small muted">⭐ ${t('Co-organizers can do everything you can, except remove you.')}</p>` : `<h3 style="margin-top:16px">🔐 ${t('Permissions')}</h3>
      <div class="card" style="padding:4px 14px">${PERMS.map(([k, l]) => `<label class="perm"><span class="grow">${t(l)}</span><input type="checkbox" class="switch" data-bind="perms.${k}" ${F.perms[k] ? 'checked' : ''}></label>`).join('')}</div>`}
    <div class="actions">${id && id !== me() ? `<button class="btn danger" data-a="delmember">${t('Delete')}</button>` : ''}<button class="btn" data-a="savemember">${t('Save')}</button></div>`);
}
function tripSettingsSheet() {
  const th = theme(), tr = trip();
  F = { name: tr.name, start: tr.start, end: tr.end, welcome: th.welcome, color: th.color, cover: th.cover || '' };
  const sw = SWATCHES.map(x => x[0]);
  openSheet(() => `${sheetHead(t('Trip settings'))}
    ${field(t('Trip name'), inp('name', F.name))}
    <div class="two">${field(t('Start date'), inp('start', F.start, 'type="date"'))}${field(t('End date'), inp('end', F.end, 'type="date"'))}</div>
    ${field(t('Welcome message'), txt('welcome', F.welcome))}
    <label class="f"><span>${t('App color')}</span></label>
    <div class="row wrap-r">${sw.map(c => `<span class="swatch ${F.color === c ? 'on' : ''}" style="background:${c}" data-a="swatch" data-k="${c}"></span>`).join('')}
      <input type="color" data-bind="color" value="${esc(F.color)}" style="width:44px;height:40px;border:0;background:none"></div>
    ${coverPicker(D().photos, {})}
    <div class="actions"><button class="btn" data-a="savetrip">${t('Save')}</button></div>`);
}
function ratesSheet() {
  const r = rates(); F = { EGP: String(r.EGP), USD: String(r.USD) };
  openSheet(() => `${sheetHead(t('Exchange rates'))}<p class="muted">${t('1 JOD equals')}:</p>
    <div class="two">${field('EGP', inp('EGP', F.EGP, 'inputmode="decimal"'))}${field('USD', inp('USD', F.USD, 'inputmode="decimal"'))}</div>
    <div class="actions"><button class="btn" data-a="saverates">${t('Save')}</button></div>`);
}
function profileSheet() {
  F = { email: D().me.email || '' };
  openSheet(() => `${sheetHead(t('Profile'))}${field(t('Email'), inp('email', F.email, 'type="email" autocapitalize="none"'))}
    <div class="actions"><button class="btn" data-a="saveprofile">${t('Save')}</button></div>`);
}
function passwordSheet() {
  F = { old: '', new: '' };
  openSheet(() => `${sheetHead(t('Change password'))}${field(t('Current password'), inp('old', F.old, 'type="password" autocomplete="current-password"'))}
    ${field(t('New password'), inp('new', F.new, 'type="password" autocomplete="new-password"'))}
    <div class="actions"><button class="btn" data-a="savepassword">${t('Save')}</button></div>`);
}
function exportCsv() {
  const rows = [['date', 'title', 'category', 'amount', 'currency', 'paid_by', 'payment_method', 'note', ...D().members.map(m => m.name)]];
  for (const e of D().expenses) rows.push([e.spent_on, e.title, e.category, e.amount, e.currency, nameOf(e.paid_by), e.method || '', e.note || '', ...D().members.map(m => e.shares[m.id] ?? '')]);
  const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'trip-expenses.csv'; a.click();
}

/* ---------------- events ---------------- */
async function busy(btn, fn) { if (btn) { btn.disabled = true; } try { await fn(); } catch (e) { /* toast already shown */ } finally { if (btn) btn.disabled = false; } }
const H = {
  tab: el => { closeSheet(); S.tab = el.dataset.k; S.anim = true; LS.set('tab', S.tab); render(); scrollTo(0, 0); },
  translate: async el => {
    const g = el.dataset.k, list = TRQ[g] || [];
    if (S.trOn.has(g)) { S.trOn.delete(g); list.forEach(x => S.trOn.delete(hashS(x))); render(); rerenderSheet(); return; }
    el.disabled = true; el.textContent = '🌐 ' + t('Translating…');
    try {
      for (const x of list) { const k = hashS(x); if (!TR[k]) TR[k] = await translateText(x, isArabic(x) ? 'en' : 'ar'); S.trOn.add(k); }
      S.trOn.add(g); LS.set('tr', TR);
    } catch { toast(t('Translation is not available right now')); }
    render(); rerenderSheet();
  },
  preview: () => { S.preview = !S.preview; S.tab = 'home'; S.anim = true; closeSheet(); render(); scrollTo(0, 0); if (S.preview) toast('👁️ ' + t('This is what your family sees')); },
  annreact: el => { const a = D().announcements.find(x => x.id === el.dataset.k); const cur = (a.reactions || {})[me()]; const v = cur === el.dataset.v ? '' : el.dataset.v;
    a.reactions = Object.assign({}, a.reactions); if (v) a.reactions[me()] = v; else delete a.reactions[me()]; render();
    act('react_announcement', { id: a.id, emoji: v }).catch(() => {}); },
  anncomments: el => { const k = el.dataset.k; S.openAnn.has(k) ? S.openAnn.delete(k) : S.openAnn.add(k); render(); },
  delanncomment: el => { act('delete_ann_comment', { id: el.dataset.k }).catch(() => {}); },
  hint: el => { const h = LS.get('hints', {}); h[el.dataset.k] = 1; LS.set('hints', h); render(); },
  resethints: () => { LS.set('hints', {}); LS.del('hideStart'); toast('💡 ' + t('Tips are back on every screen')); render(); },
  hidestart: () => { LS.set('hideStart', true); toast(t('You can find the steps in the Organize tab')); render(); },
  party: () => confetti(),
  organizers: () => organizersSheet(),
  setrole: el => { F.role = el.dataset.k; rerenderSheet(); },
  lang: () => { S.lang = S.lang === 'ar' ? 'en' : 'ar'; LS.set('lang', S.lang); render(); rerenderSheet(); },
  setlang: el => { S.lang = el.dataset.k; LS.set('lang', S.lang); render(); },
  appearance: el => { LS.set('appearance', el.dataset.k); render(); },
  refresh: async () => { try { await refresh(); toast('✓'); } catch (e) { toast(errText(e)); } },
  logout: async () => { try { await api('logout'); } catch {} logoutLocal(); },
  goday: el => { S.tab = 'plan'; S.planDay = el.dataset.k; render(); scrollTo(0, 0); },
  planday: el => { S.planDay = el.dataset.k; render(); },
  planseg: el => { closeSheet(); S.tab = 'plan'; S.planSeg = el.dataset.k; S.anim = true; render(); scrollTo(0, 0); },
  pseg: el => { S.placesSeg = el.dataset.k; render(); },
  city: el => { S.city = el.dataset.k; render(); },
  isort: el => { S.ideasSort = el.dataset.k; render(); },
  mtab: el => { S.moneyTab = el.dataset.k; S.anim = true; render(); },
  fcat: el => { S.fCat = el.dataset.k; render(); },
  budget: () => budgetSheet(),
  savebudget: el => busy(el, async () => { const cats = {}; for (const k in F.cats) if (num(F.cats[k]) > 0) cats[k] = num(F.cats[k]); await act('save_setting', { key: 'budget', value: { total: num(F.total) || 0, currency: F.currency, cats } }, 'Saved'); closeSheet(); }),
  remind: el => shareText(remindText(el.dataset.from, el.dataset.to, el.dataset.amt)),
  remindall: () => { const tr = transfers(grouped(balances())); shareText('💰 ' + trip().name + '\n' + tr.map(x => `• ${labelOf(x.from)} → ${labelOf(x.to)}: ${money(fromBase(x.amount))}`).join('\n')); },
  cur: el => { S.cur = el.dataset.k; LS.set('cur', S.cur); render(); },
  toggleidea: el => { const k = el.dataset.k; S.openIdeas.has(k) ? S.openIdeas.delete(k) : S.openIdeas.add(k); render(); },
  vote: el => { const s = D().suggestions.find(x => x.id === el.dataset.k); const v = +el.dataset.v; act('vote', { id: s.id, value: (s.votes || {})[me()] === v ? 0 : v }).catch(() => {}); },
  like: el => { const s = D().suggestions.find(x => x.id === el.dataset.k); const v = (s.votes || {})[me()] === 1 ? 0 : 1; if (v) confetti(30); act('vote', { id: s.id, value: v }).catch(() => {}); },
  ifilter: el => { S.ideasFilter = el.dataset.k; render(); },
  ideaopt: el => { F[el.dataset.k] = el.dataset.v; rerenderSheet(); },
  ideareply: el => ideaReplySheet(el.dataset.k),
  ideastatus: el => { F.status = el.dataset.k; rerenderSheet(); },
  saveideareply: el => busy(el, async () => { await act('set_suggestion_status', F, 'Saved'); closeSheet(); }),
  delidea: el => confirmSheet(t('Delete') + '?', () => act('delete_suggestion', { id: el.dataset.k }, 'Deleted')),
  delcomment: el => confirmSheet(t('Delete') + '?', () => act('delete_comment', { id: el.dataset.k }, 'Deleted')),
  idea2plan: el => { const s = D().suggestions.find(x => x.id === el.dataset.k); itemSheet(null, { title: s.title, details: s.body, day: s.day || trip().start }); F.__idea = s.id; },
  newidea: () => ideaSheet(),
  saveidea: el => busy(el, async () => { if (!F.title.trim()) { toast(t('Write the name of the place')); return; } const vis = F.visibility; await act('add_suggestion', F); closeSheet(); confetti(50); toast(vis === 'private' ? '🔒 ' + t('Sent to the organizer') : '🎉 ' + t('Idea shared! The family can now like it')); }),
  announce: el => announceSheet(el.dataset.k),
  saveann: el => busy(el, async () => { const data = { ...F, poll: F.poll ? F.poll.map(o => ({ text: String(o.text || '').trim(), price: String(o.price || '').trim(), photos: o.photos }))
      .filter(o => o.text).map(o => (o.price || o.photos.length) ? o : o.text) : null };
    if (data.poll && data.poll.length < 2) { toast(t('A vote needs at least 2 options')); return; } await act('save_announcement', data, 'Saved'); closeSheet(); }),
  polladd: () => { F.poll.push({ text: '', price: '', photos: [] }); rerenderSheet(); },
  pollph: async el => { const i = +el.dataset.k, saved = F, fn = sheetRender; const files = await pickFiles(true); if (!files.length) return; toast(t('Uploading…'));
    for (const f of files) { try { const data = await resizeImage(f, 1400, 0.8); const r = await api('add_ann_photo', { data }); saved.poll[i].photos.push(r.id); } catch (e) { toast(errText(e)); } }
    F = saved; sheetRender = fn; rerenderSheet(); },
  pollphrm: el => { F.poll[+el.dataset.k].photos.splice(+el.dataset.v, 1); rerenderSheet(); },
  optphoto: el => { const a = D().announcements.find(x => x.id === el.dataset.k); if (!a) return; const q = po(a.poll[+el.dataset.v]); optGallery(q.photos, +el.dataset.i, (+el.dataset.v + 1) + '. ' + q.text); },
  pollrm: el => { F.poll.splice(+el.dataset.k, 1); rerenderSheet(); },
  pollvote: el => { const a = D().announcements.find(x => x.id === el.dataset.k); const c = +el.dataset.v; const cur = (a.votes || {})[me()];
    const v = cur === c ? null : c; a.votes = Object.assign({}, a.votes); if (v == null) delete a.votes[me()]; else a.votes[me()] = v; render(); if (v != null) confetti(25);
    act('vote_announcement', { id: a.id, choice: v }).catch(() => {}); },
  delann: () => { const id = F.id; confirmSheet(t('Delete') + '?', () => act('delete_announcement', { id }, 'Deleted')); },
  editday: el => daySheet(el.dataset.k),
  saveday: el => busy(el, async () => { await act('save_day', F, 'Saved'); closeSheet(); }),
  edititem: el => itemSheet(el.dataset.k, el.dataset.day ? { day: el.dataset.day } : {}),
  saveitem: el => busy(el, async () => { const idea = F.__idea; await act('save_item', F, 'Saved'); if (idea) await act('set_suggestion_status', { id: idea, status: 'planned' }); closeSheet(); }),
  delitem: () => { const id = F.id; confirmSheet(t('Delete') + '?', () => act('delete_item', { id }, 'Deleted')); },
  place: el => placeSheet(el.dataset.k),
  editplace: el => placeEditSheet(el.dataset.k),
  saveplace: el => busy(el, async () => { const r = await act('save_place', F, 'Saved'); placeSheet(r.id || F.id); }),
  delplace: () => { const id = F.id; confirmSheet(t('Delete') + '?', () => act('delete_place', { id }, 'Deleted')); },
  addphotos: el => uploadPhotos({ place_id: el.dataset.place || '', day: el.dataset.day || '' }),
  uploadcover: async el => { const ctx = JSON.parse(el.dataset.ctx || '{}'); const saved = F; const fn = sheetRender; const ids = await uploadPhotos({ ...ctx, multiple: false }); F = saved; sheetRender = fn; if (ids[0]) { F.cover = ids[0]; } rerenderSheet(); },
  pickcover: el => { F.cover = el.dataset.k; rerenderSheet(); },
  lightbox: el => lightbox(el.dataset.list, +el.dataset.i),
  expenseform: el => expenseForm(el.dataset.k),
  expense: el => expenseSheet(el.dataset.k),
  cat: el => { F.category = el.dataset.k; rerenderSheet(); },
  mode: el => { F.mode = el.dataset.k; if (F.mode === 'exact' && !Object.keys(F.exact).length && num(F.amount)) { const r = computeSplit({ ...F, mode: 'equal' }); if (r.shares) F.exact = Object.fromEntries(Object.entries(r.shares).map(([k, v]) => [k, (v / 100).toFixed(2)])); } rerenderSheet(); },
  ppl: el => {
    const k = el.dataset.k; const all = D().members.map(m => m.id);
    if (k === '__all') F.people = all; else if (k === '__none') F.people = [];
    else if (k.startsWith('h:')) { const hs = D().members.filter(m => m.household === k.slice(2)).map(m => m.id); const on = hs.every(i => F.people.includes(i)); F.people = on ? F.people.filter(i => !hs.includes(i)) : [...new Set([...F.people, ...hs])]; }
    else F.people = F.people.includes(k) ? F.people.filter(i => i !== k) : [...F.people, k];
    rerenderSheet();
  },
  itemppl: el => { const it = F.items[+el.dataset.n]; const k = el.dataset.k; if (k === '__all') it.people = it.people.length === D().members.length ? [] : D().members.map(m => m.id); else it.people = it.people.includes(k) ? it.people.filter(i => i !== k) : [...it.people, k]; rerenderSheet(); },
  additemrow: () => { F.items.push({ name: '', price: '', people: [] }); rerenderSheet(); },
  delitemrow: el => { F.items.splice(+el.dataset.k, 1); if (!F.items.length) F.items.push({ name: '', price: '', people: [] }); rerenderSheet(); },
  saveexpense: el => busy(el, async () => {
    const r = computeSplit(F); if (r.error) { toast(r.error); return; }
    const shares = Object.fromEntries(Object.entries(r.shares).map(([k, v]) => [k, v / 100]));
    const split = { mode: F.mode, people: F.people, weights: F.weights, items: F.items.filter(i => num(i.price)), exact: F.exact, total: F.mode === 'items' ? num(F.amount) : undefined };
    LS.set('lastCur', F.currency);
    await act('save_expense', { id: F.id, title: F.title, amount: r.total / 100, currency: F.currency, category: F.category, paid_by: F.paid_by, spent_on: F.spent_on, note: F.note, method: F.method, receipt: F.receipt, split, shares }, 'Saved');
    LS.set('lastMethod', F.method);
    closeSheet();
  }),
  delexpense: () => { const id = F.id; confirmSheet(t('Delete') + '?', () => act('delete_expense', { id }, 'Deleted')); },
  statement: el => statementSheet(el.dataset.k),
  finalbills: () => finalBillsSheet(),
  settle: el => settleSheet(el.dataset.from, el.dataset.to, el.dataset.amt),
  savesettle: el => busy(el, async () => { await act('add_settlement', F, 'Saved'); closeSheet(); confetti(); }),
  delsettle: el => confirmSheet(t('Delete') + '?', () => act('delete_settlement', { id: el.dataset.k }, 'Deleted')),
  member: el => memberSheet(el.dataset.k),
  savemember: el => busy(el, async () => { await act('save_member', F, 'Saved'); closeSheet(); }),
  delmember: () => { const id = F.id; confirmSheet(t('Delete') + ' ' + nameOf(id) + '?', () => act('delete_member', { id }, 'Deleted')); },
  tripsettings: () => tripSettingsSheet(),
  swatch: el => { F.color = el.dataset.k; document.documentElement.style.setProperty('--brand', F.color); rerenderSheet(); },
  savetrip: el => busy(el, async () => {
    await api('save_setting', { key: 'trip', value: { name: F.name, start: F.start, end: F.end } });
    await act('save_setting', { key: 'theme', value: { color: F.color, welcome: F.welcome, cover: F.cover } }, 'Saved'); closeSheet();
  }),
  rates: () => ratesSheet(),
  saverates: el => busy(el, async () => { await act('save_setting', { key: 'rates', value: { JOD: 1, EGP: num(F.EGP) || 68, USD: num(F.USD) || 1.41 } }, 'Saved'); closeSheet(); }),
  profile: () => profileSheet(),
  saveprofile: el => busy(el, async () => { await act('update_profile', F, 'Saved'); closeSheet(); }),
  password: () => passwordSheet(),
  savepassword: el => busy(el, async () => { await act('change_password', F, 'Saved'); closeSheet(); }),
  csv: () => exportCsv(),
  method: el => { F.method = el.dataset.k; rerenderSheet(); },
  receipt: async () => { const saved = F, fn = sheetRender; const [f] = await pickFiles(false); if (!f) return; toast(t('Uploading…'));
    try { const data = await resizeImage(f, 1600, 0.8); const r = await api('add_receipt', { data }); F = saved; sheetRender = fn; F.receipt = r.id; rerenderSheet(); } catch (e) { toast(errText(e)); } },
  rmreceipt: () => { F.receipt = ''; rerenderSheet(); },
  receiptview: async el => { try { const src = await getPhoto(el.dataset.k); const w = document.createElement('div'); w.className = 'lightbox'; w.innerHTML = `<div class="row" style="justify-content:flex-end;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px"><button class="icon-btn" style="background:#333;color:#fff">${ico('x', 18)}</button></div><img src="${src}" alt="">`; w.onclick = () => w.remove(); document.body.appendChild(w); } catch {} },
  edittask: el => taskSheet(el.dataset.k),
  savetask: el => busy(el, async () => { await act('save_task', F, 'Saved'); closeSheet(); }),
  deltask: () => { const id = F.id; confirmSheet(t('Delete') + '?', () => act('delete_task', { id }, 'Deleted')); },
  aud: el => { const key = el.dataset.f, k = el.dataset.k; let sel = F[key];
    if (k === '__all') sel = [];
    else if (k.startsWith('h:')) { const hs = D().members.filter(m => m.household === k.slice(2)).map(m => m.id); sel = hs.every(i => sel.includes(i)) ? sel.filter(i => !hs.includes(i)) : [...new Set([...sel, ...hs])]; }
    else sel = sel.includes(k) ? sel.filter(i => i !== k) : [...sel, k];
    F[key] = sel; rerenderSheet(); },
  editarr: el => arrSheet(el.dataset.k),
  arrkind: el => { F.kind = el.dataset.k; rerenderSheet(); },
  arrgroup: el => { F.cur = +el.dataset.n; rerenderSheet(); },
  arrmember: el => { const id = el.dataset.k; const g = F.groups[F.cur]; if (!g) return;
    const inThis = g.members.includes(id); F.groups.forEach(x => { x.members = x.members.filter(m => m !== id); }); if (!inThis) g.members.push(id); rerenderSheet(); },
  addgroup: () => { const [, kn] = KINDS[F.kind] || KINDS.other; F.groups.push({ name: (F.kind === 'car' ? t('Car') : F.kind === 'room' ? t('Room') : t('Group')) + ' ' + (F.groups.length + 1), note: '', members: [] }); F.cur = F.groups.length - 1; rerenderSheet(); },
  delgroup: el => { F.groups.splice(+el.dataset.n, 1); F.cur = 0; rerenderSheet(); },
  byfamily: () => { const houses = {}; D().members.forEach(m => { const k = m.household || m.name; (houses[k] ||= []).push(m.id); });
    F.groups = Object.entries(houses).map(([k, ids]) => ({ name: k, note: '', members: ids })); F.cur = 0; rerenderSheet(); },
  copyarr: () => { F.id = ''; F.title = F.title + ' (' + t('copy') + ')'; F.groups = F.groups.map(g => ({ ...g, members: [...g.members] })); rerenderSheet(); toast(t('Copied. Change the day and save.')); },
  savearr: el => busy(el, async () => { const { cur, ...data } = F; await act('save_arrangement', data, 'Saved'); closeSheet(); }),
  delarr: () => { const id = F.id; confirmSheet(t('Delete') + '?', () => act('delete_arrangement', { id }, 'Deleted')); },
  editinfo: el => infoSheet(el.dataset.k),
  saveinfo: el => busy(el, async () => { await act('save_info', F, 'Saved'); closeSheet(); }),
  delinfo: () => { const id = F.id; confirmSheet(t('Delete') + '?', () => act('delete_info', { id }, 'Deleted')); },
  infoicon: el => { F.icon = el.dataset.k; rerenderSheet(); },
  addfield: () => { F.details.fields.push({ label: '', value: '' }); rerenderSheet(); },
  delfield: el => { F.details.fields.splice(+el.dataset.n, 1); rerenderSheet(); },
  addlink: () => { F.details.links.push({ label: '', url: '' }); rerenderSheet(); },
  dellink: el => { F.details.links.splice(+el.dataset.n, 1); rerenderSheet(); },
  myavatar: () => changeAvatar(''),
  memberavatar: el => changeAvatar(el.dataset.k),
  rmavatar: el => act('set_avatar', { member_id: el.dataset.k, data: '' }, 'Saved').then(rerenderSheet).catch(() => {}),
  copy: async el => { try { await navigator.clipboard.writeText(el.dataset.text); toast(t('Copied')); } catch { toast('—'); } },
  print: () => window.print(),
  close: () => closeSheet(),
  bgclose: (el, ev) => { if (ev.target === el) closeSheet(); },
  confirmno: () => { const p = F; closeSheet(); if (p.__prev) { F = p.__prevF; openSheet(p.__prev); } },
  confirmyes: el => busy(el, async () => { const fn = F.__confirm; await fn(); closeSheet(); })
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const h = H[el.dataset.a]; if (!h) return;
  if (el.dataset.a === 'bgclose') { h(el, ev); return; }
  ev.preventDefault(); h(el, ev);
});
document.addEventListener('input', ev => {
  const el = ev.target; if (!F || !el.dataset.bind) return;
  setPath(F, el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value);
  if (el.dataset.bind === 'color') document.documentElement.style.setProperty('--brand', el.value);
  if ($('#preview')) $('#preview').innerHTML = previewHtml();
  hydratePhotos($('#preview') || document.createElement('div'));
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (F && el.dataset.bind && (el.tagName === 'SELECT' || el.type === 'checkbox')) {
    setPath(F, el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value);
    if (el.dataset.bind === 'role' || el.dataset.bind === 'currency') rerenderSheet(); else if ($('#preview')) $('#preview').innerHTML = previewHtml();
  }
  if (el.dataset.a2 === 'byhouse') { S.byHouse = el.checked; LS.set('byHouse', S.byHouse); render(); }
  if (el.dataset.a2 === 'istatus') act('set_suggestion_status', { id: el.dataset.k, status: el.value }, 'Saved').catch(() => {});
  if (el.dataset.a2 === 'q') { S.q = el.value; render(); const i = document.querySelector('[data-a2=q]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  if (el.dataset.a2 === 'fpayer') { S.fPayer = el.value; render(); }
  if (el.dataset.a2 === 'fmethod') { S.fMethod = el.value; render(); }
  if (el.dataset.a2 === 'polltoggle') { F.poll = el.checked ? (F.poll && F.poll.length ? F.poll : [0, 1, 2].map(() => ({ text: '', price: '', photos: [] }))) : null; rerenderSheet(); }
  if (el.dataset.a2 === 'orgtoggle') { const id = el.dataset.k; act('save_member', { id, role: el.checked ? 'admin' : 'member' }, el.checked ? '⭐ ' + t('Co-organizer added') : 'Saved').then(() => rerenderSheet()).catch(() => rerenderSheet()); }
  if (el.dataset.a2 === 'tasktoggle') { if (el.checked) confetti(30); act('toggle_task', { id: el.dataset.k, member_id: el.dataset.m || '', done: el.checked }).then(() => rerenderSheet()).catch(() => {}); }
  if (el.dataset.a2 === 'pplbox') { const k = el.dataset.k; F.people = el.checked ? [...new Set([...F.people, k])] : F.people.filter(i => i !== k); $('#preview').innerHTML = previewHtml(); }
});
document.addEventListener('submit', async ev => {
  const f = ev.target; const kind = f.dataset.form; if (!kind) return; ev.preventDefault();
  const fd = Object.fromEntries(new FormData(f)); const btn = $('button', f);
  if (kind === 'login' || kind === 'setup') {
    busy(btn, async () => {
      try { const r = await api(kind, fd); S.token = r.token; LS.set('token', r.token); await refresh(); }
      catch (e) { toast(errText(e)); if (e.message === 'already_set_up') { S.mode = 'login'; render(); } }
    });
  }
  if (kind === 'anncomment') busy(btn, async () => { await act('comment_announcement', { id: f.dataset.k, body: fd.body }); });
  if (kind === 'comment') busy(btn, async () => { await act('comment', { id: f.dataset.k, body: fd.body }); });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetRender) closeSheet(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.token) refresh().catch(() => {}); });
setInterval(() => { if (document.visibilityState === 'visible' && S.token && !F) refresh().catch(() => {}); }, 30000);

/* ---------------- start ---------------- */
applyTheme(); render();
if (S.token && CFG.supabaseUrl) refresh().catch(e => { if (e.message !== 'not_logged_in') { $('#app').innerHTML = `<div class="login"><div class="box card"><p>${esc(errText(e))}</p><button class="btn" data-a="refresh">${t('Refresh')}</button></div></div>`; } });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
})();
