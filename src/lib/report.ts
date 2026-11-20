import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { TKey } from '@/i18n';
import type { DaySummary } from './metrics';

export interface ReportInput {
  title: string;
  name: string;
  period: string;
  days: DaySummary[];
  weight?: { start: number; end: number; bmiStart: number; bmiEnd: number } | null;
  streak: number;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

export function buildReportHtml(r: ReportInput, t: (k: TKey) => string): string {
  const total = (f: (d: DaySummary) => number) => r.days.reduce((s, d) => s + f(d), 0);
  const sleepDays = r.days.filter((d) => d.sleepHours > 0);
  const avgSleep = sleepDays.length ? total((d) => d.sleepHours) / sleepDays.length : 0;
  const maxMin = Math.max(1, ...r.days.map((d) => d.minutes));
  const rows = r.days
    .map(
      (d) => `<tr>
        <td>${d.date}</td>
        <td><div class="bar" style="width:${Math.round((d.minutes / maxMin) * 80)}px"></div> ${d.minutes}</td>
        <td>${d.calories}</td><td>${d.steps.toLocaleString()}</td><td>${d.sleepHours || '-'}</td>
        <td>${d.water} ml</td><td>${d.targetPct}%</td></tr>`,
    )
    .join('');
  const weight = r.weight
    ? `<div class="card"><b>${t('weight')}:</b> ${r.weight.start} → ${r.weight.end} kg
       (${r.weight.end - r.weight.start >= 0 ? '+' : ''}${(r.weight.end - r.weight.start).toFixed(1)} kg)
       &nbsp; | &nbsp; <b>BMI:</b> ${r.weight.bmiStart} → ${r.weight.bmiEnd}</div>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    body{font-family:-apple-system,Roboto,'Noto Sans',sans-serif;color:#0F241B;padding:24px}
    h1{color:#16A34A;margin:0} h2{color:#0284C7;margin:4px 0 16px}
    .grid{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}
    .card{border:1px solid #D6E6DE;border-radius:12px;padding:12px;background:#F1F8F5;margin-bottom:12px}
    .stat{flex:1;min-width:120px;text-align:center}.stat b{display:block;font-size:22px;color:#16A34A}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #D6E6DE;padding:6px;text-align:left}
    th{background:#E0F2FE}.bar{display:inline-block;height:8px;background:#16A34A;border-radius:4px;vertical-align:middle}
    .foot{margin-top:20px;font-size:11px;color:#56695F}
  </style></head><body>
  <h1>❤ ${esc(t('app_name'))}</h1>
  <h2>${esc(r.title)} — ${esc(r.name)} (${esc(r.period)})</h2>
  <div class="grid">
    <div class="card stat"><b>${Math.round(total((d) => d.minutes))}</b>${esc(t('active_minutes'))}</div>
    <div class="card stat"><b>${Math.round(total((d) => d.calories))}</b>${esc(t('calories_burned'))}</div>
    <div class="card stat"><b>${total((d) => d.steps).toLocaleString()}</b>${esc(t('steps'))}</div>
    <div class="card stat"><b>${avgSleep.toFixed(1)}</b>${esc(t('avg_sleep'))}</div>
    <div class="card stat"><b>🔥 ${r.streak}</b>${esc(t('streak'))}</div>
  </div>
  ${weight}
  <table><tr><th>${esc(t('date'))}</th><th>${esc(t('min'))}</th><th>kcal</th><th>${esc(t('steps'))}</th>
  <th>${esc(t('sleep'))}</th><th>${esc(t('water'))}</th><th>${esc(t('target'))}</th></tr>${rows}</table>
  <p class="foot">${esc(t('disclaimer'))}</p>
  </body></html>`;
}

export async function exportPdf(r: ReportInput, t: (k: TKey) => string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: buildReportHtml(r, t) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: r.title });
  }
}
