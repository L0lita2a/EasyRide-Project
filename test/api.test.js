const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const port = 3400 + Math.floor(Math.random() * 500);
const databasePath = path.join(os.tmpdir(), `easyride-test-${process.pid}-${Date.now()}.sqlite`);
const baseUrl = `http://127.0.0.1:${port}`;
let serverProcess;
let cookie;
let bookingId;

async function request(route, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (cookie) headers.cookie = cookie;
    const response = await fetch(`${baseUrl}${route}`, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { response, body };
}

async function waitForServer() {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
            const result = await fetch(`${baseUrl}/api/cars`);
            if (result.ok) return;
        } catch (_) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    throw new Error('Test server did not start');
}

before(async () => {
    serverProcess = spawn(process.execPath, ['server.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, PORT: String(port), DB_PATH: databasePath, NODE_ENV: 'test' },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    await waitForServer();
});

after(async () => {
    if (serverProcess && !serverProcess.killed) {
        await new Promise(resolve => {
            serverProcess.once('exit', resolve);
            serverProcess.kill();
        });
    }
    for (const suffix of ['', '-shm', '-wal']) {
        const file = databasePath + suffix;
        if (fs.existsSync(file)) fs.unlinkSync(file);
    }
});

test('rejects booking requests without authentication', async () => {
    const result = await request('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
    });
    assert.equal(result.response.status, 401);
});

test('registers, authenticates, and lists cars', async () => {
    const email = `test-${Date.now()}@example.com`;
    const registered = await request('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'test-user', email, password: 'StrongPass123' })
    });
    assert.equal(registered.response.status, 201);
    assert.ok(cookie);

    const me = await request('/api/auth/me');
    assert.equal(me.response.status, 200);
    assert.equal(me.body.user.email, email);

    const cars = await request('/api/cars');
    assert.equal(cars.response.status, 200);
    assert.equal(cars.body.cars.length, 6);
});

test('creates a booking, prevents date conflicts, and lists it', async () => {
    const details = {
        car_id: 1,
        pickup_date: '2099-01-01',
        return_date: '2099-01-02',
        province: 'Istanbul',
        landmark: 'Airport',
        phone_number: '+905551112233',
        payment_method: 'Pay at Pickup'
    };
    const created = await request('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(details)
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.booking.total_price, 240);
    bookingId = created.body.booking.id;

    const conflict = await request('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(details)
    });
    assert.equal(conflict.response.status, 409);

    const history = await request('/api/user/bookings');
    assert.equal(history.response.status, 200);
    assert.equal(history.body.bookings[0].id, bookingId);
});

test('rejects invalid dates and cancels only the authenticated user booking', async () => {
    const invalid = await request('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            car_id: 2,
            pickup_date: '2099-02-03',
            return_date: '2099-02-01',
            province: 'Istanbul',
            landmark: 'Station',
            phone_number: '+905551112233',
            payment_method: 'Pay at Pickup'
        })
    });
    assert.equal(invalid.response.status, 400);

    const cancelled = await request('/api/cancel-booking', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId })
    });
    assert.equal(cancelled.response.status, 200);

    const history = await request('/api/user/bookings');
    assert.equal(history.body.bookings[0].status, 'Cancelled');
});
