var GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
var WTTR_URL = 'https://wttr.in';
var TIMER7_URL = 'http://www.7timer.info/bin/civillight.php';

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
        // Fetch 7-day forecast from 7timer.info (same nativeGet that works for wttr.in)
        fetch7DayFrom7Timer(lat, lon);
    });
}

// 7timer weather string to icon/description mapping
var timer7Weather = {
    'clear': { icon: '☀️', desc: 'Céu limpo' },
    'pcloudy': { icon: '🌤️', desc: 'Parcialmente nublado' },
    'mcloudy': { icon: '⛅', desc: 'Nublado parcial' },
    'cloudy': { icon: '☁️', desc: 'Nublado' },
    'humid': { icon: '🌫️', desc: 'Úmido' },
    'lightrain': { icon: '🌦️', desc: 'Chuva leve' },
    'oshower': { icon: '🌦️', desc: 'Pancadas ocasionais' },
    'ishower': { icon: '🌦️', desc: 'Pancadas isoladas' },
    'lightsnow': { icon: '🌨️', desc: 'Neve leve' },
    'rain': { icon: '🌧️', desc: 'Chuva' },
    'snow': { icon: '❄️', desc: 'Neve' },
    'rainsnow': { icon: '🌨️', desc: 'Chuva com neve' },
    'ts': { icon: '⛈️', desc: 'Tempestade' },
    'tsrain': { icon: '⛈️', desc: 'Tempestade com chuva' }
};

function fetch7DayFrom7Timer(lat, lon) {
    var url = TIMER7_URL + '?lon=' + lon + '&lat=' + lat + '&ac=0&unit=metric&output=json';
    console.log('Fetching 7timer: ' + url);
    nativeGet(url, function(err, data) {
        if (err) {
            console.log('7timer error: ' + err);
            return;
        }
        if (!data || !data.dataseries || data.dataseries.length === 0) {
            console.log('7timer: no dataseries');
            return;
        }
        console.log('7timer: got ' + data.dataseries.length + ' days');
        var series = data.dataseries;
        // Ensure we have at least 8 days by duplicating last day if needed
        while (series.length < 8 && series.length > 0) {
            var last = series[series.length - 1];
            var lastDate = String(last.date);
            var y = parseInt(lastDate.substring(0, 4));
            var m = parseInt(lastDate.substring(4, 6)) - 1;
            var d = parseInt(lastDate.substring(6, 8));
            var nextDate = new Date(y, m, d + 1);
            var nextDateStr = nextDate.getFullYear() * 10000 + (nextDate.getMonth() + 1) * 100 + nextDate.getDate();
            series.push({
                date: nextDateStr,
                weather: last.weather,
                temp2m: { max: last.temp2m.max, min: last.temp2m.min },
                wind10m_max: last.wind10m_max
            });
        }
        render7TimerData(series);
    });
}

function render7TimerData(dataseries) {
    var dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    elements.dailyContainer.innerHTML = '';

    // Only show 7 days
    var days = dataseries.slice(0, 8);

    for (var i = 0; i < days.length; i++) {
        var day = days[i];
        // 7timer date format: 20260322
        var dateStr = String(day.date);
        var year = parseInt(dateStr.substring(0, 4));
        var month = parseInt(dateStr.substring(4, 6)) - 1;
        var dayNum = parseInt(dateStr.substring(6, 8));
        var date = new Date(year, month, dayNum);

        var weatherInfo = timer7Weather[day.weather] || { icon: '🌡️', desc: day.weather };
        var maxTemp = day.temp2m ? day.temp2m.max : '--';
        var minTemp = day.temp2m ? day.temp2m.min : '--';
        // wind10m_max: 1=calm, 2=light, 3=moderate, 4=fresh, 5=strong, 6=gale, 7=storm, 8=hurricane
        var windLabels = ['', 'Calmo', 'Leve', 'Moderado', 'Fresco', 'Forte', 'Vendaval', 'Tempestade', 'Furacão'];
        var windLabel = windLabels[day.wind10m_max] || '--';

        var card = document.createElement('div');
        card.className = 'day-card';
        card.innerHTML =
            '<div class="day-card-header">' +
                '<div class="day-name">' + (i === 0 ? 'Hoje' : dayNames[date.getDay()] + ' ' + date.getDate()) + '</div>' +
                '<div class="icon">' + weatherInfo.icon + '</div>' +
                '<div class="desc">' + weatherInfo.desc + '</div>' +
                '<div class="temps">' +
                    '<span class="temp-max">' + maxTemp + '°</span>' +
                    '<span class="temp-min">' + minTemp + '°</span>' +
                '</div>' +
                '<span class="expand-arrow">▼</span>' +
            '</div>' +
            '<div class="day-card-details">' +
                '<div class="day-detail-grid">' +
                    '<div class="day-detail-item"><span class="label">Vento</span><span class="value">' + windLabel + '</span></div>' +
                    '<div class="day-detail-item"><span class="label">Amplitude</span><span class="value">' + (maxTemp - minTemp) + '°C</span></div>' +
                    '<div class="day-detail-item"><span class="label">Condição</span><span class="value">' + weatherInfo.desc + '</span></div>' +
                '</div>' +
            '</div>';

        card.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });

        elements.dailyContainer.appendChild(card);
    }
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

    // Daily forecast - show wttr.in 3 days first, then 7-day proxy replaces it
    elements.dailyContainer.innerHTML = '';
    renderDailyFromWttr(data.weather);

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

