// ===================================
// AgroFlight - Diário de Bordo Oficial
// Piloto Agrícola - Monitoramento de Horas
// Lei 13.475/2017 | RBAC 137 | RBAC 117
// Formato: Diário de Bordo ANAC - Aeronave Agrícola
// ===================================

(function () {
    'use strict';

    const DEFAULT_LIMITS = {
        flightDay: 9.5, dutyDay: 11, workWeek: 44, flightMonth: 100,
        workMonth: 176, flightYear: 1000, landingsDay: 5,
        restHours: 12, daysOffMonth: 8, alertThreshold: 80
    };

    let flights = [];
    let daysOff = [];
    let alerts = [];
    let limits = { ...DEFAULT_LIMITS };
    let pilotInfo = { name: '', canac: '', cma: '', habilitacao: '' };
    let aircraftInfo = { marcas: '', fabricante: '', modelo: '', ns: '', catReg: '' };
    let maintenance = { ultManutHoras: '', ultManutTipo: '', proxManutHoras: '', proxManutTipo: '' };
    let discrepancies = [];
    let totals = { hsTotaisAnterior: 0, pousosAnterior: 0, hsCelulaAnterior: 0 };
    let deleteTargetId = null;

    // ===== INITIALIZATION =====
    function init() {
        loadData();
        setupNavigation();
        setupForms();
        setupModals();
        setupDataManagement();
        updateCurrentDate();
        applySettings();
        refreshAll();
    }

    function loadData() {
        try {
            flights = JSON.parse(localStorage.getItem('agroflight_flights') || '[]');
            daysOff = JSON.parse(localStorage.getItem('agroflight_daysoff') || '[]');
            alerts = JSON.parse(localStorage.getItem('agroflight_alerts') || '[]');
            discrepancies = JSON.parse(localStorage.getItem('agroflight_discrepancies') || '[]');
            var sl = localStorage.getItem('agroflight_limits');
            if (sl) limits = { ...DEFAULT_LIMITS, ...JSON.parse(sl) };
            var sp = localStorage.getItem('agroflight_pilot');
            if (sp) pilotInfo = JSON.parse(sp);
            var sa = localStorage.getItem('agroflight_aircraft');
            if (sa) aircraftInfo = JSON.parse(sa);
            var sm = localStorage.getItem('agroflight_maintenance');
            if (sm) maintenance = JSON.parse(sm);
            var st = localStorage.getItem('agroflight_totals');
            if (st) totals = JSON.parse(st);
        } catch (e) { console.error('Erro ao carregar dados:', e); }
    }

    function save(key, data) { localStorage.setItem('agroflight_' + key, JSON.stringify(data)); }
    function saveFlights() { save('flights', flights); }
    function saveDaysOff() { save('daysoff', daysOff); }
    function saveAlerts() { save('alerts', alerts); }
    function saveLimits() { save('limits', limits); }
    function savePilot() { save('pilot', pilotInfo); }
    function saveAircraft() { save('aircraft', aircraftInfo); }
    function saveMaintenance() { save('maintenance', maintenance); }
    function saveDiscrepancies() { save('discrepancies', discrepancies); }
    function saveTotals() { save('totals', totals); }

    // ===== NAVIGATION =====
    function setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById('page-' + page).classList.add('active');
                // Close sidebar on mobile
                document.getElementById('sidebar').classList.remove('open');
            });
        });

        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    // ===== DATE & TIME HELPERS =====
    function updateCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-BR', options);
    }

    function parseTime(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h + m / 60;
    }

    function formatHours(decimalHours) {
        if (decimalHours < 0) decimalHours = 0;
        const h = Math.floor(decimalHours);
        const m = Math.round((decimalHours - h) * 60);
        return h + ':' + String(m).padStart(2, '0');
    }

    function timeDiffHours(start, end) {
        let s = parseTime(start);
        let e = parseTime(end);
        if (e <= s) e += 24; // crosses midnight
        return e - s;
    }

    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    function getWeekStart(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1; // Monday as start
        d.setDate(d.getDate() - diff);
        return d.toISOString().split('T')[0];
    }

    function getMonthKey(dateStr) {
        return dateStr.substring(0, 7);
    }

    function getYearKey(dateStr) {
        return dateStr.substring(0, 4);
    }

    // ===== CALCULATIONS =====
    function calcFlightHours(flight) {
        return timeDiffHours(flight.partida, flight.corte);
    }

    function calcDutyHours(flight) {
        return timeDiffHours(flight.horaApres, flight.corte);
    }

    function getFlightsForDate(dateStr) {
        return flights.filter(f => f.date === dateStr);
    }

    function getFlightsForWeek(dateStr) {
        const weekStart = getWeekStart(dateStr);
        const ws = new Date(weekStart + 'T12:00:00');
        const we = new Date(ws);
        we.setDate(we.getDate() + 6);
        const weStr = we.toISOString().split('T')[0];
        return flights.filter(f => f.date >= weekStart && f.date <= weStr);
    }

    function getFlightsForMonth(dateStr) {
        const mk = getMonthKey(dateStr);
        return flights.filter(f => getMonthKey(f.date) === mk);
    }

    function getFlightsForYear(dateStr) {
        const yk = getYearKey(dateStr);
        return flights.filter(f => getYearKey(f.date) === yk);
    }

    function getDaysOffForMonth(dateStr) {
        const mk = getMonthKey(dateStr);
        return daysOff.filter(d => getMonthKey(d.date) === mk);
    }

    function sumFlightHours(flightList) {
        return flightList.reduce((sum, f) => sum + calcFlightHours(f), 0);
    }

    function sumDutyHours(flightList) {
        return flightList.reduce((sum, f) => sum + calcDutyHours(f), 0);
    }

    function sumLandings(flightList) {
        return flightList.reduce((sum, f) => sum + (parseInt(f.pousosTotal) || 0), 0);
    }

    function sumFuel(flightList) {
        return flightList.reduce((sum, f) => sum + (parseFloat(f.combTotal) || 0), 0);
    }

    function getRestHoursSinceLastFlight() {
        if (flights.length === 0) return Infinity;
        const sorted = [...flights].sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.corte.localeCompare(a.corte);
        });
        const lastFlight = sorted[0];
        // Repouso inicia 30 min após corte do motor (Lei 13.475/2017)
        const lastEnd = new Date(lastFlight.date + 'T' + lastFlight.corte);
        lastEnd.setMinutes(lastEnd.getMinutes() + 30);
        const now = new Date();
        return (now - lastEnd) / (1000 * 60 * 60);
    }

    // ===== ALERTS SYSTEM =====
    function checkLimits() {
        const today = getToday();
        const todayFlights = getFlightsForDate(today);
        const weekFlights = getFlightsForWeek(today);
        const monthFlights = getFlightsForMonth(today);
        const yearFlights = getFlightsForYear(today);
        const monthDaysOff = getDaysOffForMonth(today);

        const flightToday = sumFlightHours(todayFlights);
        const dutyToday = sumDutyHours(todayFlights);
        const workWeek = sumDutyHours(weekFlights);
        const flightMonth = sumFlightHours(monthFlights);
        const workMonth = sumDutyHours(monthFlights);
        const flightYear = sumFlightHours(yearFlights);
        const landingsToday = sumLandings(todayFlights);
        const restHours = getRestHoursSinceLastFlight();

        const activeAlerts = [];
        const threshold = limits.alertThreshold / 100;

        function check(current, limit, label, unit) {
            const pct = current / limit;
            if (pct >= 1) {
                activeAlerts.push({ type: 'danger', message: `LIMITE EXCEDIDO: ${label} - ${formatHours(current)} de ${formatHours(limit)} ${unit}` });
                addAlert('danger', `LIMITE EXCEDIDO: ${label} - ${formatHours(current)} de ${formatHours(limit)} ${unit}`);
            } else if (pct >= threshold) {
                activeAlerts.push({ type: 'warning', message: `ATENÇÃO: ${label} a ${Math.round(pct * 100)}% - ${formatHours(current)} de ${formatHours(limit)} ${unit}` });
            }
        }

        check(flightToday, limits.flightDay, 'Horas de voo hoje', '');
        check(dutyToday, limits.dutyDay, 'Jornada hoje', '');
        check(workWeek, limits.workWeek, 'Trabalho semanal', '');
        check(flightMonth, limits.flightMonth, 'Voo mensal', '');
        check(workMonth, limits.workMonth, 'Trabalho mensal', '');
        check(flightYear, limits.flightYear, 'Voo anual', '');

        if (landingsToday >= limits.landingsDay) {
            activeAlerts.push({ type: 'danger', message: `LIMITE EXCEDIDO: Pousos hoje - ${landingsToday} de ${limits.landingsDay}` });
            addAlert('danger', `LIMITE DE POUSOS: ${landingsToday} de ${limits.landingsDay}`);
        } else if (landingsToday / limits.landingsDay >= threshold) {
            activeAlerts.push({ type: 'warning', message: `ATENÇÃO: Pousos hoje a ${Math.round(landingsToday / limits.landingsDay * 100)}%` });
        }

        if (restHours < limits.restHours && restHours !== Infinity) {
            activeAlerts.push({ type: 'danger', message: `REPOUSO INSUFICIENTE: ${formatHours(restHours)} de ${limits.restHours}h mínimas` });
            addAlert('danger', `REPOUSO INSUFICIENTE: ${formatHours(restHours)} desde última jornada`);
        }

        const currentMonth = new Date();
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        const dayOfMonth = currentMonth.getDate();
        const remainingDays = daysInMonth - dayOfMonth;
        const currentDaysOff = monthDaysOff.length;
        const neededDaysOff = limits.daysOffMonth - currentDaysOff;
        if (neededDaysOff > remainingDays && currentDaysOff < limits.daysOffMonth) {
            activeAlerts.push({ type: 'warning', message: `ATENÇÃO: ${currentDaysOff} folgas no mês. Faltam ${neededDaysOff} folgas em ${remainingDays} dias restantes.` });
        }

        // Update alert banner
        const banner = document.getElementById('alertBanner');
        const topBarAlert = document.getElementById('topBarAlert');
        const dangerAlerts = activeAlerts.filter(a => a.type === 'danger');
        const warningAlerts = activeAlerts.filter(a => a.type === 'warning');

        if (dangerAlerts.length > 0) {
            banner.style.display = 'flex';
            banner.className = 'alert-banner';
            document.getElementById('alertMessage').textContent = dangerAlerts[0].message;
            topBarAlert.style.display = 'flex';
            document.getElementById('alertCount').textContent = activeAlerts.length;
        } else if (warningAlerts.length > 0) {
            banner.style.display = 'flex';
            banner.className = 'alert-banner warning';
            document.getElementById('alertMessage').textContent = warningAlerts[0].message;
            topBarAlert.style.display = 'flex';
            document.getElementById('alertCount').textContent = activeAlerts.length;
        } else {
            banner.style.display = 'none';
            topBarAlert.style.display = 'none';
        }

        return activeAlerts;
    }

    function addAlert(type, message) {
        const today = getToday();
        // Avoid duplicate alerts on same day
        const exists = alerts.find(a => a.date === today && a.message === message);
        if (!exists) {
            alerts.unshift({ date: today, type, message, timestamp: new Date().toISOString() });
            if (alerts.length > 100) alerts = alerts.slice(0, 100);
            saveAlerts();
        }
    }

    // ===== DASHBOARD UPDATE =====
    function updateDashboard() {
        const today = getToday();
        const todayFlights = getFlightsForDate(today);
        const weekFlights = getFlightsForWeek(today);
        const monthFlights = getFlightsForMonth(today);
        const yearFlights = getFlightsForYear(today);
        const monthDaysOff = getDaysOffForMonth(today);

        const flightToday = sumFlightHours(todayFlights);
        const dutyToday = sumDutyHours(todayFlights);
        const flightWeek = sumFlightHours(weekFlights);
        const flightMonth = sumFlightHours(monthFlights);
        const flightYear = sumFlightHours(yearFlights);
        const landingsToday = sumLandings(todayFlights);
        const restHours = getRestHoursSinceLastFlight();

        // Primary cards
        updateCard('hoursToday', 'progressToday', flightToday, limits.flightDay);
        updateCard('hoursWeek', 'progressWeek', flightWeek, limits.workWeek);
        updateCard('hoursMonth', 'progressMonth', flightMonth, limits.flightMonth);
        updateCard('hoursYear', 'progressYear', flightYear, limits.flightYear);

        // Secondary cards
        updateCard('dutyToday', 'progressDuty', dutyToday, limits.dutyDay);

        document.getElementById('landingsToday').textContent = landingsToday;
        const landingPct = Math.min((landingsToday / limits.landingsDay) * 100, 100);
        const landingBar = document.getElementById('progressLandings');
        landingBar.style.width = landingPct + '%';
        if (landingsToday >= limits.landingsDay) landingBar.classList.add('over-limit');
        else landingBar.classList.remove('over-limit');

        // Rest status
        const restEl = document.getElementById('restStatus');
        if (flights.length === 0) {
            restEl.textContent = '--';
            restEl.style.color = '';
        } else if (restHours >= limits.restHours) {
            restEl.textContent = 'OK (' + formatHours(restHours) + ')';
            restEl.style.color = 'var(--accent-green)';
        } else {
            restEl.textContent = formatHours(restHours) + ' (Insuficiente!)';
            restEl.style.color = 'var(--accent-red)';
        }

        // Days off
        document.getElementById('daysOff').textContent = monthDaysOff.length;

        // Limit labels
        document.getElementById('limitToday').textContent = formatHours(limits.flightDay);
        document.getElementById('limitWeek').textContent = limits.workWeek + 'h';
        document.getElementById('limitMonth').textContent = limits.flightMonth + 'h';
        document.getElementById('limitYear').textContent = formatHours(limits.flightYear);
        document.getElementById('limitDuty').textContent = limits.dutyDay + 'h';
        document.getElementById('limitRest').textContent = limits.restHours + 'h';
        document.getElementById('limitLandings').textContent = limits.landingsDay;
        document.getElementById('limitDaysOff').textContent = limits.daysOffMonth;

        // Recent flights table
        updateRecentFlightsTable();

        // Check limits and show alerts
        checkLimits();
    }

    function updateCard(valueId, progressId, current, limit) {
        const el = document.getElementById(valueId);
        const bar = document.getElementById(progressId);
        el.textContent = formatHours(current);
        const pct = Math.min((current / limit) * 100, 100);
        bar.style.width = pct + '%';
        if (current >= limit) {
            bar.classList.add('over-limit');
            el.style.color = 'var(--accent-red)';
        } else if (current / limit >= limits.alertThreshold / 100) {
            bar.classList.remove('over-limit');
            el.style.color = 'var(--accent-orange)';
        } else {
            bar.classList.remove('over-limit');
            el.style.color = '';
        }
    }

    function updateRecentFlightsTable() {
        const tbody = document.getElementById('recentFlightsBody');
        const recent = [...flights].sort((a, b) => b.date.localeCompare(a.date) || b.partida.localeCompare(a.partida)).slice(0, 10);
        if (recent.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="9">Nenhum voo registrado</td></tr>';
            return;
        }
        tbody.innerHTML = recent.map(f => `<tr>
            <td>${formatDate(f.date)}</td>
            <td>${f.horaApres}</td>
            <td>${esc(f.de)}</td>
            <td>${esc(f.para)}</td>
            <td>${f.partida}</td>
            <td>${f.corte}</td>
            <td><strong>${formatHours(calcFlightHours(f))}</strong></td>
            <td>${f.pousosTotal}</td>
            <td>${f.nat}</td>
        </tr>`).join('');
    }

    // ===== LOGBOOK =====
    function updateAllFlightsTable(filterMonth) {
        const tbody = document.getElementById('allFlightsBody');
        let filtered = [...flights];
        if (filterMonth) filtered = filtered.filter(f => getMonthKey(f.date) === filterMonth);
        filtered.sort((a, b) => a.date.localeCompare(b.date) || a.partida.localeCompare(b.partida));

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="14">Nenhum voo registrado</td></tr>';
        } else {
            tbody.innerHTML = filtered.map((f, i) => `<tr>
                <td>${i + 1}</td>
                <td>${formatDate(f.date)}</td>
                <td>${f.horaApres}</td>
                <td>${esc(f.de)}</td>
                <td>${esc(f.para)}</td>
                <td>${f.partida}</td>
                <td>${f.corte}</td>
                <td><strong>${formatHours(calcFlightHours(f))}</strong></td>
                <td>${f.pousosTotal}</td>
                <td>${f.combTotal || '-'}</td>
                <td>${esc(f.nomePiloto)}</td>
                <td>${esc(f.codigoAnac)}</td>
                <td>${f.nat}</td>
                <td><button class="btn btn-danger btn-sm" onclick="AgroFlight.deleteFlight('${f.id}')"><i class="fas fa-trash"></i></button></td>
            </tr>`).join('');
        }

        // Update totals
        var pageHours = sumFlightHours(filtered);
        var pageLandings = sumLandings(filtered);
        var pageFuel = sumFuel(filtered);
        var allHours = sumFlightHours(flights);
        var allLandings = sumLandings(flights);

        document.getElementById('totalPageHours').innerHTML = '<strong>' + formatHours(pageHours) + '</strong>';
        document.getElementById('totalPageLandings').innerHTML = '<strong>' + pageLandings + '</strong>';
        document.getElementById('totalPageFuel').innerHTML = '<strong>' + pageFuel.toFixed(1) + '</strong>';
        document.getElementById('hsTotaisAnterior').textContent = formatHours(totals.hsTotaisAnterior);
        document.getElementById('hsTotaisPagina').textContent = formatHours(pageHours);
        document.getElementById('pousosAnteriores').textContent = totals.pousosAnterior;
        document.getElementById('pousosTotais').textContent = totals.pousosAnterior + allLandings;
        document.getElementById('hsTotaisCelula').textContent = formatHours(totals.hsCelulaAnterior + allHours);

        // Update discrepancy table
        updateDiscrepancyTable();
        updateCorrectiveSelect();
        updateHorasDisponiveis();
    }

    // ===== LIMITS PAGE =====
    function updateLimitsPage() {
        const today = getToday();
        const todayFlights = getFlightsForDate(today);
        const weekFlights = getFlightsForWeek(today);
        const monthFlights = getFlightsForMonth(today);
        const yearFlights = getFlightsForYear(today);
        const monthDaysOff = getDaysOffForMonth(today);

        const threshold = limits.alertThreshold / 100;

        const limitsData = [
            {
                label: 'Horas de Voo / Jornada',
                law: 'Art. 32 - Lei 13.475/2017',
                current: sumFlightHours(todayFlights),
                limit: limits.flightDay,
                unit: 'h'
            },
            {
                label: 'Jornada Diária',
                law: 'Art. 37 - Lei 13.475/2017',
                current: sumDutyHours(todayFlights),
                limit: limits.dutyDay,
                unit: 'h'
            },
            {
                label: 'Trabalho Semanal',
                law: 'Art. 41 - Lei 13.475/2017',
                current: sumDutyHours(weekFlights),
                limit: limits.workWeek,
                unit: 'h'
            },
            {
                label: 'Horas de Voo / Mês',
                law: 'Art. 30 - Lei 13.475/2017',
                current: sumFlightHours(monthFlights),
                limit: limits.flightMonth,
                unit: 'h'
            },
            {
                label: 'Trabalho Mensal',
                law: 'Art. 41 - Limite absoluto',
                current: sumDutyHours(monthFlights),
                limit: limits.workMonth,
                unit: 'h'
            },
            {
                label: 'Horas de Voo / Ano',
                law: 'Art. 30 - Lei 13.475/2017',
                current: sumFlightHours(yearFlights),
                limit: limits.flightYear,
                unit: 'h'
            },
            {
                label: 'Pousos / Jornada',
                law: 'Art. 32 - Lei 13.475/2017',
                current: sumLandings(todayFlights),
                limit: limits.landingsDay,
                unit: '',
                isCount: true
            },
            {
                label: 'Folgas no Mês',
                law: 'Lei 13.475/2017',
                current: monthDaysOff.length,
                limit: limits.daysOffMonth,
                unit: '',
                isCount: true,
                inverted: true // more is better
            }
        ];

        const grid = document.getElementById('limitsGrid');
        grid.innerHTML = limitsData.map(item => {
            const pct = item.inverted
                ? (item.current >= item.limit ? 0 : 1)
                : item.current / item.limit;
            let status, badge;
            if (item.inverted) {
                status = item.current >= item.limit ? 'ok' : (item.current >= item.limit * 0.5 ? 'warning' : 'danger');
                badge = item.current >= item.limit ? 'OK' : 'Atenção';
            } else {
                if (pct >= 1) { status = 'danger'; badge = 'EXCEDIDO'; }
                else if (pct >= threshold) { status = 'warning'; badge = 'Atenção'; }
                else { status = 'ok'; badge = 'OK'; }
            }

            const displayCurrent = item.isCount ? item.current : formatHours(item.current);
            const displayLimit = item.isCount ? item.limit : formatHours(item.limit);
            const pctDisplay = item.inverted
                ? Math.round((item.current / item.limit) * 100)
                : Math.round(pct * 100);

            return `<div class="limit-card ${status === 'ok' ? '' : status}">
                <div class="limit-header">
                    <h4>${item.label}</h4>
                    <span class="limit-badge ${status}">${badge}</span>
                </div>
                <div class="limit-values">
                    <strong>${displayCurrent}</strong> / ${displayLimit}${item.unit} (${pctDisplay}%)
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${status === 'danger' ? 'over-limit' : status === 'warning' ? 'orange' : 'green'}"
                         style="width: ${Math.min(item.inverted ? pctDisplay : pct * 100, 100)}%"></div>
                </div>
                <small style="color: var(--text-muted); font-size: 11px;">${item.law}</small>
            </div>`;
        }).join('');

        // Alerts list
        updateAlertsList();
    }

    function updateAlertsList() {
        const list = document.getElementById('alertsList');
        if (alerts.length === 0) {
            list.innerHTML = '<p class="empty-message">Nenhum alerta registrado</p>';
            return;
        }
        list.innerHTML = alerts.slice(0, 50).map(a => {
            return `<div class="alert-item ${a.type}">
                <i class="fas fa-${a.type === 'danger' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                <span class="alert-item-text">${esc(a.message)}</span>
                <span class="alert-item-date">${formatDate(a.date)}</span>
            </div>`;
        }).join('');
    }

    // ===== FORMS =====
    function setupForms() {
        var $ = function(id) { return document.getElementById(id); };
        $('flightDate').value = getToday();
        $('filterMonth').value = getToday().substring(0, 7);

        // Auto-fill pilot name/CANAC
        if (pilotInfo.name) $('nomePiloto').value = pilotInfo.name;
        if (pilotInfo.canac) $('codigoAnac').value = pilotInfo.canac;

        // === Flight Form ===
        $('flightForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var flight = {
                id: generateId(),
                date: $('flightDate').value,
                horaApres: $('horaApres').value,
                de: $('de').value.trim(),
                para: $('para').value.trim(),
                partida: $('partida').value,
                corte: $('corte').value,
                pousosTotal: parseInt($('pousosTotal').value) || 1,
                combTotal: parseFloat($('combTotal').value) || 0,
                nomePiloto: $('nomePiloto').value.trim(),
                codigoAnac: $('codigoAnac').value.trim(),
                nat: $('nat').value,
                observacoes: $('observacoes').value.trim(),
                createdAt: new Date().toISOString()
            };
            if (timeDiffHours(flight.partida, flight.corte) <= 0) {
                showToast('Hora de corte deve ser após a partida', 'error'); return;
            }
            flights.push(flight);
            saveFlights();
            this.reset();
            $('flightDate').value = getToday();
            $('pousosTotal').value = '1';
            if (pilotInfo.name) $('nomePiloto').value = pilotInfo.name;
            if (pilotInfo.canac) $('codigoAnac').value = pilotInfo.canac;
            refreshAll();
            showToast('Voo registrado com sucesso!', 'success');
            var al = checkLimits();
            if (al.some(function(a) { return a.type === 'danger'; })) showToast('LIMITE LEGAL EXCEDIDO!', 'error');
        });

        // === Aircraft Form ===
        $('aircraftForm').addEventListener('submit', function (e) {
            e.preventDefault();
            aircraftInfo.marcas = $('acMarcas').value.trim().toUpperCase();
            aircraftInfo.fabricante = $('acFabricante').value.trim();
            aircraftInfo.modelo = $('acModelo').value.trim();
            aircraftInfo.ns = $('acNS').value.trim();
            aircraftInfo.catReg = $('acCatReg').value.trim();
            saveAircraft();
            showToast('Dados da aeronave salvos!', 'success');
        });

        // === Day Off Form ===
        $('dayOffDate').value = getToday();
        $('dayOffForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var dt = $('dayOffDate').value;
            if (daysOff.find(function(d) { return d.date === dt; })) {
                showToast('Folga já registrada para esta data', 'error'); return;
            }
            daysOff.push({ id: generateId(), date: dt, type: $('dayOffType').value, createdAt: new Date().toISOString() });
            saveDaysOff();
            this.reset(); $('dayOffDate').value = getToday();
            refreshAll();
            showToast('Folga registrada!', 'success');
        });

        // === Discrepancy Form ===
        $('discData').value = getToday();
        $('discrepancyForm').addEventListener('submit', function (e) {
            e.preventDefault();
            discrepancies.push({
                id: generateId(),
                date: $('discData').value,
                descricao: $('discDescricao').value.trim(),
                canac: $('discCanac').value.trim(),
                corrective: null
            });
            saveDiscrepancies();
            this.reset(); $('discData').value = getToday();
            refreshAll();
            showToast('Discrepância registrada!', 'success');
        });

        // === Corrective Action Form ===
        $('corrData').value = getToday();
        $('correctiveForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var discId = $('corrDiscId').value;
            if (!discId) { showToast('Selecione uma discrepância', 'error'); return; }
            var disc = discrepancies.find(function(d) { return d.id === discId; });
            if (disc) {
                disc.corrective = {
                    data: $('corrData').value,
                    acao: $('corrAcao').value.trim(),
                    canac: $('corrCanac').value.trim()
                };
                saveDiscrepancies();
                this.reset(); $('corrData').value = getToday();
                refreshAll();
                showToast('Ação corretiva registrada!', 'success');
            }
        });

        // === Maintenance Save ===
        $('saveMaintBtn').addEventListener('click', function () {
            maintenance.ultManutHoras = $('ultManutHoras').value.trim();
            maintenance.ultManutTipo = $('ultManutTipo').value.trim();
            maintenance.proxManutHoras = $('proxManutHoras').value.trim();
            maintenance.proxManutTipo = $('proxManutTipo').value.trim();
            saveMaintenance();
            updateHorasDisponiveis();
            showToast('Dados de manutenção salvos!', 'success');
        });

        // === Totals Form ===
        $('totalsForm').addEventListener('submit', function (e) {
            e.preventDefault();
            totals.hsTotaisAnterior = parseFloat($('hsTotaisAnteriorInput').value) || 0;
            totals.pousosAnterior = parseInt($('pousosAnteriorInput').value) || 0;
            totals.hsCelulaAnterior = parseFloat($('hsCelulaAnteriorInput').value) || 0;
            saveTotals();
            refreshAll();
            showToast('Totais anteriores salvos!', 'success');
        });

        // === Pilot Form ===
        $('pilotForm').addEventListener('submit', function (e) {
            e.preventDefault();
            pilotInfo.name = $('settingName').value.trim();
            pilotInfo.canac = $('settingCanac').value.trim();
            pilotInfo.cma = $('settingCma').value;
            pilotInfo.habilitacao = $('settingHabilitacao').value;
            savePilot();
            applySettings();
            showToast('Dados do piloto salvos!', 'success');
        });

        // === Limits Form ===
        $('limitsForm').addEventListener('submit', function (e) {
            e.preventDefault();
            limits.flightDay = parseFloat($('limitFlightDay').value) || DEFAULT_LIMITS.flightDay;
            limits.dutyDay = parseFloat($('limitDutyDay').value) || DEFAULT_LIMITS.dutyDay;
            limits.workWeek = parseFloat($('limitWorkWeek').value) || DEFAULT_LIMITS.workWeek;
            limits.flightMonth = parseFloat($('limitFlightMonth').value) || DEFAULT_LIMITS.flightMonth;
            limits.workMonth = parseFloat($('limitWorkMonth').value) || DEFAULT_LIMITS.workMonth;
            limits.flightYear = parseFloat($('limitFlightYear').value) || DEFAULT_LIMITS.flightYear;
            limits.landingsDay = parseInt($('limitLandingsDay').value) || DEFAULT_LIMITS.landingsDay;
            limits.restHours = parseFloat($('limitRestHours').value) || DEFAULT_LIMITS.restHours;
            limits.daysOffMonth = parseInt($('limitDaysOffMonth').value) || DEFAULT_LIMITS.daysOffMonth;
            limits.alertThreshold = parseInt($('alertThreshold').value) || DEFAULT_LIMITS.alertThreshold;
            if (limits.workMonth > 176) { limits.workMonth = 176; $('limitWorkMonth').value = 176; showToast('Limite mensal não pode exceder 176h (Art. 41)', 'error'); }
            saveLimits(); refreshAll();
            showToast('Limites atualizados!', 'success');
        });

        $('resetLimitsBtn').addEventListener('click', function () {
            limits = { ...DEFAULT_LIMITS }; saveLimits(); populateLimitsForm(); refreshAll();
            showToast('Limites restaurados ao padrão', 'success');
        });

        $('filterMonth').addEventListener('change', function () { updateAllFlightsTable(this.value); });
        $('exportBtn').addEventListener('click', exportCSV);
    }

    function updateDiscrepancyTable() {
        var tbody = document.getElementById('discrepancyBody');
        if (discrepancies.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Nenhuma discrepância registrada</td></tr>';
            return;
        }
        tbody.innerHTML = discrepancies.map(d => {
            var c = d.corrective;
            return `<tr>
                <td>${formatDate(d.date)}</td>
                <td>${esc(d.descricao)}</td>
                <td>${esc(d.canac)}</td>
                <td>-</td>
                <td>${c ? formatDate(c.data) : ''}</td>
                <td>${c ? esc(c.acao) : ''}</td>
                <td>${c ? esc(c.canac) : ''}</td>
                <td>${c ? '-' : ''}</td>
            </tr>`;
        }).join('');
    }

    function updateCorrectiveSelect() {
        var sel = document.getElementById('corrDiscId');
        var pending = discrepancies.filter(d => !d.corrective);
        sel.innerHTML = '<option value="">Selecione a discrepância</option>';
        pending.forEach(d => {
            sel.innerHTML += '<option value="' + d.id + '">' + formatDate(d.date) + ' - ' + esc(d.descricao).substring(0, 40) + '</option>';
        });
    }

    function updateHorasDisponiveis() {
        var prox = parseFloat(maintenance.proxManutHoras) || 0;
        var celulaTotal = totals.hsCelulaAnterior + sumFlightHours(flights);
        var disp = prox > 0 ? prox - celulaTotal : 0;
        document.getElementById('horasDisponiveis').value = disp > 0 ? disp.toFixed(1) + 'h' : (prox > 0 ? '0 (VENCIDA)' : '');
    }

    function populateLimitsForm() {
        document.getElementById('limitFlightDay').value = limits.flightDay;
        document.getElementById('limitDutyDay').value = limits.dutyDay;
        document.getElementById('limitWorkWeek').value = limits.workWeek;
        document.getElementById('limitFlightMonth').value = limits.flightMonth;
        document.getElementById('limitWorkMonth').value = limits.workMonth;
        document.getElementById('limitFlightYear').value = limits.flightYear;
        document.getElementById('limitLandingsDay').value = limits.landingsDay;
        document.getElementById('limitRestHours').value = limits.restHours;
        document.getElementById('limitDaysOffMonth').value = limits.daysOffMonth;
        document.getElementById('alertThreshold').value = limits.alertThreshold;
    }

    function applySettings() {
        var $ = function(id) { return document.getElementById(id); };
        $('pilotName').textContent = pilotInfo.name || 'Piloto';
        $('settingName').value = pilotInfo.name || '';
        $('settingCanac').value = pilotInfo.canac || '';
        $('settingCma').value = pilotInfo.cma || '';
        $('settingHabilitacao').value = pilotInfo.habilitacao || '';
        // Aircraft
        $('acMarcas').value = aircraftInfo.marcas || '';
        $('acFabricante').value = aircraftInfo.fabricante || '';
        $('acModelo').value = aircraftInfo.modelo || '';
        $('acNS').value = aircraftInfo.ns || '';
        $('acCatReg').value = aircraftInfo.catReg || '';
        // Maintenance
        $('ultManutHoras').value = maintenance.ultManutHoras || '';
        $('ultManutTipo').value = maintenance.ultManutTipo || '';
        $('proxManutHoras').value = maintenance.proxManutHoras || '';
        $('proxManutTipo').value = maintenance.proxManutTipo || '';
        // Totals
        $('hsTotaisAnteriorInput').value = totals.hsTotaisAnterior || 0;
        $('pousosAnteriorInput').value = totals.pousosAnterior || 0;
        $('hsCelulaAnteriorInput').value = totals.hsCelulaAnterior || 0;
        // Auto-fill pilot in flight form
        if (pilotInfo.name) $('nomePiloto').value = pilotInfo.name;
        if (pilotInfo.canac) $('codigoAnac').value = pilotInfo.canac;
        populateLimitsForm();
    }

    // ===== MODALS =====
    function setupModals() {
        document.getElementById('cancelDelete').addEventListener('click', () => {
            document.getElementById('deleteModal').style.display = 'none';
            deleteTargetId = null;
        });
        document.getElementById('confirmDelete').addEventListener('click', () => {
            if (deleteTargetId) {
                flights = flights.filter(f => f.id !== deleteTargetId);
                saveFlights();
                deleteTargetId = null;
                document.getElementById('deleteModal').style.display = 'none';
                refreshAll();
                showToast('Registro excluído', 'success');
            }
        });
    }

    function showDeleteModal(id) {
        deleteTargetId = id;
        document.getElementById('deleteModal').style.display = 'flex';
    }

    // ===== DATA MANAGEMENT =====
    function setupDataManagement() {
        document.getElementById('exportAllBtn').addEventListener('click', function () {
            const data = {
                version: 2,
                exportDate: new Date().toISOString(),
                pilotInfo, limits, flights, daysOff, alerts,
                aircraftInfo, maintenance, discrepancies, totals
            };
            downloadJSON(data, 'agroflight_backup_' + getToday() + '.json');
            showToast('Dados exportados!', 'success');
        });

        document.getElementById('importDataBtn').addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (evt) {
                try {
                    const data = JSON.parse(evt.target.result);
                    if (data.flights) flights = data.flights;
                    if (data.daysOff) daysOff = data.daysOff;
                    if (data.alerts) alerts = data.alerts;
                    if (data.limits) limits = { ...DEFAULT_LIMITS, ...data.limits };
                    if (data.pilotInfo) pilotInfo = data.pilotInfo;
                    if (data.aircraftInfo) aircraftInfo = data.aircraftInfo;
                    if (data.maintenance) maintenance = data.maintenance;
                    if (data.discrepancies) discrepancies = data.discrepancies;
                    if (data.totals) totals = data.totals;
                    saveFlights(); saveDaysOff(); saveAlerts(); saveLimits(); savePilot();
                    saveAircraft(); saveMaintenance(); saveDiscrepancies(); saveTotals();
                    applySettings();
                    refreshAll();
                    showToast('Dados importados com sucesso!', 'success');
                } catch (err) {
                    showToast('Erro ao importar arquivo', 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        document.getElementById('clearDataBtn').addEventListener('click', function () {
            if (confirm('ATENÇÃO: Todos os dados serão apagados permanentemente. Deseja continuar?')) {
                flights = []; daysOff = []; alerts = []; discrepancies = [];
                ['flights','daysoff','alerts','discrepancies'].forEach(function(k) {
                    localStorage.removeItem('agroflight_' + k);
                });
                refreshAll();
                showToast('Dados apagados', 'success');
            }
        });
    }

    // ===== EXPORT CSV =====
    function exportCSV() {
        if (flights.length === 0) {
            showToast('Nenhum voo para exportar', 'error');
            return;
        }

        const filterMonth = document.getElementById('filterMonth').value;
        let filtered = [...flights];
        if (filterMonth) {
            filtered = filtered.filter(f => getMonthKey(f.date) === filterMonth);
        }
        filtered.sort((a, b) => a.date.localeCompare(b.date) || a.takeoffTime.localeCompare(b.takeoffTime));

        const headers = ['Nº', 'Data', 'Hora Apres.', 'De', 'Para', 'Partida', 'Corte', 'Hs Voo Total', 'Pousos Total', 'Comb. Total', 'Nome do Piloto', 'Código ANAC', 'NAT', 'Observações'];
        const rows = filtered.map((f, i) => [
            i + 1,
            f.date,
            f.horaApres,
            f.de,
            f.para,
            f.partida,
            f.corte,
            formatHours(calcFlightHours(f)),
            f.pousosTotal,
            f.combTotal,
            f.nomePiloto,
            f.codigoAnac,
            f.nat,
            f.observacoes
        ]);

        let csv = '\uFEFF'; // BOM for Excel
        csv += headers.join(';') + '\n';
        rows.forEach(row => {
            csv += row.map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(';') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'diario_bordo_' + (filterMonth || 'completo') + '.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('CSV exportado!', 'success');
    }

    // ===== HELPERS =====
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return d + '/' + m + '/' + y;
    }

    function esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function showToast(message, type) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
            color: white;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#f59e0b'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ===== REFRESH ALL =====
    function refreshAll() {
        updateDashboard();
        updateAllFlightsTable(document.getElementById('filterMonth').value);
        updateLimitsPage();
    }

    // ===== PUBLIC API =====
    window.AgroFlight = {
        deleteFlight: showDeleteModal
    };

    // ===== START =====
    document.addEventListener('DOMContentLoaded', init);

})();
