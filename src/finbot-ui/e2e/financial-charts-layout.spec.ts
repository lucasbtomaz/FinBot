import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';

test('mantém o gráfico e as ações em dimensões compactas', async ({ page }) => {
  const child = spawn(
    'dotnet',
    [path.resolve('../../tests/FinBot.Driver/bin/Release/net10.0/FinBot.Driver.dll')],
    { stdio: ['pipe', 'pipe', 'pipe'] }
  );
  const pending: ((value: unknown) => void)[] = [];
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => pending.shift()?.(JSON.parse(line)));

  await page.exposeFunction('finbotTestRequest', (value: unknown) => new Promise(resolve => {
    pending.push(resolve);
    child.stdin.write(JSON.stringify(value) + '\n');
  }));
  await page.addInitScript(() => {
    const listeners = new Set<(event: { data: unknown }) => void>();
    Object.defineProperty(window, 'chrome', { configurable: true, value: { webview: {
      addEventListener: (_: string, callback: (event: { data: unknown }) => void) => listeners.add(callback),
      removeEventListener: (_: string, callback: (event: { data: unknown }) => void) => listeners.delete(callback),
      postMessage: (value: unknown) => (window as any).finbotTestRequest(value)
        .then((data: unknown) => listeners.forEach(fn => fn({ data })))
    } } });
  });

  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Gráficos e Indicadores', exact: true }).click();

    const donut = page.locator('svg[viewBox="0 0 200 200"]');
    await expect(donut).toBeVisible();
    const donutBox = await donut.boundingBox();
    expect(donutBox?.width).toBeLessThanOrEqual(240);
    expect(donutBox?.height).toBeLessThanOrEqual(240);

    const categories = await page.getByRole('button', { name: 'Categorias', exact: true }).boundingBox();
    const timeline = await page.getByRole('button', { name: 'Fluxo Diário', exact: true }).boundingBox();
    expect(categories).not.toBeNull();
    expect(timeline).not.toBeNull();
    expect((timeline?.x ?? 0) - ((categories?.x ?? 0) + (categories?.width ?? 0))).toBeGreaterThanOrEqual(4);
  } finally {
    child.stdin.end();
    await new Promise<void>(resolve => {
      child.on('exit', () => resolve());
      setTimeout(() => { child.kill(); resolve(); }, 5000).unref();
    });
    lines.close();
  }
});