function renderDailyFromWttr(weatherDays) {
    if (!weatherDays || weatherDays.length === 0) return;
    var dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    elements.dailyContainer.innerHTML = '';

    weatherDays.forEach(function(day, i) {
        var date = new Date(day.date + 'T00:00:00');
        var dayCode = parseInt(day.hourly[4] ? day.hourly[4].weatherCode : day.hourly[0].weatherCode) || 113;
        var dayWeather = getWeatherInfo(dayCode);
        var dayDesc = day.hourly[4] && day.hourly[4].lang_pt && day.hourly[4].lang_pt[0]
            ? day.hourly[4].lang_pt[0].value : dayWeather.desc;
        var maxTemp = Math.round(parseFloat(day.maxtempC));
        var minTemp = Math.round(parseFloat(day.mintempC));
        var avgHumidity = day.hourly.reduce(function(s, h) { return s + parseInt(h.humidity || 0); }, 0) / day.hourly.length;
        var maxWind = Math.max.apply(null, day.hourly.map(function(h) { return parseInt(h.windspeedKmph || 0); }));
        var totalPrecip = day.hourly.reduce(function(s, h) { return s + parseFloat(h.precipMM || 0); }, 0).toFixed(1);
        var uvMax = Math.max.apply(null, day.hourly.map(function(h) { return parseInt(h.uvIndex || 0); }));

        var card = document.createElement('div');
        card.className = 'day-card';
        card.innerHTML =
            '<div class="day-card-header">' +
                '<div class="day-name">' + (i === 0 ? 'Hoje' : dayNames[date.getDay()] + ' ' + date.getDate()) + '</div>' +
                '<div class="icon">' + dayWeather.icon + '</div>' +
                '<div class="desc">' + dayDesc + '</div>' +
                '<div class="temps">' +
                    '<span class="temp-max">' + maxTemp + '°</span>' +
                    '<span class="temp-min">' + minTemp + '°</span>' +
                '</div>' +
                '<span class="expand-arrow">▼</span>' +
            '</div>' +
            '<div class="day-card-details">' +
                '<div class="day-detail-grid">' +
                    '<div class="day-detail-item"><span class="label">Chuva</span><span class="value">' + totalPrecip + ' mm</span></div>' +
                    '<div class="day-detail-item"><span class="label">Umidade</span><span class="value">' + Math.round(avgHumidity) + '%</span></div>' +
                    '<div class="day-detail-item"><span class="label">Vento Máx</span><span class="value">' + maxWind + ' km/h</span></div>' +
                    '<div class="day-detail-item"><span class="label">UV Máx</span><span class="value">' + uvMax + '</span></div>' +
                    '<div class="day-detail-item"><span class="label">Amplitude</span><span class="value">' + (maxTemp - minTemp) + '°C</span></div>' +
                    '<div class="day-detail-item"><span class="label">Condição</span><span class="value">' + dayDesc + '</span></div>' +
                '</div>' +
            '</div>';

        card.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });

        elements.dailyContainer.appendChild(card);
    });
}

function render7DayData(daily) {
    if (!daily || !daily.time || daily.time.length === 0) return;
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

// ---- Radar de Chuva ao Vivo (RainViewer) + Estações Meteorológicas ----

var RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';
var OPENMETEO_URL = 'https://api.open-meteo.com/v1/forecast';
var radarMap = null;
var radarMarker = null;
var radarLayers = [];
var radarFrames = [];
var radarPastCount = 0;
var radarIndex = 0;
var radarInterval = null;
var radarPlaying = false;
var stationMarkers = [];

function initRadar(lat, lon) {
    if (typeof L === 'undefined') return;

    try {
        document.querySelector('.radar-section').style.display = '';

        if (radarMap) {
            radarMap.setView([lat, lon], 9);
        } else {
            radarMap = L.map('radar-map', {
                zoomControl: true,
                attributionControl: false,
            }).setView([lat, lon], 9);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                subdomains: 'abcd',
                tileSize: 256,
                detectRetina: true,
            }).addTo(radarMap);
        }

        // Add/update city marker
        var cityName = elements.cityName.textContent || '';
        var markerIcon = L.divIcon({
            className: 'radar-city-marker',
            html: '<div class="radar-marker-pin"></div><div class="radar-marker-label">' + cityName + '</div>',
            iconSize: [120, 40],
            iconAnchor: [60, 36]
        });
        if (radarMarker) {
            radarMarker.setLatLng([lat, lon]);
            radarMarker.setIcon(markerIcon);
        } else {
            radarMarker = L.marker([lat, lon], { icon: markerIcon, zIndexOffset: 1000 }).addTo(radarMap);
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
                elements.radarTime.textContent = 'Sem radar';
                return;
            }
            try {
                var past = data.radar.past || [];
                var nowcast = data.radar.nowcast || [];
                radarPastCount = past.length;
                radarFrames = past.concat(nowcast);

                radarFrames.forEach(function(frame) {
                    var layer = L.tileLayer(
                        data.host + frame.path + '/512/{z}/{x}/{y}/4/1_1.png',
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
                elements.radarTime.textContent = 'Sem radar';
            }
        });

        // Load weather stations on the map
        loadWeatherStations(lat, lon);

        // Fix map rendering
        setTimeout(function() { if (radarMap) radarMap.invalidateSize(); }, 200);
    } catch(e) {
        elements.radarTime.textContent = 'Sem radar';
    }
}

