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
    await page.getByRole('button', { name: 'Most kihagyom', exact: true }).click();
    await page.getByRole('button', { name: 'Személy hozzáadása', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('@krampus:data:v2')).onboardingCompleted), true);
    await page.reload();
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
    assert.equal(migrated.onboardingCompleted, true);
    await legacyContext.close();

    // Existing 0.3.0 installations have no onboarding marker and retain their choices.
    const existingContext = await browser.newContext({ locale: 'hu-HU' });
    await existingContext.addInitScript(() => {
      if (!localStorage.getItem('@krampus:data:v2')) localStorage.setItem('@krampus:data:v2', JSON.stringify({
        version: 2, shoppingYear: 2026, people: [], settings: { language: 'de', currency: 'EUR',
          globalBudgetLimitMinor: 20000, defaultPriceLimitMinor: 7500, notificationsEnabled: false,
          reminderDays: [1, 24], reminderHour: 9, reminderMinute: 0 },
      }));
    });
    const existing = await existingContext.newPage();
    await existing.goto(base, { waitUntil: 'domcontentloaded' });
    await existing.getByRole('button', { name: 'Person hinzufügen', exact: true }).waitFor();
    assert.equal(await existing.getByRole('button', { name: 'Jetzt überspringen', exact: true }).count(), 0);
    await existingContext.close();

    const setupContext = await browser.newContext({ locale: 'hu-HU', viewport: { width: 320, height: 640 } });
    const setup = await setupContext.newPage();
    setup.on('pageerror', error => errors.push(error.message));
    await setup.goto(base, { waitUntil: 'domcontentloaded' });
    await setup.getByRole('radio', { name: 'Deutsch', exact: true }).click();
    await setup.getByRole('button', { name: 'Weiter', exact: true }).click();
    await setup.getByRole('radio', { name: 'EUR', exact: true }).click();
    await setup.getByRole('switch', { name: 'Kein Gesamtbudgetlimit', exact: true }).uncheck();
    await setup.getByRole('textbox', { name: 'Gesamtbudget (EUR)', exact: true }).fill('abc');
    await setup.getByRole('button', { name: 'Speichern und starten', exact: true }).click();
    await setup.getByText('Gib ein Budget größer als null mit höchstens zwei Nachkommastellen ein.', { exact: true }).waitFor();
    await setup.getByRole('textbox', { name: 'Gesamtbudget (EUR)', exact: true }).fill('250,50');
    await setup.getByRole('textbox', { name: 'Standardbudget für neue Personen (EUR)', exact: true }).fill('30,50');
    await setup.getByRole('button', { name: 'Zurück', exact: true }).click();
    await setup.getByRole('radio', { name: 'Magyar', exact: true }).click();
    await setup.getByRole('button', { name: 'Tovább', exact: true }).click();
    assert.equal(await setup.getByRole('textbox', { name: 'Teljes keret (EUR)', exact: true }).inputValue(), '250,50');
    await setup.getByRole('button', { name: 'Mentés és kezdés', exact: true }).click();
    await setup.getByRole('button', { name: 'Személy hozzáadása', exact: true }).waitFor();
    const configured = await setup.evaluate(() => JSON.parse(localStorage.getItem('@krampus:data:v2')));
    assert.equal(configured.onboardingCompleted, true);
    assert.equal(configured.settings.language, 'hu'); assert.equal(configured.settings.currency, 'EUR');
    assert.equal(configured.settings.globalBudgetLimitMinor, 25050); assert.equal(configured.settings.defaultPriceLimitMinor, 3050);
    assert.equal(configured.settings.notificationsEnabled, false);
    await setup.reload();
    await setup.getByRole('button', { name: 'Személy hozzáadása', exact: true }).click();
    assert.equal(await setup.getByRole('textbox', { name: 'Személyenkénti keret (EUR) *', exact: true }).inputValue(), '30.50');
    await setupContext.close();

    // Invalid unfinished budgets never prevent skipping, and drafts are not saved.
    const skipContext = await browser.newContext({ locale: 'en-US' });
    const skip = await skipContext.newPage();
    await skip.goto(base, { waitUntil: 'domcontentloaded' });
    await skip.getByRole('button', { name: 'Continue', exact: true }).click();
    await skip.getByRole('radio', { name: 'HUF', exact: true }).click();
    assert.equal(await skip.getByRole('textbox', { name: 'Default budget for a new person (HUF)', exact: true }).inputValue(), '5000');
    await skip.getByRole('textbox', { name: 'Default budget for a new person (HUF)', exact: true }).fill('-10');
    await skip.getByRole('button', { name: 'Skip for now', exact: true }).click();
    await skip.getByRole('button', { name: 'Add person', exact: true }).waitFor();
    const skipped = await skip.evaluate(() => JSON.parse(localStorage.getItem('@krampus:data:v2')));
    assert.equal(skipped.onboardingCompleted, true); assert.equal(skipped.settings.currency, 'USD');
    assert.equal(skipped.settings.defaultPriceLimitMinor, 5000); assert.equal(skipped.settings.globalBudgetLimitMinor, null);
    await skipContext.close();
    assert.deepEqual(errors, []);
    console.log('Browser smoke passed: onboarding completion/skip, live language, budgets, persistence, existing installs and legacy migration; core gift flows; 390px and 320px viewports.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
