const apiBase = 'https://api.weather.gov';
const forecastEl = document.getElementById('forecast');
const errorMsgEl = document.getElementById('errorMsg');
const form = document.getElementById('locationForm');
const locationInput = document.getElementById('locationInput');
const currentInfo = document.getElementById('currentInfo');
const toggleUnitBtn = document.getElementById('toggleUnit');

let currentUnit = 'F'; // 'F' or 'C'
let currentForecast = null;

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    errorMsgEl.classList.add('d-none');
    currentInfo.innerHTML = '';
    forecastEl.innerHTML = '';
    const query = locationInput.value.trim();
    if (!query) return;

    try {
        // Get coordinates via Nominatim OpenStreetMap
        const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
        const geoRes = await fetch(geoUrl, {headers: {'User-Agent': 'weather-app-example'}});
        const geoData = await geoRes.json();
        if (!geoData.length) throw new Error('Location not found.');

        const { lat, lon, display_name } = geoData[0];
        // Get weather.gov forecast gridpoint
        const pointsRes = await fetch(`${apiBase}/points/${lat},${lon}`);
        if (!pointsRes.ok) throw new Error('Unable to retrieve weather for this location.');
        const pointsData = await pointsRes.json();
        const forecastUrl = pointsData.properties.forecast;

        // Fetch forecast data
        const fcRes = await fetch(forecastUrl);
        if (!fcRes.ok) throw new Error('Weather forecast data unavailable.');
        const fcData = await fcRes.json();

        currentForecast = fcData; // Save for toggle

        showForecast(fcData, display_name);

    } catch (err) {
        showError(err.message);
    }
});

toggleUnitBtn.addEventListener('click', function() {
    currentUnit = currentUnit === 'F' ? 'C' : 'F';
    if (currentForecast) {
        // Refresh forecast display
        showForecast(currentForecast, null);
    }
    toggleUnitBtn.textContent = currentUnit === 'F' ? '°F / °C' : '°C / °F';
});

function showError(msg) {
    errorMsgEl.textContent = msg;
    errorMsgEl.classList.remove('d-none');
}

function showForecast(data, locName) {
    const periods = data.properties.periods;
    const today = periods[0];
    setWeatherBackground(today.shortForecast);
    // Show current weather
    const now = new Date();
    let city = locName || '';
    let tonight = periods[1] && periods[1].name.toLowerCase().includes('night') ? periods[1] : null;

    currentInfo.innerHTML = `
        <div>${city ? `<b>${city}</b> - ` : ''}${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        <div>
            <b>Current:</b> ${today.shortForecast}, 
            ${convertTemp(today.temperature, today.temperatureUnit)}°${currentUnit}
            ${tonight ? `| <b>Tonight:</b> ${tonight.shortForecast}, ${convertTemp(tonight.temperature, tonight.temperatureUnit)}°${currentUnit}` : ''}
        </div>
    `;

    // Show 7-day forecast cards
    forecastEl.innerHTML = '';
    for (let i = 0, days = 0; i < periods.length && days < 7; i++) {
        let p = periods[i];
        // Only show daytime (skip nights unless user wants them)
        if (p.name.toLowerCase().includes('night')) continue;
        let night = periods[i+1] && periods[i+1].name.toLowerCase().includes('night') ? periods[i+1] : null;

        forecastEl.innerHTML += `
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <div class="card weather-card h-100 shadow-sm">
                    <div class="card-body text-center">
                        <h5 class="card-title">${p.name}</h5>
                        <img class="weather-icon mb-2" src="${p.icon}" alt="${p.shortForecast}">
                        <div class="mb-2">${p.shortForecast}</div>
                        <div>
                            <span class="fw-bold">${convertTemp(p.temperature, p.temperatureUnit)}°${currentUnit}</span>
                            <span class="text-secondary">High</span>
                        </div>
                        ${
                            night ?
                            `<div>
                                <span class="fw-bold">${convertTemp(night.temperature, night.temperatureUnit)}°${currentUnit}</span>
                                <span class="text-secondary">Low</span>
                            </div>`
                            : ''
                        }
                    </div>
                </div>
            </div>
        `;
        days++;
    }
}
function setWeatherBackground(shortForecast) {
    // Remove previous backgrounds
    document.body.classList.remove('bg-sunny', 'bg-cloudy', 'bg-rain', 'bg-snow', 'bg-thunder', 'bg-fog');

    // Simple logic: Check for keywords
    let bg = 'bg-sunny';
    const s = shortForecast.toLowerCase();
    if (s.includes('rain') || s.includes('showers') || s.includes('drizzle')) bg = 'bg-rain';
    else if (s.includes('cloud') || s.includes('overcast')) bg = 'bg-cloudy';
    else if (s.includes('snow') || s.includes('flurries')) bg = 'bg-snow';
    else if (s.includes('thunder')) bg = 'bg-thunder';
    else if (s.includes('fog') || s.includes('mist') || s.includes('haze')) bg = 'bg-fog';
    else if (s.includes('sun') || s.includes('clear')) bg = 'bg-sunny';

    document.body.classList.add(bg);

    // Remove old rain/snow elements if any
    document.querySelectorAll('.rain-drop, .snow-flake').forEach(e => e.remove());

    // Add simple animated elements for rain/snow
    if (bg === 'bg-rain') addRain();
    if (bg === 'bg-snow') addSnow();
}

function addRain() {
    for (let i = 0; i < 60; i++) {
        let drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = Math.random() * 100 + 'vw';
        drop.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
        drop.style.opacity = 0.2 + Math.random() * 0.6;
        document.body.appendChild(drop);
    }
}

function addSnow() {
    for (let i = 0; i < 30; i++) {
        let flake = document.createElement('div');
        flake.className = 'snow-flake';
        flake.style.left = Math.random() * 100 + 'vw';
        flake.style.animationDuration = (3 + Math.random() * 2) + 's';
        flake.style.opacity = 0.3 + Math.random() * 0.5;
        document.body.appendChild(flake);
    }
}

// Converts temp from F to C
function convertTemp(temp, unit) {
    if (currentUnit === 'F') {
        return unit === 'F' ? temp : Math.round((temp * 9/5) + 32);
    } else {
        return unit === 'C' ? temp : Math.round((temp - 32) * 5/9);
    }
}

const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const closeBtn = document.querySelector('.close');

document.querySelectorAll('.grid-img').forEach(img => {
  img.onclick = function() {
    modal.style.display = "flex";
    modalImg.src = this.src;
  }
});

closeBtn.onclick = function() {
  modal.style.display = "none";
}

modal.onclick = function(e) {
  if (e.target === modal) modal.style.display = "none";
}
