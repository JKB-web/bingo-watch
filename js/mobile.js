// Bingo Watch – mobile.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// SIMPLE MOBILE "MORE": one list, every on/off shown as a clear switch
// =====================================================================
function renderMobileQuick() {
    const b = document.getElementById('mQuickAuto'); if (b) b.classList.toggle('on', !!autopilotInterval);
}
// Flip the switch at once so the tap feels instant; the list is re-rendered a moment later with the real state.
function mmFlip(btn) {
    const on = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', on); const s = btn.querySelector('.mm-sw'); if (s) s.classList.toggle('on', on);
}
function renderMobileMore() {
    const el = document.getElementById('m-more'); if (!el) return;
    const oldScroll = el.querySelector('.mm-scroll'), keepTop = oldScroll ? oldScroll.scrollTop : 0;   // re-rendering must not jump to the top
    const da = currentLang === 'da', T = (d, e) => da ? d : e;
    const sw = (on, label, icon, action) => `<button type="button" class="mm-row" role="switch" aria-checked="${on}" onclick="mmFlip(this); ${action}; setTimeout(renderMobileMore, 250);">
        <span class="material-icons-outlined">${icon}</span><span class="mm-label">${label}</span><span class="mm-sw${on ? ' on' : ''}"><i></i></span></button>`;
    const go = (label, icon, action, sub) => `<button type="button" class="mm-row" onclick="${action}"><span class="material-icons-outlined">${icon}</span><span class="mm-label">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="mm-chev">›</span></button>`;
    const sec = (title, rows) => `<div class="mm-sec"><div class="mm-title">${title}</div>${rows.join('')}</div>`;
    const wxRows = [];
    WX_LAYER_DEFS.forEach(d => {
        wxRows.push(sw(!!liveWeatherState[d.id], da ? d.da : d.en, d.icon, `toggleWxLayer('${d.id}')`));
        if (d.id === 'flow' && liveWeatherState.flow) wxRows.push(`<label class="mm-row"><span class="material-icons-outlined">height</span><span class="mm-label">${T('Niveau', 'Level')}</span><select class="mm-select" onchange="setFlowLevel(this.value)">${WIND_LEVELS.map(l => `<option value="${l[0]}"${flow.level === l[0] ? ' selected' : ''}>${l[1]}</option>`).join('')}</select></label>`);
    });
    const seasonOpts = ['none', 'auto', 'xmas', 'newyear', 'easter', 'halloween', 'party'].map(id => `<option value="${id}"${seasonChoice === id ? ' selected' : ''}>${seasonLabel(id)}</option>`).join('');
    el.innerHTML = `<div class="mm-scroll">
        ${sec(T('Spil', 'Game'), [
            sw(!!autopilotInterval, 'Autopilot', 'smart_toy', 'toggleAutopilot()'),
            sw(!isMuted, T('Lyd', 'Sound'), 'volume_up', 'toggleMute()'),
            sw(manualMode, T('Manuel tilstand (klik på tal)', 'Manual mode (tap numbers)'), 'touch_app', 'toggleManualMode(!manualMode)'),
            sw(gadss.enabled, T('GADSS-simulering', 'GADSS simulation'), 'crisis_alert', 'setGadssEnabled(!gadss.enabled)'),
            go(T('Nyt spil', 'New game'), 'restart_alt', "mobileSetTab('map'); confirmNewGame()")])}
        ${sec(T('Værktøjer', 'Tools'), [
            go(T('Vejr', 'Weather'), 'cloud', "mobileSetTab('panel-metar')", currentICAO),
            go(T('Tjek plade', 'Verify win'), 'verified', "mobileSetTab('panel-verify')"),
            go(T('Gavefordeling', 'Prizes'), 'redeem', "mobileSetTab('panel-prizes')"),
            go(T('Konfliktløsning', 'Conflict resolution'), 'gavel', "mobileSetTab('panel-tie')"),
            go(T('Pladegenerator', 'Card generator'), 'grid_view', "mobileSetTab('panel-gen')")])}
        ${sec(T('Kort', 'Map'), [
            sw(liveWeatherState.rings, T('Rækkeviddecirkler og lufthavne', 'Range rings and airports'), 'track_changes', "toggleLiveLayer('rings')"),
            sw(!!liveWeatherState.sun, T('Sol og dag/nat', 'Sun and day/night'), 'wb_sunny', 'toggleSun()'),
            sw(isGlobeMode, T('3D-globus', '3D globe'), 'public', 'toggleGlobeProjection()'),
            go(T('Centrér på lufthavn', 'Centre on airport'), 'my_location', "mobileSetTab('map'); centerMapOnAirport()")])}
        ${sec(T('Vejrlag', 'Weather layers'), wxRows)}
        ${sec(T('Udseende', 'Appearance'), [
            sw(wxIsDark(), T('Mørkt tema', 'Dark theme'), 'dark_mode', 'toggleLightDarkQuick()'),
            `<label class="mm-row"><span class="material-icons-outlined">celebration</span><span class="mm-label">${T('Sæson', 'Season')}</span><select class="mm-select" onchange="setSeasonChoice(this.value); setTimeout(renderMobileMore, 250);">${seasonOpts}</select></label>`,
            `<label class="mm-row"><span class="material-icons-outlined">translate</span><span class="mm-label">${T('Sprog', 'Language')}</span><select class="mm-select" onchange="setLanguage(this.value); renderMobileMore();"><option value="da"${da ? ' selected' : ''}>Dansk</option><option value="en"${!da ? ' selected' : ''}>English</option></select></label>`])}
        ${sec(T('Mere', 'More'), [
            go('Manual', 'menu_book', "mobileSetTab('map'); openManual()"),
            go(T('Alle indstillinger', 'All settings'), 'settings', "mobileSetTab('panel-settings')")])}
    </div>`;
    const newScroll = el.querySelector('.mm-scroll'); if (newScroll && keepTop) newScroll.scrollTop = keepTop;
    renderMobileQuick();
}
setInterval(() => { if (isMobileUI()) renderMobileQuick(); }, 1000);
