var GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
var WTTR_URL = 'https://wttr.in';
var OPENMETEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Global error handler
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
    radarSlider: document.getElementById('radar-slider'),
    radarTimestamps: document.getElementById('radar-timestamps'),
    welcomeScreen: document.getElementById('welcome-screen'),
};

// WWO weather codes (used by wttr.in)
var weatherCodes = {
    113: { desc: 'Céu limpo', icon: '☀️' },
    116: { desc: 'Parcialmente nublado', icon: '⛅' },
    119: { desc: 'Nublado', icon: '☁️' },
    122: { desc: 'Encoberto', icon: '☁️' },
    143: { desc: 'Neblina', icon: '🌫️' },
    176: { desc: 'Chuva isolada', icon: '🌦️' },
    179: { desc: 'Neve isolada', icon: '🌨️' },
    182: { desc: 'Aguaceiro isolado', icon: '🌧️' },
    185: { desc: 'Garoa congelante', icon: '🌧️' },
    200: { desc: 'Trovoada', icon: '⛈️' },
    227: { desc: 'Nevasca leve', icon: '🌨️' },
    230: { desc: 'Nevasca', icon: '❄️' },
    248: { desc: 'Nevoeiro', icon: '🌫️' },
    260: { desc: 'Nevoeiro congelante', icon: '🌫️' },
    263: { desc: 'Garoa leve', icon: '🌦️' },
    266: { desc: 'Garoa', icon: '🌦️' },
    281: { desc: 'Garoa congelante', icon: '🌧️' },
    284: { desc: 'Garoa congelante forte', icon: '🌧️' },
    293: { desc: 'Chuva leve', icon: '🌦️' },
    296: { desc: 'Chuva leve', icon: '🌦️' },
    299: { desc: 'Chuva moderada', icon: '🌧️' },
    302: { desc: 'Chuva moderada', icon: '🌧️' },
    305: { desc: 'Chuva forte', icon: '🌧️' },
    308: { desc: 'Chuva forte', icon: '🌧️' },
    311: { desc: 'Chuva congelante', icon: '🌧️' },
    314: { desc: 'Chuva congelante forte', icon: '🌧️' },
    317: { desc: 'Granizo leve', icon: '🌨️' },
    320: { desc: 'Granizo', icon: '🌨️' },
    323: { desc: 'Neve leve', icon: '🌨️' },
    326: { desc: 'Neve leve', icon: '🌨️' },
    329: { desc: 'Neve moderada', icon: '🌨️' },
    332: { desc: 'Neve moderada', icon: '🌨️' },
    335: { desc: 'Neve forte', icon: '❄️' },
    338: { desc: 'Neve forte', icon: '❄️' },
    350: { desc: 'Granizo', icon: '🌨️' },
    353: { desc: 'Pancadas leves', icon: '🌦️' },
    356: { desc: 'Pancadas moderadas', icon: '🌧️' },
    359: { desc: 'Pancadas fortes', icon: '⛈️' },
    362: { desc: 'Pancadas de granizo', icon: '🌨️' },
    365: { desc: 'Pancadas de granizo forte', icon: '🌨️' },
    368: { desc: 'Neve leve', icon: '🌨️' },
    371: { desc: 'Neve forte', icon: '❄️' },
    374: { desc: 'Granizo leve', icon: '🌨️' },
    377: { desc: 'Granizo forte', icon: '🌨️' },
    386: { desc: 'Trovoada com chuva', icon: '⛈️' },
    389: { desc: 'Trovoada forte', icon: '⛈️' },
    392: { desc: 'Trovoada com neve', icon: '⛈️' },
    395: { desc: 'Nevasca com trovoada', icon: '⛈️' },
};

function getWeatherInfo(code) {
    return weatherCodes[code] || { desc: 'Desconhecido', icon: '❓' };
}

// Native HTTP bridge
function nativeGet(url, callback) {
    if (typeof NativeBridge !== 'undefined') {
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
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.timeout = 15000;
        xhr.onload = function() {
            try { callback(null, JSON.parse(xhr.responseText)); }
            catch(e) { callback('Erro: ' + e.message, null); }
        };
        xhr.onerror = function() { callback('Erro de conexão', null); };
        xhr.ontimeout = function() { callback('Timeout', null); };
        xhr.send();
    }
}

