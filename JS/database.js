/* =========================================
   CINEVERSE — DATABASE LOADER
   When a Supabase database is connected (CINEVERSE_CONFIG.database in
   JS/data.js), the titles and homepage rows come from the database instead
   of data.js. The admin page (admin/) is where you add and edit them.

   If the database can't be reached, the last copy this browser received is
   used, and failing that the titles in data.js — so the site never shows
   up empty.
========================================= */

(() => {
    'use strict';

    const config = (window.CINEVERSE_CONFIG || {}).database || {};
    const url = String(config.url || '').trim().replace(/\/+$/, '');
    const key = String(config.key || '').trim();
    const CACHE_KEY = 'cineverse-db-cache';

    if (!url || !key) {
        window.CINEVERSE_READY = Promise.resolve('file');
        return;
    }

    const readCache = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            return saved && saved.url === url && Array.isArray(saved.titles) ? saved : null;
        } catch {
            return null;
        }
    };

    const writeCache = payload => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
        } catch { /* storage full or blocked */ }
    };

    const get = path => fetch(`${url}/rest/v1/${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
        cache: 'no-store'
    }).then(response => {
        if (!response.ok) throw new Error(`Database answered ${response.status}`);
        return response.json();
    });

    // Turn database rows into the same shape as data.js.
    function apply(payload) {
        const titles = (payload.titles || [])
            .map(row => ({ ...(row.data || {}), id: row.id }))
            .filter(title => title.title && (title.type === 'movie' || title.type === 'series'));

        // An empty database (not imported yet) keeps the data.js titles.
        if (!titles.length) return false;

        const data = window.CINEVERSE_DATA || (window.CINEVERSE_DATA = { notifications: [] });
        data.movies = titles.filter(title => title.type === 'movie');
        data.series = titles.filter(title => title.type === 'series');

        if (Array.isArray(payload.collections) && payload.collections.length) {
            data.collections = Object.fromEntries(payload.collections.map(row => [
                row.id,
                { name: row.name, ids: Array.isArray(row.title_ids) ? row.title_ids : [] }
            ]));
        }

        data.source = 'database';
        return true;
    }

    const cached = readCache();

    const fresh = Promise.all([
        get('titles?select=id,data&published=eq.true&order=created_at.asc'),
        get('collections?select=id,name,title_ids,position&order=position.asc')
    ]).then(([titles, collections]) => {
        const payload = { url, titles, collections, savedAt: Date.now() };
        writeCache(payload);
        return payload;
    });

    window.CINEVERSE_READY = new Promise(resolve => {
        let settled = false;
        const finish = (payload, source) => {
            if (settled) return;
            settled = true;
            resolve(payload && apply(payload) ? source : 'file');
        };

        fresh
            .then(payload => finish(payload, 'database'))
            .catch(error => {
                console.warn('CineVerse: could not reach the database, using saved titles.', error);
                finish(cached, 'cache');
            });

        // Slow connection: show the saved copy instead of waiting.
        if (cached) setTimeout(() => finish(cached, 'cache'), 1500);
        setTimeout(() => finish(cached, 'cache'), 6000);
    });
})();
