#!/usr/bin/env node
/**
 * RahatPost Same-Repo Safe Auto-Linker
 * ====================================
 * يربط /rahatpost-bridge.js تلقائياً داخل index.html الموجود في مشروع رهط بوست
 * بدون حذف أو تغيير أي تصميم أو إعدادات قائمة، وبدون أي قاعدة بيانات جديدة.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const BRIDGE_TAG = '<script src="/rahatpost-bridge.js" defer></script>';

const candidates = [
  path.join(root, 'index.html'),
  path.join(root, 'public', 'index.html')
];

const targetIndex = candidates.find((p) => fs.existsSync(p));

if (!targetIndex) {
  console.log('! لم يتم العثور على index.html في جذر المشروع.');
  process.exit(0);
}

const original = fs.readFileSync(targetIndex, 'utf8');
if (original.includes('/rahatpost-bridge.js')) {
  console.log(`✓ الملف ${path.relative(root, targetIndex)} مربوط بالفعل بـ /rahatpost-bridge.js`);
  process.exit(0);
}

const updated = original.includes('</head>')
  ? original.replace('</head>', `    ${BRIDGE_TAG}\n  </head>`)
  : `${original}\n${BRIDGE_TAG}\n`;

fs.writeFileSync(targetIndex, updated, 'utf8');
console.log(`✓ تم إضافة جسر الربط بنجاح إلى ${path.relative(root, targetIndex)} بدون المساس بأي تصميم.`);
