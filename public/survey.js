document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('long-survey-form') || document.getElementById('survey-form');
    if (!form) return;
    const device = document.getElementById('survey-device');
    const detectedDevice = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
    device.value = detectedDevice;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const message = document.getElementById('long-survey-message') || document.getElementById('survey-message');
        button.disabled = true;
        try {
            const values = Object.fromEntries(new FormData(form));
            const answers = {};
            for (let i = 1; i <= 10; i += 1) answers[`q${i}`] = values[`q${i}`] || '';
            values.answers = answers;
            values.respondent_type = values.respondent_type || ({ Customer: 'customer', Developer: 'developer', 'Business partner': 'business' }[values.q1] || 'customer');
            values.experience = values.experience || ({ Excellent: 'excellent', Good: 'good', Okay: 'okay', Poor: 'poor' }[values.q7] || 'okay');
            values.favorite_feature = values.favorite_feature || 'design';
            values.improvements = values.improvements || values.q10;
            values.consent = values.consent === 'true';
            const response = await fetch('/api/survey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || 'Survey could not be submitted.');
            form.reset();
            device.value = detectedDevice;
            message.textContent = body.message;
            message.className = 'form-msg success';
        } catch (error) { message.textContent = error.message; message.className = 'form-msg error'; }
        finally { button.disabled = false; }
    });
});
