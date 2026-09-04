const { test } = require('node:test');
const assert = require('node:assert/strict');

test('browser smoke test is available when Playwright is installed', async t => {
    if (process.env.RUN_E2E !== '1') {
        t.skip('Run with RUN_E2E=1 against a running EasyRide server');
        return;
    }

    let playwright;
    try {
        playwright = require('playwright');
    } catch (_) {
        t.skip('Install Playwright to run the browser smoke test');
        return;
    }

    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
        await page.getByRole('link', { name: /login/i }).click();
        await page.getByRole('button', { name: 'Register', exact: true }).click();
        await page.locator('#register-username').fill(`browser-${Date.now()}`);
        await page.locator('#register-email').fill(`browser-${Date.now()}@example.com`);
        await page.locator('#register-password').fill('StrongPass123');
        await page.locator('#register-form button[type="submit"]').click();
        await page.locator('.btn-book').first().click();
        await page.locator('#pickup_date').fill('2099-04-01');
        await page.locator('#return_date').fill('2099-04-02');
        await page.locator('#province').selectOption('Istanbul');
        await page.locator('#phone_number').fill('5551112233');
        await page.locator('#landmark').fill('Airport');
        await page.locator('#payment_method').selectOption('Pay at Pickup');
        await page.getByRole('button', { name: /confirm booking/i }).click();
        await page.getByText('Booking Confirmed!').waitFor();
        assert.ok(page.url().includes('/booking.html'));
    } finally {
        await browser.close();
    }
});
