/*
 * متجري — خادم المزامنة وبرنامج الكمبيوتر
 * تشغيل:  node server.js
 * لا يحتاج أي مكتبات خارجية (Node.js فقط).
 * المنفذ الافتراضي 4321 — غيّره بمتغير البيئة PORT.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4321;
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const safe = c => String(c || 'default').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 60) || 'default';
const fileFor = c => path.join(DATA_DIR, safe(c) + '.json');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function money(n){ n=Math.round((n||0)); return n.toLocaleString('en-US'); }

function readStore(code){ try { return JSON.parse(fs.readFileSync(fileFor(code),'utf8')); } catch(e){ return null; } }
function listStores(){ try { return fs.readdirSync(DATA_DIR).filter(f=>f.endsWith('.json')).map(f=>f.replace(/\.json$/,'')); } catch(e){ return []; } }

function calcStats(S){
  if(!S) return {};
  const sym = (S.settings && S.settings.baseCurrency==='SAR')?'ر.س':'ر.ي';
  const products=(S.products||[]);
  const sales=(S.sales||[]);
  const profit=sales.reduce((a,s)=>a+(s.items||[]).reduce((b,i)=>b+((i.sellPrice-i.buyPrice)*i.qty),0),0);
  const totalSales=sales.reduce((a,s)=>a+(s.total||0),0);
  const inv=products.reduce((a,p)=>a+(p.qty*p.buyPrice),0);
  return {
    name:(S.settings&&S.settings.businessName)||'متجري', sym,
    products:products.length, sales:sales.length,
    customers:(S.customers||[]).length, suppliers:(S.suppliers||[]).length,
    totalSales, profit, inv
  };
}

const server = http.createServer((req, res) => {
  cors(res);
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // استقبال البيانات من التطبيق
  if (u.pathname === '/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 25e6) req.destroy(); });
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        const code = safe(j.code);
        fs.writeFileSync(fileFor(code), JSON.stringify({ data: j.data, ts: j.ts || Date.now() }), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, code }));
        console.log(`⬆️  استُلمت بيانات المتجر "${code}" — ${new Date().toLocaleTimeString()}`);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'bad json' }));
      }
    });
    return;
  }

  // إرسال البيانات إلى التطبيق
  if (u.pathname === '/sync' && req.method === 'GET') {
    const code = safe(u.searchParams.get('code'));
    const store = readStore(code);
    if (!store) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: false, error: 'no data' })); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    console.log(`⬇️  أُرسلت بيانات المتجر "${code}" — ${new Date().toLocaleTimeString()}`);
    return res.end(JSON.stringify(store));
  }

  // قائمة المتاجر (API)
  if (u.pathname === '/api/stores') {
    const stores = listStores().map(code => { const s = readStore(code); return { code, ts: s && s.ts, stats: calcStats(s && s.data) }; });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(stores));
  }

  // اللوحة الرئيسية (برنامج الكمبيوتر)
  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(DASHBOARD);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('غير موجود');
});

const DASHBOARD = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>متجري — لوحة الكمبيوتر</title>
<style>
:root{--bg:#0E0E12;--surface:#1A1A21;--border:#2C2C38;--text:#F5F5F7;--text3:#7C7C8A;--gold:#1FCB94;--green:#4FD1A1}
*{box-sizing:border-box;font-family:'Segoe UI',Tahoma,sans-serif}
body{margin:0;background:var(--bg);color:var(--text);padding:30px}
.head{display:flex;align-items:center;gap:14px;margin-bottom:8px}
.logo{width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#1FCB94,#0E9F6E);display:grid;place-items:center}
.logo svg{width:26px;height:26px}
h1{font-size:22px;margin:0}
.sub{color:var(--text3);font-size:13px;margin:0 0 26px 60px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px}
.card h2{margin:0 0 4px;font-size:18px}
.code{color:var(--text3);font-size:12px;margin-bottom:16px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px}
.row:last-child{border:none}
.k{color:var(--text3)} .v{font-weight:700}
.v.g{color:var(--green)} .v.gold{color:var(--gold)}
.empty{text-align:center;color:var(--text3);padding:60px}
.upd{font-size:11px;color:var(--text3);margin-top:12px}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);margin-inline-end:6px}
</style></head><body>
<div class="head"><div class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="#04261C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>
<h1>متجري — لوحة الكمبيوتر</h1></div>
<p class="sub"><span class="dot"></span>الخادم يعمل · البيانات تصل من تطبيق الجوال مباشرة</p>
<div id="grid" class="grid"><div class="empty">جارٍ التحميل...</div></div>
<script>
async function load(){
  try{ const r=await fetch('/api/stores'); const stores=await r.json();
    const g=document.getElementById('grid');
    if(!stores.length){ g.innerHTML='<div class="empty">لا توجد بيانات بعد.<br>افتح تطبيق متجري على الجوال، أدخل عنوان هذا الجهاز، واضغط «رفع للسحابة».</div>'; return; }
    g.innerHTML=stores.map(function(s){ var st=s.stats||{}; var sym=st.sym||'';
      return '<div class="card"><h2>'+(st.name||'متجر')+'</h2><div class="code">كود: '+s.code+'</div>'+
        '<div class="row"><span class="k">إجمالي الأرباح</span><span class="v g">'+num(st.profit)+' '+sym+'</span></div>'+
        '<div class="row"><span class="k">إجمالي المبيعات</span><span class="v gold">'+num(st.totalSales)+' '+sym+'</span></div>'+
        '<div class="row"><span class="k">قيمة المخزون</span><span class="v">'+num(st.inv)+' '+sym+'</span></div>'+
        '<div class="row"><span class="k">المنتجات</span><span class="v">'+(st.products||0)+'</span></div>'+
        '<div class="row"><span class="k">الفواتير</span><span class="v">'+(st.sales||0)+'</span></div>'+
        '<div class="row"><span class="k">العملاء / الموردون</span><span class="v">'+(st.customers||0)+' / '+(st.suppliers||0)+'</span></div>'+
        '<div class="upd">آخر تحديث: '+(s.ts?new Date(s.ts).toLocaleString('ar'):'—')+'</div></div>';
    }).join('');
  }catch(e){ document.getElementById('grid').innerHTML='<div class="empty">تعذّر الاتصال بالخادم</div>'; }
}
function num(n){ return (Math.round(n||0)).toLocaleString('en-US'); }
load(); setInterval(load, 5000);
</script></body></html>`;

server.listen(PORT, () => {
  console.log('\n=============================================');
  console.log('  🛍️  متجري — خادم المزامنة يعمل');
  console.log('  افتح في المتصفح:  http://localhost:' + PORT);
  console.log('  في تطبيق الجوال اكتب:  http://<عنوان-هذا-الجهاز>:' + PORT);
  console.log('=============================================\n');
});
