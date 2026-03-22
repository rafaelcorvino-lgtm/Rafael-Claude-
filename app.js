var GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
var WEATHER_URL = 'http://api.open-meteo.com/v1/forecast';
var RAINVIEWER_URL = 'http://api.rainviewer.com/public/weather-maps.json';

// Global error handler - shows errors on screen for debugging
window.onerror = function(msg, url, line) {
    var errDiv = document.getElementById('error');
    if (errDiv) {
        errDiv.textContent = 'Erro: ' + msg + ' (linha ' + line + ')';
        errDiv.classList.remove('hidden');
    }
    return false;
};

var elements = {
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
    radarMap: document.getElementById('radar-map'),
    radarPlay: document.getElementById('radar-play'),
    radarTime: document.getElementById('radar-time'),
};

var weatherCodes = {
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

// Native HTTP bridge - uses Android's HttpURLConnection via JavaScriptInterface
// This bypasses WebView network restrictions
function nativeGet(url, callback) {
    if (typeof NativeBridge !== 'undefined') {
        // Run on a separate thread via setTimeout to not block UI
        setTimeout(function() {
            try {
                var response = NativeBridge.httpGet(url);
                var data = JSON.parse(response);
                if (data._error) {
                    callback(data._message, null);
                } else {
                    callback(null, data);
                }
            } catch(e) {
                callback('Erro ao processar: ' + e.message, null);
            }
        }, 0);
    } else {
        // Fallback to XHR (for browser testing)
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.timeout = 15000;
        xhr.onload = function() {
            try {
                callback(null, JSON.parse(xhr.responseText));
            } catch(e) {
                callback('Erro ao processar: ' + e.message, null);
            }
        };
        xhr.onerror = function() { callback('Erro de conexão', null); };
        xhr.ontimeout = function() { callback('Timeout', null); };
        xhr.send();
    }
}

var searchTimeout = null;

// Search city
elements.cityInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    var query = elements.cityInput.value.trim();
    if (query.length < 2) {
        elements.suggestions.classList.add('hidden');
        return;
    }
    searchTimeout = setTimeout(function() { searchCities(query); }, 300);
});

elements.cityInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        elements.suggestions.classList.add('hidden');
        var query = elements.cityInput.value.trim();
        if (query) searchAndFetch(query);
    }
});

elements.searchBtn.addEventListener('click', function() {
    var query = elements.cityInput.value.trim();
    if (query) searchAndFetch(query);
});

elements.locationBtn.addEventListener('click', function() {
    if (!navigator.geolocation) {
        showError('Geolocalização não suportada.');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function(pos) { fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Sua Localização'); },
        function() { showError('Não foi possível obter sua localização. Verifique as permissões.'); }
    );
});

function searchCities(query) {
    var url = GEOCODING_URL + '?name=' + encodeURIComponent(query) + '&count=5&language=pt';
    nativeGet(url, function(err, data) {
        if (err || !data.results || data.results.length === 0) {
            elements.suggestions.classList.add('hidden');
            return;
        }
        elements.suggestions.innerHTML = '';
        data.results.forEach(function(city) {
            var li = document.createElement('li');
            li.innerHTML = city.name + ' <span class="country">' + (city.admin1 || '') + ', ' + (city.country || '') + '</span>';
            li.addEventListener('click', function() {
                elements.cityInput.value = city.name;
                elements.suggestions.classList.add('hidden');
                fetchWeather(city.latitude, city.longitude, city.name + ', ' + (city.country || ''));
            });
            elements.suggestions.appendChild(li);
        });
        elements.suggestions.classList.remove('hidden');
    });
}

function searchAndFetch(query) {
    showLoading();
    var url = GEOCODING_URL + '?name=' + encodeURIComponent(query) + '&count=1&language=pt';
    showDebug('Buscando cidade...');
    nativeGet(url, function(err, data) {
        if (err) {
            showError('Erro ao buscar cidade: ' + err);
            return;
        }
        if (!data.results || data.results.length === 0) {
            showError('Cidade "' + query + '" não encontrada.');
            return;
        }
        var city = data.results[0];
        fetchWeather(city.latitude, city.longitude, city.name + ', ' + (city.country || ''));
    });
}

function showDebug(msg) {
    var errDiv = document.getElementById('error');
    if (errDiv) {
        errDiv.textContent = msg;
        errDiv.classList.remove('hidden');
        errDiv.style.color = '#4fc3f7';
    }
}

function fetchWeather(lat, lon, name) {
    showLoading();
    showDebug('Carregando clima...');
    var params = 'latitude=' + lat + '&longitude=' + lon +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index,visibility' +
        '&hourly=temperature_2m,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
        '&timezone=auto&forecast_days=7';

    nativeGet(WEATHER_URL + '?' + params, function(err, data) {
        if (err) {
            showError('Erro ao buscar clima: ' + err);
            return;
        }
        renderWeather(data, name);
    });
}

function renderWeather(data, name) {
    hideLoading();
    elements.error.classList.add('hidden');
    elements.content.classList.remove('hidden');

    var current = data.current;
    var weather = getWeatherInfo(current.weather_code);

    // Current
    elements.cityName.textContent = name;
    elements.currentDate.textContent = formatDate(new Date());
    elements.weatherIcon.textContent = weather.icon;
    elements.currentTemp.textContent = Math.round(current.temperature_2m) + '°C';
    elements.weatherDesc.textContent = weather.desc;
    elements.feelsLike.textContent = Math.round(current.apparent_temperature) + '°C';
    elements.humidity.textContent = current.relative_humidity_2m + '%';
    elements.wind.textContent = Math.round(current.wind_speed_10m) + ' km/h';
    elements.precipitation.textContent = current.precipitation + ' mm';
    elements.uvIndex.textContent = Math.round(current.uv_index);
    elements.visibility.textContent = (current.visibility / 1000).toFixed(1) + ' km';

    // Hourly (next 24h)
    elements.hourlyContainer.innerHTML = '';
    var currentHour = new Date().getHours();
    for (var i = 0; i < 24; i++) {
        var idx = currentHour + i;
        if (idx >= data.hourly.time.length) break;
        var hourWeather = getWeatherInfo(data.hourly.weather_code[idx]);
        var time = new Date(data.hourly.time[idx]);
        var card = document.createElement('div');
        card.className = 'hour-card';
        card.innerHTML =
            '<div class="time">' + (i === 0 ? 'Agora' : time.getHours().toString().padStart(2, '0') + ':00') + '</div>' +
            '<div class="icon">' + hourWeather.icon + '</div>' +
            '<div class="temp">' + Math.round(data.hourly.temperature_2m[idx]) + '°</div>';
        elements.hourlyContainer.appendChild(card);
    }

    // Daily
    elements.dailyContainer.innerHTML = '';
    var dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    data.daily.time.forEach(function(dateStr, i) {
        var date = new Date(dateStr + 'T00:00:00');
        var dayWeather = getWeatherInfo(data.daily.weather_code[i]);
        var card = document.createElement('div');
        card.className = 'day-card';
        card.innerHTML =
            '<div class="day-name">' + (i === 0 ? 'Hoje' : dayNames[date.getDay()]) + '</div>' +
            '<div class="icon">' + dayWeather.icon + '</div>' +
            '<div class="desc">' + dayWeather.desc + '</div>' +
            '<div class="temps">' +
                '<span class="temp-max">' + Math.round(data.daily.temperature_2m_max[i]) + '°</span>' +
                '<span class="temp-min">' + Math.round(data.daily.temperature_2m_min[i]) + '°</span>' +
            '</div>';
        elements.dailyContainer.appendChild(card);
    });

    // Radar - only if Leaflet loaded successfully
    try {
        if (typeof L !== 'undefined') {
            initRadar(data.latitude, data.longitude);
        } else {
            elements.radarTime.textContent = 'Radar indisponível (sem mapa)';
            document.querySelector('.radar-section').style.display = 'none';
        }
    } catch(e) {
        elements.radarTime.textContent = 'Radar indisponível';
    }
}

function formatDate(date) {
    var options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
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
    elements.error.style.color = '';
    elements.error.classList.remove('hidden');
}

// Close suggestions on click outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-box') && !e.target.closest('.suggestions')) {
        elements.suggestions.classList.add('hidden');
    }
});