var searchTimeout = null;

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
    showLoading();
    navigator.geolocation.getCurrentPosition(
        function(pos) { fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Sua Localização'); },
        function() { showError('Não foi possível obter sua localização.'); }
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

function fetchWeather(lat, lon, name) {
    showLoading();
    // Use wttr.in with lat,lon format - returns JSON weather data
    var url = WTTR_URL + '/' + lat + ',' + lon + '?format=j1';
    nativeGet(url, function(err, data) {
        if (err) {
            showError('Erro ao buscar clima: ' + err);
            return;
        }
        if (!data.current_condition || data.current_condition.length === 0) {
            showError('Dados meteorológicos indisponíveis.');
            return;
        }
        renderWeather(data, name, lat, lon);
    });
}

function renderWeather(data, name, lat, lon) {
    hideLoading();
    elements.error.classList.add('hidden');
    elements.content.classList.remove('hidden');
    elements.welcomeScreen.classList.add('hidden');

    var current = data.current_condition[0];
    var code = parseInt(current.weatherCode) || 113;
    var weather = getWeatherInfo(code);

    // Current conditions
    elements.cityName.textContent = name;
    elements.currentDate.textContent = formatDate(new Date());
    elements.weatherIcon.textContent = weather.icon;
    elements.currentTemp.textContent = current.temp_C + '°C';
    elements.weatherDesc.textContent = current.lang_pt && current.lang_pt[0] ? current.lang_pt[0].value : weather.desc;
    elements.feelsLike.textContent = current.FeelsLikeC + '°C';
    elements.humidity.textContent = current.humidity + '%';
    elements.wind.textContent = current.windspeedKmph + ' km/h';
    elements.precipitation.textContent = current.precipMM + ' mm';
    elements.uvIndex.textContent = current.uvIndex;
    elements.visibility.textContent = current.visibility + ' km';

    // Hourly forecast (wttr.in gives 8 points per day, every 3 hours)
    elements.hourlyContainer.innerHTML = '';
    var now = new Date();
    var currentHour = now.getHours();
    var allHourly = [];

    // Collect hourly from all days
    data.weather.forEach(function(day, dayIdx) {
        if (day.hourly) {
            day.hourly.forEach(function(h) {
                var hour = parseInt(h.time) / 100; // "0"->0, "300"->3, "600"->6
                allHourly.push({
                    hour: hour,
                    dayIdx: dayIdx,
                    temp: h.tempC,
                    code: parseInt(h.weatherCode) || 113,
                    desc: h.lang_pt && h.lang_pt[0] ? h.lang_pt[0].value : ''
                });
            });
        }
    });

    // Filter to show from current hour onwards
    var shown = 0;
    allHourly.forEach(function(h) {
        if (shown >= 8) return; // Show max 8 cards
        if (h.dayIdx === 0 && h.hour < currentHour - 1) return; // Skip past hours
        var hourWeather = getWeatherInfo(h.code);
        var card = document.createElement('div');
        card.className = 'hour-card';
        var label = (shown === 0) ? 'Agora' : h.hour.toString().padStart(2, '0') + ':00';
        card.innerHTML =
            '<div class="time">' + label + '</div>' +
            '<div class="icon">' + hourWeather.icon + '</div>' +
            '<div class="temp">' + Math.round(parseFloat(h.temp)) + '°</div>';
        elements.hourlyContainer.appendChild(card);
        shown++;
    });

    // Daily forecast - 7 days from Open-Meteo
    elements.dailyContainer.innerHTML = '';
    fetch7DayForecast(lat, lon);

    // Initialize radar
    if (typeof L !== 'undefined') {
        initRadar(lat, lon);
    } else {
        try { document.querySelector('.radar-section').style.display = 'none'; } catch(e) {}
    }
}

// WMO weather code mapping for Open-Meteo
var wmoWeatherCodes = {
    0: { desc: 'Céu limpo', icon: '☀️' },
    1: { desc: 'Predominantemente limpo', icon: '🌤️' },
    2: { desc: 'Parcialmente nublado', icon: '⛅' },
    3: { desc: 'Nublado', icon: '☁️' },
    45: { desc: 'Neblina', icon: '🌫️' },
    48: { desc: 'Neblina com geada', icon: '🌫️' },
    51: { desc: 'Garoa leve', icon: '🌦️' },
    53: { desc: 'Garoa moderada', icon: '🌦️' },
    55: { desc: 'Garoa intensa', icon: '🌧️' },
    61: { desc: 'Chuva leve', icon: '🌦️' },
    63: { desc: 'Chuva moderada', icon: '🌧️' },
    65: { desc: 'Chuva forte', icon: '🌧️' },
    71: { desc: 'Neve leve', icon: '🌨️' },
    73: { desc: 'Neve moderada', icon: '🌨️' },
    75: { desc: 'Neve forte', icon: '❄️' },
    80: { desc: 'Pancadas leves', icon: '🌦️' },
    81: { desc: 'Pancadas moderadas', icon: '🌧️' },
    82: { desc: 'Pancadas fortes', icon: '⛈️' },
    95: { desc: 'Tempestade', icon: '⛈️' },
    96: { desc: 'Tempestade com granizo', icon: '⛈️' },
    99: { desc: 'Tempestade com granizo forte', icon: '⛈️' }
};

function getWmoWeather(code) {
    return wmoWeatherCodes[code] || { desc: 'Desconhecido', icon: '🌡️' };
}

function fetch7DayForecast(lat, lon) {
    var url = OPENMETEO_URL + '?latitude=' + lat + '&longitude=' + lon +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max,precipitation_probability_max,sunrise,sunset' +
        '&timezone=auto&forecast_days=7';

    nativeGet(url, function(err, data) {
        if (err || !data.daily) {
            // Fallback - show empty
            return;
        }

        var daily = data.daily;
        var dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        elements.dailyContainer.innerHTML = '';

        for (var i = 0; i < daily.time.length; i++) {
            var date = new Date(daily.time[i] + 'T00:00:00');
            var wmoCode = daily.weather_code[i];
            var weather = getWmoWeather(wmoCode);
            var maxTemp = Math.round(daily.temperature_2m_max[i]);
            var minTemp = Math.round(daily.temperature_2m_min[i]);
            var precip = daily.precipitation_sum[i];
            var windMax = Math.round(daily.wind_speed_10m_max[i]);
            var windDir = daily.wind_direction_10m_dominant[i];
            var uvMax = daily.uv_index_max[i];
            var precipProb = daily.precipitation_probability_max[i];
            var sunrise = daily.sunrise[i] ? daily.sunrise[i].split('T')[1] : '--:--';
            var sunset = daily.sunset[i] ? daily.sunset[i].split('T')[1] : '--:--';

            var windDirText = getWindDirection(windDir);

            var card = document.createElement('div');
            card.className = 'day-card';
            card.innerHTML =
                '<div class="day-card-header">' +
                    '<div class="day-name">' + (i === 0 ? 'Hoje' : dayNames[date.getDay()] + ' ' + date.getDate()) + '</div>' +
                    '<div class="icon">' + weather.icon + '</div>' +
                    '<div class="desc">' + weather.desc + '</div>' +
                    '<div class="temps">' +
                        '<span class="temp-max">' + maxTemp + '°</span>' +
                        '<span class="temp-min">' + minTemp + '°</span>' +
                    '</div>' +
                    '<span class="expand-arrow">▼</span>' +
                '</div>' +
                '<div class="day-card-details">' +
                    '<div class="day-detail-grid">' +
                        '<div class="day-detail-item"><span class="label">Chuva</span><span class="value">' + precip + ' mm</span></div>' +
                        '<div class="day-detail-item"><span class="label">Prob. Chuva</span><span class="value">' + precipProb + '%</span></div>' +
                        '<div class="day-detail-item"><span class="label">Vento Máx</span><span class="value">' + windMax + ' km/h</span></div>' +
                        '<div class="day-detail-item"><span class="label">Dir. Vento</span><span class="value">' + windDirText + '</span></div>' +
                        '<div class="day-detail-item"><span class="label">UV Máx</span><span class="value">' + uvMax + '</span></div>' +
                        '<div class="day-detail-item"><span class="label">Amplitude</span><span class="value">' + (maxTemp - minTemp) + '°C</span></div>' +
                        '<div class="day-detail-item"><span class="label">Nascer do Sol</span><span class="value">' + sunrise + '</span></div>' +
                        '<div class="day-detail-item"><span class="label">Pôr do Sol</span><span class="value">' + sunset + '</span></div>' +
                        '<div class="day-detail-item"><span class="label">Condição</span><span class="value">' + weather.desc + '</span></div>' +
                    '</div>' +
                '</div>';

            card.addEventListener('click', function() {
                this.classList.toggle('expanded');
            });

            elements.dailyContainer.appendChild(card);
        }
    });
}

function getWindDirection(degrees) {
    if (degrees == null) return '--';
    var dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
    var idx = Math.round(degrees / 45) % 8;
    return dirs[idx];
}

function formatDate(date) {
    var options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('pt-BR', options);
}

function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.content.classList.add('hidden');
    elements.error.classList.add('hidden');
    elements.welcomeScreen.classList.add('hidden');
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

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-box') && !e.target.closest('.suggestions')) {
        elements.suggestions.classList.add('hidden');
    }
});

