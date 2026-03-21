const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

const elements = {
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    locationBtn: document.getElementById('location-btn'),
    suggestions: document.getElementById('suggestions'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    content: document.getElementById('weather-content'),
    cityName: document.getElementById('city-name'),
    currentDate: document.getElementById('current-date'),
    weatherIcon: document.getElementById('weather-icon'),
    currentTemp: document.getElementById('current-temp'),
    weatherDesc: document.getElementById('weather-desc'),
    feelsLike: document.getElementById('feels-like'),
    humidity: document.getElementById('humidity'),
    wind: document.getElementById('wind'),
    precipitation: document.getElementById('precipitation'),
    uvIndex: document.getElementById('uv-index'),
    visibility: document.getElementById('visibility'),
    hourlyContainer: document.getElementById('hourly-container'),
    dailyContainer: document.getElementById('daily-container'),
};

const weatherCodes = {
    0: { desc: 'Céu limpo', icon: '☀️' },
    1: { desc: 'Principalmente limpo', icon: '🌤️' },
    2: { desc: 'Parcialmente nublado', icon: '⛅' },
    3: { desc: 'Nublado', icon: '☁️' },
    45: { desc: 'Nevoeiro', icon: '🌫️' },
    48: { desc: 'Nevoeiro com geada', icon: '🌫️' },
    51: { desc: 'Garoa leve', icon: '🌦️' },
    53: { desc: 'Garoa moderada', icon: '🌦️' },
    55: { desc: 'Garoa intensa', icon: '🌧️' },
    56: { desc: 'Garoa congelante leve', icon: '🌧️' },
    57: { desc: 'Garoa congelante intensa', icon: '🌧️' },
    61: { desc: 'Chuva leve', icon: '🌦️' },
    63: { desc: 'Chuva moderada', icon: '🌧️' },
    65: { desc: 'Chuva forte', icon: '🌧️' },
    66: { desc: 'Chuva congelante leve', icon: '🌧️' },
    67: { desc: 'Chuva congelante forte', icon: '🌧️' },
    71: { desc: 'Neve leve', icon: '🌨️' },
    73: { desc: 'Neve moderada', icon: '🌨️' },
    75: { desc: 'Neve forte', icon: '❄️' },
    77: { desc: 'Grãos de neve', icon: '❄️' },
    80: { desc: 'Pancadas de chuva leves', icon: '🌦️' },
    81: { desc: 'Pancadas de chuva moderadas', icon: '🌧️' },
    82: { desc: 'Pancadas de chuva fortes', icon: '⛈️' },
    85: { desc: 'Pancadas de neve leves', icon: '🌨️' },
    86: { desc: 'Pancadas de neve fortes', icon: '❄️' },
    95: { desc: 'Trovoada', icon: '⛈️' },
    96: { desc: 'Trovoada com granizo leve', icon: '⛈️' },
    99: { desc: 'Trovoada com granizo forte', icon: '⛈️' },
};

function getWeatherInfo(code) {
    return weatherCodes[code] || { desc: 'Desconhecido', icon: '❓' };
}

let searchTimeout = null;

// Search city
elements.cityInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = elements.cityInput.value.trim();
    if (query.length < 2) {
        elements.suggestions.classList.add('hidden');
        return;
    }
    searchTimeout = setTimeout(() => searchCities(query), 300);
});

elements.cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        elements.suggestions.classList.add('hidden');
        const query = elements.cityInput.value.trim();
        if (query) searchAndFetch(query);
    }
});

elements.searchBtn.addEventListener('click', () => {
    const query = elements.cityInput.value.trim();
    if (query) searchAndFetch(query);
});

elements.locationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showError('Geolocalização não suportada pelo navegador.');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Sua Localização'),
        () => showError('Não foi possível obter sua localização. Verifique as permissões.')
    );
});

