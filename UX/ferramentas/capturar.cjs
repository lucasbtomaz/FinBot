// Uso: node UX/ferramentas/capturar.cjs
// Requer Playwright instalado e Microsoft Edge no Windows.
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1800 }, deviceScaleFactor: 1 });
    const source = path.resolve(__dirname, '../prototipos/2026-09-09-finbot-v01.html');
    await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });
    const frame = page.frameLocator('iframe');
    const panel = frame.locator('#finbot-preview');
    await panel.waitFor();
    const icons = await panel.locator('svg').count();
    if (icons < 10) throw new Error('Ícones não carregaram; não salvar captura incompleta.');
    await panel.screenshot({ path: path.resolve(__dirname, '../capturas/2026-09-09-finbot-v01-desktop.png') });
    await frame.locator('.fb-nav [data-view="chat"]').click();
    await panel.screenshot({ path: path.resolve(__dirname, '../capturas/2026-09-09-finbot-v01-chat.png') });
    await frame.locator('.fb-nav [data-view="overview"]').click();
    await page.setViewportSize({ width: 422, height: 3500 });
    await panel.screenshot({ path: path.resolve(__dirname, '../capturas/2026-09-09-finbot-v01-mobile.png') });
    console.log('Três capturas salvas. Ícones no painel:', icons);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