// ---- Estações Meteorológicas em Tempo Real ----

function loadWeatherStations(lat, lon) {
    if (!radarMap) return;

    // Remove old station markers
    stationMarkers.forEach(function(m) { radarMap.removeLayer(m); });
    stationMarkers = [];

    // Generate station points in a grid around the location (~50km spacing)
    var stations = [];
    var offsets = [
        { dlat: 0, dlon: 0 },
        { dlat: 0.45, dlon: 0 },
        { dlat: -0.45, dlon: 0 },
        { dlat: 0, dlon: 0.45 },
        { dlat: 0, dlon: -0.45 },
        { dlat: 0.32, dlon: 0.32 },
        { dlat: -0.32, dlon: 0.32 },
        { dlat: 0.32, dlon: -0.32 },
        { dlat: -0.32, dlon: -0.32 },
        { dlat: 0.7, dlon: 0 },
        { dlat: -0.7, dlon: 0 },
        { dlat: 0, dlon: 0.7 },
        { dlat: 0, dlon: -0.7 },
    ];

    offsets.forEach(function(o) {
        stations.push({
            lat: Math.round((lat + o.dlat) * 100) / 100,
            lon: Math.round((lon + o.dlon) * 100) / 100
        });
    });

    // Build Open-Meteo multi-point URL
    var lats = stations.map(function(s) { return s.lat; }).join(',');
    var lons = stations.map(function(s) { return s.lon; }).join(',');
    var url = OPENMETEO_URL +
        '?latitude=' + lats +
        '&longitude=' + lons +
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation' +
        '&timezone=auto';

    nativeGet(url, function(err, data) {
        if (err || !data) return;

        // Open-Meteo returns array for multi-point or single object
        var results = Array.isArray(data) ? data : [data];

        results.forEach(function(point, i) {
            if (!point.current) return;
            var c = point.current;
            var sLat = stations[i] ? stations[i].lat : point.latitude;
            var sLon = stations[i] ? stations[i].lon : point.longitude;
            var temp = Math.round(c.temperature_2m);
            var humidity = c.relative_humidity_2m;
            var wind = Math.round(c.wind_speed_10m);
            var precip = c.precipitation || 0;
            var code = c.weather_code || 0;
            var wInfo = getWmoWeather(code);

            // Skip the center point (main city marker already there)
            if (i === 0) {
                // Update center marker with weather data
                if (radarMarker) {
                    var centerName = elements.cityName.textContent || '';
                    radarMarker.bindPopup(
                        '<div class="station-popup">' +
                        '<strong>' + centerName + '</strong><br>' +
                        '<span class="station-temp">' + temp + '°C</span> ' + wInfo.icon + '<br>' +
                        'Umidade: ' + humidity + '%<br>' +
                        'Vento: ' + wind + ' km/h<br>' +
                        'Precip: ' + precip + ' mm' +
                        '</div>'
                    );
                }
                return;
            }

            var stationIcon = L.divIcon({
                className: 'weather-station-marker',
                html: '<div class="station-dot" style="background:' + getTempColor(temp) + '"></div>' +
                      '<div class="station-label">' + temp + '°</div>',
                iconSize: [50, 30],
                iconAnchor: [25, 15]
            });

            var marker = L.marker([sLat, sLon], { icon: stationIcon, zIndexOffset: 500 }).addTo(radarMap);
            marker.bindPopup(
                '<div class="station-popup">' +
                '<span class="station-temp">' + temp + '°C</span> ' + wInfo.icon + ' ' + wInfo.desc + '<br>' +
                'Umidade: ' + humidity + '%<br>' +
                'Vento: ' + wind + ' km/h<br>' +
                'Precipitação: ' + precip + ' mm' +
                '</div>'
            );
            stationMarkers.push(marker);
        });
    });
}

function getWmoWeather(code) {
    if (wmoWeatherCodes[code]) return wmoWeatherCodes[code];
    return { desc: 'Variável', icon: '🌤️' };
}

function getTempColor(temp) {
    if (temp <= 0) return '#00bfff';
    if (temp <= 10) return '#4da6ff';
    if (temp <= 15) return '#80ccff';
    if (temp <= 20) return '#66cc66';
    if (temp <= 25) return '#ffcc00';
    if (temp <= 30) return '#ff8c00';
    if (temp <= 35) return '#ff4500';
    return '#cc0000';
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