async function searchCities(query) {
    try {
        const res = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=pt`);
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            elements.suggestions.classList.add('hidden');
            return;
        }
        elements.suggestions.innerHTML = '';
        data.results.forEach((city) => {
            const li = document.createElement('li');
            li.innerHTML = `${city.name} <span class="country">${city.admin1 || ''}, ${city.country || ''}</span>`;
            li.addEventListener('click', () => {
                elements.cityInput.value = city.name;
                elements.suggestions.classList.add('hidden');
                fetchWeather(city.latitude, city.longitude, `${city.name}, ${city.country || ''}`);
            });
            elements.suggestions.appendChild(li);
        });
        elements.suggestions.classList.remove('hidden');
    } catch {
        elements.suggestions.classList.add('hidden');
    }
}

async function searchAndFetch(query) {
    try {
        const res = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=1&language=pt`);
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            showError(`Cidade "${query}" não encontrada.`);
            return;
        }
        const city = data.results[0];
        fetchWeather(city.latitude, city.longitude, `${city.name}, ${city.country || ''}`);
    } catch {
        showError('Erro ao buscar a cidade. Verifique sua conexão.');
    }
}

async function fetchWeather(lat, lon, name) {
    showLoading();
    try {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index,visibility',
            hourly: 'temperature_2m,weather_code',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min',
            timezone: 'auto',
            forecast_days: '7',
        });

        const res = await fetch(`${WEATHER_URL}?${params}`);
        if (!res.ok) throw new Error('Erro na API');
        const data = await res.json();
        renderWeather(data, name);
    } catch {
        showError('Erro ao obter dados meteorológicos. Tente novamente.');
    }
}

function renderWeather(data, name) {
    hideLoading();
    elements.error.classList.add('hidden');
    elements.content.classList.remove('hidden');

    const current = data.current;
    const weather = getWeatherInfo(current.weather_code);

    // Current
    elements.cityName.textContent = name;
    elements.currentDate.textContent = formatDate(new Date());
    elements.weatherIcon.textContent = weather.icon;
    elements.currentTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
    elements.weatherDesc.textContent = weather.desc;
    elements.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;
    elements.humidity.textContent = `${current.relative_humidity_2m}%`;
    elements.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    elements.precipitation.textContent = `${current.precipitation} mm`;
    elements.uvIndex.textContent = Math.round(current.uv_index);
    elements.visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;

    // Hourly (next 24h)
    elements.hourlyContainer.innerHTML = '';
    const currentHour = new Date().getHours();
    for (let i = 0; i < 24; i++) {
        const idx = currentHour + i;
        if (idx >= data.hourly.time.length) break;
        const hourWeather = getWeatherInfo(data.hourly.weather_code[idx]);
        const time = new Date(data.hourly.time[idx]);
        const card = document.createElement('div');
        card.className = 'hour-card';
        card.innerHTML = `
            <div class="time">${i === 0 ? 'Agora' : time.getHours().toString().padStart(2, '0') + ':00'}</div>
            <div class="icon">${hourWeather.icon}</div>
            <div class="temp">${Math.round(data.hourly.temperature_2m[idx])}°</div>
        `;
        elements.hourlyContainer.appendChild(card);
    }

    // Daily
    elements.dailyContainer.innerHTML = '';
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    data.daily.time.forEach((dateStr, i) => {
        const date = new Date(dateStr + 'T00:00:00');
        const dayWeather = getWeatherInfo(data.daily.weather_code[i]);
        const card = document.createElement('div');
        card.className = 'day-card';
        card.innerHTML = `
            <div class="day-name">${i === 0 ? 'Hoje' : dayNames[date.getDay()]}</div>
            <div class="icon">${dayWeather.icon}</div>
            <div class="desc">${dayWeather.desc}</div>
            <div class="temps">
                <span class="temp-max">${Math.round(data.daily.temperature_2m_max[i])}°</span>
                <span class="temp-min">${Math.round(data.daily.temperature_2m_min[i])}°</span>
            </div>
        `;
        elements.dailyContainer.appendChild(card);
    });
}

function formatDate(date) {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('pt-BR', options);
}

function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.content.classList.add('hidden');
    elements.error.classList.add('hidden');
}

function hideLoading() {
    elements.loading.classList.add('hidden');
}

function showError(msg) {
    hideLoading();
    elements.content.classList.add('hidden');
    elements.error.textContent = msg;
    elements.error.classList.remove('hidden');
}

// Close suggestions on click outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box') && !e.target.closest('.suggestions')) {
        elements.suggestions.classList.add('hidden');
    }
});