// ---- Radar Meteorológico (RainViewer) ----

var radarMap = null;
var radarLayers = [];
var radarFrames = [];
var radarIndex = 0;
var radarInterval = null;
var radarPlaying = false;

function initRadar(lat, lon) {
    if (typeof L === 'undefined') return;

    try {
        // Initialize or update map
        if (radarMap) {
            radarMap.setView([lat, lon], 7);
        } else {
            radarMap = L.map('radar-map', {
                zoomControl: true,
                attributionControl: false,
            }).setView([lat, lon], 7);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 18,
            }).addTo(radarMap);
        }

        // Clear old radar layers
        radarLayers.forEach(function(layer) { radarMap.removeLayer(layer); });
        radarLayers = [];
        radarFrames = [];
        radarIndex = 0;
        stopRadarAnimation();

        nativeGet(RAINVIEWER_URL, function(err, data) {
            if (err) {
                elements.radarTime.textContent = 'Radar indisponível';
                return;
            }
            try {
                var past = data.radar.past || [];
                var nowcast = data.radar.nowcast || [];
                radarFrames = past.concat(nowcast);

                radarFrames.forEach(function(frame) {
                    var layer = L.tileLayer(
                        data.host + frame.path + '/256/{z}/{x}/{y}/4/1_1.png',
                        { opacity: 0, zIndex: 10 }
                    );
                    radarLayers.push(layer);
                    layer.addTo(radarMap);
                });

                if (radarLayers.length > 0) {
                    radarIndex = past.length > 0 ? past.length - 1 : 0;
                    showRadarFrame(radarIndex);
                }
            } catch(e) {
                elements.radarTime.textContent = 'Radar indisponível';
            }
        });

        // Fix map rendering after container becomes visible
        setTimeout(function() { if (radarMap) radarMap.invalidateSize(); }, 100);
    } catch(e) {
        elements.radarTime.textContent = 'Radar indisponível';
    }
}

function showRadarFrame(index) {
    radarLayers.forEach(function(layer, i) {
        layer.setOpacity(i === index ? 0.6 : 0);
    });

    if (radarFrames[index]) {
        var date = new Date(radarFrames[index].time * 1000);
        var timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        var isPast = index < radarFrames.length - (radarFrames.length > 3 ? 3 : 0);
        elements.radarTime.textContent = timeStr + (isPast ? '' : ' (previsão)');
    }
}

function toggleRadarAnimation() {
    if (radarPlaying) {
        stopRadarAnimation();
    } else {
        startRadarAnimation();
    }
}

function startRadarAnimation() {
    if (radarLayers.length === 0) return;
    radarPlaying = true;
    elements.radarPlay.textContent = '⏸️';
    radarInterval = setInterval(function() {
        radarIndex = (radarIndex + 1) % radarFrames.length;
        showRadarFrame(radarIndex);
    }, 800);
}

function stopRadarAnimation() {
    radarPlaying = false;
    elements.radarPlay.textContent = '▶️';
    clearInterval(radarInterval);
    radarInterval = null;
}

elements.radarPlay.addEventListener('click', toggleRadarAnimation);
