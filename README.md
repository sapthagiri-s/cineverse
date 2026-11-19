# CineVerse

A movie and series discovery website built with plain HTML, CSS and JavaScript (no build step).

## Run it

Open the `CineVerse` folder in VS Code and start **Live Server** on `index.html`
(or upload the folder to any static host such as Netlify, Vercel or GitHub Pages).
All paths are relative, so it works from any folder or sub-folder.

> Opening `index.html` by double-clicking (a `file://` address) also works, but YouTube
> trailers only play when the site is served over `http://` or `https://`.

## What's where

| Path | What it does |
| --- | --- |
| `index.html` | Homepage: hero, Trending / Popular / Top Rated rows, genres |
| `pages/movies.html` | Browse all movies: genre filters, sort, search |
| `pages/series.html` | Browse all series |
| `pages/my-list.html` | The visitor's saved titles |
| `pages/search.html` | Search results across movies and series |
| `pages/help.html`, `contact.html`, `privacy.html`, `terms.html` | Support and legal pages |
| `JS/data.js` | **All titles, ratings, trailers, notifications and site settings** |
| `JS/cineverse.js` | Every interaction (search, details pop-up, the CineVerse video player, My List, menus, forms) |
| `CSS/components.css` | Styles for pop-ups, the video player, forms and the new pages |
| `Videos/beyond-the-universe-teaser*.mp4` | Teaser played by the hero's **Watch Now** button, in 720p, 480p and 360p |
| `Videos/subtitles/` | Subtitle files for the teaser (English captions, Hindi, Tamil) |
| `admin/` | The admin page: sign in and add, edit or hide titles (needs the database, see below) |
| `JS/admin.js`, `CSS/admin.css` | The admin page's code and styles |
| `JS/database.js` | Loads titles and homepage rows from the database when one is connected |
| `database/setup.sql` | Creates the database tables and security rules (run once in Supabase) |

## Add a movie or series