// ---- Radar de Chuva ao Vivo (RainViewer) ----

var RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';
var radarMap = null;
var radarLayers = [];
var radarFrames = [];
var radarPastCount = 0;
var radarIndex = 0;
var radarInterval = null;
var radarPlaying = false;

function initRadar(lat, lon) {
    if (typeof L === 'undefined') return;

    try {
        document.querySelector('.radar-section').style.display = '';

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
        radarPastCount = 0;
        radarIndex = 0;
        stopRadarAnimation();

        // Fetch radar data via NativeBridge
        nativeGet(RAINVIEWER_URL, function(err, data) {
            if (err) {
                elements.radarTime.textContent = 'Indisponível';
                return;
            }
            try {
                var past = data.radar.past || [];
                var nowcast = data.radar.nowcast || [];
                radarPastCount = past.length;
                radarFrames = past.concat(nowcast);

                radarFrames.forEach(function(frame) {
                    var layer = L.tileLayer(
                        data.host + frame.path + '/256/{z}/{x}/{y}/4/1_1.png',
                        { opacity: 0, zIndex: 10 }
                    );
                    radarLayers.push(layer);
                    layer.addTo(radarMap);
                });

                // Setup slider
                var slider = elements.radarSlider;
                slider.max = radarFrames.length - 1;

                // Build timestamp ticks
                buildRadarTimestamps();

                if (radarLayers.length > 0) {
                    radarIndex = radarPastCount > 0 ? radarPastCount - 1 : 0;
                    slider.value = radarIndex;
                    showRadarFrame(radarIndex);
                }
            } catch(e) {
                elements.radarTime.textContent = 'Indisponível';
            }
        });

        // Fix map rendering
        setTimeout(function() { if (radarMap) radarMap.invalidateSize(); }, 200);
    } catch(e) {
        elements.radarTime.textContent = 'Indisponível';
    }
}

