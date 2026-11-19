/* =========================================
   CINEVERSE — ADMIN PAGE
   Sign in, then add, edit, hide or delete titles and arrange the homepage
   rows. Everything is saved in your Supabase database; the website reads
   it from there (JS/database.js).
========================================= */

(() => {
    'use strict';

    // =========================================
    // SETUP
    // =========================================

    const CONFIG = window.CINEVERSE_CONFIG || {};
    const DB = CONFIG.database || {};
    const DB_URL = String(DB.url || '').trim().replace(/\/+$/, '');
    const DB_KEY = String(DB.key || '').trim();
    const FILE_DATA = window.CINEVERSE_DATA || { movies: [], series: [], collections: {} };
    const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
    const SITE_ROOT = new URL('../', SCRIPT_URL).href;
    const BUCKET = 'media';
    const MAX_UPLOAD = 10 * 1024 * 1024;

    const ROWS = [
        { id: 'trending', name: 'Trending Movies' },
        { id: 'free', name: 'Free to Watch' },
        { id: 'popular', name: 'Popular Movies' },
        { id: 'top-rated', name: 'Top Rated Movies' },
        { id: 'originals', name: 'CineVerse Originals' }
    ];
    const HOME_SECTIONS = new Set(['trending', 'free', 'popular', 'top-rated']);
    const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family',
        'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'];
    const QUALITIES = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p'];
    const CERTIFICATES = ['U', 'U/A 7+', 'U/A 13+', 'U/A 16+', 'A', 'G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA'];
    const UPLOAD_TYPES = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
        avif: 'image/avif', gif: 'image/gif', vtt: 'text/vtt'
    };

    const state = {
        client: null,
        user: null,
        titles: [],
        rows: [],
        tab: 'titles',
        query: '',
        filter: 'all',
        editing: null
    };

    // =========================================
    // HELPERS
    // =========================================

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const main = $('#adm-main');

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));

    const slugify = value => String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

    const isExternal = path => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(path) || /^(data|blob):/i.test(path);
    const assetUrl = path => (!path ? '' : isExternal(path) ? path : SITE_ROOT + String(path).replace(/^\/+/, ''));

    // Links typed into the form: web addresses or paths inside the site only.
    const isSafeLink = value => !value || /^(https?:\/\/|\/|\.{0,2}\/?[\w-])/i.test(value) && !/^\s*(javascript|data|vbscript):/i.test(value);

    const list = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);

    // form.elements, never form.title / form.id: those are the form's own properties.
    const input = (form, name) => form.elements.namedItem(name);
    const titleName = id => state.titles.find(row => row.id === id)?.data?.title || id;

    let toastTimer = 0;
    function toast(message, kind = '') {
        let box = $('.adm-toast');
        if (!box) {
            box = document.createElement('div');
            box.className = 'adm-toast';
            box.setAttribute('role', 'status');
            box.setAttribute('aria-live', 'polite');
            document.body.appendChild(box);
        }
        box.textContent = message;
        box.dataset.kind = kind;
        box.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => box.classList.remove('is-on'), 3200);
    }

    // Plain-language versions of database errors.
    function friendlyError(error) {
        const text = String(error?.message || error || '');
        if (/failed to fetch|networkerror|load failed/i.test(text)) return "Couldn't reach your database. Check your internet connection and the Project URL in JS/data.js.";
        if (/invalid api key|no api key/i.test(text)) return 'The key in JS/data.js is not right. Copy the Publishable key from Supabase again.';
        if (/does not exist|could not find the table|schema cache/i.test(text)) return 'The database tables are missing. Run database/setup.sql in the Supabase SQL Editor.';
        if (/row-level security|permission denied|not allowed|42501/i.test(text)) return "Your account isn't allowed to make this change. Make sure it's an admin (step 6 of database/setup.sql).";
        if (/mime type|invalid_mime/i.test(text)) return 'That file type is not allowed. Upload JPG, PNG, WebP, AVIF or GIF images, or .vtt subtitle files.';
        if (/maximum allowed size|payload too large/i.test(text)) return 'That file is too big. Files can be up to 10 MB.';
        if (/already exists|duplicate/i.test(text)) return 'A file with that name already exists. Please try again.';
        return text || 'Something went wrong. Please try again.';
    }

    function setBusy(button, busy, label) {
        if (!button) return;
        if (busy) {
            button.dataset.label = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `<span class="adm-spinner" aria-hidden="true"></span>${escapeHtml(label || 'Saving…')}`;
        } else {
            button.disabled = false;
            if (button.dataset.label) button.innerHTML = button.dataset.label;
        }
    }

    // A small "Are you sure?" box that matches the page.
    function confirmBox(message, confirmLabel = 'Delete') {
        return new Promise(resolve => {
            const dialog = document.createElement('dialog');
            dialog.className = 'adm-confirm';
            dialog.innerHTML = `
                <form method="dialog">
                    <p>${escapeHtml(message)}</p>
                    <div class="adm-confirm-actions">
                        <button class="cv-btn cv-btn-ghost cv-btn-sm" value="cancel">Cancel</button>
                        <button class="cv-btn cv-btn-sm adm-danger" value="ok">${escapeHtml(confirmLabel)}</button>
                    </div>
                </form>`;
            document.body.appendChild(dialog);
            dialog.addEventListener('close', () => {
                resolve(dialog.returnValue === 'ok');
                dialog.remove();
            });
            dialog.showModal();
            $('button[value="cancel"]', dialog).focus();
        });
    }

    // =========================================
    // VIDEO LINKS (same formats as JS/data.js)
    // =========================================

    function youTubeId(value) {
        const text = String(value || '').trim();
        if (/^[\w-]{11}$/.test(text)) return text;
        const prefixed = text.match(/^youtube:([\w-]{11})$/i);
        if (prefixed) return prefixed[1];
        const match = text.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i);
        return match ? match[1] : '';
    }

    function vimeoId(value) {
        const text = String(value || '').trim();
        const prefixed = text.match(/^vimeo:(\d+)$/i);
        if (prefixed) return prefixed[1];
        const match = text.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
        return match ? match[1] : '';
    }

    // Stored value → what the form shows.
    function readVideo(value) {
        if (!value) return { mode: 'none', link: '', qualities: [] };
        if (typeof value === 'object') {
            const entries = Array.isArray(value)
                ? value.map(item => [item?.quality || item?.label, item?.src])
                : Object.entries(value);
            return { mode: 'qualities', link: '', qualities: entries.map(([quality, src]) => ({ quality: String(quality || ''), src: String(src || '') })) };
        }
        const text = String(value);
        const yt = youTubeId(text);
        if (yt) return { mode: 'single', link: `https://www.youtube.com/watch?v=${yt}`, qualities: [] };
        const vimeo = text.match(/^vimeo:(\d+)$/i);
        if (vimeo) return { mode: 'single', link: `https://vimeo.com/${vimeo[1]}`, qualities: [] };
        return { mode: 'single', link: text, qualities: [] };
    }

    // What the form holds → stored value. Trailers keep bare YouTube IDs
    // (like data.js); full movies use 'youtube:ID'.
    function writeVideo(video, kind) {
        if (video.mode === 'qualities') {
            const object = {};
            video.qualities
                .filter(item => item.quality && item.src)
                .forEach(item => { object[item.quality] = item.src; });
            return Object.keys(object).length ? object : undefined;
        }
        if (video.mode !== 'single' || !video.link) return undefined;
        const link = video.link.trim();
        const yt = youTubeId(link);
        if (yt) return kind === 'watch' ? `youtube:${yt}` : yt;
        const vimeo = vimeoId(link);
        if (vimeo) return `vimeo:${vimeo}`;
        return link;
    }

    // =========================================
    // DATABASE
    // =========================================

    async function loadAll() {
        const [titles, rows] = await Promise.all([
            state.client.from('titles').select('id,data,published,created_at,updated_at').order('updated_at', { ascending: false }),
            state.client.from('collections').select('id,name,title_ids,position').order('position', { ascending: true })
        ]);
        if (titles.error) throw titles.error;
        if (rows.error) throw rows.error;
        state.titles = titles.data || [];
        state.rows = rows.data || [];
    }

    // Every known row, in order, even ones not saved in the database yet.
    function allRows() {
        const saved = new Map(state.rows.map(row => [row.id, row]));
        const known = ROWS.map((row, index) => saved.get(row.id) || { id: row.id, name: row.name, title_ids: [], position: index });
        const extra = state.rows.filter(row => !ROWS.some(item => item.id === row.id));
        return [...known, ...extra].sort((a, b) => a.position - b.position);
    }

    async function saveRows(rows) {
        if (!rows.length) return;
        const { error } = await state.client.from('collections').upsert(rows.map(row => ({
            id: row.id,
            name: row.name,
            title_ids: row.title_ids,
            position: row.position
        })), { onConflict: 'id' });
        if (error) throw error;
    }

    // =========================================
    // SCREENS
    // =========================================

    function showSignedIn(user) {
        const bar = $('[data-signed-in]');
        bar.hidden = !user;
        $('[data-user-email]').textContent = user?.email || '';
    }

    function render(html) {
        main.innerHTML = html;
    }

    function showSetup() {
        showSignedIn(null);
        render(`
            <section class="adm-card adm-narrow">
                <p class="adm-kicker">One-time setup</p>
                <h1>Connect your database</h1>
                <p>CineVerse's admin page uses a free <strong>Supabase</strong> database. Setting it up takes about ten minutes:</p>
                <ol class="adm-steps">
                    <li>Create a free account and a new project at <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>. Choose the region closest to your visitors.</li>
                    <li>Open <strong>SQL Editor</strong>, paste everything from <code>database/setup.sql</code> and press <strong>Run</strong>.</li>
                    <li>Create your login: <strong>Authentication → Users → Add user → Create new user</strong> (your email and a strong password, with <strong>Auto Confirm User</strong> ticked). Then, under <strong>Authentication → Sign In / Providers</strong>, turn off <strong>Allow new users to sign up</strong>.</li>
                    <li>Make that login an admin: in <code>setup.sql</code> change <code>you@example.com</code> in step 6 to your email and run it again.</li>
                    <li>Copy the <strong>Project URL</strong> and <strong>Publishable key</strong> shown by the project's <strong>Connect</strong> button (the key is also under Settings → API Keys) into <code>JS/data.js</code> under <code>database</code>.</li>
                    <li>Upload the changed <code>data.js</code>, then reload this page and sign in.</li>
                </ol>
                <p class="adm-muted">README.md (“Database &amp; admin page”) has the same steps with more detail.</p>
            </section>`);
    }

    function showProblem(title, message) {
        render(`
            <section class="adm-card adm-narrow">
                <h1>${escapeHtml(title)}</h1>
                <p>${escapeHtml(message)}</p>
                <button class="cv-btn cv-btn-primary" type="button" data-reload>Try again</button>
            </section>`);
        $('[data-reload]', main).addEventListener('click', () => location.reload());
    }

    function showLogin(message = '') {
        showSignedIn(null);
        render(`
            <section class="adm-card adm-login">
                <h1>Sign in</h1>
                <p class="adm-muted">Use the admin login you created in Supabase.</p>
                <form class="adm-form" data-login novalidate>
                    <label class="adm-field">
                        <span>Email</span>
                        <input type="email" name="email" autocomplete="username" required>
                    </label>
                    <label class="adm-field">
                        <span>Password</span>
                        <input type="password" name="password" autocomplete="current-password" required>
                    </label>
                    <p class="adm-error" data-error ${message ? '' : 'hidden'}>${escapeHtml(message)}</p>
                    <button class="cv-btn cv-btn-primary adm-wide" type="submit">Sign in</button>
                </form>
            </section>`);

        const form = $('[data-login]', main);
        const error = $('[data-error]', form);
        input(form, 'email').focus();

        form.addEventListener('submit', async event => {
            event.preventDefault();
            const email = input(form, 'email').value.trim();
            const password = input(form, 'password').value;
            if (!email || !password) {
                error.textContent = 'Enter your email and password.';
                error.hidden = false;
                return;
            }

            const button = $('button[type="submit"]', form);
            setBusy(button, true, 'Signing in…');
            const { data, error: signInError } = await state.client.auth.signInWithPassword({ email, password });
            setBusy(button, false);

            if (signInError) {
                error.textContent = /invalid login credentials/i.test(signInError.message)
                    ? 'That email and password don’t match. Please try again.'
                    : friendlyError(signInError);
                error.hidden = false;
                input(form, 'password').select();
                return;
            }
            await enter(data.user);
        });
    }

    function showNotAdmin(user) {
        const sql = `insert into public.admins (user_id, email)\nselect id, email from auth.users\nwhere lower(email) = lower('${String(user.email || '').replace(/'/g, "''")}')\non conflict (user_id) do nothing;`;
        render(`
            <section class="adm-card adm-narrow">
                <h1>This account isn’t an admin yet</h1>
                <p>You’re signed in as <strong>${escapeHtml(user.email)}</strong>, but this account can’t change titles. In Supabase, open <strong>SQL Editor</strong>, run this, then check again:</p>
                <pre class="adm-code"><code>${escapeHtml(sql)}</code></pre>
                <div class="adm-actions">
                    <button class="cv-btn cv-btn-ghost cv-btn-sm" type="button" data-copy>Copy</button>
                    <button class="cv-btn cv-btn-primary cv-btn-sm" type="button" data-recheck>Check again</button>
                </div>
            </section>`);

        $('[data-copy]', main).addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(sql);
                toast('Copied');
            } catch {
                toast('Select the text and copy it');
            }
        });
        $('[data-recheck]', main).addEventListener('click', () => enter(user));
    }

    async function enter(user) {
        state.user = user;
        showSignedIn(user);
        render('<div class="adm-loading" role="status"><span class="adm-spinner" aria-hidden="true"></span>Loading your titles…</div>');

        // Admins can see their own entry in the admins table (and nothing else there).
        const { data: adminRows, error } = await state.client
            .from('admins')
            .select('user_id')
            .eq('user_id', user.id)
            .limit(1);
        if (error) {
            showProblem("Couldn't check your account", friendlyError(error));
            return;
        }
        if (!adminRows || !adminRows.length) {
            showNotAdmin(user);
            return;
        }

        try {
            await loadAll();
        } catch (loadError) {
            showProblem("Couldn't load your titles", friendlyError(loadError));
            return;
        }
        showApp();
    }

    // =========================================
    // MAIN SCREEN: TITLES & HOMEPAGE ROWS
    // =========================================

    function showApp() {
        render(`
            <div class="adm-app">
                <div class="adm-tabs" role="tablist" aria-label="Admin sections">
                    <button class="adm-tab" type="button" role="tab" data-tab="titles">Titles <span class="adm-count" data-count></span></button>
                    <button class="adm-tab" type="button" role="tab" data-tab="rows">Homepage rows</button>
                </div>

                <section class="adm-panel" data-panel="titles" role="tabpanel">
                    <div class="adm-toolbar">
                        <label class="adm-search">
                            <span class="cv-sr-only">Search titles</span>
                            <input type="search" placeholder="Search titles, genres, years…" data-search value="${escapeHtml(state.query)}">
                        </label>
                        <div class="adm-segment" role="group" aria-label="Show">
                            ${[['all', 'All'], ['movie', 'Movies'], ['series', 'Series'], ['hidden', 'Hidden']].map(([value, label]) =>
                                `<button type="button" data-filter="${value}" aria-pressed="${state.filter === value}">${label}</button>`).join('')}
                        </div>
                        <button class="cv-btn cv-btn-primary" type="button" data-new>+ Add title</button>
                    </div>
                    <div data-import-box></div>
                    <ul class="adm-list" data-list></ul>
                </section>

                <section class="adm-panel" data-panel="rows" role="tabpanel" hidden>
                    <p class="adm-muted adm-panel-intro">Choose which titles appear in each homepage row and in what order. The homepage shows the first six; <strong>View All</strong> shows the whole row.</p>
                    <div class="adm-rows" data-rows></div>
                </section>
            </div>`);

        $$('[data-tab]', main).forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
        $('[data-search]', main).addEventListener('input', event => {
            state.query = event.target.value;
            renderList();
        });
        $$('[data-filter]', main).forEach(button => button.addEventListener('click', () => {
            state.filter = button.dataset.filter;
            $$('[data-filter]', main).forEach(item => item.setAttribute('aria-pressed', String(item === button)));
            renderList();
        }));
        $('[data-new]', main).addEventListener('click', () => openEditor(null));
        $('[data-list]', main).addEventListener('click', onListClick);
        $('[data-rows]', main).addEventListener('click', onRowsClick);
        $('[data-rows]', main).addEventListener('change', onRowsChange);

        switchTab(state.tab);
        renderList();
        renderRows();
    }

    function switchTab(tab) {
        state.tab = tab;
        $$('[data-tab]', main).forEach(item => item.setAttribute('aria-selected', String(item.dataset.tab === tab)));
        $$('[data-panel]', main).forEach(panel => { panel.hidden = panel.dataset.panel !== tab; });
    }

    function renderImportBox() {
        const box = $('[data-import-box]', main);
        const fileTitles = [...(FILE_DATA.movies || []), ...(FILE_DATA.series || [])];
        if (state.titles.length || !fileTitles.length) {
            box.innerHTML = '';
            return;
        }
        box.innerHTML = `
            <div class="adm-card adm-import">
                <div>
                    <h2>Your database is empty</h2>
                    <p>Copy the ${fileTitles.length} titles and the homepage rows from <code>JS/data.js</code> into your database to get started. Until then, the website keeps showing the titles from data.js.</p>
                </div>
                <button class="cv-btn cv-btn-primary" type="button" data-import>Import ${fileTitles.length} titles</button>
            </div>`;
        $('[data-import]', box).addEventListener('click', event => importFromFile(event.currentTarget));
    }

    function matches(row) {
        const title = row.data || {};
        if (state.filter === 'hidden' && row.published) return false;
        if ((state.filter === 'movie' || state.filter === 'series') && title.type !== state.filter) return false;
        const query = state.query.trim().toLowerCase();
        if (!query) return true;
        return [title.title, row.id, title.year, ...(title.genres || []), ...(title.cast || []), title.director]
            .some(value => String(value || '').toLowerCase().includes(query));
    }

    function renderList() {
        const listBox = $('[data-list]', main);
        if (!listBox) return;
        $('[data-count]', main).textContent = state.titles.length;
        renderImportBox();

        const rows = state.titles.filter(matches);
        const memberships = new Map();
        allRows().forEach(row => row.title_ids.forEach(id => {
            if (!memberships.has(id)) memberships.set(id, []);
            memberships.get(id).push(row.name);
        }));

        if (!rows.length) {
            listBox.innerHTML = state.titles.length
                ? '<li class="adm-empty">No titles match. Try another search.</li>'
                : '<li class="adm-empty">No titles yet. Select <strong>+ Add title</strong> to add your first one.</li>';
            return;
        }

        listBox.innerHTML = rows.map(row => {
            const title = row.data || {};
            const meta = [title.type === 'series' ? 'Series' : 'Movie', title.year, (title.genres || []).slice(0, 3).join(', ')].filter(Boolean).join(' · ');
            const tags = [
                row.published ? '' : '<span class="adm-tag is-hidden">Hidden</span>',
                title.original ? '<span class="adm-tag">Original</span>' : '',
                title.watch ? '<span class="adm-tag">Full movie</span>' : '',
                ...(memberships.get(row.id) || []).map(name => `<span class="adm-tag is-row">${escapeHtml(name)}</span>`)
            ].join('');
            return `
                <li class="adm-item${row.published ? '' : ' is-unpublished'}">
                    <span class="adm-thumb">${title.poster ? `<img src="${escapeHtml(assetUrl(title.poster))}" alt="" loading="lazy">` : ''}</span>
                    <div class="adm-item-main">
                        <h3>${escapeHtml(title.title)}</h3>
                        <p>${escapeHtml(meta)}</p>
                        ${tags ? `<div class="adm-tags">${tags}</div>` : ''}
                    </div>
                    <div class="adm-item-actions">
                        <a class="cv-btn cv-btn-ghost cv-btn-sm" href="${escapeHtml(SITE_ROOT)}index.html?title=${encodeURIComponent(row.id)}" target="_blank" rel="noopener" title="Open on the website">View</a>
                        <button class="cv-btn cv-btn-primary cv-btn-sm" type="button" data-edit="${escapeHtml(row.id)}">Edit</button>
                    </div>
                </li>`;
        }).join('');

        $$('.adm-thumb img', listBox).forEach(img => img.addEventListener('error', () => img.remove(), { once: true }));
    }

    function onListClick(event) {
        const edit = event.target.closest('[data-edit]');
        if (edit) openEditor(edit.dataset.edit);
    }

    // ---------- Homepage rows ----------

    function renderRows() {
        const box = $('[data-rows]', main);
        if (!box) return;
        const published = state.titles.filter(row => row.published);

        box.innerHTML = allRows().map(row => {
            const ids = row.title_ids.filter(id => state.titles.some(title => title.id === id));
            const options = published
                .filter(title => !ids.includes(title.id))
                .sort((a, b) => String(a.data.title).localeCompare(String(b.data.title)))
                .map(title => `<option value="${escapeHtml(title.id)}">${escapeHtml(title.data.title)} (${escapeHtml(title.data.year || '')})</option>`)
                .join('');
            const where = HOME_SECTIONS.has(row.id) ? 'Homepage row' : 'Browse page only';

            return `
                <article class="adm-card adm-row" data-row="${escapeHtml(row.id)}">
                    <header class="adm-row-head">
                        <label class="adm-field adm-row-name">
                            <span>${where}</span>
                            <input type="text" value="${escapeHtml(row.name)}" data-row-name maxlength="60">
                        </label>
                        <span class="adm-muted">${ids.length} ${ids.length === 1 ? 'title' : 'titles'}</span>
                    </header>
                    <ol class="adm-row-list">
                        ${ids.length ? ids.map((id, index) => {
                            const title = state.titles.find(item => item.id === id);
                            const hidden = title && !title.published;
                            return `
                                <li class="${index >= 6 ? 'is-overflow' : ''}">
                                    <span class="adm-row-pos">${index + 1}</span>
                                    <span class="adm-row-title">${escapeHtml(titleName(id))}${hidden ? ' <span class="adm-tag is-hidden">Hidden</span>' : ''}</span>
                                    <span class="adm-row-buttons">
                                        <button type="button" data-move="up" data-id="${escapeHtml(id)}" aria-label="Move ${escapeHtml(titleName(id))} up" ${index === 0 ? 'disabled' : ''}>↑</button>
                                        <button type="button" data-move="down" data-id="${escapeHtml(id)}" aria-label="Move ${escapeHtml(titleName(id))} down" ${index === ids.length - 1 ? 'disabled' : ''}>↓</button>
                                        <button type="button" data-remove-from-row="${escapeHtml(id)}" aria-label="Remove ${escapeHtml(titleName(id))} from this row">✕</button>
                                    </span>
                                </li>`;
                        }).join('') : '<li class="adm-row-empty">No titles yet. Add some below. An empty row is hidden on the homepage.</li>'}
                    </ol>
                    <label class="adm-field">
                        <span class="cv-sr-only">Add a title to ${escapeHtml(row.name)}</span>
                        <select data-row-add>
                            <option value="">+ Add a title to this row…</option>
                            ${options}
                        </select>
                    </label>
                </article>`;
        }).join('');
    }

    async function updateRow(rowId, change, message) {
        const rows = allRows();
        const row = rows.find(item => item.id === rowId);
        if (!row) return;
        const next = { ...row, title_ids: [...row.title_ids] };
        change(next);
        try {
            await saveRows([next]);
            const index = state.rows.findIndex(item => item.id === rowId);
            if (index >= 0) state.rows[index] = next;
            else state.rows.push(next);
            renderRows();
            renderList();
            if (message) toast(message);
        } catch (error) {
            toast(friendlyError(error), 'error');
        }
    }

    function onRowsClick(event) {
        const card = event.target.closest('[data-row]');
        if (!card) return;
        const rowId = card.dataset.row;

        const move = event.target.closest('[data-move]');
        if (move) {
            const id = move.dataset.id;
            const step = move.dataset.move === 'up' ? -1 : 1;
            updateRow(rowId, row => {
                const index = row.title_ids.indexOf(id);
                const target = index + step;
                if (index < 0 || target < 0 || target >= row.title_ids.length) return;
                [row.title_ids[index], row.title_ids[target]] = [row.title_ids[target], row.title_ids[index]];
            });
            return;
        }

        const remove = event.target.closest('[data-remove-from-row]');
        if (remove) {
            const id = remove.dataset.removeFromRow;
            updateRow(rowId, row => { row.title_ids = row.title_ids.filter(item => item !== id); }, `Removed ${titleName(id)}`);
        }
    }

    function onRowsChange(event) {
        const card = event.target.closest('[data-row]');
        if (!card) return;
        const rowId = card.dataset.row;

        if (event.target.matches('[data-row-add]') && event.target.value) {
            const id = event.target.value;
            updateRow(rowId, row => { if (!row.title_ids.includes(id)) row.title_ids.push(id); }, `Added ${titleName(id)}`);
        }

        if (event.target.matches('[data-row-name]')) {
            const name = event.target.value.trim();
            if (!name) return;
            updateRow(rowId, row => { row.name = name; }, 'Row renamed');
        }
    }

    // ---------- Import from data.js ----------

    async function importFromFile(button) {
        const titles = [...(FILE_DATA.movies || []), ...(FILE_DATA.series || [])].filter(title => title && title.id && title.title);
        const ok = await confirmBox(`Copy ${titles.length} titles and the homepage rows from data.js into your database?`, 'Import');
        if (!ok) return;

        setBusy(button, true, 'Importing…');
        try {
            const start = Date.now() - titles.length * 1000;
            const rows = titles.map((title, index) => {
                const { id, ...data } = title;
                // Keep the data.js order.
                return { id, data, published: true, created_at: new Date(start + index * 1000).toISOString() };
            });
            for (let i = 0; i < rows.length; i += 50) {
                const { error } = await state.client.from('titles').upsert(rows.slice(i, i + 50), { onConflict: 'id' });
                if (error) throw error;
            }

            const fileRows = Object.entries(FILE_DATA.collections || {});
            const order = ROWS.map(row => row.id);
            await saveRows(fileRows.map(([id, row]) => ({
                id,
                name: row.name || ROWS.find(item => item.id === id)?.name || id,
                title_ids: Array.isArray(row.ids) ? row.ids : [],
                position: order.includes(id) ? order.indexOf(id) : order.length + fileRows.findIndex(([key]) => key === id)
            })));

            await loadAll();
            renderList();
            renderRows();
            toast(`Imported ${titles.length} titles`);
        } catch (error) {
            setBusy(button, false);
            toast(friendlyError(error), 'error');
        }
    }

    // =========================================
    // EDITOR (add / edit a title)
    // =========================================

    const field = (label, control, hint = '', extra = '') => `
        <label class="adm-field ${extra}">
            <span>${label}</span>
            ${control}
            ${hint ? `<small>${hint}</small>` : ''}
        </label>`;

    function videoBlock(name, video) {
        const qualityRows = (video.qualities.length ? video.qualities : [{ quality: '1080p', src: '' }, { quality: '720p', src: '' }]);
        return `
            <div class="adm-video" data-video="${name}">
                <div class="adm-choice" role="radiogroup" aria-label="${name === 'watch' ? 'Full movie' : 'Trailer'} source">
                    ${[['none', 'None'], ['single', 'One link'], ['qualities', 'Several qualities']].map(([value, label]) => `
                        <label><input type="radio" name="${name}-mode" value="${value}" ${video.mode === value ? 'checked' : ''}> ${label}</label>`).join('')}
                </div>
                <div class="adm-video-single" ${video.mode === 'single' ? '' : 'hidden'}>
                    <input type="text" name="${name}-link" value="${escapeHtml(video.link)}" placeholder="${name === 'watch' ? 'https://your-video-host/…/playlist.m3u8 or Videos/my-film.mp4' : 'https://www.youtube.com/watch?v=… or Videos/trailer.mp4'}" spellcheck="false" autocomplete="off">
                    <small>${name === 'watch'
                        ? 'A video file (.mp4), a video-host link (.m3u8, gets the Quality menu automatically), or a YouTube or Vimeo link of a full film.'
                        : 'Paste a YouTube link, or a link to your own video file (.mp4 / .m3u8) to play it without YouTube branding.'}</small>
                </div>
                <div class="adm-video-qualities" ${video.mode === 'qualities' ? '' : 'hidden'}>
                    <div class="adm-repeat" data-repeat="${name}-quality">
                        ${qualityRows.map(item => qualityRow(name, item)).join('')}
                    </div>
                    <button class="adm-link-btn" type="button" data-add-quality="${name}">+ Add a quality</button>
                    <small>One file per quality, for example 1080p, 720p and 480p copies of the same video. The player lists them in its Quality menu.</small>
                </div>
            </div>`;
    }

    function qualityRow(name, item = { quality: '', src: '' }) {
        return `
            <div class="adm-repeat-row" data-quality-row>
                <select name="${name}-q" aria-label="Quality">
                    ${QUALITIES.map(quality => `<option ${quality === item.quality ? 'selected' : ''}>${quality}</option>`).join('')}
                    ${item.quality && !QUALITIES.includes(item.quality) ? `<option selected>${escapeHtml(item.quality)}</option>` : ''}
                </select>
                <input type="text" name="${name}-src" value="${escapeHtml(item.src)}" placeholder="Link to the ${escapeHtml(item.quality || '')} file" aria-label="Video link" spellcheck="false" autocomplete="off">
                <button class="adm-icon-btn" type="button" data-remove-repeat aria-label="Remove this quality">✕</button>
            </div>`;
    }

    function subtitleRow(name, item = {}) {
        return `
            <div class="adm-repeat-row adm-sub-row" data-sub-row>
                <input type="text" name="${name}-label" value="${escapeHtml(item.label || '')}" placeholder="Name, e.g. English or தமிழ்" aria-label="Subtitle name">
                <input type="text" name="${name}-lang" value="${escapeHtml(item.lang || '')}" placeholder="en" aria-label="Language code" class="adm-short" maxlength="12">
                <div class="adm-upload-line">
                    <input type="text" name="${name}-src" value="${escapeHtml(item.src || '')}" placeholder="Subtitle file (.vtt)" aria-label="Subtitle file link" spellcheck="false" autocomplete="off">
                    <label class="cv-btn cv-btn-ghost cv-btn-sm adm-upload">Upload<input type="file" accept=".vtt,text/vtt" data-upload="subtitles" hidden></label>
                </div>
                <label class="adm-check"><input type="radio" name="${name}-default" value="1" ${item.default ? 'checked' : ''}> On by default</label>
                <button class="adm-icon-btn" type="button" data-remove-repeat aria-label="Remove these subtitles">✕</button>
            </div>`;
    }

    function imageField(name, label, value, hint) {
        return `
            <div class="adm-field adm-image" data-image="${name}">
                <span>${label}</span>
                <div class="adm-image-body">
                    <span class="adm-image-preview ${name === 'backdrop' ? 'is-wide' : ''}">${value ? `<img src="${escapeHtml(assetUrl(value))}" alt="">` : ''}</span>
                    <div class="adm-image-controls">
                        <div class="adm-upload-line">
                            <input type="text" name="${name}" value="${escapeHtml(value || '')}" placeholder="Link or path, e.g. Images/posters/my-film.jpg" spellcheck="false" autocomplete="off">
                            <label class="cv-btn cv-btn-ghost cv-btn-sm adm-upload">Upload<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" data-upload="${name === 'poster' ? 'posters' : 'backdrops'}" hidden></label>
                        </div>
                        <small>${hint}</small>
                    </div>
                </div>
            </div>`;
    }

    function editorHtml(row) {
        const isNew = !row;
        const title = row?.data || { type: 'movie', genres: [], popularity: 50 };
        const trailerValue = title.video || title.trailer;
        const trailer = readVideo(trailerValue);
        const watch = readVideo(title.watch);
        const knownGenres = [...new Set([...GENRES, ...state.titles.flatMap(item => item.data?.genres || []), ...(title.genres || [])])].sort();
        const inRows = new Set(allRows().filter(item => item.title_ids.includes(row?.id)).map(item => item.id));

        return `
            <form class="adm-editor-form" data-editor-form novalidate>
                <header class="adm-editor-head">
                    <div>
                        <p class="adm-kicker">${isNew ? 'New title' : 'Edit title'}</p>
                        <h2 data-editor-heading>${escapeHtml(title.title || 'Untitled')}</h2>
                    </div>
                    <button class="adm-icon-btn adm-close" type="button" data-close-editor aria-label="Close without saving">✕</button>
                </header>

                <div class="adm-editor-body">
                    <p class="adm-error" data-form-error hidden></p>

                    <fieldset class="adm-section">
                        <legend>Basics</legend>
                        <div class="adm-grid">
                            ${field('Title *', `<input type="text" name="title" value="${escapeHtml(title.title || '')}" required maxlength="120">`, '', 'adm-span-2')}
                            ${field('Web address', `<div class="adm-prefix"><span>?title=</span><input type="text" name="id" value="${escapeHtml(row?.id || '')}" ${isNew ? '' : 'readonly'} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" spellcheck="false"></div>`,
                                isNew ? 'Made from the title. Lowercase letters, numbers and dashes.' : 'Fixed once saved, so shared links keep working.', 'adm-span-2')}
                            <div class="adm-field adm-span-2">
                                <span>Type</span>
                                <div class="adm-choice">
                                    <label><input type="radio" name="type" value="movie" ${title.type !== 'series' ? 'checked' : ''}> Movie</label>
                                    <label><input type="radio" name="type" value="series" ${title.type === 'series' ? 'checked' : ''}> Series</label>
                                </div>
                            </div>
                            ${field('Year', `<input type="number" name="year" value="${escapeHtml(title.year ?? '')}" min="1888" max="2100" inputmode="numeric">`)}
                            ${field('Age rating', `<input type="text" name="certification" value="${escapeHtml(title.certification || '')}" list="adm-certificates" maxlength="20">`)}
                            ${field('Length (minutes)', `<input type="number" name="runtime" value="${escapeHtml(title.runtime ?? '')}" min="1" max="1000" inputmode="numeric">`, '', 'adm-movie-only')}
                            ${field('Seasons', `<input type="number" name="seasons" value="${escapeHtml(title.seasons ?? '')}" min="1" max="100" inputmode="numeric">`, '', 'adm-series-only')}
                            ${field('Shown as', `<select name="seasonLabel">
                                ${[['', 'Seasons'], ['Parts', 'Parts'], ['Limited Series', 'Limited Series']].map(([value, label]) => `<option value="${value}" ${String(title.seasonLabel || '') === value ? 'selected' : ''}>${label}</option>`).join('')}
                            </select>`, '', 'adm-series-only')}
                            ${field('Rating (0–10)', `<input type="number" name="rating" value="${escapeHtml(title.rating ?? '')}" min="0" max="10" step="0.1" inputmode="decimal">`)}
                            ${field('Popularity (0–100)', `<input type="number" name="popularity" value="${escapeHtml(title.popularity ?? 50)}" min="0" max="100" inputmode="numeric">`, 'Higher shows earlier in “Most Popular”.')}
                            <div class="adm-field adm-span-2">
                                <span>Genres</span>
                                <div class="adm-chips">
                                    ${knownGenres.map(genre => `<label class="adm-chip"><input type="checkbox" name="genres" value="${escapeHtml(genre)}" ${(title.genres || []).includes(genre) ? 'checked' : ''}><span>${escapeHtml(genre)}</span></label>`).join('')}
                                </div>
                                <input type="text" name="moreGenres" placeholder="Other genres, separated by commas" aria-label="Other genres">
                            </div>
                            ${field('Story', `<textarea name="overview" rows="4" maxlength="1200">${escapeHtml(title.overview || '')}</textarea>`, 'One or two sentences shown on the title page.', 'adm-span-2')}
                            ${field('Director', `<input type="text" name="director" value="${escapeHtml(title.director || '')}">`, '', 'adm-movie-only')}
                            ${field('Created by', `<input type="text" name="creators" value="${escapeHtml((title.creators || []).join(', '))}">`, 'Separate names with commas.', 'adm-series-only')}
                            ${field('Cast', `<input type="text" name="cast" value="${escapeHtml((title.cast || []).join(', '))}">`, 'Separate names with commas.')}
                            ${field('Network or studio', `<input type="text" name="network" value="${escapeHtml(title.network || '')}">`, '', 'adm-series-only')}
                            ${field('Format', `<input type="text" name="format" value="${escapeHtml(title.format || '')}" placeholder="e.g. Short film">`, 'Optional label shown above the title.')}
                        </div>
                    </fieldset>

                    <fieldset class="adm-section">
                        <legend>Pictures</legend>
                        ${imageField('poster', 'Poster (tall)', title.poster, 'Shown on cards. About 2:3, for example 600 × 900 pixels.')}
                        ${imageField('backdrop', 'Backdrop (wide)', title.backdrop, 'Shown at the top of the title page. About 16:9, for example 1600 × 900 pixels.')}
                    </fieldset>

                    <fieldset class="adm-section">
                        <legend>Trailer</legend>
                        ${videoBlock('trailer', trailer)}
                        <label class="adm-check"><input type="checkbox" name="isTeaser" ${title.video ? 'checked' : ''}> Call it a <strong>teaser</strong> (for CineVerse Originals)</label>
                        <div class="adm-field">
                            <span>Trailer subtitles</span>
                            <div class="adm-repeat" data-repeat="trailerSubs">${(title.trailerSubtitles || []).map(item => subtitleRow('trailerSubs', item)).join('')}</div>
                            <button class="adm-link-btn" type="button" data-add-sub="trailerSubs">+ Add subtitles</button>
                            <small>Only for your own trailer files. YouTube trailers use YouTube's captions.</small>
                        </div>
                    </fieldset>

                    <fieldset class="adm-section">
                        <legend>Full movie</legend>
                        <p class="adm-note">Only add films you have the right to stream: your own, licensed, or free-licence films.</p>
                        ${videoBlock('watch', watch)}
                        <div class="adm-field">
                            <span>Subtitles</span>
                            <div class="adm-repeat" data-repeat="movieSubs">${(title.subtitles || []).map(item => subtitleRow('movieSubs', item)).join('')}</div>
                            <button class="adm-link-btn" type="button" data-add-sub="movieSubs">+ Add subtitles</button>
                        </div>
                        ${field('Credit line', `<input type="text" name="credit" value="${escapeHtml(title.credit || '')}" placeholder="e.g. Blender Foundation · Creative Commons licence">`, 'Shown on the title page and in the player.')}
                    </fieldset>

                    <fieldset class="adm-section">
                        <legend>On the website</legend>
                        <label class="adm-switch"><input type="checkbox" name="published" ${row ? (row.published ? 'checked' : '') : 'checked'}> <span>Visible to visitors</span></label>
                        <label class="adm-check"><input type="checkbox" name="original" ${title.original ? 'checked' : ''}> CineVerse Original</label>
                        <div class="adm-field">
                            <span>Homepage rows</span>
                            <div class="adm-chips">
                                ${allRows().map(item => `<label class="adm-chip"><input type="checkbox" name="rows" value="${escapeHtml(item.id)}" ${inRows.has(item.id) ? 'checked' : ''}><span>${escapeHtml(item.name)}</span></label>`).join('')}
                            </div>
                            <small>New titles go to the end of a row. Change the order in Homepage rows.</small>
                        </div>
                    </fieldset>
                </div>

                <footer class="adm-editor-foot">
                    ${isNew ? '<span></span>' : '<button class="cv-btn cv-btn-sm adm-danger" type="button" data-delete-title>Delete</button>'}
                    <div class="adm-actions">
                        <button class="cv-btn cv-btn-ghost" type="button" data-close-editor>Cancel</button>
                        <button class="cv-btn cv-btn-primary" type="submit">${isNew ? 'Add title' : 'Save changes'}</button>
                    </div>
                </footer>

                <datalist id="adm-certificates">${CERTIFICATES.map(item => `<option value="${escapeHtml(item)}">`).join('')}</datalist>
            </form>`;
    }

    function openEditor(id) {
        const row = id ? state.titles.find(item => item.id === id) : null;
        state.editing = row;

        const dialog = document.createElement('dialog');
        dialog.className = 'adm-editor';
        dialog.innerHTML = editorHtml(row);
        document.body.appendChild(dialog);

        const form = $('[data-editor-form]', dialog);
        let idTouched = Boolean(row);
        let dirty = false;

        const syncType = () => {
            const type = form.querySelector('input[name="type"]:checked')?.value || 'movie';
            dialog.dataset.type = type;
        };
        syncType();

        form.addEventListener('input', event => {
            dirty = true;
            if (event.target.name === 'title') {
                $('[data-editor-heading]', form).textContent = event.target.value || 'Untitled';
                if (!idTouched) input(form, 'id').value = slugify(event.target.value);
            }
            if (event.target.name === 'id') {
                idTouched = true;
                event.target.value = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            }
            if (event.target.name === 'poster' || event.target.name === 'backdrop') updatePreview(form, event.target.name);
        });

        form.addEventListener('change', event => {
            if (event.target.name === 'type') syncType();
            const mode = event.target.name?.match(/^(trailer|watch)-mode$/);
            if (mode) {
                const block = $(`[data-video="${mode[1]}"]`, form);
                $('.adm-video-single', block).hidden = event.target.value !== 'single';
                $('.adm-video-qualities', block).hidden = event.target.value !== 'qualities';
            }
            if (event.target.matches('[data-upload]') && event.target.files?.[0]) handleUpload(event.target);
        });

        form.addEventListener('click', event => {
            if (event.target.closest('[data-close-editor]')) {
                closeEditor(dialog, dirty);
                return;
            }
            const addQuality = event.target.closest('[data-add-quality]');
            if (addQuality) {
                const name = addQuality.dataset.addQuality;
                const box = $(`[data-repeat="${name}-quality"]`, form);
                const used = $$('select', box).map(select => select.value);
                const next = QUALITIES.find(quality => !used.includes(quality)) || '480p';
                box.insertAdjacentHTML('beforeend', qualityRow(name, { quality: next, src: '' }));
                $$('input', box).pop().focus();
                dirty = true;
                return;
            }
            const addSub = event.target.closest('[data-add-sub]');
            if (addSub) {
                const name = addSub.dataset.addSub;
                const box = $(`[data-repeat="${name}"]`, form);
                box.insertAdjacentHTML('beforeend', subtitleRow(name));
                $$('input[type="text"]', box).slice(-3)[0].focus();
                dirty = true;
                return;
            }
            const removeRepeat = event.target.closest('[data-remove-repeat]');
            if (removeRepeat) {
                removeRepeat.closest('.adm-repeat-row').remove();
                dirty = true;
                return;
            }
            if (event.target.closest('[data-delete-title]')) deleteTitle(dialog, row);
        });

        form.addEventListener('submit', event => {
            event.preventDefault();
            saveTitle(dialog, form, row);
        });

        dialog.addEventListener('cancel', event => {
            event.preventDefault();
            closeEditor(dialog, dirty);
        });

        dialog.showModal();
        input(form, 'title').focus();
    }

    async function closeEditor(dialog, dirty) {
        if (dirty && !(await confirmBox('Close without saving your changes?', 'Discard changes'))) return;
        dialog.close();
        dialog.remove();
        state.editing = null;
    }

    function updatePreview(form, name) {
        const preview = $(`[data-image="${name}"] .adm-image-preview`, form);
        const value = input(form, name).value.trim();
        preview.innerHTML = value && isSafeLink(value) ? `<img src="${escapeHtml(assetUrl(value))}" alt="">` : '';
        const img = $('img', preview);
        if (img) img.addEventListener('error', () => { preview.innerHTML = '<span class="adm-image-broken">Picture not found</span>'; }, { once: true });
    }

    async function handleUpload(input) {
        const file = input.files[0];
        const folder = input.dataset.upload;
        const target = input.closest('.adm-upload-line').querySelector('input[type="text"]');
        const button = input.closest('.adm-upload');

        const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
        const type = UPLOAD_TYPES[ext] || '';
        input.value = '';

        if (!type || (folder === 'subtitles') !== (type === 'text/vtt')) {
            toast(folder === 'subtitles' ? 'Subtitles must be a .vtt file.' : 'Pictures must be JPG, PNG, WebP, AVIF or GIF.', 'error');
            return;
        }
        if (file.size > MAX_UPLOAD) {
            toast('That file is too big. Files can be up to 10 MB.', 'error');
            return;
        }

        const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'file';
        const path = `${folder}/${Date.now()}-${base}.${ext}`;
        button.classList.add('is-busy');
        button.firstChild.textContent = 'Uploading…';

        try {
            const { error } = await state.client.storage
                .from(BUCKET)
                .upload(path, new File([file], `${base}.${ext}`, { type }), { upsert: false, cacheControl: '31536000' });
            if (error) throw error;
            target.value = state.client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            toast('Uploaded');
        } catch (error) {
            toast(friendlyError(error), 'error');
        } finally {
            button.classList.remove('is-busy');
            button.firstChild.textContent = 'Upload';
        }
    }

    function readVideoForm(form, name) {
        const mode = form.querySelector(`input[name="${name}-mode"]:checked`)?.value || 'none';
        const block = $(`[data-video="${name}"]`, form);
        return {
            mode,
            link: input(form, `${name}-link`)?.value.trim() || '',
            qualities: $$('[data-quality-row]', block).map(item => ({
                quality: $('select', item).value,
                src: $('input', item).value.trim()
            }))
        };
    }

    function readSubtitles(form, name) {
        return $$(`[data-repeat="${name}"] [data-sub-row]`, form).map(item => {
            const entry = {
                label: item.querySelector(`input[name="${name}-label"]`).value.trim(),
                lang: item.querySelector(`input[name="${name}-lang"]`).value.trim(),
                src: item.querySelector(`input[name="${name}-src"]`).value.trim()
            };
            if (item.querySelector(`input[name="${name}-default"]`).checked) entry.default = true;
            if (!entry.lang) delete entry.lang;
            return entry;
        }).filter(entry => entry.src || entry.label);
    }

    // Reads the form into a title object. Fields the form doesn't know about
    // (for example posterFallback) are kept as they were.
    function readForm(form, original) {
        const errors = [];
        const data = { ...(original || {}) };
        const text = name => input(form, name)?.value.trim() || '';
        const number = (name, { min, max, decimal } = {}) => {
            const raw = text(name);
            if (!raw) return undefined;
            const value = decimal ? Number(raw) : Number.parseInt(raw, 10);
            if (!Number.isFinite(value) || (min !== undefined && value < min) || (max !== undefined && value > max)) {
                errors.push(`${input(form, name).closest('.adm-field').querySelector('span').textContent} must be between ${min} and ${max}.`);
                return undefined;
            }
            return decimal ? Math.round(value * 10) / 10 : value;
        };
        const put = (key, value) => {
            const empty = value === undefined || value === '' || (Array.isArray(value) && !value.length);
            if (empty) delete data[key];
            else data[key] = value;
        };

        const type = form.querySelector('input[name="type"]:checked')?.value === 'series' ? 'series' : 'movie';
        const id = (input(form, 'id').value || slugify(text('title'))).replace(/^-+|-+$/g, '');

        if (!text('title')) errors.push('Give the title a name.');
        if (!text('year')) errors.push('Add the year it came out.');
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errors.push('The web address can only use lowercase letters, numbers and single dashes.');

        put('type', type);
        put('title', text('title'));
        put('year', number('year', { min: 1888, max: 2100 }));
        put('certification', text('certification'));
        put('rating', number('rating', { min: 0, max: 10, decimal: true }) ?? 0);
        put('popularity', number('popularity', { min: 0, max: 100 }) ?? 50);

        const genres = [...new Set([...$$('input[name="genres"]:checked', form).map(input => input.value), ...list(text('moreGenres'))])];
        put('genres', genres);
        if (!genres.length) data.genres = [];
        put('overview', text('overview'));
        put('cast', list(text('cast')));
        put('format', text('format'));

        if (type === 'movie') {
            put('runtime', number('runtime', { min: 1, max: 1000 }));
            put('director', text('director'));
            ['seasons', 'seasonLabel', 'creators', 'network'].forEach(key => delete data[key]);
        } else {
            put('seasons', number('seasons', { min: 1, max: 100 }));
            put('seasonLabel', text('seasonLabel'));
            put('creators', list(text('creators')));
            put('network', text('network'));
            ['runtime', 'director'].forEach(key => delete data[key]);
        }

        ['poster', 'backdrop'].forEach(key => {
            const value = text(key);
            if (!isSafeLink(value)) errors.push(`The ${key} link doesn't look right.`);
            if (value !== String(original?.[key] || '')) delete data[key === 'poster' ? 'posterFallback' : 'backdropFallback'];
            put(key, value);
        });

        const trailer = writeVideo(readVideoForm(form, 'trailer'), 'trailer');
        const teaser = input(form, 'isTeaser').checked;
        delete data.trailer;
        delete data.video;
        if (trailer) data[teaser ? 'video' : 'trailer'] = trailer;

        put('watch', writeVideo(readVideoForm(form, 'watch'), 'watch'));
        put('subtitles', readSubtitles(form, 'movieSubs'));
        put('trailerSubtitles', readSubtitles(form, 'trailerSubs'));
        put('credit', text('credit'));
        if (input(form, 'original').checked) data.original = true;
        else delete data.original;

        const links = [
            ...(typeof data.watch === 'string' ? [data.watch] : Object.values(data.watch || {})),
            ...(typeof trailer === 'string' ? [trailer] : Object.values(trailer || {})),
            ...[...(data.subtitles || []), ...(data.trailerSubtitles || [])].map(item => item.src)
        ];
        if (links.some(link => !/^(youtube|vimeo|embed):/i.test(link) && !isSafeLink(link))) errors.push('One of the video or subtitle links doesn’t look right.');
        if ([...(data.subtitles || []), ...(data.trailerSubtitles || [])].some(item => !item.src || !item.label)) errors.push('Each subtitle needs a name and a file.');

        delete data.id;
        return { id, data, published: input(form, 'published').checked, rows: $$('input[name="rows"]:checked', form).map(input => input.value), errors };
    }

    async function saveTitle(dialog, form, row) {
        const result = readForm(form, row?.data);
        const errorBox = $('[data-form-error]', form);

        if (!row && state.titles.some(item => item.id === result.id)) {
            result.errors.push(`The web address “${result.id}” is already used by “${titleName(result.id)}”. Change it a little.`);
        }
        if (result.errors.length) {
            errorBox.innerHTML = result.errors.map(escapeHtml).join('<br>');
            errorBox.hidden = false;
            errorBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return;
        }
        errorBox.hidden = true;

        const button = $('button[type="submit"]', form);
        setBusy(button, true, 'Saving…');

        try {
            const { error } = await state.client.from('titles').upsert({ id: result.id, data: result.data, published: result.published }, { onConflict: 'id' });
            if (error) throw error;

            // Homepage rows: add to newly ticked rows, remove from unticked ones.
            const changed = allRows().map(item => {
                const has = item.title_ids.includes(result.id);
                const wants = result.rows.includes(item.id);
                if (has === wants) return null;
                return { ...item, title_ids: wants ? [...item.title_ids, result.id] : item.title_ids.filter(id => id !== result.id) };
            }).filter(Boolean);
            await saveRows(changed);

            await loadAll();
            renderList();
            renderRows();
            dialog.close();
            dialog.remove();
            state.editing = null;
            toast(row ? `Saved “${result.data.title}”` : `Added “${result.data.title}”`);
        } catch (error) {
            setBusy(button, false);
            errorBox.textContent = friendlyError(error);
            errorBox.hidden = false;
        }
    }

    async function deleteTitle(dialog, row) {
        if (!row) return;
        const ok = await confirmBox(`Delete “${row.data.title}”? It disappears from the website. This can’t be undone.`);
        if (!ok) return;

        try {
            const { error } = await state.client.from('titles').delete().eq('id', row.id);
            if (error) throw error;
            const changed = allRows()
                .filter(item => item.title_ids.includes(row.id))
                .map(item => ({ ...item, title_ids: item.title_ids.filter(id => id !== row.id) }));
            await saveRows(changed);
            await loadAll();
            renderList();
            renderRows();
            dialog.close();
            dialog.remove();
            state.editing = null;
            toast(`Deleted “${row.data.title}”`);
        } catch (error) {
            toast(friendlyError(error), 'error');
        }
    }

    // =========================================
    // START
    // =========================================

    async function start() {
        if (!DB_URL || !DB_KEY) {
            showSetup();
            return;
        }
        if (!window.supabase?.createClient) {
            showProblem("Couldn't load Supabase", 'The admin page needs an internet connection to load Supabase. Check your connection and try again.');
            return;
        }

        state.client = window.supabase.createClient(DB_URL, DB_KEY, {
            auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cineverse-admin-auth' }
        });

        $('[data-sign-out]').addEventListener('click', async () => {
            await state.client.auth.signOut();
            state.user = null;
            showLogin();
        });

        const { data } = await state.client.auth.getSession();
        if (data?.session?.user) await enter(data.session.user);
        else showLogin();
    }

    start().catch(error => showProblem('Something went wrong', friendlyError(error)));
})();
