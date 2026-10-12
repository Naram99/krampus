const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
  });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'hu-HU' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = process.env.KRAMPUS_PREVIEW_URL ?? 'http://127.0.0.1:8083';
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Személy hozzáadása', exact: true }).click();
    await page.getByRole('textbox', { name: 'Név *', exact: true }).fill('Anya');
    const budget = page.getByRole('textbox', { name: /Személyenkénti keret/ });
    await budget.fill('abc');
    await page.getByRole('dialog').getByRole('button', { name: 'Mentés', exact: true }).click();
    await page.getByText('Adj meg nullánál nagyobb keretet, legfeljebb két tizedesjeggyel.', { exact: true }).waitFor();
    await budget.fill('12,99');
    await page.getByRole('dialog').getByRole('button', { name: 'Mentés', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Szerkesztés: Anya', exact: true }).waitFor();
    await page.getByRole('tab', { name: /Főoldal/ }).click();
    await page.getByRole('checkbox', { name: 'Anya ajándékának megjelölése megvásároltként' }).click();
    const price = page.getByRole('textbox', { name: /Tényleges ár/ });
    await price.fill('-100');
    await page.getByRole('dialog').getByRole('button', { name: 'Mentés', exact: true }).click();
    await page.getByText(/Adj meg nem negatív összeget/).waitFor();
    await price.fill('0');
    await page.getByRole('dialog').getByRole('button', { name: 'Mentés', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByText('Minden ajándék megvan!', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ár módosítása: Anya', exact: true }).click();
    assert.equal(await price.inputValue(), '0');
    await price.fill('30,50');
    await page.getByRole('dialog').getByRole('button', { name: 'Mentés', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('checkbox', { name: 'Anya vásárlási jelölésének visszavonása' }).click();
    await page.getByRole('checkbox', { name: 'Anya ajándékának megjelölése megvásároltként' }).click();
    assert.equal(await price.inputValue(), '30.50');
    await page.getByRole('dialog').getByRole('button', { name: 'Mentés', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('tab', { name: /Beállítások/ }).click();
    await page.getByRole('switch', { name: 'Nincs teljes költési korlát' }).uncheck();
    await page.getByRole('textbox', { name: /Teljes keret/ }).fill('20');
    await page.getByRole('radio', { name: 'Deutsch' }).click();
    await page.getByRole('button', { name: 'Mentés', exact: true }).click();
    await page.getByText('Einstellungen gespeichert.', { exact: true }).waitFor();
    await page.getByRole('tab', { name: /Übersicht/ }).click();
    await page.getByText(/Budget um .* überschritten/).first().waitFor();
    await page.reload();
    await page.getByText('Alle Geschenke sind bereit!', { exact: true }).waitFor();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('@krampus:data:v2')));
    assert.equal(stored.people[0].priceLimitMinor, 1299);
    assert.equal(stored.people[0].actualPriceMinor, 3050);
    assert.equal(stored.people[0].isBought, true);
    assert.equal(stored.settings.globalBudgetLimitMinor, 2000);
    assert.equal(stored.settings.language, 'de');
    assert.deepEqual(errors, []);
    if (process.env.KRAMPUS_SCREENSHOT) await page.screenshot({ path: process.env.KRAMPUS_SCREENSHOT, fullPage: true });
    await context.close();

    // A prior installation must migrate without requiring a gift idea or category.
    const legacyContext = await browser.newContext({ locale: 'hu-HU', viewport: { width: 320, height: 640 } });
    await legacyContext.addInitScript(() => {
      if (!localStorage.getItem('@krampus:data:v2')) {
        localStorage.setItem('@krampus:people', JSON.stringify([{ id: 'legacy', name: 'Régi személy', priceLimit: 12.99, isBought: true, actualPrice: 0 }]));
        localStorage.setItem('@krampus:settings', JSON.stringify({ currency: 'HUF', language: 'hu', notificationsEnabled: false }));
      }
    });
    const legacy = await legacyContext.newPage();
    await legacy.goto(base, { waitUntil: 'domcontentloaded' });
    await legacy.getByText('Minden ajándék megvan!', { exact: true }).waitFor();
    const migrated = await legacy.evaluate(() => JSON.parse(localStorage.getItem('@krampus:data:v2')));
    assert.equal(migrated.people[0].priceLimitMinor, 1299);
    assert.equal(migrated.people[0].actualPriceMinor, 0);
    assert.equal(migrated.settings.currency, 'HUF');
    await legacyContext.close();
    console.log('Browser smoke passed: validation, zero price, retained price, settings/language, budget warning, reload, legacy migration; 390px and 320px viewports.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