**Easiest:** connect the free database and use the admin page — no code
(see [Database & admin page](#database--admin-page)).

**Without a database:** add one object to the `movies` (or `series`) list in `JS/data.js`:

```js
{
    id: 'the-matrix',              // unique, lowercase, no spaces
    type: 'movie',
    title: 'The Matrix',
    year: 1999,
    runtime: 136,                  // minutes (series use `seasons: 3` instead)
    certification: 'R',
    rating: 8.7,
    genres: ['Sci-Fi', 'Action'],
    popularity: 80,                // higher = earlier in "Most Popular"
    overview: 'A hacker learns the truth about his reality.',
    director: 'The Wachowskis',
    cast: ['Keanu Reeves', 'Laurence Fishburne'],
    poster: 'Images/posters/the-matrix.jpg',
    trailer: 'YOUTUBE_VIDEO_ID'    // the part after watch?v= in a YouTube link,
                                   // or your own file: 'Videos/the-matrix-trailer.mp4'
}
```

It then appears in search, the Movies page, genre filters, "More Like This" and My List.
To show it in a homepage row, add a card in `index.html` with `data-open="the-matrix"`,
and add its id to the matching list in `collections` so "View All" includes it.

## Database & admin page

Instead of editing `JS/data.js`, you can keep your titles in a free **Supabase** database and
manage them from a private page at **`/admin/`** on your site. There you sign in and add, edit,
hide or delete titles, upload posters, backdrops and subtitle files, and choose which titles
appear in each homepage row. Changes show on the website as soon as you save — nothing to
re-upload.

Until a database is connected, the site works exactly as before, using the titles in `JS/data.js`.

### One-time setup (about 10 minutes)

1. **Create a project.** Sign up at [supabase.com](https://supabase.com) and create a new project.
   Pick the region closest to your visitors (for visitors in India, Mumbai). Keep the database
   password somewhere safe; the website doesn't need it.
2. **Create the tables.** In the project open **SQL Editor**, paste everything from
   `database/setup.sql` and press **Run**. This creates the `titles`, `collections` (homepage rows)
   and `admins` tables, the security rules, and a `media` storage bucket for pictures and subtitle
   files. Running it again is safe.
3. **Create your login.** Go to **Authentication → Users → Add user → Create new user**, enter
   your email and a strong password, tick **Auto Confirm User** and create it. Then go to
   **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up", so
   nobody else can make an account.
4. **Make yourself an admin.** At the bottom of `database/setup.sql` (step 6), change
   `you@example.com` to the email from step 3 and run it again in the SQL Editor (the whole file or
   just that last statement). If you forget, the admin page tells you and shows the exact line to run.
5. **Connect the website.** Press **Connect** at the top of your Supabase project (the same values
   are under **Settings → API Keys**). Copy the **Project URL** and the **Publishable key** (it starts
   with `sb_publishable_`) into the top of `JS/data.js`:

   ```js
   database: {
       url: 'https://abcdefghijklmnop.supabase.co',
       key: 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxx'
   },
   ```

   Older projects may show an **anon public** key instead; that works too. **Never** paste the
   **secret** key (`sb_secret_…`) or the **service_role** key here: `data.js` is public, and those
   keys skip every security rule.
6. **Upload the site** to your host as usual, including the `admin/` folder. The `database/` folder
   is only needed for step 2 (uploading it does no harm).
7. **Import your titles.** Open `https://your-site/admin/`, sign in, and press **Import … titles**
   (shown while the database is empty). It copies every movie, series and homepage row from
   `data.js` into the database. From then on, the website reads from the database.

### Using the admin page

- **Titles** lists everything, with search and **All / Movies / Series / Hidden** filters.
  **+ Add title** opens an empty form, **Edit** opens a title, **View** opens it on the website.
- The form has five parts:
  - **Basics**: title, web address (the `?title=` part of links, fixed once saved), type, year,
    age rating, length or seasons, rating, genres, story, cast and so on.
  - **Pictures**: poster and backdrop. Paste a link, or press **Upload** (JPG, PNG, WebP, AVIF or
    GIF, up to 10 MB).
  - **Trailer**: a YouTube link, a link to your own video file, or **Several qualities** (one link
    per quality, see [Video quality](#video-quality-auto-1080p-720p)), plus subtitle files.
  - **Full movie**: the video for **Watch Now**, its subtitle files and a credit line.
  - **On the website**: **Visible to visitors** (switch off to hide a title without deleting it),
    **CineVerse Original**, and the homepage rows it appears in.
- **Homepage rows**: reorder titles with ↑ ↓, remove them with ✕, add one with the menu under each
  row, and rename the row. The homepage shows the first six titles of each row; **View All** shows
  the whole row.
- **Delete** (at the bottom of a title's form) removes it for good. Hide it instead if you might
  want it back.

### Where things are stored

| What | Where |
| --- | --- |
| Titles and homepage rows | The database |
| Posters, backdrops, subtitle files you **upload** | Supabase Storage (the `media` bucket) |
| Video files (trailers and full movies) | **Not** the database: a video host or CDN (Bunny Stream, Cloudflare Stream, Vimeo, your own server). Paste the link in the form |

The free Supabase plan includes 500 MB of database space, 1 GB of file storage and 5 GB of
downloads a month: plenty for titles, pictures and subtitles, but not for video. That's why the
`media` bucket only accepts pictures and `.vtt` subtitle files up to 10 MB.

### How the website uses it

- Every page loads the visible titles and homepage rows from the database.
- Each browser keeps a copy of the last titles it received. If the database is slow (over
  1.5 seconds) that copy is shown; if the database can't be reached at all and there's no copy,
  the site falls back to the titles in `data.js`. Keep `data.js` as it is as a backup; you don't
  need to update it.
- Free Supabase projects are **paused after a week with too little activity**. A site with regular
  visitors stays active. If yours does get paused, Supabase emails you; open the project and press
  **Resume project**. Until then the site shows the saved copy or the `data.js` titles, and the admin
  page can't save.

### Security

- The publishable key is meant to be public. The security rules in `setup.sql` decide what it can
  do: visitors can only **read** visible titles and homepage rows; only the emails in the `admins`
  table can add, change or delete anything, or upload files.
- Use a strong password for your admin login, and keep "Allow new users to sign up" turned off.
- The admin page is hidden from search engines (`noindex`), but anyone who opens `/admin/` only
  sees a sign-in form.
- To add another admin: create their login (step 3) and run step 6 with their email.

## The video player

Everything plays in the **CineVerse player**: your own controls in CineVerse purple
(play/pause, back and forward 10 seconds, seek bar with time preview, volume, subtitles,
video quality, speed, full screen). The controls hide while the video plays and come back
when the mouse moves or the screen is tapped. Volume, subtitle language and quality are
remembered for next time.

- **Subtitles button** (next to the gear) appears when a video has subtitle files.
- **Gear button** opens the **Quality** menu (Auto, 1080p, 720p, 480p…) when a video comes in
  more than one quality. An **HD** badge shows when it's playing in 720p or better.

Open the *Beyond the Universe* teaser to try both: it has three qualities and subtitles in
English (captions), Hindi and Tamil.

| Key | What it does |
| --- | --- |
| Space or K | Play / pause |
| ← or J / → or L | Back / forward 10 seconds |
| ↑ / ↓ | Volume up / down |
| M | Mute |
| F (or double-click) | Full screen |
| C | Subtitles on / off |
| Esc | Close the player |

On phones: tap to show or hide the controls, double-tap the left or right side to skip 10 seconds.
Full screen turns the phone sideways.

## Trailers: YouTube or your own video files

A trailer can come from two places, and they look different:

**1. A YouTube video ID** (what the site uses now), for example `trailer: 'Way9Dexny3w'`.
The trailer plays inside YouTube's official player, driven by the CineVerse controls, which
sit under the picture. YouTube's own buttons, end-screen suggestions and annotations are
switched off, but **YouTube's logo and the video title inside the picture stay visible**.
YouTube's rules don't allow sites to hide or cover them, and the old embed settings that did
(`modestbranding`, `showinfo`) no longer work. If a studio blocks its trailer from other
websites, CineVerse shows its own message with a link to watch it on YouTube.

**2. Your own video file**, for example `trailer: 'Videos/dune-part-two-trailer.mp4'`
(or a CDN link, or an `.m3u8` HLS stream). The trailer then plays in the CineVerse player
with **no YouTube branding at all**. This is how Netflix and Hotstar do it: they host
their own video files.

Only host trailers you have the right to use: your own trailers, or files a studio or
distributor has given you permission to use (for example from their press kit). Don't
download trailers from YouTube; that breaks YouTube's terms and the studio's copyright.

Video tips: MP4 with H.264 video and AAC audio plays in every browser. To convert a file with
[ffmpeg](https://ffmpeg.org):

```
ffmpeg -i trailer.mov -c:v libx264 -crf 22 -preset slow -c:a aac -b:a 160k -movflags +faststart trailer.mp4
```

`+faststart` lets the video start before it has fully downloaded.

## Add a full movie (not just a trailer)

Only add full movies you have the right to show: your own films, films you've licensed,
open-licence films (like the Blender Foundation films already in **Free to Watch**) or
public-domain classics. Studio films such as Dune or Oppenheimer can't be streamed without a
licence from the studio, so for those the site shows a **Where to Watch** button that lists the
streaming services that carry them.

Add a `watch` line to the title in `JS/data.js`:

```js
watch: 'Videos/my-film.mp4'                         // a video file in the Videos folder
watch: 'https://cdn.example.com/my-film.mp4'        // a video file on a CDN
watch: 'https://cdn.example.com/my-film/master.m3u8' // an HLS stream (Bunny Stream, Mux, Cloudflare Stream)
watch: 'youtube:VIDEO_ID'                           // a full film on YouTube
watch: 'vimeo:VIDEO_ID'                             // a full film on Vimeo
watch: 'embed:https://player-link'                  // any embeddable player page
```

The title then gets a **Watch Now** button, a **Free** badge and a **Continue Watching** row
that remembers where each visitor stopped. Video files and HLS streams play in the CineVerse
player; `youtube:` films play in YouTube's player with CineVerse controls (as explained above),
and `vimeo:` / `embed:` links use that service's own player. For full-length films, use a video host
(Bunny Stream, Cloudflare Stream, Mux or Vimeo) rather than putting big files in the
`Videos` folder: static hosts limit file sizes, and video hosts stream smoothly on slow
connections.

### Video quality (Auto, 1080p, 720p…)

There are two ways to give viewers a Quality menu:

**1. Upload to a video host (easiest, and how Netflix and Hotstar work).** Bunny Stream,
Cloudflare Stream and Mux turn one upload into every quality automatically and give you an
`.m3u8` link:

```js
watch: 'https://your-video-host.example/my-film/playlist.m3u8'
```

The Quality menu fills itself in from the stream, and **Auto** keeps adjusting the quality to
the viewer's internet speed while they watch.

**2. Upload one file per quality** and list them, highest first:

```js
watch: {
    '1080p': 'Videos/my-film-1080p.mp4',
    '720p': 'Videos/my-film-720p.mp4',
    '480p': 'Videos/my-film-480p.mp4'
}
```

The same works for `trailer:` and for a teaser in `video:` (see *Beyond the Universe* in
`JS/data.js`). **Auto** picks the smallest file that still looks sharp on the viewer's screen,
and a smaller one on slow or data-saver connections. If one file is missing, the player
quietly switches to the next quality.

To make the files from one master copy with [ffmpeg](https://ffmpeg.org):

```
ffmpeg -i my-film.mp4 -vf scale=-2:1080 -c:v libx264 -crf 21 -c:a aac -b:a 160k -movflags +faststart my-film-1080p.mp4
ffmpeg -i my-film.mp4 -vf scale=-2:720  -c:v libx264 -crf 23 -c:a aac -b:a 128k -movflags +faststart my-film-720p.mp4
ffmpeg -i my-film.mp4 -vf scale=-2:480  -c:v libx264 -crf 26 -c:a aac -b:a 96k  -movflags +faststart my-film-480p.mp4
```

YouTube videos keep YouTube's own quality and captions settings, so these menus only appear
for your own video files and streams.

### Subtitles and captions

Add WebVTT (`.vtt`) subtitle files to your own video. Use `subtitles` for the full movie
(`watch`) and `trailerSubtitles` for its trailer or teaser:

```js
watch: 'Videos/my-film.mp4',
subtitles: [
    { label: 'English (CC)', lang: 'en', src: 'Videos/subtitles/my-film.en.vtt' },
    { label: 'हिन्दी', lang: 'hi', src: 'Videos/subtitles/my-film.hi.vtt' },
    { label: 'தமிழ்', lang: 'ta', src: 'Videos/subtitles/my-film.ta.vtt', default: true }
]
```

The subtitles button then appears in the player, listing each `label`. Write labels in the
language itself, as streaming apps do. `default: true` turns that language on at the start
(until the viewer picks something else, which is remembered). The teaser's files in
`Videos/subtitles/` show the format: a cue is a time range followed by its text.

Have an `.srt` file? Convert it with `ffmpeg -i my-film.srt my-film.en.vtt`. If the video and
subtitle files are on a CDN, the CDN must allow cross-origin (CORS) requests.

## Receive newsletter sign-ups and contact messages

By default, sign-ups and messages are only saved in the visitor's browser.
To receive them, paste a webhook URL into `formEndpoint` at the top of `JS/data.js`
(for example an n8n **Webhook** node, Formspree, Make or Zapier). Each submission is sent
as JSON with `type` set to `newsletter` or `contact`.

## Social links

Set your profile URLs in `social` at the top of `JS/data.js`; every footer updates.
