document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('review-access');
    const list = document.getElementById('review-list');
    const message = document.getElementById('review-message');
    let key = '';
    async function load() {
        const response = await fetch('/api/reviews/surveys', { headers: { 'x-review-key': key } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load responses.');
        list.replaceChildren();
        data.responses.forEach(item => {
            const card = document.createElement('article');
            card.className = 'review-card';
            let answers = {};
            try { answers = JSON.parse(item.answers || '{}'); } catch (_) {}
            const answerText = Object.entries(answers).map(([question, answer]) => `<p><b>${question.toUpperCase()}:</b> ${answer}</p>`).join('');
            card.innerHTML = `<div class="review-card-header"><strong>#${item.id} · ${item.respondent_type}</strong><span>${item.review_status}</span></div>${answerText}<p class="review-meta">${item.name || 'Anonymous'}${item.email ? ` · ${item.email}` : ''} · ${item.device} · ${item.created_at}</p><label>Status <select class="review-status"><option>New</option><option>In review</option><option>Planned</option><option>Resolved</option><option>Not planned</option></select></label><label>Notes <textarea class="review-notes" rows="3">${item.reviewer_notes || ''}</textarea></label><button class="btn btn-secondary review-save">Save review</button>`;
            card.querySelector('.review-status').value = item.review_status;
            card.querySelector('.review-save').addEventListener('click', async event => {
                event.target.disabled = true;
                try {
                    const result = await fetch(`/api/reviews/surveys/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-review-key': key }, body: JSON.stringify({ review_status: card.querySelector('.review-status').value, reviewer_notes: card.querySelector('.review-notes').value }) });
                    if (!result.ok) throw new Error((await result.json()).error || 'Unable to save review.');
                    event.target.textContent = 'Saved';
                } catch (error) { message.textContent = error.message; } finally { event.target.disabled = false; }
            });
            list.append(card);
        });
        if (!data.responses.length) list.textContent = 'No responses yet.';
    }
    form.addEventListener('submit', async event => { event.preventDefault(); key = document.getElementById('review-key').value; try { await load(); form.classList.add('hidden'); } catch (error) { message.textContent = error.message; } });
});
