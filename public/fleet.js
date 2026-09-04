document.addEventListener('DOMContentLoaded', async () => {
    const list = document.getElementById('fleet-list');
    const filters = ['search', 'category', 'fuel', 'transmission', 'price'];
    let cars = [];
    const api = url => fetch(url).then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Unable to load the fleet.');
        return data;
    });
    function optionValues(id, values) {
        const select = document.getElementById(id);
        [...new Set(values)].sort().forEach(value => select.insertAdjacentHTML('beforeend', `<option value="${value}">${value}</option>`));
    }
    function render() {
        const search = document.getElementById('fleet-search').value.toLowerCase().trim();
        const category = document.getElementById('fleet-category').value;
        const fuel = document.getElementById('fleet-fuel').value;
        const transmission = document.getElementById('fleet-transmission').value;
        const price = Number(document.getElementById('fleet-price').value);
        const matching = cars.filter(car => (!search || car.name.toLowerCase().includes(search)) &&
            (!category || car.category === category) && (!fuel || car.fuel === fuel) &&
            (!transmission || car.transmission === transmission) && car.price_per_day <= price);
        document.getElementById('fleet-count').textContent = `${matching.length} vehicle${matching.length === 1 ? '' : 's'} found`;
        list.replaceChildren();
        matching.forEach(car => {
            const card = document.createElement('article');
            card.className = 'car-card';
            card.innerHTML = `<img class="car-image" src="${car.image_url}" alt="${car.name}" loading="lazy">
                <div class="car-details"><div class="car-header"><div><span class="car-category">${car.category}</span><h2 class="car-name">${car.name}</h2></div><div class="car-price">$${Number(car.price_per_day).toFixed(2)}<span>/day</span></div></div>
                <div class="car-specs"><div class="spec-item"><span class="spec-label">Transmission</span><span>${car.transmission}</span></div><div class="spec-item"><span class="spec-label">Seats</span><span>${car.seats}</span></div><div class="spec-item"><span class="spec-label">Fuel</span><span>${car.fuel}</span></div></div>
                <div class="fleet-card-actions"><a class="btn btn-primary" href="booking.html?id=${encodeURIComponent(car.id)}">Book now</a><a class="video-link" href="${car.video_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(car.name + ' driving review')}`}" target="_blank" rel="noopener">Watch real driving videos ↗</a></div></div>`;
            list.append(card);
        });
        if (!matching.length) list.innerHTML = '<p class="empty-state">No vehicles match those filters. Try widening your search.</p>';
    }
    try {
        cars = (await api('/api/cars')).cars;
        optionValues('fleet-category', cars.map(car => car.category));
        optionValues('fleet-fuel', cars.map(car => car.fuel));
        optionValues('fleet-transmission', cars.map(car => car.transmission));
        filters.forEach(name => document.getElementById(`fleet-${name}`).addEventListener('input', render));
        document.getElementById('fleet-filters').addEventListener('reset', () => setTimeout(render));
        document.getElementById('fleet-price').addEventListener('input', event => { document.getElementById('fleet-price-output').value = `$${event.target.value}/day`; });
        render();
    } catch (error) { list.textContent = error.message; }
});
