// يعدّل AndroidManifest.xml بعد إنشاء منصة أندرويد:
// 1) إضافة صلاحيتي جهات الاتصال (READ + WRITE) — الإضافة تربطهما معًا
// 2) السماح بحركة HTTP العادية (لمزامنة الشبكة المحلية مع برنامج الكمبيوتر)
const fs = require('fs');
const path = 'android/app/src/main/AndroidManifest.xml';

if (!fs.existsSync(path)) { console.log('⚠️  لم يُعثر على AndroidManifest.xml — تخطّي'); process.exit(0); }
let xml = fs.readFileSync(path, 'utf8');
let changed = false;

// 1) صلاحيات جهات الاتصال (لازم الاثنتين لأن الإضافة تجمعهما في اسم واحد)
const perms = ['READ_CONTACTS', 'WRITE_CONTACTS'];
let permLines = '';
perms.forEach(p => {
  if (!xml.includes('android.permission.' + p)) {
    permLines += '    <uses-permission android:name="android.permission.' + p + '" />\n';
  }
});
if (permLines) {
  xml = xml.replace('<application', permLines + '\n    <application');
  changed = true;
  console.log('✅ أُضيفت صلاحيات جهات الاتصال (READ + WRITE)');
}

// 2) السماح بالاتصال غير المشفّر (HTTP) للمزامنة المحلية
if (!/android:usesCleartextTraffic/.test(xml)) {
  xml = xml.replace('<application', '<application android:usesCleartextTraffic="true"');
  changed = true;
  console.log('✅ فُعّل usesCleartextTraffic');
}

if (changed) { fs.writeFileSync(path, xml, 'utf8'); console.log('💾 حُفظ AndroidManifest.xml'); }
else console.log('ℹ️  لا تغييرات مطلوبة');
