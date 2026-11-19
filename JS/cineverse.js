/* =========================================
   CINEVERSE — SITE SCRIPT
   Shared behaviour for every page (HTML/CSS/JS only).
   Titles come from your database when one is connected (JS/database.js),
   otherwise from JS/data.js.
========================================= */

(async () => {
    'use strict';

    // Read now: once the script waits below, the browser forgets which script is running.
    const SCRIPT_URL = document.currentScript ? document.currentScript.src : '';

    // Titles may still be on their way from the database.
    try {
        await window.CINEVERSE_READY;
    } catch { /* data.js titles are used */ }

    // =========================================
    // SETUP
    // =========================================

    const DATA = window.CINEVERSE_DATA || { movies: [], series: [], collections: {}, notifications: [] };
    const CONFIG = window.CINEVERSE_CONFIG || {};

    // Folder that holds index.html, worked out from this script's own URL,
    // so links and images resolve from any page (and from a sub-folder host).
    const ROOT = (() => {
        try {
            return new URL('../', SCRIPT_URL).href;
        } catch {
            return new URL('./', location.href).href;
        }
    })();

    const PAGE = document.body.dataset.page || 'home';
    const ALL = [...(DATA.movies || []), ...(DATA.series || [])];
    const BY_ID = new Map(ALL.map(title => [title.id, title]));
    const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);
    const BASE_TITLE = document.title;

    const KEYS = {
        list: 'cineverse-my-list',
        recent: 'cineverse-recent',
        profile: 'cineverse-profile',
        seen: 'cineverse-seen-notifications',
        read: 'cineverse-read-notifications',
        newsletter: 'cineverse-newsletter',
        messages: 'cineverse-messages',
        progress: 'cineverse-progress',
        player: 'cineverse-player'
    };

    const ICONS = {
        plus: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
        check: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
        play: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
        share: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v13"/><path d="M7 8l5-5 5 5"/></svg>',
        close: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        external: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>'
    };

    const CURATED_GENRES = {
        movie: ['Action', 'Adventure', 'Sci-Fi', 'Thriller', 'Drama', 'Comedy', 'Romance', 'Horror', 'Animation', 'Fantasy', 'Crime'],
        series: ['Drama', 'Crime', 'Thriller', 'Sci-Fi', 'Fantasy', 'Action', 'Comedy', 'Horror', 'Animation', 'Mystery']
    };

    // =========================================
    // HELPERS
    // =========================================

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));

    const isExternal = path => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(path) || /^(data|blob):/i.test(path);
    const asset = path => !path ? '' : isExternal(path) ? path : ROOT + String(path).replace(/^\/+/, '');

    function pageUrl(path, params = {}) {
        const url = new URL(path, ROOT);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
        });
        return url.href;
    }

    const normalize = value => String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    function formatRuntime(minutes) {
        if (!minutes) return '';
        const hours = Math.floor(minutes / 60);
        const rest = minutes % 60;
        if (!hours) return `${rest}m`;
        return rest ? `${hours}h ${rest}m` : `${hours}h`;
    }

    function seasonText(title) {
        if (!title.seasons) return '';
        if (title.seasonLabel === 'Limited Series') return 'Limited Series';
        const unit = title.seasonLabel === 'Parts' ? 'Part' : 'Season';
        return `${title.seasons} ${unit}${title.seasons === 1 ? '' : 's'}`;
    }

    const typeLabel = title => title.original ? 'Original' : title.type === 'series' ? 'Series' : 'Movie';
    const rating = title => Number(title.rating || 0).toFixed(1);
    const isValidEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

    function debounce(fn, wait) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), wait);
        };
    }

    const youtubeSearch = title => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title.title} ${title.year} official trailer`)}`;

    // Legal "where to stream it" search for studio titles we can't play here.
    const whereToWatchUrl = title =>
        `https://www.justwatch.com/${encodeURIComponent(CONFIG.watchCountry || 'in')}/search?q=${encodeURIComponent(title.title)}`;

    // Video formats for title.watch and title.trailer (see JS/data.js):
    //   'Videos/film.mp4' or 'https://…/film.mp4'  → video file   (CineVerse player)
    //   'https://…/playlist.m3u8'                   → HLS stream   (CineVerse player)
    //   'youtube:VIDEO_ID' or a bare 11-character ID → YouTube player with CineVerse controls
    //   'vimeo:VIDEO_ID'                             → Vimeo player
    //   'embed:https://…'                           → any player URL (Bunny Stream, Cloudflare Stream, Internet Archive…)
    //   { '1080p': '…-1080p.mp4', '720p': '…-720p.mp4' } → one video in several qualities (Quality menu)
    function qualityHeight(label) {
        const text = String(label || '').toLowerCase();
        const number = text.match(/(\d{3,4})\s*p?\b/);
        if (number) return Number(number[1]);
        if (/\b(4k|uhd)\b/.test(text)) return 2160;
        if (/full\s*hd|fhd/.test(text)) return 1080;
        if (/\bhd\b/.test(text)) return 720;
        if (/\bsd\b/.test(text)) return 480;
        return 0;
    }

    function parseSource(value) {
        if (value && typeof value === 'object') {
            const entries = Array.isArray(value)
                ? value.map(item => [item?.quality || item?.label, item?.src])
                : Object.entries(value);
            const qualities = entries
                .map(([label, src]) => ({ label: String(label || '').trim(), src: String(src || '').trim() }))
                .filter(item => item.label && item.src)
                .map(item => ({ ...item, height: qualityHeight(item.label), src: asset(item.src) }))
                .sort((a, b) => b.height - a.height);
            if (!qualities.length) return null;
            return { kind: 'file', src: qualities[0].src, qualities };
        }

        const raw = String(value || '').trim();
        if (!raw) return null;

        const match = raw.match(/^(youtube|vimeo|embed):(.+)$/i);
        if (match) {
            const kind = match[1].toLowerCase();
            const rest = match[2].trim();
            return kind === 'embed' ? { kind, src: rest } : { kind, id: rest };
        }

        if (/^[\w-]{11}$/.test(raw)) return { kind: 'youtube', id: raw };

        return /\.m3u8(\?|#|$)/i.test(raw)
            ? { kind: 'hls', src: asset(raw) }
            : { kind: 'file', src: asset(raw) };
    }

    const watchSource = title => parseSource(title?.watch);
    const trailerSource = title => parseSource(title?.video || title?.trailer);

    function formatClock(seconds) {
        const total = Math.max(0, Math.floor(seconds));
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = String(total % 60).padStart(2, '0');
        return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
    }

    // =========================================
    // STORAGE (localStorage with safe fallbacks)
    // =========================================

    const store = {
        get(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw === null ? fallback : JSON.parse(raw);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch { /* ignore */ }
        }
    };

    // =========================================
    // TOAST
    // =========================================

    let toastTimer;

    function toast(message) {
        let element = $('.cv-toast');

        if (!element) {
            element = document.createElement('div');
            element.className = 'cv-toast';
            element.setAttribute('role', 'status');
            element.setAttribute('aria-live', 'polite');
            document.body.appendChild(element);
        }

        element.textContent = message;
        element.classList.remove('is-visible');
        void element.offsetWidth;
        element.classList.add('is-visible');

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => element.classList.remove('is-visible'), 2800);
    }

    // =========================================
    // IMAGES — fallbacks for posters that fail to load
    // =========================================

    function handleBrokenImage(img) {
        const fallback = img.dataset.fallback;

        if (fallback && img.dataset.fallbackUsed !== '1') {
            img.dataset.fallbackUsed = '1';
            img.src = fallback;
            return;
        }

        img.classList.add('is-broken');
        img.closest('[data-placeholder]')?.classList.add('is-missing');
    }

    document.addEventListener('error', event => {
        if (event.target instanceof HTMLImageElement) handleBrokenImage(event.target);
    }, true);

    function checkBrokenImages(root = document) {
        $$('img', root).forEach(img => {
            const src = img.currentSrc || img.getAttribute('src') || '';
            if (!src || /\.svg(\?|#|$)/i.test(src)) return;
            if (img.complete && img.naturalWidth === 0) handleBrokenImage(img);
        });
    }

    function posterImg(title, extra = '') {
        const fallback = title.posterFallback ? ` data-fallback="${escapeHtml(asset(title.posterFallback))}"` : '';
        return `<img src="${escapeHtml(asset(title.poster))}"${fallback} alt="${escapeHtml(title.title)} poster" loading="lazy" decoding="async" ${extra}>`;
    }

    // =========================================
    // SEARCH ENGINE
    // =========================================

    function searchTitles(query, pool = ALL) {
        const q = normalize(query);
        if (!q) return [];
        const terms = q.split(' ');

        return pool
            .map(title => {
                const name = normalize(title.title);
                const haystack = normalize([
                    title.title,
                    title.year,
                    (title.genres || []).join(' '),
                    (title.cast || []).join(' '),
                    title.director || '',
                    (title.creators || []).join(' '),
                    title.network || '',
                    title.type === 'series' ? 'series tv show' : 'movie film',
                    title.original ? 'cineverse original' : '',
                    title.watch ? 'free watch full movie' : '',
                    title.format || ''
                ].join(' '));

                if (!terms.every(term => haystack.includes(term))) return null;

                let score = title.popularity / 100;
                if (name === q) score += 100;
                else if (name.startsWith(q)) score += 60;
                else if (name.includes(q)) score += 40;

                const nameWords = name.split(' ');
                const words = haystack.split(' ');
                terms.forEach(term => {
                    if (nameWords.some(word => word.startsWith(term))) score += 10;
                    if (words.includes(term)) score += 8;
                    else if (words.some(word => word.startsWith(term))) score += 3;
                });

                return { title, score };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score)
            .map(result => result.title);
    }

    function highlight(text, query) {
        const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
        if (!query.trim() || index < 0) return escapeHtml(text);
        const end = index + query.trim().length;
        return `${escapeHtml(text.slice(0, index))}<mark>${escapeHtml(text.slice(index, end))}</mark>${escapeHtml(text.slice(end))}`;
    }

    function sortTitles(items, sort) {
        const list = items.slice();
        if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || b.popularity - a.popularity);
        else if (sort === 'newest') list.sort((a, b) => b.year - a.year || b.popularity - a.popularity);
        else if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
        else if (sort === 'popular') list.sort((a, b) => b.popularity - a.popularity);
        return list;
    }

    // =========================================
    // MY LIST
    // =========================================

    function getList() {
        const raw = store.get(KEYS.list, []);
        if (!Array.isArray(raw)) return [];

        let changed = false;
        const seen = new Set();

        const list = raw
            .map(item => {
                if (item && item.id && BY_ID.has(item.id)) return item;

                // Older versions saved { title, image } — match them to the catalog.
                if (item && item.title) {
                    const match = ALL.find(title => normalize(title.title) === normalize(item.title));
                    changed = true;
                    return match ? { id: match.id, savedAt: item.savedAt || Date.now() } : null;
                }

                changed = true;
                return null;
            })
            .filter(item => item && !seen.has(item.id) && seen.add(item.id));

        if (changed) store.set(KEYS.list, list);
        return list;
    }

    const isSaved = id => getList().some(item => item.id === id);

    function setSaved(id, saved) {
        const list = getList().filter(item => item.id !== id);
        if (saved) list.unshift({ id, savedAt: Date.now() });

        if (!store.set(KEYS.list, list)) {
            toast('Your browser blocked saving. Please allow site storage and try again.');
            return false;
        }

        syncListUI();
        document.dispatchEvent(new CustomEvent('cv:listchange'));
        return true;
    }

    function toggleSaved(id) {
        const title = BY_ID.get(id);
        if (!title) return;

        const next = !isSaved(id);
        if (setSaved(id, next)) {
            toast(next ? `${title.title} added to My List` : `${title.title} removed from My List`);
        }
    }

    function syncListUI() {
        const ids = new Set(getList().map(item => item.id));

        $$('[data-list-toggle]').forEach(button => {
            const id = button.dataset.listToggle;
            const saved = ids.has(id);
            const name = BY_ID.get(id)?.title || 'this title';

            button.setAttribute('aria-pressed', String(saved));
            button.classList.toggle('is-saved', saved);

            if (button.classList.contains('cv-list-toggle')) {
                button.innerHTML = saved ? ICONS.check : ICONS.plus;
                button.setAttribute('aria-label', saved ? `Remove ${name} from My List` : `Add ${name} to My List`);
                button.title = saved ? 'In My List' : 'Add to My List';
            } else {
                button.innerHTML = saved
                    ? `${ICONS.check}<span>In My List</span>`
                    : `${ICONS.plus}<span>My List</span>`;
            }
        });

        $$('[data-list-count]').forEach(element => {
            element.textContent = ids.size;
        });
    }

    // =========================================
    // RECENTLY VIEWED
    // =========================================

    const getRecent = () => (store.get(KEYS.recent, []) || []).filter(id => BY_ID.has(id));

    function pushRecent(id) {
        const recent = getRecent().filter(item => item !== id);
        recent.unshift(id);
        store.set(KEYS.recent, recent.slice(0, 12));
    }

    // =========================================
    // WATCH PROGRESS (Continue Watching)
    // =========================================

    function getProgress() {
        const saved = store.get(KEYS.progress, {});
        return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    }

    function saveProgress(id, time, duration) {
        if (!id || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return;

        const all = getProgress();
        if (time < 5 || time / duration > 0.95) delete all[id];
        else all[id] = { time: Math.floor(time), duration: Math.floor(duration), updatedAt: Date.now() };
        store.set(KEYS.progress, all);
    }

    function clearProgress(id) {
        const all = getProgress();
        if (!(id in all)) return;
        delete all[id];
        store.set(KEYS.progress, all);
    }

    // Where to pick up again: skip the first seconds and the closing credits.
    const resumePoint = entry => entry && entry.time >= 10 && entry.time < entry.duration - Math.min(20, entry.duration * 0.1)
        ? entry.time
        : 0;

    const getContinueWatching = () => Object.entries(getProgress())
        .filter(([id, entry]) => BY_ID.has(id) && watchSource(BY_ID.get(id)) && entry.duration > 0)
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
        .map(([id, entry]) => ({ title: BY_ID.get(id), ...entry }));

    // =========================================
    // CARD TEMPLATES
    // =========================================

    function browseCard(title) {
        const meta = title.type === 'series'
            ? (seasonText(title) || title.network || title.genres[0])
            : title.genres[0];

        return `
            <article class="browse-movie-card" data-open="${title.id}">
                <div class="browse-poster" data-placeholder="${escapeHtml(title.title)}">
                    ${posterImg(title)}
                    ${title.original ? '<span class="cv-badge">Original</span>' : title.watch ? '<span class="cv-badge">Free</span>' : ''}
                    <div class="poster-overlay">
                        <span class="poster-rating">★ ${rating(title)}</span>
                        <button class="poster-watch-btn" type="button" data-open="${title.id}">▶ View ${title.type === 'series' ? 'Series' : 'Movie'}</button>
                    </div>
                    <button class="cv-list-toggle" type="button" data-list-toggle="${title.id}" aria-pressed="false" aria-label="Add ${escapeHtml(title.title)} to My List">${ICONS.plus}</button>
                </div>
                <div class="browse-movie-info">
                    <h3>${escapeHtml(title.title)}</h3>
                    <div class="movie-meta">
                        <span>${title.year}</span>
                        <span class="meta-dot"></span>
                        <span>${escapeHtml(meta)}</span>
                    </div>
                    <div class="movie-rating">
                        <span>★</span>
                        <span>${rating(title)}</span>
                    </div>
                </div>
            </article>`;
    }

    function rowCard(title, badge = '') {
        return `
            <div class="movie-card" data-open="${title.id}">
                <div class="movie-image" data-placeholder="${escapeHtml(title.title)}">
                    ${posterImg(title)}
                    ${badge ? `<span class="trending-badge">${escapeHtml(badge)}</span>` : ''}
                </div>
                <div class="movie-card-content">
                    <h4>${escapeHtml(title.title)}</h4>
                    <span class="movie-rating">★ ${rating(title)}</span>
                </div>
            </div>`;
    }

    function enhanceRowCard(card) {
        const title = BY_ID.get(card.dataset.open);
        const name = title?.title || $('h4', card)?.textContent.trim() || 'title';

        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${name}: view details`);

        const image = $('.movie-image', card);
        if (title && image && !$('.cv-list-toggle', image)) {
            image.insertAdjacentHTML('beforeend',
                `<button class="cv-list-toggle" type="button" data-list-toggle="${title.id}" aria-pressed="false">${ICONS.plus}</button>`);
        }
    }

    function playButton(title, className = 'cv-btn cv-btn-primary') {
        if (title.video) {
            return `<button class="${className}" type="button" data-play="${title.id}">${ICONS.play}<span>Play Teaser</span></button>`;
        }
        if (title.trailer) {
            return `<button class="${className}" type="button" data-play="${title.id}">${ICONS.play}<span>Play Trailer</span></button>`;
        }
        return `<a class="${className}" href="${youtubeSearch(title)}" target="_blank" rel="noopener">${ICONS.play}<span>Watch Trailer</span>${ICONS.external}</a>`;
    }

    // =========================================
    // SCROLL LOCK & FOCUS TRAP (for overlays)
    // =========================================

    let lockCount = 0;

    function lockScroll() {
        if (lockCount++ === 0) document.documentElement.classList.add('cv-no-scroll');
    }

    function unlockScroll() {
        lockCount = Math.max(0, lockCount - 1);
        if (!lockCount) document.documentElement.classList.remove('cv-no-scroll');
    }

    function trapFocus(event, container) {
        const focusable = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, iframe, video[controls], [tabindex]:not([tabindex="-1"])', container)
            .filter(element => element.offsetParent !== null);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === container) {
            event.preventDefault();
            last.focus();
        } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        } else if (!container.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
        }
    }

    // =========================================
    // DETAILS MODAL
    // =========================================

    let modal = null;
    let modalTrigger = null;
    let modalOpenId = null;
    let historyPushed = false;

    function ensureModal() {
        if (modal) return modal;

        modal = document.createElement('div');
        modal.className = 'cv-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="cv-modal-backdrop" data-close-modal></div>
            <div class="cv-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cv-modal-title" tabindex="-1">
                <button class="cv-modal-close" type="button" aria-label="Close details" data-close-modal>${ICONS.close}</button>
                <div class="cv-modal-content"></div>
            </div>`;
        document.body.appendChild(modal);

        modal.addEventListener('click', event => {
            if (event.target.closest('[data-close-modal]')) closeDetails();
        });

        return modal;
    }

    function similarTitles(title, limit = 6) {
        return ALL
            .filter(other => other.id !== title.id && other.type === title.type)
            .map(other => ({
                other,
                shared: other.genres.filter(genre => title.genres.includes(genre)).length
            }))
            .filter(result => result.shared > 0)
            .sort((a, b) => b.shared - a.shared || b.other.rating - a.other.rating)
            .slice(0, limit)
            .map(result => result.other);
    }

    function detailsHtml(title) {
        const browsePage = title.type === 'series' ? 'pages/series.html' : 'pages/movies.html';
        const meta = [
            title.year,
            title.certification,
            title.type === 'series' ? seasonText(title) : formatRuntime(title.runtime)
        ].filter(Boolean);

        const credits = [];
        if (title.director) credits.push(['Director', title.director]);
        if (title.creators?.length) credits.push(['Created by', title.creators.join(', ')]);
        if (title.cast?.length) credits.push(['Starring', title.cast.join(', ')]);
        if (title.network) credits.push(['Network', title.network]);
        if (title.credit) credits.push(['Credits', title.credit]);

        const similar = similarTitles(title);
        const kicker = title.original
            ? 'CineVerse Original'
            : [title.format || (title.type === 'series' ? 'Series' : 'Movie'), title.watch ? 'Watch Free' : ''].filter(Boolean).join(' · ');
        const backdrop = title.backdrop || title.poster;
        const backdropFallback = !title.backdrop && title.posterFallback
            ? ` data-fallback="${escapeHtml(asset(title.posterFallback))}"`
            : '';

        return `
            <div class="cv-detail-hero${title.backdrop ? '' : ' is-poster-backdrop'}">
                <img class="cv-detail-backdrop" src="${escapeHtml(asset(backdrop))}"${backdropFallback} alt="" aria-hidden="true">
            </div>

            <div class="cv-detail-body">
                <div class="cv-detail-poster" data-placeholder="${escapeHtml(title.title)}">
                    ${posterImg(title)}
                </div>

                <div class="cv-detail-info">
                    <p class="cv-detail-kicker">${kicker}</p>
                    <h2 id="cv-modal-title">${escapeHtml(title.title)}</h2>

                    <div class="cv-detail-meta">
                        <span class="cv-detail-rating">★ ${rating(title)}</span>
                        ${meta.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
                    </div>

                    <div class="cv-detail-genres">
                        ${title.genres.map(genre => `<a class="cv-chip" href="${pageUrl(browsePage, { genre })}">${escapeHtml(genre)}</a>`).join('')}
                    </div>

                    <p class="cv-detail-overview">${escapeHtml(title.overview)}</p>

                    ${credits.length ? `
                        <dl class="cv-detail-credits">
                            ${credits.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}
                        </dl>` : ''}

                    <div class="cv-detail-actions">${detailActions(title)}</div>
                </div>
            </div>

            ${similar.length ? `
                <section class="cv-detail-similar" aria-labelledby="cv-similar-title">
                    <h3 id="cv-similar-title">More Like This</h3>
                    <div class="cv-similar-grid">
                        ${similar.map(other => `
                            <button class="cv-similar-card" type="button" data-open="${other.id}">
                                <span class="cv-similar-poster" data-placeholder="${escapeHtml(other.title)}">${posterImg(other)}</span>
                                <span class="cv-similar-title">${escapeHtml(other.title)}</span>
                                <span class="cv-similar-meta">★ ${rating(other)} · ${other.year}</span>
                            </button>`).join('')}
                    </div>
                </section>` : ''}`;
    }

    function detailActions(title) {
        const source = watchSource(title);
        const resumeAt = source ? resumePoint(getProgress()[title.id]) : 0;
        const resume = resumeAt ? ` ${formatClock(resumeAt)}` : '';

        return [
            source
                ? `<button class="cv-btn cv-btn-primary" type="button" data-watch="${title.id}">${ICONS.play}<span>${resume ? `Resume${resume}` : 'Watch Now'}</span></button>`
                : playButton(title),
            source && (title.trailer || title.video) ? playButton(title, 'cv-btn cv-btn-ghost') : '',
            `<button class="cv-btn cv-btn-ghost" type="button" data-list-toggle="${title.id}"></button>`,
            !source && !title.original
                ? `<a class="cv-btn cv-btn-ghost" href="${whereToWatchUrl(title)}" target="_blank" rel="noopener">Where to Watch ${ICONS.external}</a>`
                : '',
            `<button class="cv-btn cv-btn-icon" type="button" data-share="${title.id}" aria-label="Share ${escapeHtml(title.title)}" title="Share">${ICONS.share}</button>`
        ].join('');
    }

    function refreshDetailsActions() {
        const actions = modal && $('.cv-detail-actions', modal);
        const title = BY_ID.get(modalOpenId);
        if (!actions || !title) return;
        actions.innerHTML = detailActions(title);
        syncListUI();
    }

    function setTitleParam(id, replace) {
        try {
            const url = new URL(location.href);
            url.searchParams.set('title', id);
            if (replace || history.state?.cvTitle) {
                history.replaceState({ cvTitle: id }, '', url);
            } else {
                history.pushState({ cvTitle: id }, '', url);
                historyPushed = true;
            }
        } catch { /* file:// pages can't change the URL — the modal still works */ }
    }

    function clearTitleParam() {
        try {
            const url = new URL(location.href);
            if (!url.searchParams.has('title')) return;

            if (historyPushed && history.state?.cvTitle) {
                historyPushed = false;
                history.back();
                return;
            }

            url.searchParams.delete('title');
            history.replaceState(null, '', url);
        } catch { /* ignore */ }
    }

    function openDetails(id, options = {}) {
        const title = BY_ID.get(id);
        if (!title) {
            toast("Sorry, we couldn't find that title.");
            return;
        }

        ensureModal();
        closeMenus();
        closeSearchPanel();
        setMobileMenu(false);

        const wasOpen = modalOpenId !== null;
        if (!wasOpen) {
            modalTrigger = options.trigger || document.activeElement;
            lockScroll();
        }

        const content = $('.cv-modal-content', modal);
        content.innerHTML = detailsHtml(title);
        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add('is-open'));

        modal.scrollTop = 0;

        modalOpenId = id;
        pushRecent(id);
        syncListUI();
        checkBrokenImages(content);

        if (options.push !== false) setTitleParam(id, wasOpen);

        document.title = `${title.title} | CineVerse`;
        $('.cv-modal-close', modal).focus({ preventScroll: true });
    }

    function closeDetails(options = {}) {
        if (!modal || modalOpenId === null) return;

        modalOpenId = null;
        modal.classList.remove('is-open');
        document.title = BASE_TITLE;
        unlockScroll();

        setTimeout(() => {
            if (modalOpenId === null) {
                modal.hidden = true;
                $('.cv-modal-content', modal).innerHTML = '';
            }
        }, 250);

        if (!options.fromHistory) clearTitleParam();

        if (PAGE === 'home') renderPersonalRows();

        if (modalTrigger && document.contains(modalTrigger)) {
            modalTrigger.focus({ preventScroll: true });
        }
    }

    window.addEventListener('popstate', () => {
        const id = new URL(location.href).searchParams.get('title');
        if (id && BY_ID.has(id)) openDetails(id, { push: false });
        else closeDetails({ fromHistory: true });
    });

    // =========================================
    // VIDEO PLAYER — the CineVerse player
    // =========================================
    // Video files (MP4/WebM) and HLS streams play in CineVerse's own player:
    // your controls and colours, no other brand on screen. Netflix and Hotstar
    // work the same way, because they host their own video files.
    //
    // YouTube videos play in YouTube's official embedded player, driven by the
    // same CineVerse controls. Those controls sit outside the picture: YouTube's
    // terms don't allow covering or hiding its logo, title or links, so nothing
    // is ever placed on top of a YouTube video.

    const SKIP_SECONDS = 10;
    const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const IDLE_DELAY = 3000;
    const IS_LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

    const PICONS = {
        back: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H5"/><path d="M11 5l-7 7 7 7"/></svg>',
        play: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M7.5 4.9v14.2a.9.9 0 0 0 1.38.76l11.1-7.1a.9.9 0 0 0 0-1.52L8.88 4.14a.9.9 0 0 0-1.38.76z"/></svg>',
        pause: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="5.5" y="4.5" width="4.5" height="15" rx="1.3"/><rect x="14" y="4.5" width="4.5" height="15" rx="1.3"/></svg>',
        replay: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.6 13a7.5 7.5 0 1 0 2.3-6.4"/><path d="M4.5 3.8v4.6h4.6"/></svg>',
        rewind: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5A7.5 7.5 0 1 1 5.5 9.25"/><path d="M14.4 3.1L12 5.5l2.4 2.4"/><text x="12" y="16.2" fill="currentColor" stroke="none" font-family="Montserrat, Arial, sans-serif" font-size="6.8" font-weight="700" text-anchor="middle">10</text></svg>',
        forward: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5A7.5 7.5 0 1 0 18.5 9.25"/><path d="M9.6 3.1L12 5.5 9.6 7.9"/><text x="12" y="16.2" fill="currentColor" stroke="none" font-family="Montserrat, Arial, sans-serif" font-size="6.8" font-weight="700" text-anchor="middle">10</text></svg>',
        volumeHigh: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9.5v5h3.6l4.9 4.2V5.3L7.1 9.5z" fill="currentColor"/><path d="M15.6 9.2a4 4 0 0 1 0 5.6"/><path d="M18.4 6.4a8 8 0 0 1 0 11.2"/></svg>',
        volumeLow: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9.5v5h3.6l4.9 4.2V5.3L7.1 9.5z" fill="currentColor"/><path d="M15.6 9.2a4 4 0 0 1 0 5.6"/></svg>',
        volumeMute: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9.5v5h3.6l4.9 4.2V5.3L7.1 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
        fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/></svg>',
        fullscreenExit: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v4a1 1 0 0 1-1 1H4M20 9h-4a1 1 0 0 1-1-1V4M15 20v-4a1 1 0 0 1 1-1h4M4 15h4a1 1 0 0 1 1 1v4"/></svg>',
        subtitles: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 12.5h3M13 12.5h4M7 15.5h6M16 15.5h1"/></svg>',
        alert: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/></svg>',
        settings: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9.90 5.22L10.41 2.74H13.59L14.10 5.22L15.31 5.72L17.43 4.32L19.68 6.57L18.28 8.69L18.78 9.90L21.26 10.41V13.59L18.78 14.10L18.28 15.31L19.68 17.43L17.43 19.68L15.31 18.28L14.10 18.78L13.59 21.26H10.41L9.90 18.78L8.69 18.28L6.57 19.68L4.32 17.43L5.72 15.31L5.22 14.10L2.74 13.59V10.41L5.22 9.90L5.72 8.69L4.32 6.57L6.57 4.32L8.69 5.72Z"/><circle cx="12" cy="12" r="3"/></svg>'
    };

    let player = null;
    let ui = null;
    let playerTrigger = null;
    let nowPlaying = null;

    const playerOpen = () => Boolean(player && !player.hidden && player.classList.contains('is-open'));
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const speedLabel = rate => (rate === 1 ? 'Normal' : `${rate}x`);

    function playerPrefs() {
        const saved = store.get(KEYS.player, {}) || {};
        return {
            volume: Number.isFinite(saved.volume) ? clamp(saved.volume, 0, 1) : 1,
            muted: saved.muted === true,
            subtitles: typeof saved.subtitles === 'string' ? saved.subtitles : '',
            quality: typeof saved.quality === 'string' ? saved.quality : 'auto'
        };
    }

    const savePlayerPrefs = changes => store.set(KEYS.player, { ...playerPrefs(), ...changes });

    // ---------- Adapters: one small API for the controls, whatever is playing ----------

    function html5Adapter(video) {
        // While a new quality loads, keep showing the old position and length.
        let held = null;
        let swaps = 0;

        const adapter = {
            video,
            swapping: () => Boolean(held),
            play: () => {
                if (held) {
                    held.playing = true;
                    return;
                }
                const attempt = video.play();
                // Autoplay blocked (or interrupted): show the big Play button instead.
                if (attempt?.catch) {
                    attempt.catch(() => {
                        if (nowPlaying?.video === video && !held && !video.error && player.dataset.state !== 'error') {
                            setPlayerState(video.paused ? 'paused' : 'playing');
                        }
                    });
                }
            },
            pause: () => {
                if (held) held.playing = false;
                video.pause();
            },
            paused: () => (held ? !held.playing : video.paused),
            ended: () => !held && video.ended,
            time: () => (held ? held.time : video.currentTime || 0),
            duration: () => (held ? held.duration : Number.isFinite(video.duration) ? video.duration : 0),
            // Switch to another file of the same video (quality change) and carry on from the same moment.
            swap: (src, { time: at, playing: resume, done } = {}) => {
                const token = ++swaps;
                const playing = resume ?? (held ? held.playing : !video.paused && !video.ended);
                const time = at ?? (held ? held.time : video.currentTime || 0);
                const duration = held?.duration || (Number.isFinite(video.duration) ? video.duration : 0);
                const rate = video.playbackRate;
                held = { time, duration, playing };
                setPlayerState('loading');

                const cleanup = () => {
                    video.removeEventListener('loadedmetadata', onReady);
                    video.removeEventListener('error', onFail);
                };
                const onReady = () => {
                    cleanup();
                    if (token !== swaps || nowPlaying?.video !== video || !held) return;
                    // Use the latest values: the viewer may have paused or skipped while it loaded.
                    const { time: target, playing: play } = held;
                    try {
                        video.currentTime = Math.min(target, Math.max(0, video.duration - 0.5));
                    } catch { /* ignore */ }
                    video.playbackRate = rate;
                    held = null;
                    if (play) adapter.play();
                    else setPlayerState('paused');
                    done?.(true);
                    renderPlayer();
                };
                const onFail = () => {
                    cleanup();
                    if (token !== swaps) return;
                    held = null;
                    done?.(false);
                };

                video.addEventListener('loadedmetadata', onReady);
                video.addEventListener('error', onFail);
                video.src = src;
            },
            buffered: () => {
                const ranges = video.buffered;
                const duration = Number.isFinite(video.duration) ? video.duration : 0;
                if (!duration || !ranges?.length) return 0;
                for (let i = 0; i < ranges.length; i++) {
                    if (ranges.start(i) <= video.currentTime + 0.5 && ranges.end(i) >= video.currentTime) return ranges.end(i) / duration;
                }
                return 0;
            },
            seek: time => {
                if (held) held.time = time;
                else video.currentTime = time;
            },
            volume: () => video.volume,
            setVolume: value => { video.volume = value; },
            muted: () => video.muted,
            setMuted: value => { video.muted = value; },
            rate: () => video.playbackRate,
            setRate: value => { video.playbackRate = value; },
            rates: () => SPEEDS
        };

        return adapter;
    }

    // The IFrame API reports changes a moment after they happen, so the values
    // we just set are kept for a second and shown straight away.
    function youtubeAdapter(yt, states) {
        let state = -1;
        let held = { time: 0, until: 0 };
        let wanted = { playing: null, until: 0 };
        const local = { volume: 1, muted: false, rate: 1, at: 0 };
        const call = (fn, fallback) => {
            try {
                const value = fn();
                return value === undefined || value === null || Number.isNaN(value) ? fallback : value;
            } catch {
                return fallback;
            }
        };
        const touched = () => { local.at = Date.now(); };
        const settled = () => Date.now() - local.at > 1200;

        return {
            yt,
            setState: value => {
                state = value;
                wanted.until = 0;
            },
            play: () => {
                wanted = { playing: true, until: Date.now() + 800 };
                call(() => yt.playVideo());
            },
            pause: () => {
                wanted = { playing: false, until: Date.now() + 800 };
                call(() => yt.pauseVideo());
            },
            paused: () => (Date.now() < wanted.until ? !wanted.playing : state !== states.PLAYING && state !== states.BUFFERING),
            ended: () => state === states.ENDED,
            buffering: () => state === states.BUFFERING,
            time: () => (Date.now() < held.until ? held.time : call(() => yt.getCurrentTime(), 0)),
            duration: () => call(() => yt.getDuration(), 0),
            buffered: () => clamp(call(() => yt.getVideoLoadedFraction(), 0), 0, 1),
            seek: time => {
                held = { time, until: Date.now() + 900 };
                call(() => yt.seekTo(time, true));
            },
            volume: () => (settled() ? clamp(call(() => yt.getVolume(), local.volume * 100) / 100, 0, 1) : local.volume),
            setVolume: value => {
                local.volume = value;
                touched();
                call(() => yt.setVolume(Math.round(value * 100)));
            },
            muted: () => (settled() ? Boolean(call(() => yt.isMuted(), local.muted)) : local.muted),
            setMuted: value => {
                local.muted = value;
                touched();
                call(() => (value ? yt.mute() : yt.unMute()));
            },
            rate: () => (settled() ? call(() => yt.getPlaybackRate(), local.rate) : local.rate),
            setRate: value => {
                local.rate = value;
                touched();
                call(() => yt.setPlaybackRate(value));
            },
            rates: () => {
                const available = call(() => yt.getAvailablePlaybackRates(), []);
                const list = SPEEDS.filter(rate => !available.length || available.includes(rate));
                return list.length ? list : [1];
            }
        };
    }

    // ---------- Building the player ----------

    function ensurePlayer() {
        if (player) return player;

        player = document.createElement('div');
        player.className = 'cv-player';
        player.hidden = true;
        player.innerHTML = `
            <div class="cv-player-panel" role="dialog" aria-modal="true" aria-labelledby="cv-player-title" tabindex="-1">
                <div class="cv-player-top">
                    <button class="cv-player-close" type="button" aria-label="Close player" title="Back (Esc)" data-close-player>${PICONS.back}</button>
                    <div class="cv-player-heading">
                        <p id="cv-player-title"></p>
                        <span class="cv-player-label"></span>
                    </div>
                    <div class="cv-player-note"></div>
                </div>

                <div class="cv-player-frame"></div>

                <div class="cv-player-layer">
                    <div class="cv-player-subtitles" aria-hidden="true"></div>
                    <div class="cv-player-center">
                        <button class="cv-center-skip" type="button" data-pc="rewind" aria-label="Back 10 seconds">${PICONS.rewind}</button>
                        <button class="cv-center-play" type="button" data-pc="toggle" aria-label="Play">${PICONS.play}</button>
                        <button class="cv-center-skip" type="button" data-pc="forward" aria-label="Forward 10 seconds">${PICONS.forward}</button>
                    </div>
                    <div class="cv-player-spinner" aria-hidden="true"></div>
                    <div class="cv-player-flash" aria-hidden="true"></div>
                    <div class="cv-player-pill" aria-hidden="true"></div>
                    <div class="cv-player-message" role="alert" hidden></div>
                </div>

                <div class="cv-player-controls">
                    <div class="cv-seek" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00 of 0:00">
                        <div class="cv-seek-track">
                            <span class="cv-seek-buffer"></span>
                            <span class="cv-seek-fill"></span>
                        </div>
                        <span class="cv-seek-thumb"></span>
                        <span class="cv-seek-tip">0:00</span>
                    </div>

                    <div class="cv-ctrl-row">
                        <div class="cv-ctrl-group">
                            <button class="cv-ctrl cv-ctrl-play" type="button" data-pc="toggle" aria-label="Play" title="Play (Space)">${PICONS.play}</button>
                            <button class="cv-ctrl cv-ctrl-skip" type="button" data-pc="rewind" aria-label="Back 10 seconds" title="Back 10 seconds (←)">${PICONS.rewind}</button>
                            <button class="cv-ctrl cv-ctrl-skip" type="button" data-pc="forward" aria-label="Forward 10 seconds" title="Forward 10 seconds (→)">${PICONS.forward}</button>
                            <div class="cv-volume">
                                <button class="cv-ctrl" type="button" data-pc="mute" aria-label="Mute" title="Mute (M)">${PICONS.volumeHigh}</button>
                                <input class="cv-volume-slider" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume">
                            </div>
                            <span class="cv-time"><span data-pc-time>0:00</span><span class="cv-time-sep"> / </span><span data-pc-duration>0:00</span></span>
                        </div>

                        <div class="cv-ctrl-group">
                            <div class="cv-pmenu-wrap" data-pc-subtitles hidden>
                                <button class="cv-ctrl" type="button" data-pc="subtitles" aria-label="Subtitles" title="Subtitles (C)" aria-haspopup="true" aria-expanded="false">${PICONS.subtitles}</button>
                                <div class="cv-pmenu" data-menu="subtitles" role="menu" aria-label="Subtitles" hidden></div>
                            </div>
                            <div class="cv-pmenu-wrap" data-pc-quality hidden>
                                <button class="cv-ctrl cv-ctrl-quality" type="button" data-pc="quality" aria-label="Video quality" title="Video quality" aria-haspopup="true" aria-expanded="false">${PICONS.settings}<span class="cv-quality-badge" hidden></span></button>
                                <div class="cv-pmenu" data-menu="quality" role="menu" aria-label="Video quality" hidden></div>
                            </div>
                            <div class="cv-pmenu-wrap">
                                <button class="cv-ctrl cv-ctrl-speed" type="button" data-pc="speed" aria-label="Playback speed: Normal" title="Playback speed" aria-haspopup="true" aria-expanded="false">1x</button>
                                <div class="cv-pmenu" data-menu="speed" role="menu" aria-label="Playback speed" hidden></div>
                            </div>
                            <button class="cv-ctrl" type="button" data-pc="fullscreen" aria-label="Full screen" title="Full screen (F)">${PICONS.fullscreen}</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(player);

        ui = {
            panel: $('.cv-player-panel', player),
            frame: $('.cv-player-frame', player),
            layer: $('.cv-player-layer', player),
            title: $('#cv-player-title', player),
            label: $('.cv-player-label', player),
            note: $('.cv-player-note', player),
            seek: $('.cv-seek', player),
            fill: $('.cv-seek-fill', player),
            buffer: $('.cv-seek-buffer', player),
            thumb: $('.cv-seek-thumb', player),
            tip: $('.cv-seek-tip', player),
            time: $('[data-pc-time]', player),
            duration: $('[data-pc-duration]', player),
            toggles: $$('[data-pc="toggle"]', player),
            mute: $('[data-pc="mute"]', player),
            volume: $('.cv-volume-slider', player),
            speed: $('[data-pc="speed"]', player),
            fullscreen: $('[data-pc="fullscreen"]', player),
            subtitlesWrap: $('[data-pc-subtitles]', player),
            subtitlesButton: $('[data-pc="subtitles"]', player),
            qualityWrap: $('[data-pc-quality]', player),
            qualityBadge: $('.cv-quality-badge', player),
            subtitles: $('.cv-player-subtitles', player),
            flash: $('.cv-player-flash', player),
            pill: $('.cv-player-pill', player),
            message: $('.cv-player-message', player),
            icons: new WeakMap(),
            menu: '',
            hovering: false,
            scrubbing: false,
            scrubTime: 0,
            idleTimer: 0,
            pillTimer: 0,
            pointerType: 'mouse',
            lastTap: 0,
            tapTimer: 0
        };

        bindPlayerEvents();
        return player;
    }

    function bindPlayerEvents() {
        player.addEventListener('click', event => {
            if (event.target.closest('[data-close-player]')) {
                closePlayer();
                return;
            }

            if (event.target.closest('[data-restart]')) {
                restartPlayback();
                return;
            }

            const speedItem = event.target.closest('[data-speed]');
            if (speedItem) {
                setSpeed(Number(speedItem.dataset.speed));
                closePlayerMenus(event.detail === 0);
                return;
            }

            const qualityItem = event.target.closest('[data-quality]');
            if (qualityItem) {
                selectQuality(qualityItem.dataset.quality);
                closePlayerMenus(event.detail === 0);
                return;
            }

            const trackItem = event.target.closest('[data-track]');
            if (trackItem) {
                selectSubtitles(Number(trackItem.dataset.track));
                closePlayerMenus(event.detail === 0);
                return;
            }

            const control = event.target.closest('[data-pc]');
            if (control) {
                runControl(control.dataset.pc, event.detail === 0);
                // After a mouse click, hand the keyboard back to the player so
                // Space still means play/pause rather than "press that button again".
                if (event.detail > 0 && !control.hasAttribute('aria-haspopup') && player && !player.hidden) {
                    ui.panel.focus({ preventScroll: true });
                }
                return;
            }

            if (ui.menu && !event.target.closest('.cv-pmenu-wrap')) closePlayerMenus();
        });

        // Pointer activity shows the controls; resting the mouse hides them again.
        ui.panel.addEventListener('pointermove', event => {
            if (event.pointerType === 'mouse') wake();
        });
        ui.panel.addEventListener('pointerdown', event => {
            ui.pointerType = event.pointerType;
            if (event.pointerType === 'mouse' || event.target.closest('.cv-player-controls, .cv-player-top, .cv-player-center button')) wake();
        });
        $$('.cv-player-controls, .cv-player-top', player).forEach(bar => {
            bar.addEventListener('pointerenter', event => {
                if (event.pointerType === 'mouse') ui.hovering = true;
            });
            bar.addEventListener('pointerleave', () => {
                ui.hovering = false;
                wake();
            });
        });

        // The picture itself: click = play/pause, double-click = full screen.
        // On touch screens: tap = show/hide controls, double-tap a side = skip 10s.
        // "click" (not pointerup) is used so a tap that the browser hands to a
        // nearby button is never counted twice.
        ui.layer.addEventListener('click', event => {
            if (!nowPlaying?.adapter || !player.classList.contains('is-own') || event.target !== ui.layer) return;

            if (ui.menu) {
                closePlayerMenus();
                return;
            }

            if (ui.pointerType === 'mouse') {
                togglePlay();
                return;
            }

            const rect = ui.layer.getBoundingClientRect();
            const zone = event.clientX < rect.left + rect.width / 3 ? -1 : event.clientX > rect.right - rect.width / 3 ? 1 : 0;
            const now = Date.now();

            if (zone && now - ui.lastTap < 300) {
                clearTimeout(ui.tapTimer);
                ui.lastTap = 0;
                skip(zone * SKIP_SECONDS);
                return;
            }

            ui.lastTap = now;
            clearTimeout(ui.tapTimer);
            ui.tapTimer = setTimeout(() => {
                if (player.classList.contains('is-idle')) wake();
                else sleep(true);
            }, 300);
        });

        ui.layer.addEventListener('dblclick', event => {
            if (ui.pointerType !== 'mouse' || !player.classList.contains('is-own') || event.target.closest('button, .cv-player-message')) return;
            toggleFullscreen();
        });

        // Seek bar
        const pointAt = clientX => {
            const rect = ui.seek.getBoundingClientRect();
            const ratio = rect.width ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
            return { x: ratio * rect.width, time: ratio * (nowPlaying?.adapter?.duration() || 0) };
        };

        ui.seek.addEventListener('pointerdown', event => {
            const adapter = nowPlaying?.adapter;
            if (!adapter || !adapter.duration() || (event.pointerType === 'mouse' && event.button !== 0)) return;
            event.preventDefault();
            ui.scrubbing = true;
            ui.scrubTime = pointAt(event.clientX).time;
            try { ui.seek.setPointerCapture(event.pointerId); } catch { /* ignore */ }
            player.classList.add('is-scrubbing');
            renderPlayer();
        });

        ui.seek.addEventListener('pointermove', event => {
            if (!nowPlaying?.adapter) return;
            const { x, time } = pointAt(event.clientX);
            ui.tip.textContent = formatClock(time);
            ui.tip.style.left = `${x}px`;
            if (ui.scrubbing) {
                ui.scrubTime = time;
                renderPlayer();
            }
        });

        const endScrub = event => {
            if (!ui.scrubbing) return;
            ui.scrubbing = false;
            player.classList.remove('is-scrubbing');
            seekTo(ui.scrubTime);
            if (event.pointerType === 'mouse') ui.panel.focus({ preventScroll: true });
        };
        ui.seek.addEventListener('pointerup', endScrub);
        ui.seek.addEventListener('pointercancel', endScrub);

        // Volume slider
        ui.volume.addEventListener('input', () => setVolume(Number(ui.volume.value), { silent: true }));
        ui.volume.addEventListener('pointerup', () => ui.panel.focus({ preventScroll: true }));

        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    }

    // ---------- Showing state ----------

    function setPlayerState(state) {
        if (!player) return;
        player.dataset.state = state;
        if (state === 'paused' || state === 'ended' || state === 'error') wake(false);
        else if (state === 'playing') wake();
    }

    function setIcon(button, name, label, shortcut = '') {
        if (!button) return;
        if (ui.icons.get(button) !== name) {
            button.innerHTML = PICONS[name];
            ui.icons.set(button, name);
        }
        if (label && button.getAttribute('aria-label') !== label) {
            button.setAttribute('aria-label', label);
            if (button.hasAttribute('title')) button.title = shortcut ? `${label} (${shortcut})` : label;
        }
    }

    function renderPlayer() {
        const adapter = nowPlaying?.adapter;
        if (!adapter || !ui) return;

        const duration = adapter.duration();
        const time = ui.scrubbing ? ui.scrubTime : clamp(adapter.time(), 0, duration || Infinity);
        const ended = adapter.ended();
        const paused = adapter.paused();

        const toggleIcon = ended ? 'replay' : paused ? 'play' : 'pause';
        const toggleLabel = ended ? 'Replay' : paused ? 'Play' : 'Pause';
        ui.toggles.forEach(button => setIcon(button, toggleIcon, toggleLabel, 'Space'));

        const percent = duration ? clamp((time / duration) * 100, 0, 100) : 0;
        ui.fill.style.width = `${percent}%`;
        ui.thumb.style.left = `${percent}%`;
        ui.buffer.style.width = `${clamp(adapter.buffered() * 100, percent, 100)}%`;
        ui.time.textContent = formatClock(time);
        ui.duration.textContent = formatClock(duration);
        ui.seek.setAttribute('aria-valuemax', String(Math.floor(duration)));
        ui.seek.setAttribute('aria-valuenow', String(Math.floor(time)));
        ui.seek.setAttribute('aria-valuetext', `${formatClock(time)} of ${formatClock(duration)}`);

        const muted = adapter.muted();
        const volume = adapter.volume();
        const level = muted ? 0 : volume;
        setIcon(ui.mute, level === 0 ? 'volumeMute' : level < 0.5 ? 'volumeLow' : 'volumeHigh', level === 0 ? 'Unmute' : 'Mute', 'M');
        if (document.activeElement !== ui.volume) ui.volume.value = String(level);
        ui.volume.style.setProperty('--level', `${level * 100}%`);
        ui.volume.setAttribute('aria-valuetext', `${Math.round(level * 100)}%`);

        const rate = adapter.rate();
        const rateText = `${rate}x`;
        if (ui.speed.textContent !== rateText) ui.speed.textContent = rateText;
        ui.speed.setAttribute('aria-label', `Playback speed: ${speedLabel(rate)}`);

        renderFullscreenButton();
    }

    function renderFullscreenButton() {
        if (!ui) return;
        const on = Boolean(fullscreenElement());
        setIcon(ui.fullscreen, on ? 'fullscreenExit' : 'fullscreen', on ? 'Exit full screen' : 'Full screen', 'F');
    }

    // Brief feedback in the picture (own videos only).
    function flash(icon, side = 'center') {
        if (!ui || !player.classList.contains('is-own')) return;
        ui.flash.innerHTML = PICONS[icon] || '';
        ui.flash.className = `cv-player-flash is-${side}`;
        void ui.flash.offsetWidth;
        ui.flash.classList.add('is-on');
    }

    function pill(text, icon = '') {
        if (!ui || !player.classList.contains('is-own')) return;
        ui.pill.innerHTML = `${icon ? PICONS[icon] : ''}<span>${escapeHtml(text)}</span>`;
        ui.pill.classList.add('is-on');
        clearTimeout(ui.pillTimer);
        ui.pillTimer = setTimeout(() => ui.pill.classList.remove('is-on'), 1100);
    }

    function showMessage(kind, html) {
        ui.message.innerHTML = html;
        ui.message.hidden = false;
        ui.message.dataset.kind = kind;
        player.classList.add('has-message');
        syncListUI();
        wake(false);
    }

    function hideMessage() {
        if (!ui || ui.message.hidden) return;
        ui.message.hidden = true;
        ui.message.innerHTML = '';
        delete ui.message.dataset.kind;
        player.classList.remove('has-message');
    }

    // ---------- Showing / hiding the controls ----------

    function wake(autoHide = true) {
        if (!player || player.hidden) return;
        player.classList.remove('is-idle');
        clearTimeout(ui.idleTimer);
        if (autoHide) ui.idleTimer = setTimeout(() => sleep(), IDLE_DELAY);
    }

    function sleep(force = false) {
        clearTimeout(ui.idleTimer);
        const adapter = nowPlaying?.adapter;
        if (!adapter || !player.classList.contains('is-own') || adapter.paused() || ui.scrubbing || ui.menu || player.classList.contains('has-message')) return;
        if (!force && ui.hovering) return;

        const active = document.activeElement;
        let keyboardOnControl = false;
        try {
            keyboardOnControl = Boolean(active && active !== ui.panel && ui.panel.contains(active) && active.matches(':focus-visible'));
        } catch { /* older browsers */ }
        if (!force && keyboardOnControl) return;

        player.classList.add('is-idle');
    }

    // ---------- Actions ----------

    function runControl(name, fromKeyboard = false) {
        const adapter = nowPlaying?.adapter;

        if (name === 'retry') {
            retryPlayback();
            return;
        }
        if (!adapter) return;

        if (name === 'toggle' || name === 'replay') togglePlay();
        else if (name === 'rewind') skip(-SKIP_SECONDS);
        else if (name === 'forward') skip(SKIP_SECONDS);
        else if (name === 'mute') toggleMute();
        else if (name === 'fullscreen') toggleFullscreen();
        else if (name === 'speed' || name === 'subtitles' || name === 'quality') togglePlayerMenu(name, fromKeyboard);

        wake();
    }

    function togglePlay() {
        const adapter = nowPlaying?.adapter;
        if (!adapter) return;

        if (adapter.ended()) {
            hideMessage();
            adapter.seek(0);
            adapter.play();
            flash('play');
        } else if (adapter.paused()) {
            hideMessage();
            adapter.play();
            flash('play');
        } else {
            adapter.pause();
        }
        renderPlayer();
    }

    function seekTo(time) {
        const adapter = nowPlaying?.adapter;
        if (!adapter) return;
        const duration = adapter.duration();
        if (!duration) return;

        adapter.seek(clamp(time, 0, Math.max(0, duration - 0.25)));
        if (ui.message.dataset.kind === 'ended') hideMessage();
        renderPlayer();
        wake();
    }

    function skip(seconds) {
        const adapter = nowPlaying?.adapter;
        if (!adapter || !adapter.duration()) return;
        seekTo(adapter.time() + seconds);
        flash(seconds < 0 ? 'rewind' : 'forward', seconds < 0 ? 'left' : 'right');
    }

    function setVolume(value, { silent = false } = {}) {
        const adapter = nowPlaying?.adapter;
        if (!adapter) return;
        const volume = clamp(Math.round(value * 100) / 100, 0, 1);

        adapter.setVolume(volume);
        adapter.setMuted(volume === 0);
        if (volume > 0) savePlayerPrefs({ volume, muted: false });
        else savePlayerPrefs({ muted: true });

        renderPlayer();
        if (!silent) pill(`Volume ${Math.round(volume * 100)}%`, volume === 0 ? 'volumeMute' : volume < 0.5 ? 'volumeLow' : 'volumeHigh');
    }

    function toggleMute() {
        const adapter = nowPlaying?.adapter;
        if (!adapter) return;

        if (adapter.muted() || adapter.volume() === 0) {
            if (adapter.volume() === 0) adapter.setVolume(0.5);
            adapter.setMuted(false);
            savePlayerPrefs({ muted: false, volume: adapter.volume() || 0.5 });
            pill('Sound on', 'volumeHigh');
        } else {
            adapter.setMuted(true);
            savePlayerPrefs({ muted: true });
            pill('Muted', 'volumeMute');
        }
        renderPlayer();
    }

    function setSpeed(rate) {
        const adapter = nowPlaying?.adapter;
        if (!adapter || !Number.isFinite(rate)) return;
        adapter.setRate(rate);
        renderPlayer();
        pill(`Speed ${speedLabel(rate)}`);
    }

    function toggleFullscreen() {
        if (fullscreenElement()) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) Promise.resolve(exit.call(document)).catch(() => {});
            return;
        }

        const request = ui.panel.requestFullscreen || ui.panel.webkitRequestFullscreen;
        if (request) {
            Promise.resolve(request.call(ui.panel))
                .then(() => screen.orientation?.lock?.('landscape'))
                .catch(() => {});
        } else if (nowPlaying?.video?.webkitEnterFullscreen) {
            nowPlaying.video.webkitEnterFullscreen(); // iPhone: the system player
        }
    }

    function onFullscreenChange() {
        if (!player) return;
        const on = fullscreenElement() === ui.panel;
        player.classList.toggle('is-fullscreen', on);
        if (on) nowPlaying?.quality?.refreshAuto?.();
        if (!on) {
            try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
        }
        renderFullscreenButton();
    }

    const canFullscreen = () => Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled || nowPlaying?.video?.webkitEnterFullscreen);

    // ---------- Menus (speed, subtitles) ----------

    function togglePlayerMenu(name, fromKeyboard) {
        if (ui.menu === name) {
            closePlayerMenus(fromKeyboard);
            return;
        }
        closePlayerMenus();

        const adapter = nowPlaying?.adapter;
        const menu = $(`[data-menu="${name}"]`, player);
        const button = $(`[data-pc="${name}"]`, player);
        if (!adapter || !menu || !button) return;

        if (name === 'quality') {
            renderQualityMenu();
        } else if (name === 'speed') {
            const current = adapter.rate();
            menu.innerHTML = `<p class="cv-pmenu-title">Playback speed</p>` + adapter.rates().map(rate => `
                <button type="button" role="menuitemradio" aria-checked="${rate === current}" data-speed="${rate}">${ICONS.check}<span>${speedLabel(rate)}</span></button>`).join('');
        } else {
            const current = nowPlaying.subtitleIndex ?? -1;
            menu.innerHTML = `<p class="cv-pmenu-title">Subtitles</p>` + [{ label: 'Off', index: -1 }, ...(nowPlaying.subtitleList || []).map((item, index) => ({ label: item.label || item.lang || `Track ${index + 1}`, index }))]
                .map(item => `<button type="button" role="menuitemradio" aria-checked="${item.index === current}" data-track="${item.index}">${ICONS.check}<span>${escapeHtml(item.label)}</span></button>`).join('');
        }

        menu.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        ui.menu = name;
        wake(false);

        if (fromKeyboard) ($('[aria-checked="true"]', menu) || $('button', menu))?.focus();
    }

    function closePlayerMenus(returnFocus = false) {
        if (!ui?.menu) return;
        const button = $(`[data-pc="${ui.menu}"]`, player);
        $$('.cv-pmenu', player).forEach(menu => { menu.hidden = true; });
        $$('[aria-haspopup]', player).forEach(item => item.setAttribute('aria-expanded', 'false'));
        ui.menu = '';
        if (returnFocus && button) button.focus();
        else if (player.contains(document.activeElement) && document.activeElement.closest('.cv-pmenu')) ui.panel.focus({ preventScroll: true });
        wake();
    }

    function moveMenuFocus(step) {
        const items = $$(`[data-menu="${ui.menu}"] button`, player);
        if (!items.length) return;
        const index = items.indexOf(document.activeElement);
        items[(index + step + items.length) % items.length].focus();
    }

    // ---------- Video quality ----------
    // Several files of one video ({ '1080p': …, '720p': … } in data.js), or an HLS
    // stream from a video host, whose qualities are read from the stream itself.

    const qualityTag = height => (height >= 2160 ? '4K' : height >= 720 ? 'HD' : '');

    // "Auto" for separate files: the smallest file that is still sharp on this screen,
    // and smaller files on slow or data-saver connections.
    function autoFileQuality(qualities) {
        const known = qualities.filter(item => item.height);
        if (!known.length) return qualities[0];

        const connection = navigator.connection || {};
        const type = String(connection.effectiveType || '');
        if (connection.saveData || /2g$/.test(type)) return known[known.length - 1];

        const cap = type === '3g' ? 480 : Infinity;
        const allowed = known.filter(item => item.height <= cap);
        const pool = allowed.length ? allowed : [known[known.length - 1]];
        const needed = Math.min(window.innerHeight, window.innerWidth * 9 / 16) * (window.devicePixelRatio || 1);
        const sharpEnough = pool.filter(item => item.height >= needed);
        return sharpEnough.length ? sharpEnough[sharpEnough.length - 1] : pool[0];
    }

    function fileQuality(adapter, qualities) {
        if (!Array.isArray(qualities) || qualities.length < 2) return null;

        const saved = playerPrefs().quality;
        let selected = qualities.some(item => item.label === saved) ? saved : 'auto';
        let current = selected === 'auto' ? autoFileQuality(qualities) : qualities.find(item => item.label === selected);
        const tried = new Set();

        const change = (next, options = {}) => {
            current = next;
            adapter.swap(next.src, {
                ...options,
                done: ok => {
                    if (ok) qualityChanged();
                }
            });
        };

        return {
            options: qualities.map(item => ({ id: item.label, height: item.height, name: item.height ? `${item.height}p` : item.label })),
            src: () => current.src,
            selected: () => selected,
            playingHeight: () => current.height,
            select(id, options) {
                const next = id === 'auto' ? autoFileQuality(qualities) : qualities.find(item => item.label === id);
                if (!next) return false;
                selected = id === 'auto' ? 'auto' : next.label;
                tried.clear();
                if (next.src !== current.src) change(next, options);
                else if (options?.playing) change(next, options);
                return true;
            },
            // Going full screen on "Auto" can call for a sharper file.
            refreshAuto() {
                if (selected !== 'auto') return;
                const next = autoFileQuality(qualities);
                if (next.height > current.height && !tried.has(next.src)) change(next);
            },
            // A file that won't load: quietly try the next quality down.
            fallback(options) {
                tried.add(current.src);
                const next = qualities.find(item => !tried.has(item.src) && item.height <= current.height)
                    || qualities.find(item => !tried.has(item.src));
                if (!next) return false;
                change(next, options);
                return true;
            }
        };
    }

    function hlsQuality(hls) {
        const best = new Map();
        (hls.levels || []).forEach((level, index) => {
            const height = Number(level.height) || 0;
            if (!height) return;
            const known = best.get(height);
            if (known === undefined || (level.bitrate || 0) > (hls.levels[known].bitrate || 0)) best.set(height, index);
        });

        const options = [...best.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([height, index]) => ({ id: `${height}p`, height, name: `${height}p`, index }));
        if (options.length < 2) return null;

        const saved = playerPrefs().quality;
        let selected = options.some(option => option.id === saved) ? saved : 'auto';
        if (selected !== 'auto') hls.currentLevel = options.find(option => option.id === selected).index;

        return {
            options,
            selected: () => selected,
            playingHeight: () => Number(hls.levels?.[hls.currentLevel]?.height) || 0,
            select(id) {
                const option = options.find(item => item.id === id);
                selected = option ? option.id : 'auto';
                hls.currentLevel = option ? option.index : -1; // -1 = automatic
                return true;
            },
            refreshAuto() { /* hls.js adapts by itself */ },
            fallback: () => false
        };
    }

    function setupQuality(quality) {
        nowPlaying.quality = quality || null;
        ui.qualityWrap.hidden = !quality;
        renderQualityBadge();
    }

    function renderQualityBadge() {
        const quality = nowPlaying?.quality;
        const height = quality ? quality.playingHeight() : 0;
        const tag = qualityTag(height);
        ui.qualityBadge.textContent = tag;
        ui.qualityBadge.hidden = !tag;

        const button = $('[data-pc="quality"]', player);
        if (button && quality) {
            const now = height ? `${height}p` : '';
            const label = quality.selected() === 'auto' ? `Video quality: Auto${now ? ` (${now})` : ''}` : `Video quality: ${now || quality.selected()}`;
            button.setAttribute('aria-label', label);
            button.title = label;
        }
    }

    function renderQualityMenu() {
        const menu = $('[data-menu="quality"]', player);
        const quality = nowPlaying?.quality;
        if (!menu || !quality) return;

        const selected = quality.selected();
        const playing = quality.playingHeight();
        const items = [
            { id: 'auto', name: 'Auto', note: selected === 'auto' && playing ? `${playing}p` : '', tag: '' },
            ...quality.options.map(option => ({ id: option.id, name: option.name, note: '', tag: qualityTag(option.height) }))
        ];

        menu.innerHTML = '<p class="cv-pmenu-title">Quality</p>' + items.map(item => `
            <button type="button" role="menuitemradio" aria-checked="${item.id === selected}" data-quality="${escapeHtml(item.id)}">${ICONS.check}<span>${escapeHtml(item.name)}</span>${item.tag ? `<span class="cv-pmenu-tag">${item.tag}</span>` : ''}${item.note ? `<span class="cv-pmenu-note">${item.note}</span>` : ''}</button>`).join('');
    }

    function selectQuality(id) {
        const quality = nowPlaying?.quality;
        if (!quality) return;

        // Picking a quality after an error also restarts playback.
        const recovering = player.dataset.state === 'error';
        if (recovering) hideMessage();
        if (!quality.select(id, recovering ? { playing: true } : undefined)) return;

        savePlayerPrefs({ quality: quality.selected() });
        const option = quality.options.find(item => item.id === quality.selected());
        pill(option ? `Quality: ${option.name}` : 'Quality: Auto', 'settings');
        renderQualityBadge();
    }

    function qualityChanged() {
        if (!nowPlaying) return;
        if (nowPlaying.tracks?.length) selectSubtitles(nowPlaying.subtitleIndex, { save: false, quiet: true });
        renderQualityBadge();
        if (ui.menu === 'quality') renderQualityMenu();
    }

    // ---------- Subtitles (WebVTT files listed in data.js) ----------

    function setupSubtitles(video, list) {
        nowPlaying.subtitleList = list;
        nowPlaying.tracks = [];
        nowPlaying.subtitleIndex = -1;
        ui.subtitlesWrap.hidden = !list.length;
        ui.subtitles.textContent = '';
        if (!list.length) return;

        // Subtitles on another website need CORS, which also applies to the video.
        const crossSite = list.some(item => {
            try {
                return new URL(asset(item.src), location.href).origin !== location.origin;
            } catch {
                return false;
            }
        });
        if (crossSite) video.crossOrigin = 'anonymous';

        list.forEach((item, index) => {
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = item.label || item.lang || `Track ${index + 1}`;
            if (item.lang) track.srclang = item.lang;
            track.src = asset(item.src);
            video.appendChild(track);
            track.track.mode = 'disabled';
            nowPlaying.tracks.push(track.track);
        });

        const saved = playerPrefs().subtitles;
        let pick = saved && saved !== 'off' ? list.findIndex(item => (item.lang || item.label) === saved) : -1;
        if (pick < 0 && saved !== 'off') pick = list.findIndex(item => item.default);
        selectSubtitles(pick, { save: false, quiet: true });
    }

    function selectSubtitles(index, { save = true, quiet = false } = {}) {
        if (!nowPlaying?.tracks) return;
        const tracks = nowPlaying.tracks;
        const pick = Number.isInteger(index) && index >= 0 && index < tracks.length ? index : -1;

        tracks.forEach((track, n) => {
            // "hidden" loads the cues without the browser drawing them;
            // CineVerse draws them itself so they move above the controls.
            track.mode = n === pick ? 'hidden' : 'disabled';
            track.oncuechange = n === pick ? () => drawCues(track) : null;
        });

        nowPlaying.subtitleIndex = pick;
        if (pick >= 0) nowPlaying.lastSubtitle = pick;
        ui.subtitles.textContent = '';
        if (pick >= 0) drawCues(tracks[pick]);
        ui.subtitlesButton.classList.toggle('is-on', pick >= 0);

        const item = nowPlaying.subtitleList[pick];
        if (save) savePlayerPrefs({ subtitles: item ? (item.lang || item.label) : 'off' });
        if (!quiet) pill(item ? `Subtitles: ${item.label || item.lang}` : 'Subtitles off', 'subtitles');
    }

    function drawCues(track) {
        const cues = [...(track.activeCues || [])];
        ui.subtitles.innerHTML = cues
            .map(cue => `<span>${escapeHtml(String(cue.text || '').replace(/<[^>]*>/g, '')).replace(/\n/g, '<br>')}</span>`)
            .join('<br>');
    }

    function toggleSubtitles() {
        if (!nowPlaying?.tracks?.length) return;
        selectSubtitles(nowPlaying.subtitleIndex >= 0 ? -1 : (nowPlaying.lastSubtitle ?? 0));
    }

    // ---------- Loading video ----------

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = $(`script[src="${src}"]`);
            if (existing?.dataset.loaded) {
                resolve();
                return;
            }
            const script = existing || document.createElement('script');
            script.addEventListener('load', () => {
                script.dataset.loaded = '1';
                resolve();
            }, { once: true });
            script.addEventListener('error', reject, { once: true });
            if (!existing) {
                script.src = src;
                script.async = true;
                document.head.appendChild(script);
            }
        });
    }

    let youTubeApi = null;

    function loadYouTubeApi() {
        if (window.YT?.Player) return Promise.resolve(window.YT);

        if (!youTubeApi) {
            youTubeApi = new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('YouTube API timed out')), 6000);
                const previous = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => {
                    clearTimeout(timer);
                    if (typeof previous === 'function') previous();
                    resolve(window.YT);
                };
                loadScript('https://www.youtube.com/iframe_api').catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
            }).catch(error => {
                youTubeApi = null;
                throw error;
            });
        }

        return youTubeApi;
    }

    const iframeHtml = (src, label) =>
        `<iframe src="${escapeHtml(src)}" title="${escapeHtml(label)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;

    function stopPlayback() {
        if (!nowPlaying) return;

        const { id, adapter, trackProgress, timer, noteTimer, hls, video, yt } = nowPlaying;

        if (trackProgress && adapter) {
            try {
                const duration = adapter.duration();
                if (duration) saveProgress(id, adapter.time(), duration);
            } catch { /* player not ready */ }
        }

        clearInterval(timer);
        clearTimeout(noteTimer);
        try { yt?.destroy(); } catch { /* ignore */ }
        try { hls?.destroy(); } catch { /* ignore */ }
        if (video) {
            video.pause();
            video.removeAttribute('src');
            try { video.load(); } catch { /* ignore */ }
        }

        nowPlaying = null;

        if (ui) {
            closePlayerMenus();
            hideMessage();
            clearTimeout(ui.idleTimer);
            clearTimeout(ui.tapTimer);
            ui.scrubbing = false;
            ui.subtitles.textContent = '';
            ui.note.innerHTML = '';
            player.classList.remove('is-idle', 'is-scrubbing');
        }
    }

    function restartPlayback() {
        if (!nowPlaying) return;
        clearProgress(nowPlaying.id);
        ui.note.innerHTML = '';
        hideMessage();

        const adapter = nowPlaying.adapter;
        if (adapter) {
            adapter.seek(0);
            adapter.play();
            renderPlayer();
        }
    }

    function retryPlayback() {
        if (!nowPlaying) return;
        const { title, source, options } = nowPlaying;
        const at = nowPlaying.adapter ? nowPlaying.adapter.time() : 0;
        startPlayback(title, source, { ...options, resumeAt: at || options.resumeAt || 0, retry: true });
    }

    // Opens the player for any kind of video.
    //   purpose: 'trailer' | 'teaser' | 'movie'  (only movies are saved to Continue Watching)
    function startPlayback(title, source, options = {}) {
        ensurePlayer();
        closeMenus();
        stopPlayback();
        if (player.hidden) playerTrigger = document.activeElement;

        const own = source.kind === 'file' || source.kind === 'hls';
        const purpose = options.purpose || 'movie';
        const resumeAt = options.resumeAt || 0;

        player.classList.toggle('is-own', own);
        player.classList.toggle('is-framed', !own);
        player.classList.toggle('has-controls', own);
        player.classList.remove('is-idle', 'has-message');
        player.dataset.kind = source.kind;
        player.dataset.state = 'loading';

        ui.title.textContent = title.title;
        ui.label.textContent = options.label || '';
        ui.subtitlesWrap.hidden = true;
        ui.qualityWrap.hidden = true;
        ui.qualityBadge.hidden = true;
        ui.fullscreen.hidden = false;

        nowPlaying = {
            id: title.id,
            title,
            source,
            options: { ...options, purpose },
            kind: source.kind,
            trackProgress: purpose === 'movie'
        };

        if (resumeAt && !options.retry) {
            ui.note.innerHTML = `<span class="cv-resume-note">Resuming from ${formatClock(resumeAt)} <button class="cv-btn cv-btn-ghost cv-btn-sm" type="button" data-restart>Start over</button></span>`;
            nowPlaying.noteTimer = setTimeout(() => { ui.note.innerHTML = ''; }, 10000);
        } else {
            ui.note.innerHTML = '';
        }

        if (own) {
            mountVideo(source, title, resumeAt, options.subtitles || []);
        } else if (source.kind === 'youtube') {
            mountYouTube(source.id, title, resumeAt);
        } else if (source.kind === 'vimeo') {
            ui.frame.innerHTML = `<div class="cv-player-screen">${iframeHtml(`https://player.vimeo.com/video/${encodeURIComponent(source.id)}?autoplay=1${resumeAt ? `#t=${Math.floor(resumeAt)}s` : ''}`, title.title)}</div>`;
        } else {
            ui.frame.innerHTML = `<div class="cv-player-screen">${iframeHtml(source.src, title.title)}</div>`;
        }

        ui.fullscreen.hidden = !canFullscreen();
        showPlayer();
        renderFullscreenButton();
    }

    const HLS_JS = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';

    function mountVideo(source, title, resumeAt, subtitles) {
        const poster = asset(title.backdrop || title.poster);
        ui.frame.innerHTML = `<div class="cv-player-screen"><video playsinline preload="auto"${poster ? ` poster="${escapeHtml(poster)}"` : ''}></video></div>`;

        const video = $('video', ui.frame);
        const adapter = html5Adapter(video);
        const prefs = playerPrefs();
        const current = () => nowPlaying?.video === video;

        // A failed video also fires "pause" afterwards: keep showing the error.
        const failed = () => Boolean(video.error) || player.dataset.state === 'error';

        nowPlaying.video = video;
        nowPlaying.adapter = adapter;
        video.volume = prefs.volume;
        video.muted = prefs.muted;

        let lastSave = 0;
        let lastTime = 0;
        const save = () => {
            if (current() && nowPlaying.trackProgress && !adapter.swapping()) saveProgress(title.id, video.currentTime, video.duration);
        };

        video.addEventListener('loadedmetadata', () => {
            if (resumeAt && resumeAt < video.duration - 5) video.currentTime = resumeAt;
            renderPlayer();
        }, { once: true });

        ['durationchange', 'progress', 'volumechange', 'ratechange', 'seeked'].forEach(type => {
            video.addEventListener(type, () => {
                if (current()) renderPlayer();
            });
        });

        video.addEventListener('timeupdate', () => {
            if (!current()) return;
            if (!adapter.swapping()) lastTime = video.currentTime;
            renderPlayer();
            if (Date.now() - lastSave > 4000) {
                lastSave = Date.now();
                save();
            }
        });
        video.addEventListener('waiting', () => {
            if (current() && !video.paused && !failed()) setPlayerState('loading');
        });
        video.addEventListener('playing', () => {
            if (!current()) return;
            // The poster is only for the very start; a quality change shouldn't flash it.
            video.removeAttribute('poster');
            hideMessage();
            setPlayerState('playing');
            renderPlayer();
        });
        video.addEventListener('pause', () => {
            if (!current() || failed() || adapter.swapping()) return;
            if (!video.ended) setPlayerState('paused');
            renderPlayer();
            save();
        });
        video.addEventListener('canplay', () => {
            if (current() && video.paused && !failed() && !adapter.swapping() && player.dataset.state === 'loading') setPlayerState('paused');
        });
        video.addEventListener('ended', () => {
            if (!current()) return;
            if (nowPlaying.trackProgress) clearProgress(title.id);
            setPlayerState('ended');
            renderPlayer();
            showEndCard();
        });
        video.addEventListener('error', () => {
            if (!current() || !video.getAttribute('src') || nowPlaying.hls) return;
            const broken = video.getAttribute('src');
            const resume = adapter.swapping() ? !adapter.paused() : true;
            if (nowPlaying.quality?.fallback({ time: lastTime || resumeAt, playing: resume })) {
                console.warn(`CineVerse: couldn't load ${broken}, trying another quality.`);
                return;
            }
            showVideoError(broken);
        });

        setupSubtitles(video, Array.isArray(subtitles) ? subtitles.filter(item => item && item.src) : []);

        if (source.kind === 'hls') {
            mountHls(video, adapter, source, current);
        } else {
            const quality = fileQuality(adapter, source.qualities);
            setupQuality(quality);
            video.src = quality ? quality.src() : source.src;
            adapter.play();
        }

        renderPlayer();
    }

    // HLS streams (from Bunny Stream, Cloudflare Stream, Mux…) play through hls.js,
    // which also lists the stream's qualities. Older iPhones use their built-in player.
    function mountHls(video, adapter, source, current) {
        const native = () => {
            if (!current()) return;
            video.src = source.src;
            adapter.play();
        };

        loadScript(HLS_JS)
            .then(() => {
                if (!current()) return;
                const Hls = window.Hls;
                if (!Hls?.isSupported()) {
                    native();
                    return;
                }

                const hls = new Hls({ capLevelToPlayerSize: true });
                let recovered = false;
                nowPlaying.hls = hls;

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (!current()) return;
                    setupQuality(hlsQuality(hls));
                    adapter.play();
                });
                hls.on(Hls.Events.LEVEL_SWITCHED, () => {
                    if (!current()) return;
                    renderQualityBadge();
                    if (ui.menu === 'quality') renderQualityMenu();
                });
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (!data?.fatal || !current()) return;
                    if (!recovered && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        recovered = true;
                        hls.recoverMediaError();
                    } else if (!recovered && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        recovered = true;
                        hls.startLoad();
                    } else {
                        showVideoError(source.src);
                    }
                });

                hls.loadSource(source.src);
                hls.attachMedia(video);
            })
            .catch(() => {
                if (video.canPlayType('application/vnd.apple.mpegurl')) native();
                else if (current()) showVideoError(source.src);
            });
    }

    function mountYouTube(videoId, title, resumeAt) {
        const start = Math.floor(resumeAt) || 0;
        const current = () => nowPlaying?.id === title.id && nowPlaying?.kind === 'youtube';

        // If the YouTube API can't load, fall back to YouTube's standard player.
        const plainEmbed = () => {
            if (!current()) return;
            player.classList.remove('has-controls');
            ui.frame.innerHTML = `<div class="cv-player-screen">${iframeHtml(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1${start ? `&start=${start}` : ''}`, title.title)}</div>`;
        };

        ui.frame.innerHTML = '<div class="cv-player-screen"><div class="cv-yt-mount"></div></div>';
        const mount = $('.cv-yt-mount', ui.frame);

        loadYouTubeApi()
            .then(YT => {
                if (!current() || !mount.isConnected) return;

                const states = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, ...(YT.PlayerState || {}) };
                const prefs = playerPrefs();
                let adapter = null;
                let lastSave = Date.now();

                const save = () => {
                    if (adapter && nowPlaying?.trackProgress && current()) saveProgress(title.id, adapter.time(), adapter.duration());
                };

                const playerVars = {
                    autoplay: 1,
                    controls: 0,          // CineVerse controls are used instead (they sit below the picture)
                    rel: 0,               // suggestions at the end come from the same channel
                    iv_load_policy: 3,    // no annotations
                    playsinline: 1,
                    fs: 0,                // full screen goes through the CineVerse button
                    start
                };
                if (/^https?:$/.test(location.protocol)) playerVars.origin = location.origin;

                const yt = new YT.Player(mount, {
                    host: 'https://www.youtube-nocookie.com',
                    videoId,
                    playerVars,
                    events: {
                        onReady: event => {
                            if (!current()) return;
                            adapter.setVolume(prefs.volume);
                            adapter.setMuted(prefs.muted);
                            event.target.playVideo();
                            renderPlayer();
                        },
                        onStateChange: event => {
                            if (!current()) return;
                            adapter.setState(event.data);
                            if (event.data === states.ENDED) {
                                if (nowPlaying.trackProgress) clearProgress(title.id);
                                player.dataset.state = 'ended';
                            } else if (event.data === states.PAUSED) {
                                save();
                                player.dataset.state = 'paused';
                            } else if (event.data === states.PLAYING) {
                                player.dataset.state = 'playing';
                            }
                            renderPlayer();
                        },
                        onPlaybackRateChange: () => {
                            if (current()) renderPlayer();
                        },
                        onError: event => {
                            if (current()) showYouTubeError(videoId, event.data);
                        }
                    }
                });

                adapter = youtubeAdapter(yt, states);
                nowPlaying.yt = yt;
                nowPlaying.adapter = adapter;
                player.classList.add('has-controls');
                nowPlaying.timer = setInterval(() => {
                    if (!current()) return;
                    renderPlayer();
                    if (Date.now() - lastSave > 5000) {
                        lastSave = Date.now();
                        save();
                    }
                }, 250);
                renderPlayer();
            })
            .catch(plainEmbed);
    }

    // ---------- Messages: end of video, errors ----------

    function showEndCard() {
        const title = nowPlaying?.title;
        if (!title) return;
        const offerMovie = nowPlaying.options.purpose !== 'movie' && watchSource(title);

        showMessage('ended', `
            <p class="cv-player-message-kicker">${{ movie: 'Thanks for watching', teaser: 'Teaser finished', trailer: 'Trailer finished' }[nowPlaying.options.purpose] || 'Finished'}</p>
            <h3>${escapeHtml(title.title)}</h3>
            <div class="cv-player-message-actions">
                ${offerMovie ? `<button class="cv-btn cv-btn-primary cv-btn-sm" type="button" data-watch="${title.id}">${ICONS.play}<span>Watch Now</span></button>` : ''}
                <button class="cv-btn ${offerMovie ? 'cv-btn-ghost' : 'cv-btn-primary'} cv-btn-sm" type="button" data-pc="replay">${PICONS.replay}<span>Replay</span></button>
                <button class="cv-btn cv-btn-ghost cv-btn-sm" type="button" data-list-toggle="${title.id}"></button>
            </div>`);
    }

    function showVideoError(src) {
        if (!nowPlaying) return;
        setPlayerState('error');
        const path = String(src || '').replace(ROOT, '');
        showMessage('error', `
            <span class="cv-player-message-icon">${PICONS.alert}</span>
            <h3>This video can't be played right now</h3>
            <p>Please check your internet connection and try again.</p>
            ${IS_LOCAL ? `<p class="cv-player-hint">Site owner: check that <code>${escapeHtml(path)}</code> exists and matches the path in JS/data.js.</p>` : ''}
            <div class="cv-player-message-actions">
                <button class="cv-btn cv-btn-primary cv-btn-sm" type="button" data-pc="retry">${PICONS.replay}<span>Try again</span></button>
                <button class="cv-btn cv-btn-ghost cv-btn-sm" type="button" data-close-player>Close</button>
            </div>`);
    }

    function showYouTubeError(videoId, code) {
        const reasons = {
            2: 'The video link is not valid.',
            5: "This video can't be played in this browser.",
            100: 'The video was removed or made private.',
            101: "The video's owner doesn't allow it to be played on other websites.",
            150: "The video's owner doesn't allow it to be played on other websites.",
            153: 'YouTube needs to know which website is playing the video.'
        };
        const fileHint = location.protocol === 'file:'
            ? '<p class="cv-player-hint">YouTube videos only play when the site is opened through http:// or https:// (for example with VS Code Live Server), not by double-clicking index.html.</p>'
            : '';

        try { nowPlaying?.yt?.destroy(); } catch { /* ignore */ }
        clearInterval(nowPlaying?.timer);
        if (nowPlaying) {
            nowPlaying.yt = null;
            nowPlaying.adapter = null;
        }
        player.classList.remove('has-controls');
        player.dataset.state = 'error';

        ui.frame.innerHTML = `
            <div class="cv-player-screen">
                <div class="cv-player-message cv-player-message-inline" role="alert">
                    <span class="cv-player-message-icon">${PICONS.alert}</span>
                    <h3>This video can't play here</h3>
                    <p>${escapeHtml(reasons[code] || 'Please try again later.')}</p>
                    ${fileHint}
                    <div class="cv-player-message-actions">
                        <a class="cv-btn cv-btn-primary cv-btn-sm" href="https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}" target="_blank" rel="noopener">Watch on YouTube ${ICONS.external}</a>
                        <button class="cv-btn cv-btn-ghost cv-btn-sm" type="button" data-close-player>Close</button>
                    </div>
                </div>
            </div>`;
    }

    // ---------- Opening and closing ----------

    function showPlayer() {
        if (player.hidden) lockScroll();
        player.hidden = false;
        requestAnimationFrame(() => player.classList.add('is-open'));
        syncListUI();
        ui.panel.focus({ preventScroll: true });
        wake();
    }

    // Trailer (YouTube or your own file) or the teaser video for originals.
    function playTitle(id) {
        const title = BY_ID.get(id);
        if (!title) return;

        const source = trailerSource(title);
        if (!source) {
            window.open(youtubeSearch(title), '_blank', 'noopener');
            return;
        }

        const teaser = Boolean(title.video);
        startPlayback(title, source, {
            purpose: teaser ? 'teaser' : 'trailer',
            label: teaser ? (title.original ? 'CineVerse Original · Teaser' : 'Teaser') : 'Official Trailer',
            subtitles: title.trailerSubtitles
        });
    }

    // Full movie or episode (title.watch in data.js).
    function watchTitle(id) {
        const title = BY_ID.get(id);
        const source = title && watchSource(title);

        if (!source) {
            if (title) playTitle(id);
            return;
        }

        startPlayback(title, source, {
            purpose: 'movie',
            label: title.credit || [title.year, title.certification, formatRuntime(title.runtime)].filter(Boolean).join(' · '),
            resumeAt: resumePoint(getProgress()[id]),
            subtitles: title.subtitles
        });
        pushRecent(id);
    }

    function closePlayer() {
        if (!player || player.hidden) return;

        if (fullscreenElement()) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) Promise.resolve(exit.call(document)).catch(() => {});
        }

        stopPlayback();
        player.classList.remove('is-open', 'is-idle', 'is-fullscreen');
        player.hidden = true;
        ui.frame.innerHTML = '';
        unlockScroll();

        if (PAGE === 'home') renderPersonalRows();
        if (modalOpenId) refreshDetailsActions();

        if (playerTrigger && document.contains(playerTrigger)) {
            playerTrigger.focus({ preventScroll: true });
        }
    }

    // Keyboard shortcuts while the player is open (Netflix / YouTube style).
    function handlePlayerKey(event) {
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        const active = document.activeElement;

        if (ui.menu && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            moveMenuFocus(event.key === 'ArrowDown' ? 1 : -1);
            return;
        }

        const onControl = active && active !== ui.panel && ui.panel.contains(active) && active.matches('button, a[href]');
        if ((event.key === ' ' || event.key === 'Enter') && onControl) return;
        if (active?.matches?.('input[type="range"]') && /^Arrow|^Page|^Home$|^End$/.test(event.key)) return;
        if (!nowPlaying?.adapter) return;

        const adapter = nowPlaying.adapter;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

        switch (key) {
            case ' ':
            case 'k':
                togglePlay();
                break;
            case 'ArrowLeft':
            case 'j':
                skip(-SKIP_SECONDS);
                break;
            case 'ArrowRight':
            case 'l':
                skip(SKIP_SECONDS);
                break;
            case 'ArrowUp':
                setVolume((adapter.muted() ? 0 : adapter.volume()) + 0.1);
                break;
            case 'ArrowDown':
                setVolume((adapter.muted() ? 0 : adapter.volume()) - 0.1);
                break;
            case 'm':
                toggleMute();
                break;
            case 'f':
                if (!ui.fullscreen.hidden) toggleFullscreen();
                break;
            case 'c':
                toggleSubtitles();
                break;
            case 'Home':
                seekTo(0);
                break;
            case 'End':
                seekTo(adapter.duration());
                break;
            default:
                return;
        }

        event.preventDefault();
        wake();
    }

    // =========================================
    // SHARE
    // =========================================

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch { /* fall through */ }

        try {
            const area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
            document.body.appendChild(area);
            area.select();
            const copied = document.execCommand('copy');
            area.remove();
            return copied;
        } catch {
            return false;
        }
    }

    async function shareTitle(id) {
        const title = BY_ID.get(id);
        if (!title) return;

        let url = location.href;
        try {
            const link = new URL(location.href);
            link.searchParams.set('title', id);
            url = link.href;
        } catch { /* keep current URL */ }

        if (navigator.share) {
            try {
                await navigator.share({ title: `${title.title} on CineVerse`, text: title.overview, url });
                return;
            } catch (error) {
                if (error?.name === 'AbortError') return;
            }
        }

        toast(await copyText(url) ? 'Link copied to clipboard' : url);
    }

    // =========================================
    // GLOBAL CLICK & KEYBOARD HANDLING
    // =========================================

    document.addEventListener('click', event => {
        const listButton = event.target.closest('[data-list-toggle]');
        if (listButton) {
            event.preventDefault();
            toggleSaved(listButton.dataset.listToggle);
            return;
        }

        const removeProgress = event.target.closest('[data-remove-progress]');
        if (removeProgress) {
            event.preventDefault();
            clearProgress(removeProgress.dataset.removeProgress);
            renderPersonalRows();
            toast('Removed from Continue Watching');
            return;
        }

        const watchButton = event.target.closest('[data-watch]');
        if (watchButton) {
            event.preventDefault();
            watchTitle(watchButton.dataset.watch);
            return;
        }

        const playButtonEl = event.target.closest('[data-play]');
        if (playButtonEl) {
            event.preventDefault();
            playTitle(playButtonEl.dataset.play);
            return;
        }

        const shareButton = event.target.closest('[data-share]');
        if (shareButton) {
            event.preventDefault();
            shareTitle(shareButton.dataset.share);
            return;
        }

        const opener = event.target.closest('[data-open]');
        if (opener) {
            const link = event.target.closest('a[href]');
            if (link && !link.hasAttribute('data-open')) return;
            event.preventDefault();
            openDetails(opener.dataset.open, { trigger: opener.matches('button, a, [tabindex]') ? opener : event.target.closest('button, a, [tabindex]') });
        }
    });

    function focusSearch() {
        const pageSearch = $('[data-page-search]');
        if (pageSearch) {
            pageSearch.focus();
            pageSearch.select();
            return;
        }

        const headerSearch = $('.header .search');
        if (!headerSearch) return;

        if (window.matchMedia('(max-width: 960px)').matches) setMobileMenu(true);
        headerSearch.focus();
        headerSearch.select();
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (playerOpen()) {
                if (ui.menu) {
                    closePlayerMenus(true);
                    return;
                }
                if (fullscreenElement()) return; // the browser leaves full screen first
                closePlayer();
                return;
            }
            if (modalOpenId !== null) {
                closeDetails();
                return;
            }
            closeMenus();
            closeSearchPanel();
            setMobileMenu(false);
            return;
        }

        if (event.key === 'Tab') {
            if (playerOpen()) {
                wake();
                trapFocus(event, ui.panel);
            } else if (modalOpenId !== null) {
                trapFocus(event, $('.cv-modal-panel', modal));
            }
            return;
        }

        // While the player is open, keys control playback and nothing else.
        if (playerOpen()) {
            handlePlayerKey(event);
            return;
        }

        const active = document.activeElement;
        const typing = active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable);

        if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            focusSearch();
            return;
        }

        if (event.key === '/' && !typing && modalOpenId === null && !playerOpen()) {
            event.preventDefault();
            focusSearch();
            return;
        }

        if ((event.key === 'Enter' || event.key === ' ') && active?.matches('[data-watch][role="button"]')) {
            event.preventDefault();
            watchTitle(active.dataset.watch);
            return;
        }

        if ((event.key === 'Enter' || event.key === ' ') && active?.matches('[data-open][role="button"]')) {
            event.preventDefault();
            openDetails(active.dataset.open, { trigger: active });
        }
    });

    // =========================================
    // HEADER — mobile menu, dropdown menus, search
    // =========================================

    let openMenu = null;
    let closeSearchPanel = () => {};

    function setMobileMenu(open) {
        const header = $('.header');
        const toggle = $('.menu-toggle');
        if (!header || !toggle) return;

        header.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    function closeMenus() {
        if (!openMenu) return;
        openMenu.button.setAttribute('aria-expanded', 'false');
        openMenu.panel.remove();
        openMenu = null;
    }

    function toggleMenu(button, render) {
        if (openMenu?.button === button) {
            closeMenus();
            return;
        }

        closeMenus();
        closeSearchPanel();

        const wrap = button.closest('.cv-menu-wrap') || button.parentElement;
        const panel = document.createElement('div');
        panel.className = 'cv-menu-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', button.dataset.menuLabel || button.getAttribute('aria-label') || 'Menu');
        wrap.appendChild(panel);

        openMenu = { button, panel };
        button.setAttribute('aria-expanded', 'true');
        render(panel);
        requestAnimationFrame(() => panel.classList.add('is-open'));
    }

    document.addEventListener('click', event => {
        if (openMenu && !openMenu.panel.contains(event.target) && !openMenu.button.contains(event.target)) {
            closeMenus();
        }
    });

    function initHeader() {
        const header = $('.header');
        if (!header) return;

        $('.menu-toggle', header)?.addEventListener('click', () => {
            setMobileMenu(!header.classList.contains('menu-open'));
        });

        $$('.nav-links a', header).forEach(link => {
            link.addEventListener('click', () => setMobileMenu(false));
        });

        window.addEventListener('resize', debounce(() => {
            if (window.innerWidth > 960) setMobileMenu(false);
        }, 150));

        const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        $('.logo', header)?.addEventListener('click', () => {
            if (PAGE === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        initNotifications();
        initProfile();
        initHeaderSearch();
    }

    // ---------- Notifications ----------

    function notificationItems() {
        return (DATA.notifications || []).filter(item => !item.titleId || BY_ID.has(item.titleId));
    }

    function updateNotificationDot() {
        const seen = new Set(store.get(KEYS.seen, []));
        const hasNew = notificationItems().some(item => !seen.has(item.id));
        $$('.notification-dot').forEach(dot => {
            dot.hidden = !hasNew;
        });
        $$('.notification').forEach(button => {
            button.setAttribute('aria-label', hasNew ? 'Notifications (new)' : 'Notifications');
        });
    }

    function markRead(ids) {
        const read = new Set(store.get(KEYS.read, []));
        ids.forEach(id => read.add(id));
        store.set(KEYS.read, [...read]);
    }

    function initNotifications() {
        const button = $('.header .notification');
        if (!button) return;

        button.dataset.menuLabel = 'Notifications';
        updateNotificationDot();

        button.addEventListener('click', () => toggleMenu(button, panel => {
            const items = notificationItems();
            const read = new Set(store.get(KEYS.read, []));

            panel.classList.add('cv-notifications');
            panel.innerHTML = `
                <div class="cv-menu-head">
                    <strong>Notifications</strong>
                    ${items.some(item => !read.has(item.id)) ? '<button type="button" class="cv-link-btn" data-mark-read>Mark all as read</button>' : ''}
                </div>
                ${items.length ? `
                    <ul class="cv-notification-list">
                        ${items.map(item => {
                            const title = BY_ID.get(item.titleId);
                            return `
                                <li>
                                    <button type="button" class="cv-notification${read.has(item.id) ? '' : ' is-unread'}" data-notification="${item.id}"${title ? ` data-open="${title.id}"` : ''}>
                                        ${title ? `<span class="cv-notification-thumb" data-placeholder="${escapeHtml(title.title)}">${posterImg(title)}</span>` : ''}
                                        <span class="cv-notification-text">
                                            <span class="cv-notification-label">${escapeHtml(item.label || 'Update')}</span>
                                            ${escapeHtml(item.text)}
                                        </span>
                                    </button>
                                </li>`;
                        }).join('')}
                    </ul>` : '<p class="cv-menu-empty">You\'re all caught up! New movie updates will appear here.</p>'}`;

            store.set(KEYS.seen, items.map(item => item.id));
            updateNotificationDot();
            checkBrokenImages(panel);

            panel.addEventListener('click', event => {
                if (event.target.closest('[data-mark-read]')) {
                    markRead(items.map(item => item.id));
                    $$('.cv-notification.is-unread', panel).forEach(element => element.classList.remove('is-unread'));
                    event.target.closest('[data-mark-read]').remove();
                    return;
                }

                const item = event.target.closest('[data-notification]');
                if (item) markRead([item.dataset.notification]);
            });
        }));
    }

    // ---------- Profile ----------

    function getProfile() {
        const saved = store.get(KEYS.profile, null);
        const name = saved && typeof saved.name === 'string' ? saved.name.trim().slice(0, 24) : '';
        return { name: name || 'Guest', isGuest: !name };
    }

    function updateAvatar() {
        const { name } = getProfile();
        $$('.profile-avatar').forEach(avatar => {
            avatar.textContent = name.charAt(0).toUpperCase();
            avatar.setAttribute('aria-label', `Profile menu for ${name}`);
        });
    }

    function renderProfilePanel(panel) {
        const profile = getProfile();
        const count = getList().length;

        panel.classList.add('cv-profile-menu');
        panel.innerHTML = `
            <div class="cv-profile-head">
                <span class="cv-profile-avatar" aria-hidden="true">${escapeHtml(profile.name.charAt(0).toUpperCase())}</span>
                <div>
                    <strong>${escapeHtml(profile.name)}</strong>
                    <span>${profile.isGuest ? 'Add your name to personalise CineVerse' : 'CineVerse member'}</span>
                </div>
            </div>

            <form class="cv-profile-form" hidden novalidate>
                <label for="cv-profile-name">Profile name</label>
                <div class="cv-profile-form-row">
                    <input id="cv-profile-name" name="profileName" maxlength="24" autocomplete="nickname" placeholder="Your name" value="${escapeHtml(profile.isGuest ? '' : profile.name)}">
                    <button class="cv-btn cv-btn-primary cv-btn-sm" type="submit">Save</button>
                </div>
                <p class="cv-field-error" id="cv-profile-error" aria-live="polite"></p>
            </form>

            <button type="button" class="cv-menu-item" data-edit-profile>${profile.isGuest ? 'Add your name' : 'Edit profile'}</button>
            <a class="cv-menu-item" href="${pageUrl('pages/my-list.html')}">My List <span class="cv-menu-count">${count}</span></a>
            <a class="cv-menu-item" href="${pageUrl('pages/help.html')}">Help Center</a>
            <button type="button" class="cv-menu-item cv-menu-danger" data-clear-data>Clear my data</button>`;

        const form = $('.cv-profile-form', panel);
        const input = $('input', form);
        const error = $('.cv-field-error', form);

        $('[data-edit-profile]', panel).addEventListener('click', event => {
            form.hidden = false;
            event.currentTarget.hidden = true;
            input.focus();
        });

        form.addEventListener('submit', event => {
            event.preventDefault();
            const name = input.value.replace(/\s+/g, ' ').trim();

            if (name.length < 2) {
                error.textContent = 'Please enter at least 2 characters.';
                input.setAttribute('aria-invalid', 'true');
                input.focus();
                return;
            }

            store.set(KEYS.profile, { name });
            updateAvatar();
            renderProfilePanel(panel);
            toast(`Profile updated. Welcome, ${name}!`);
        });

        $('[data-clear-data]', panel).addEventListener('click', () => {
            if (!window.confirm('Clear My List, recently viewed titles and your profile from this browser?')) return;

            Object.values(KEYS).forEach(key => store.remove(key));
            closeMenus();
            updateAvatar();
            updateNotificationDot();
            syncListUI();
            document.dispatchEvent(new CustomEvent('cv:listchange'));
            if (PAGE === 'home') renderPersonalRows();
            toast('Your CineVerse data was cleared from this browser.');
        });
    }

    function initProfile() {
        const button = $('.header .profile-avatar');
        if (!button) return;

        button.dataset.menuLabel = 'Profile';
        updateAvatar();
        button.addEventListener('click', () => toggleMenu(button, renderProfilePanel));
    }

    // ---------- Header search ----------

    function initHeaderSearch() {
        const input = $('.header .search');
        const form = input?.closest('form');
        if (!input || !form) return;

        const panel = document.createElement('div');
        panel.className = 'cv-search-panel';
        panel.id = 'cv-search-panel';
        panel.setAttribute('role', 'listbox');
        panel.setAttribute('aria-label', 'Search suggestions');
        panel.hidden = true;
        form.appendChild(panel);

        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-controls', panel.id);

        let active = -1;

        const hide = () => {
            panel.hidden = true;
            active = -1;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
        };

        const render = () => {
            const query = input.value.trim();
            if (!query) {
                hide();
                return;
            }

            const results = searchTitles(query).slice(0, 6);
            const allLink = `<a class="cv-search-all" href="${pageUrl('pages/search.html', { q: query })}">See all results for “${escapeHtml(query)}”</a>`;

            panel.innerHTML = results.length
                ? results.map((title, index) => `
                    <button type="button" class="cv-search-item" role="option" id="cv-search-option-${index}" aria-selected="false" data-open="${title.id}">
                        <span class="cv-search-thumb" data-placeholder="${escapeHtml(title.title)}">${posterImg(title)}</span>
                        <span class="cv-search-text">
                            <span class="cv-search-title">${highlight(title.title, query)}</span>
                            <span class="cv-search-meta">${title.year} · ${typeLabel(title)} · ★ ${rating(title)}</span>
                        </span>
                    </button>`).join('') + allLink
                : `<p class="cv-search-empty">No titles match “${escapeHtml(query)}”.</p>${allLink}`;

            active = -1;
            panel.hidden = false;
            input.setAttribute('aria-expanded', 'true');
            checkBrokenImages(panel);
        };

        const renderSoon = debounce(render, 120);

        input.addEventListener('input', renderSoon);
        input.addEventListener('focus', () => {
            closeMenus();
            if (input.value.trim()) render();
        });

        input.addEventListener('keydown', event => {
            const items = $$('.cv-search-item', panel);

            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                if (panel.hidden) render();
                const options = $$('.cv-search-item', panel);
                if (!options.length) return;
                event.preventDefault();
                active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
                options.forEach((option, index) => option.setAttribute('aria-selected', String(index === active)));
                input.setAttribute('aria-activedescendant', options[active].id);
                options[active].scrollIntoView({ block: 'nearest' });
            } else if (event.key === 'Enter' && active >= 0 && items[active]) {
                event.preventDefault();
                const id = items[active].dataset.open;
                hide();
                openDetails(id, { trigger: input });
            } else if (event.key === 'Escape' && (!panel.hidden || input.value)) {
                event.stopPropagation();
                if (!panel.hidden) hide();
                else input.value = '';
            }
        });

        form.addEventListener('submit', event => {
            if (!input.value.trim()) {
                event.preventDefault();
                input.focus();
            }
        });

        document.addEventListener('click', event => {
            if (!form.contains(event.target)) hide();
        });

        closeSearchPanel = hide;
    }

    // =========================================
    // NEWSLETTER & FORMS
    // =========================================

    async function submitToEndpoint(payload) {
        const endpoint = String(CONFIG.formEndpoint || '').trim();
        if (!endpoint) return true; // No backend configured: kept in this browser.

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ ...payload, page: location.pathname, sentAt: new Date().toISOString() })
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    function setStatus(element, message, kind = '') {
        if (!element) return;
        element.textContent = message;
        element.classList.toggle('is-error', kind === 'error');
        element.classList.toggle('is-success', kind === 'success');
    }

    function initNewsletter() {
        $$('.newsletter-form').forEach(form => {
            const input = $('input[type="email"]', form);
            const button = $('button[type="submit"]', form);
            const status = form.parentElement.querySelector('.newsletter-status');
            if (!input || !button) return;

            input.addEventListener('input', () => {
                input.removeAttribute('aria-invalid');
                setStatus(status, '');
            });

            form.addEventListener('submit', async event => {
                event.preventDefault();
                const email = input.value.trim().toLowerCase();

                if (!isValidEmail(email)) {
                    input.setAttribute('aria-invalid', 'true');
                    setStatus(status, 'Please enter a valid email address, like name@example.com.', 'error');
                    input.focus();
                    return;
                }

                const subscribers = store.get(KEYS.newsletter, []);
                if (subscribers.includes(email)) {
                    setStatus(status, `${email} is already subscribed. You're all set!`, 'success');
                    form.reset();
                    return;
                }

                const label = button.textContent;
                button.disabled = true;
                button.textContent = 'Subscribing…';

                const sent = await submitToEndpoint({ type: 'newsletter', email });

                button.disabled = false;
                button.textContent = label;

                if (!sent) {
                    setStatus(status, "We couldn't reach the server. Please try again in a moment.", 'error');
                    return;
                }

                subscribers.push(email);
                store.set(KEYS.newsletter, subscribers);
                setStatus(status, `Thanks for subscribing! Updates will go to ${email}.`, 'success');
                form.reset();
            });
        });
    }

    // =========================================
    // HOMEPAGE
    // =========================================

    function personalRow(id, heading, action, cards) {
        return `
            <section class="trending-section cv-personal-section" id="${id}" aria-labelledby="${id}-title">
                <div class="section-header">
                    <div class="section-title">
                        <span class="title-accent"></span>
                        <h2 id="${id}-title">${heading}</h2>
                    </div>
                    ${action}
                </div>
                <div class="movie-category">
                    <div class="movie-grid">${cards}</div>
                </div>
            </section>`;
    }

    function continueCard({ title, time, duration }) {
        const percent = Math.min(100, Math.max(2, Math.round((time / duration) * 100)));
        const minutesLeft = Math.max(1, Math.round((duration - time) / 60));

        return `
            <div class="movie-card cv-continue-card" data-watch="${title.id}" role="button" tabindex="0" aria-label="Resume ${escapeHtml(title.title)}, ${minutesLeft} minutes left">
                <div class="movie-image" data-placeholder="${escapeHtml(title.title)}">
                    ${posterImg(title)}
                    <span class="cv-play-overlay" aria-hidden="true">${ICONS.play}</span>
                    <button class="cv-list-toggle cv-remove-progress" type="button" data-remove-progress="${title.id}" aria-label="Remove ${escapeHtml(title.title)} from Continue Watching" title="Remove from row">${ICONS.close}</button>
                    <span class="cv-progress" aria-hidden="true"><span style="width: ${percent}%"></span></span>
                </div>
                <div class="movie-card-content">
                    <h4>${escapeHtml(title.title)}</h4>
                    <span class="cv-time-left">${minutesLeft}m left</span>
                </div>
            </div>`;
    }

    function renderPersonalRows() {
        const container = $('#cv-personal-rows');
        if (!container) return;

        const watching = getContinueWatching().slice(0, 6);
        const recent = getRecent().slice(0, 6);

        container.innerHTML = [
            watching.length
                ? personalRow('continue-watching', 'Continue Watching', '', watching.map(continueCard).join(''))
                : '',
            recent.length
                ? personalRow('recently-viewed', 'Recently Viewed',
                    '<button type="button" class="view-all cv-link-btn" data-clear-recent>Clear history</button>',
                    recent.map(id => rowCard(BY_ID.get(id))).join(''))
                : ''
        ].join('');

        $$('#recently-viewed .movie-card', container).forEach(enhanceRowCard);
        syncListUI();
        checkBrokenImages(container);
    }

    // With a database connected, the homepage rows follow the rows you arrange
    // on the admin page (the cards written in index.html are the fallback).
    const HOME_ROWS = [
        { id: 'trending', badge: (title, index) => (index === 0 ? 'Trending' : '') },
        { id: 'free', badge: title => (title.watch ? 'Free' : '') },
        { id: 'popular', badge: () => '' },
        { id: 'top-rated', badge: () => '' }
    ];

    function renderHomeRows() {
        if (DATA.source !== 'database') return;

        HOME_ROWS.forEach(row => {
            const section = document.getElementById(row.id);
            const grid = section && $('.movie-grid', section);
            if (!grid) return;

            const collection = DATA.collections?.[row.id];
            const titles = (collection?.ids || []).map(id => BY_ID.get(id)).filter(Boolean).slice(0, 6);
            section.hidden = !titles.length;
            if (!titles.length) return;

            const heading = $('.section-title h2', section);
            if (heading && collection.name) heading.textContent = collection.name;

            grid.innerHTML = titles.map((title, index) => rowCard(title, row.badge(title, index))).join('');
        });

        checkBrokenImages(document);
    }

    function initHome() {
        renderHomeRows();
        $$('.movie-card[data-open]').forEach(enhanceRowCard);
        renderPersonalRows();

        document.addEventListener('click', event => {
            if (!event.target.closest('[data-clear-recent]')) return;
            store.set(KEYS.recent, []);
            renderPersonalRows();
            toast('Viewing history cleared');
        });
    }

    // =========================================
    // MOVIES & SERIES BROWSE PAGES
    // =========================================

    function initBrowse(type) {
        const grid = $('[data-browse-grid]');
        if (!grid) return;

        const pool = (type === 'series' ? DATA.series : DATA.movies) || [];
        const collections = type === 'movie' ? (DATA.collections || {}) : {};
        const nouns = type === 'series' ? ['series', 'series'] : ['movie', 'movies'];
        const allLabel = type === 'series' ? 'All Series' : 'All Movies';

        const chipsWrap = $('[data-genre-filters]');
        const sortSelect = $('[data-sort]');
        const searchInput = $('[data-page-search]');
        const titleElement = $('[data-results-title]');
        const countElement = $('[data-results-count]');
        const activeFilters = $('[data-active-filters]');

        const params = new URLSearchParams(location.search);
        const allGenres = [...new Set(pool.flatMap(title => title.genres))];
        const matchGenre = value => value ? allGenres.find(genre => normalize(genre) === normalize(value)) : null;

        const state = {
            collection: collections[params.get('collection')] ? params.get('collection') : '',
            genre: matchGenre(params.get('genre')) || 'All',
            q: (params.get('q') || '').trim(),
            sort: ''
        };

        const defaultSort = () => state.collection ? 'featured' : 'popular';
        const validSorts = ['featured', 'popular', 'rating', 'newest', 'az'];
        state.sort = validSorts.includes(params.get('sort')) ? params.get('sort') : defaultSort();
        if (state.sort === 'featured' && !state.collection) state.sort = 'popular';

        // Genre chips
        const genres = CURATED_GENRES[type].filter(genre => allGenres.includes(genre));
        if (state.genre !== 'All' && !genres.includes(state.genre)) genres.push(state.genre);

        chipsWrap.innerHTML = [`<button class="filter-btn" type="button" data-genre="All">${allLabel}</button>`]
            .concat(genres.map(genre => `<button class="filter-btn" type="button" data-genre="${escapeHtml(genre)}">${escapeHtml(genre)}</button>`))
            .join('');

        chipsWrap.addEventListener('click', event => {
            const chip = event.target.closest('[data-genre]');
            if (!chip) return;
            state.genre = chip.dataset.genre;
            update();
        });

        // Sort
        const featuredOption = () => $('option[value="featured"]', sortSelect);
        function syncSortOptions() {
            if (!sortSelect) return;
            if (state.collection && !featuredOption()) {
                sortSelect.insertAdjacentHTML('afterbegin', '<option value="featured">Featured</option>');
            } else if (!state.collection && featuredOption()) {
                featuredOption().remove();
            }
        }

        sortSelect?.addEventListener('change', () => {
            state.sort = sortSelect.value;
            update();
        });

        // Search box
        if (searchInput) {
            searchInput.value = state.q;
            const onSearch = debounce(() => {
                state.q = searchInput.value.trim();
                update();
            }, 150);
            searchInput.addEventListener('input', onSearch);
            searchInput.addEventListener('keydown', event => {
                if (event.key === 'Escape' && searchInput.value) {
                    event.stopPropagation();
                    searchInput.value = '';
                    state.q = '';
                    update();
                }
            });
            searchInput.closest('form')?.addEventListener('submit', event => {
                event.preventDefault();
                state.q = searchInput.value.trim();
                update();
                grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        // Active filter pills & reset
        document.addEventListener('click', event => {
            const remove = event.target.closest('[data-remove-filter]');
            if (remove) {
                const key = remove.dataset.removeFilter;
                if (key === 'q') {
                    state.q = '';
                    if (searchInput) searchInput.value = '';
                }
                if (key === 'collection') {
                    state.collection = '';
                    if (state.sort === 'featured') state.sort = 'popular';
                }
                if (key === 'genre') state.genre = 'All';
                update();
                return;
            }

            if (event.target.closest('[data-reset-filters]')) {
                state.collection = '';
                state.genre = 'All';
                state.q = '';
                state.sort = 'popular';
                if (searchInput) searchInput.value = '';
                update();
            }
        });

        function heading() {
            if (state.q) return `Results for “${state.q}”`;
            const base = state.collection ? collections[state.collection].name : allLabel;
            if (state.genre === 'All') return base;
            return state.collection ? `${state.genre} · ${base}` : `${state.genre} ${type === 'series' ? 'Series' : 'Movies'}`;
        }

        function syncUrl() {
            try {
                const url = new URL(location.href);
                ['collection', 'genre', 'q', 'sort'].forEach(key => url.searchParams.delete(key));
                if (state.collection) url.searchParams.set('collection', state.collection);
                if (state.genre !== 'All') url.searchParams.set('genre', state.genre);
                if (state.q) url.searchParams.set('q', state.q);
                if (state.sort !== defaultSort()) url.searchParams.set('sort', state.sort);
                history.replaceState(history.state, '', url);
            } catch { /* file:// */ }
        }

        function update() {
            let items = state.collection
                ? collections[state.collection].ids.map(id => BY_ID.get(id)).filter(title => title && title.type === type)
                : pool.slice();

            if (state.genre !== 'All') items = items.filter(title => title.genres.includes(state.genre));
            if (state.q) items = searchTitles(state.q, items);
            if (state.sort !== 'featured') items = sortTitles(items, state.sort);

            grid.innerHTML = items.length
                ? items.map(browseCard).join('')
                : `
                    <div class="cv-empty">
                        <h3>No ${nouns[1]} found</h3>
                        <p>Try a different title, actor or genre, or clear your filters to see everything.</p>
                        <button class="cv-btn cv-btn-primary" type="button" data-reset-filters>Clear filters</button>
                    </div>`;

            $$('[data-genre]', chipsWrap).forEach(chip => {
                const on = chip.dataset.genre === state.genre;
                chip.classList.toggle('active', on);
                chip.setAttribute('aria-pressed', String(on));
            });

            syncSortOptions();
            if (sortSelect) sortSelect.value = state.sort;

            titleElement.textContent = heading();
            countElement.textContent = `${items.length} ${items.length === 1 ? nouns[0] : nouns[1]}`;

            if (activeFilters) {
                const pills = [];
                if (state.collection) pills.push(['collection', collections[state.collection].name]);
                if (state.genre !== 'All') pills.push(['genre', state.genre]);
                if (state.q) pills.push(['q', `“${state.q}”`]);
                activeFilters.innerHTML = pills.map(([key, label]) =>
                    `<button type="button" class="cv-filter-pill" data-remove-filter="${key}" aria-label="Remove filter ${escapeHtml(label)}">${escapeHtml(label)} ${ICONS.close}</button>`).join('');
                activeFilters.hidden = !pills.length;
            }

            syncListUI();
            checkBrokenImages(grid);
            syncUrl();
        }

        update();
    }

    // =========================================
    // MY LIST PAGE
    // =========================================

    function initMyList() {
        const grid = $('[data-mylist-grid]');
        if (!grid) return;

        const countElement = $('[data-results-count]');
        const tabs = $('[data-type-filters]');
        const sortSelect = $('[data-sort]');
        const clearButton = $('[data-clear-list]');
        const state = { type: 'all', sort: 'recent' };

        tabs?.addEventListener('click', event => {
            const tab = event.target.closest('[data-type]');
            if (!tab) return;
            state.type = tab.dataset.type;
            render();
        });

        sortSelect?.addEventListener('change', () => {
            state.sort = sortSelect.value;
            render();
        });

        clearButton?.addEventListener('click', () => {
            if (!window.confirm('Remove every title from My List?')) return;
            store.set(KEYS.list, []);
            syncListUI();
            render();
            toast('My List cleared');
        });

        function render() {
            const saved = getList();
            let items = saved.map(item => ({ title: BY_ID.get(item.id), savedAt: item.savedAt || 0 }));

            if (state.type !== 'all') items = items.filter(item => item.title.type === state.type);

            if (state.sort === 'az') items.sort((a, b) => a.title.title.localeCompare(b.title.title));
            else if (state.sort === 'rating') items.sort((a, b) => b.title.rating - a.title.rating);
            else items.sort((a, b) => b.savedAt - a.savedAt);

            if (items.length) {
                grid.innerHTML = items.map(item => browseCard(item.title)).join('');
            } else if (!saved.length) {
                grid.innerHTML = `
                    <div class="cv-empty">
                        <h3>Your list is empty</h3>
                        <p>Tap the ＋ button on any movie or series to save it here and watch it later.</p>
                        <div class="cv-empty-actions">
                            <a class="cv-btn cv-btn-primary" href="${pageUrl('pages/movies.html')}">Browse Movies</a>
                            <a class="cv-btn cv-btn-ghost" href="${pageUrl('pages/series.html')}">Browse Series</a>
                        </div>
                    </div>`;
            } else {
                grid.innerHTML = `
                    <div class="cv-empty">
                        <h3>No saved ${state.type === 'series' ? 'series' : 'movies'} yet</h3>
                        <p>Switch to “All” to see everything in your list.</p>
                    </div>`;
            }

            $$('[data-type]', tabs).forEach(tab => {
                const on = tab.dataset.type === state.type;
                tab.classList.toggle('active', on);
                tab.setAttribute('aria-pressed', String(on));
            });

            countElement.textContent = `${items.length} ${items.length === 1 ? 'title' : 'titles'}`;
            if (clearButton) clearButton.hidden = !saved.length;

            syncListUI();
            checkBrokenImages(grid);
        }

        document.addEventListener('cv:listchange', render);
        render();
    }

    // =========================================
    // SEARCH RESULTS PAGE
    // =========================================

    function initSearchPage() {
        const input = $('[data-page-search]');
        const results = $('[data-search-results]');
        if (!input || !results) return;

        input.value = new URLSearchParams(location.search).get('q') || '';

        const section = (label, items) => !items.length ? '' : `
            <section class="cv-search-section" aria-label="${label}">
                <div class="movies-section-header">
                    <div class="movies-section-title">
                        <span class="movies-title-accent"></span>
                        <h2>${label}</h2>
                    </div>
                    <p>${items.length} ${items.length === 1 ? 'result' : 'results'}</p>
                </div>
                <div class="movies-grid">${items.map(browseCard).join('')}</div>
            </section>`;

        const suggestions = ['Christopher Nolan', 'Sci-Fi', 'Batman', 'Leonardo DiCaprio', 'Netflix', 'Horror'];

        function render() {
            const query = input.value.trim();

            try {
                const url = new URL(location.href);
                if (query) url.searchParams.set('q', query);
                else url.searchParams.delete('q');
                history.replaceState(history.state, '', url);
            } catch { /* file:// */ }

            document.title = query ? `Search: ${query} | CineVerse` : BASE_TITLE;

            if (!query) {
                results.innerHTML = `
                    <div class="cv-search-start">
                        <h2>Popular searches</h2>
                        <div class="cv-suggestions">
                            ${suggestions.map(term => `<button type="button" class="filter-btn" data-suggest="${escapeHtml(term)}">${escapeHtml(term)}</button>`).join('')}
                        </div>
                    </div>
                    ${section('Trending now', sortTitles(ALL, 'popular').slice(0, 12))}`;
            } else {
                const found = searchTitles(query);
                results.innerHTML = found.length
                    ? section('Movies', found.filter(title => title.type === 'movie')) + section('Series', found.filter(title => title.type === 'series'))
                    : `
                        <div class="cv-empty">
                            <h3>No results for “${escapeHtml(query)}”</h3>
                            <p>Check the spelling, or search by actor, director, genre or year.</p>
                            <div class="cv-suggestions">
                                ${suggestions.map(term => `<button type="button" class="filter-btn" data-suggest="${escapeHtml(term)}">${escapeHtml(term)}</button>`).join('')}
                            </div>
                        </div>`;
            }

            syncListUI();
            checkBrokenImages(results);
        }

        input.addEventListener('input', debounce(render, 150));
        input.closest('form')?.addEventListener('submit', event => {
            event.preventDefault();
            render();
        });

        results.addEventListener('click', event => {
            const suggestion = event.target.closest('[data-suggest]');
            if (!suggestion) return;
            input.value = suggestion.dataset.suggest;
            render();
            input.focus();
        });

        render();
    }

    // =========================================
    // HELP CENTER
    // =========================================

    function initHelp() {
        const input = $('[data-faq-search]');
        const items = $$('.cv-faq-item');
        const empty = $('[data-faq-empty]');

        input?.addEventListener('input', () => {
            const query = normalize(input.value);
            let shown = 0;

            items.forEach(item => {
                const match = !query || normalize(item.textContent).includes(query);
                item.hidden = !match;
                item.open = Boolean(query && match);
                if (match) shown++;
            });

            if (empty) empty.hidden = shown > 0;
        });

        input?.closest('form')?.addEventListener('submit', event => event.preventDefault());
    }

    // =========================================
    // CONTACT PAGE
    // =========================================

    function initContact() {
        const form = $('[data-contact-form]');
        if (!form) return;

        const success = $('[data-contact-success]');
        const status = $('[data-contact-status]', form);
        const fields = {
            name: $('#contact-name', form),
            email: $('#contact-email', form),
            topic: $('#contact-topic', form),
            message: $('#contact-message', form)
        };
        const counter = $('[data-char-count]', form);

        const topic = new URLSearchParams(location.search).get('topic');
        if (topic && $$('option', fields.topic).some(option => option.value === topic)) fields.topic.value = topic;

        fields.message.addEventListener('input', () => {
            if (counter) counter.textContent = `${fields.message.value.length} / ${fields.message.maxLength}`;
        });

        Object.values(fields).forEach(field => field.addEventListener('input', () => {
            field.removeAttribute('aria-invalid');
            const error = $(`#${field.id}-error`);
            if (error) error.textContent = '';
        }));

        form.addEventListener('submit', async event => {
            event.preventDefault();
            let firstInvalid = null;

            const check = (field, message) => {
                const error = $(`#${field.id}-error`);
                field.setAttribute('aria-invalid', message ? 'true' : 'false');
                if (error) error.textContent = message || '';
                if (message && !firstInvalid) firstInvalid = field;
            };

            check(fields.name, fields.name.value.trim().length >= 2 ? '' : 'Please tell us your name.');
            check(fields.email, isValidEmail(fields.email.value.trim()) ? '' : 'Please enter a valid email address.');
            check(fields.topic, fields.topic.value ? '' : 'Please choose a topic.');
            check(fields.message, fields.message.value.trim().length >= 10 ? '' : 'Please write at least 10 characters.');

            if (firstInvalid) {
                firstInvalid.focus();
                return;
            }

            const payload = {
                type: 'contact',
                name: fields.name.value.trim(),
                email: fields.email.value.trim(),
                topic: fields.topic.value,
                message: fields.message.value.trim()
            };

            const button = $('button[type="submit"]', form);
            const label = button.textContent;
            button.disabled = true;
            button.textContent = 'Sending…';
            setStatus(status, '');

            const sent = await submitToEndpoint(payload);

            button.disabled = false;
            button.textContent = label;

            if (!sent) {
                setStatus(status, "We couldn't send your message. Please check your connection and try again.", 'error');
                return;
            }

            const reference = `CV-${Date.now().toString(36).toUpperCase().slice(-6)}`;
            const messages = store.get(KEYS.messages, []);
            messages.unshift({ ...payload, reference, sentAt: Date.now() });
            store.set(KEYS.messages, messages.slice(0, 20));

            $('[data-contact-ref]', success).textContent = reference;
            $('[data-contact-email]', success).textContent = payload.email;
            form.hidden = true;
            success.hidden = false;
            success.focus();
        });

        $('[data-contact-again]')?.addEventListener('click', () => {
            form.reset();
            if (counter) counter.textContent = `0 / ${fields.message.maxLength}`;
            success.hidden = true;
            form.hidden = false;
            fields.name.focus();
        });
    }

    // =========================================
    // START
    // =========================================

    function init() {
        initHeader();
        initNewsletter();

        $$('[data-year]').forEach(element => {
            element.textContent = new Date().getFullYear();
        });

        $$('[data-social]').forEach(link => {
            const url = CONFIG.social?.[link.dataset.social];
            if (url) link.href = url;
        });

        $$('.search-shortcut').forEach(element => {
            element.textContent = IS_MAC ? '⌘ K' : 'Ctrl K';
        });

        if (PAGE === 'home') initHome();
        if (PAGE === 'movies') initBrowse('movie');
        if (PAGE === 'series') initBrowse('series');
        if (PAGE === 'my-list') initMyList();
        if (PAGE === 'search') initSearchPage();
        if (PAGE === 'help') initHelp();
        if (PAGE === 'contact') initContact();

        syncListUI();
        checkBrokenImages(document);

        const deepLink = new URLSearchParams(location.search).get('title');
        if (deepLink && BY_ID.has(deepLink)) openDetails(deepLink, { push: false });

        // Keep several open tabs in sync.
        window.addEventListener('storage', event => {
            if (event.key === KEYS.list) {
                syncListUI();
                document.dispatchEvent(new CustomEvent('cv:listchange'));
            }
            if (event.key === KEYS.profile) updateAvatar();
        });
    }

    init();
})();