function buildRadarTimestamps() {
    var container = elements.radarTimestamps;
    container.innerHTML = '';
    var total = radarFrames.length;
    if (total === 0) return;

    // Show ~5 evenly spaced labels
    var labelCount = Math.min(5, total);
    var step = (total - 1) / (labelCount - 1);

    for (var i = 0; i < labelCount; i++) {
        var idx = Math.round(i * step);
        var frame = radarFrames[idx];
        var date = new Date(frame.time * 1000);
        var timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        var span = document.createElement('span');
        span.textContent = timeStr;
        // Mark the "now" boundary
        if (idx === radarPastCount - 1) {
            span.className = 'now-marker';
            span.textContent = 'Agora';
        }
        container.appendChild(span);
    }
}

function showRadarFrame(index) {
    radarLayers.forEach(function(layer, i) {
        layer.setOpacity(i === index ? 0.6 : 0);
    });

    // Update slider position
    elements.radarSlider.value = index;

    if (radarFrames[index]) {
        var date = new Date(radarFrames[index].time * 1000);
        var timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        var isForecast = index >= radarPastCount;
        elements.radarTime.textContent = timeStr + (isForecast ? ' ⟩' : '');
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
    elements.radarPlay.textContent = '⏸';
    radarInterval = setInterval(function() {
        radarIndex = (radarIndex + 1) % radarFrames.length;
        showRadarFrame(radarIndex);
    }, 800);
}

function stopRadarAnimation() {
    radarPlaying = false;
    elements.radarPlay.textContent = '▶';
    clearInterval(radarInterval);
    radarInterval = null;
}

// Slider drag
elements.radarSlider.addEventListener('input', function() {
    radarIndex = parseInt(this.value, 10);
    showRadarFrame(radarIndex);
    // Pause animation when user drags
    if (radarPlaying) stopRadarAnimation();
});

elements.radarPlay.addEventListener('click', toggleRadarAnimation);
