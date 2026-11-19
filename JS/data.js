/* =========================================
   CINEVERSE — SITE SETTINGS & CATALOG
   Every page reads its titles from this file.
   Add a movie or series once here and it shows up in
   search, browse pages, details, My List and recommendations.
========================================= */

window.CINEVERSE_CONFIG = {
    // Your Supabase database (see "Database & admin page" in README.md).
    // Leave both empty to keep using the titles in this file.
    //   url: Project URL         e.g. 'https://abcdefghijklm.supabase.co'
    //   key: Publishable key     e.g. 'sb_publishable_…'   (safe to put in a website;
    //        never paste the SECRET key here)
    database: {
        url: 'https://subcebevekpgnsasmfjk.supabase.co',
        key: 'sb_publishable_socl_GlWoindDooC4gX1vQ_NA5inAcH'
    },

    // Optional: paste a webhook URL (for example an n8n "Webhook" node,
    // Formspree, Make or Zapier). Newsletter sign-ups and contact messages
    // are then sent there as JSON with a POST request.
    // Leave it empty and submissions are only kept in the visitor's browser.
    formEndpoint: '',

    // Country used by the "Where to Watch" button (JustWatch):
    // 'in' India, 'us' USA, 'gb' UK, 'ae' UAE, 'au' Australia…
    watchCountry: 'in',

    // Your social profiles (used by the icons in every footer).
    social: {
        instagram: 'https://www.instagram.com/',
        youtube: 'https://www.youtube.com/',
        x: 'https://x.com/',
        facebook: 'https://www.facebook.com/'
    }
};

/* -----------------------------------------
   TITLE FIELDS
   id            unique, lowercase, no spaces
   poster        image path (or URL)
   trailer       the trailer (optional), either:
                   'Way9Dexny3w'                  a YouTube video ID: plays in YouTube's player with
                                                  CineVerse controls; YouTube's logo and title stay visible
                   'Videos/dune-trailer.mp4'      your own video file (or a CDN / .m3u8 link): plays in the
                                                  CineVerse player with no YouTube branding, like Netflix
   video         a teaser for your own originals (used instead of trailer; same formats,
                 including several qualities — see Beyond the Universe below)
   watch         the FULL movie/episode, if you have the right to show it (optional):
                   'Videos/my-film.mp4'                     a video file in this site
                   'https://cdn.example.com/my-film.mp4'    a video file on a CDN
                   'https://cdn.example.com/master.m3u8'    an HLS stream (Bunny Stream, Mux, Cloudflare…)
                   'youtube:VIDEO_ID'                       a full film on YouTube
                   'vimeo:VIDEO_ID'                         a full film on Vimeo
                   'embed:https://player-url…'              any embeddable player page
                 Titles with "watch" get a Watch Now button, a "Free" badge,
                 resume playback and a Continue Watching row.
                 Several qualities of your own video? List them and the player shows a Quality menu:
                   watch: { '1080p': 'Videos/my-film-1080p.mp4', '720p': 'Videos/my-film-720p.mp4' }
                 (an HLS .m3u8 link from a video host gets the Quality menu automatically)
   subtitles     subtitle files (WebVTT .vtt) for the "watch" video (optional):
                   [{ label: 'English', lang: 'en', src: 'Videos/my-film.en.vtt', default: true }]
   trailerSubtitles  the same, for a trailer or teaser that is your own video file
   credit        licence / credit line shown in the details and player
----------------------------------------- */

(() => {
    const tmdb = path => `https://image.tmdb.org/t/p/w500/${path}`;

    // Free, legal films from the Blender Foundation (official YouTube uploads).
    const youtubeFilm = id => ({
        poster: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        posterFallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        backdrop: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        watch: `youtube:${id}`
    });
    const BLENDER = 'Blender Foundation · Creative Commons licence';

    const movies = [
        {
            id: 'beyond-the-universe',
            type: 'movie',
            original: true,
            title: 'Beyond the Universe',
            year: 2026,
            runtime: 138,
            certification: 'PG-13',
            rating: 9.2,
            genres: ['Sci-Fi', 'Adventure', 'Thriller'],
            popularity: 100,
            overview: 'When the galaxy falls silent, humanity must find its last hope.',
            director: '',
            cast: [],
            poster: 'Images/originals/beyond-the-universe-poster.jpg',
            backdrop: 'Images/movie1.jpg',
            // The teaser in three qualities: the player's Quality menu lists them.
            video: {
                '720p': 'Videos/beyond-the-universe-teaser.mp4',
                '480p': 'Videos/beyond-the-universe-teaser-480p.mp4',
                '360p': 'Videos/beyond-the-universe-teaser-360p.mp4'
            },
            // Subtitles for the teaser: the player's subtitles button lists them.
            trailerSubtitles: [
                { label: 'English (CC)', lang: 'en', src: 'Videos/subtitles/beyond-the-universe.en.vtt' },
                { label: 'हिन्दी', lang: 'hi', src: 'Videos/subtitles/beyond-the-universe.hi.vtt' },
                { label: 'தமிழ்', lang: 'ta', src: 'Videos/subtitles/beyond-the-universe.ta.vtt' }
            ]
        },
        {
            id: 'dune-part-two',
            type: 'movie',
            title: 'Dune: Part Two',
            year: 2024,
            runtime: 166,
            certification: 'PG-13',
            rating: 8.8,
            genres: ['Sci-Fi', 'Adventure', 'Action', 'Drama'],
            popularity: 98,
            overview: 'Paul Atreides joins Chani and the Fremen on a path of revenge against the conspirators who destroyed his family, while visions warn him of a terrible future only he can prevent.',
            director: 'Denis Villeneuve',
            cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Austin Butler'],
            poster: tmdb('1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'),
            posterFallback: 'Images/Trending_movie/dune.jpg',
            backdrop: 'Images/Trending_movie/dune.jpg',
            trailer: 'Way9Dexny3w'
        },
        {
            id: 'avatar-the-way-of-water',
            type: 'movie',
            title: 'Avatar: The Way of Water',
            year: 2022,
            runtime: 192,
            certification: 'PG-13',
            rating: 7.5,
            genres: ['Sci-Fi', 'Adventure', 'Action'],
            popularity: 91,
            overview: 'More than a decade after the first film, Jake Sully, Neytiri and their children are forced from their home and seek refuge with the ocean clans of Pandora as an old threat returns.',
            director: 'James Cameron',
            cast: ['Sam Worthington', 'Zoe Saldaña', 'Sigourney Weaver', 'Kate Winslet'],
            poster: tmdb('t6HIqrRAclMCA60NsSmeqe9RmNV.jpg'),
            posterFallback: 'Images/Trending_movie/avatar.jpg',
            backdrop: 'Images/Trending_movie/avatar.jpg',
            trailer: 'd9MyW72ELq0'
        },
        {
            id: 'interstellar',
            type: 'movie',
            title: 'Interstellar',
            year: 2014,
            runtime: 169,
            certification: 'PG-13',
            rating: 8.7,
            genres: ['Sci-Fi', 'Adventure', 'Drama'],
            popularity: 93,
            overview: "With Earth's crops failing, a former pilot leads a team through a wormhole near Saturn to search for a new home for humanity, knowing that time itself is working against him.",
            director: 'Christopher Nolan',
            cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
            poster: tmdb('gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'),
            posterFallback: 'Images/Trending_movie/interstellar.jpg',
            backdrop: 'Images/Trending_movie/interstellar.jpg',
            trailer: 'zSWdZVtXT7E'
        },
        {
            id: 'oppenheimer',
            type: 'movie',
            title: 'Oppenheimer',
            year: 2023,
            runtime: 180,
            certification: 'R',
            rating: 8.3,
            genres: ['Drama', 'History', 'Thriller'],
            popularity: 96,
            overview: 'The story of J. Robert Oppenheimer, the physicist who led the Manhattan Project, and the personal and political cost of building the atomic bomb.',
            director: 'Christopher Nolan',
            cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.'],
            poster: tmdb('ptpr0kGAckfQkJeJIt8st5dglvd.jpg'),
            posterFallback: 'Images/Trending_movie/oppenheimer.jpg',
            backdrop: 'Images/Trending_movie/oppenheimer.jpg',
            trailer: 'uYPbbksJxIg'
        },
        {
            id: 'the-batman',
            type: 'movie',
            title: 'The Batman',
            year: 2022,
            runtime: 176,
            certification: 'PG-13',
            rating: 7.8,
            genres: ['Action', 'Crime', 'Thriller'],
            popularity: 92,
            overview: 'In his second year of fighting crime, Batman follows a trail of cryptic clues left by a serial killer and uncovers corruption that reaches the heart of Gotham, and his own family.',
            director: 'Matt Reeves',
            cast: ['Robert Pattinson', 'Zoë Kravitz', 'Paul Dano', 'Colin Farrell'],
            poster: tmdb('74xTEgt7R36Fpooo50r9T25onhq.jpg'),
            posterFallback: 'Images/Trending_movie/the-batman.webp',
            backdrop: 'Images/Trending_movie/the-batman.webp',
            trailer: 'mqqft2x_Aa4'
        },
        {
            id: 'inception',
            type: 'movie',
            title: 'Inception',
            year: 2010,
            runtime: 148,
            certification: 'PG-13',
            rating: 8.8,
            genres: ['Sci-Fi', 'Action', 'Thriller'],
            popularity: 87,
            overview: "A thief who steals secrets from people's dreams is offered one last job: plant an idea in a target's mind, deep inside a dream within a dream.",
            director: 'Christopher Nolan',
            cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy'],
            poster: tmdb('oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg'),
            posterFallback: 'Images/Trending_movie/inception.jpg',
            backdrop: 'Images/Trending_movie/inception.jpg',
            trailer: 'YoHD9XEInc0'
        },
        {
            id: 'top-gun-maverick',
            type: 'movie',
            title: 'Top Gun: Maverick',
            year: 2022,
            runtime: 131,
            certification: 'PG-13',
            rating: 8.3,
            genres: ['Action', 'Drama'],
            popularity: 90,
            overview: "After more than thirty years as one of the Navy's top aviators, Pete “Maverick” Mitchell returns to train a squad of young pilots for a near-impossible mission.",
            director: 'Joseph Kosinski',
            cast: ['Tom Cruise', 'Miles Teller', 'Jennifer Connelly', 'Jon Hamm'],
            poster: 'Images/popular-movie/tom-cur.jpg',
            trailer: 'giXco2jaZ_4'
        },
        {
            id: 'spider-man-across-the-spider-verse',
            type: 'movie',
            title: 'Spider-Man: Across the Spider-Verse',
            year: 2023,
            runtime: 140,
            certification: 'PG',
            rating: 8.6,
            genres: ['Animation', 'Action', 'Adventure', 'Sci-Fi'],
            popularity: 95,
            overview: 'Miles Morales is catapulted across the Multiverse, where he meets a society of Spider-People sworn to protect it, and must decide what being a hero really means.',
            director: 'Joaquim Dos Santos, Kemp Powers, Justin K. Thompson',
            cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac', 'Jake Johnson'],
            poster: 'Images/popular-movie/spider-man.jpg',
            backdrop: 'Images/genre/animation.jpg',
            trailer: 'cqGjhVJWtEg'
        },
        {
            id: 'the-dark-knight',
            type: 'movie',
            title: 'The Dark Knight',
            year: 2008,
            runtime: 152,
            certification: 'PG-13',
            rating: 9.0,
            genres: ['Action', 'Crime', 'Drama', 'Thriller'],
            popularity: 86,
            overview: "Batman, Lieutenant Gordon and District Attorney Harvey Dent take on Gotham's mob, until a chaos-loving criminal known as the Joker pushes the city to the brink.",
            director: 'Christopher Nolan',
            cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Gary Oldman'],
            poster: 'Images/top-rated-movie/dark-knight.jpg',
            trailer: 'EXeTwQWrcwY'
        },
        {
            id: 'john-wick-chapter-4',
            type: 'movie',
            title: 'John Wick: Chapter 4',
            year: 2023,
            runtime: 169,
            certification: 'R',
            rating: 7.7,
            genres: ['Action', 'Thriller', 'Crime'],
            popularity: 89,
            overview: 'John Wick takes his fight against the High Table worldwide, facing a powerful new enemy and old allies turned rivals in Osaka, Berlin and Paris.',
            director: 'Chad Stahelski',
            cast: ['Keanu Reeves', 'Donnie Yen', 'Bill Skarsgård', 'Laurence Fishburne'],
            poster: 'Images/popular-movie/johnwick.jpg',
            trailer: 'qEVUtrk8_B4'
        },
        {
            id: 'guardians-of-the-galaxy-vol-3',
            type: 'movie',
            title: 'Guardians of the Galaxy Vol. 3',
            year: 2023,
            runtime: 150,
            certification: 'PG-13',
            rating: 7.9,
            genres: ['Action', 'Sci-Fi', 'Comedy', 'Adventure'],
            popularity: 88,
            overview: 'Still reeling from loss, Peter Quill rallies the Guardians on a dangerous mission to protect Rocket, one that could mean the end of the team as they know it.',
            director: 'James Gunn',
            cast: ['Chris Pratt', 'Zoe Saldaña', 'Dave Bautista', 'Karen Gillan'],
            poster: 'Images/popular-movie/galaxy.jpg',
            trailer: 'u3V5KDHRQvk'
        },
        {
            id: 'barbie',
            type: 'movie',
            title: 'Barbie',
            year: 2023,
            runtime: 114,
            certification: 'PG-13',
            rating: 7.0,
            genres: ['Comedy', 'Fantasy', 'Adventure'],
            popularity: 94,
            overview: 'Barbie lives a perfect life in Barbieland, until unsettling thoughts send her and Ken into the real world, where they discover what it means to be human.',
            director: 'Greta Gerwig',
            cast: ['Margot Robbie', 'Ryan Gosling', 'America Ferrera', 'Kate McKinnon'],
            poster: 'Images/popular-movie/barbie.jpg',
            trailer: 'pBk4NYhWNMM'
        },
        {
            id: 'the-shawshank-redemption',
            type: 'movie',
            title: 'The Shawshank Redemption',
            year: 1994,
            runtime: 142,
            certification: 'R',
            rating: 9.3,
            genres: ['Drama'],
            popularity: 76,
            overview: "Banker Andy Dufresne is sentenced to life in Shawshank prison for a crime he says he didn't commit, and forms a lasting friendship with fellow inmate Red over two decades.",
            director: 'Frank Darabont',
            cast: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton', 'William Sadler'],
            poster: 'Images/top-rated-movie/shawshank.jpg',
            backdrop: 'Images/genre/drama.jpg',
            trailer: 'PLl99DlL6b4'
        },
        {
            id: 'the-godfather',
            type: 'movie',
            title: 'The Godfather',
            year: 1972,
            runtime: 175,
            certification: 'R',
            rating: 9.2,
            genres: ['Crime', 'Drama'],
            popularity: 75,
            overview: 'The ageing head of a powerful New York crime family hands control of his empire to his reluctant youngest son, Michael.',
            director: 'Francis Ford Coppola',
            cast: ['Marlon Brando', 'Al Pacino', 'James Caan', 'Diane Keaton'],
            poster: 'Images/top-rated-movie/godfather.jpg',
            trailer: 'UaVTIH8mujA'
        },
        {
            id: 'the-return-of-the-king',
            type: 'movie',
            title: 'The Lord of the Rings: The Return of the King',
            year: 2003,
            runtime: 201,
            certification: 'PG-13',
            rating: 9.0,
            genres: ['Fantasy', 'Adventure', 'Action', 'Drama'],
            popularity: 74,
            overview: 'As the armies of Sauron gather for a final assault on Middle-earth, Frodo and Sam near Mount Doom with the One Ring while Aragorn steps into his destiny as king.',
            director: 'Peter Jackson',
            cast: ['Elijah Wood', 'Viggo Mortensen', 'Ian McKellen', 'Sean Astin'],
            poster: 'Images/top-rated-movie/return-of-the-king.jpg',
            trailer: 'r5X-hFf6Bwo'
        },
        {
            id: 'schindlers-list',
            type: 'movie',
            title: "Schindler's List",
            year: 1993,
            runtime: 195,
            certification: 'R',
            rating: 9.0,
            genres: ['Drama', 'History'],
            popularity: 70,
            overview: 'During the Holocaust, industrialist Oskar Schindler turns from war profiteer to protector, saving more than a thousand Jewish refugees by employing them in his factories.',
            director: 'Steven Spielberg',
            cast: ['Liam Neeson', 'Ben Kingsley', 'Ralph Fiennes', 'Embeth Davidtz'],
            poster: 'Images/top-rated-movie/schindlers-list.jpg',
            trailer: 'mxphAlJID9U'
        },
        {
            id: '12-angry-men',
            type: 'movie',
            title: '12 Angry Men',
            year: 1957,
            runtime: 96,
            certification: 'NR',
            rating: 9.0,
            genres: ['Drama', 'Crime'],
            popularity: 68,
            overview: "A jury deliberating a murder case seems ready to convict, until one juror's doubt forces the other eleven to take a second look at the evidence.",
            director: 'Sidney Lumet',
            cast: ['Henry Fonda', 'Lee J. Cobb', 'Martin Balsam', 'Jack Klugman'],
            poster: 'Images/top-rated-movie/12-angry-men.jpg',
            trailer: 'TEN-2uTi2c0'
        },
        {
            id: 'joker',
            type: 'movie',
            title: 'Joker',
            year: 2019,
            runtime: 122,
            certification: 'R',
            rating: 8.4,
            genres: ['Crime', 'Drama', 'Thriller'],
            popularity: 85,
            overview: 'A struggling comedian and party clown in Gotham City is pushed to the edge by a society that ignores him, setting off a violent transformation.',
            director: 'Todd Phillips',
            cast: ['Joaquin Phoenix', 'Robert De Niro', 'Zazie Beetz', 'Frances Conroy'],
            poster: tmdb('udDclJoHjfjb8Ekgsd4FDteOkCU.jpg'),
            trailer: 't433PEQGErc'
        },
        {
            id: 'avengers-endgame',
            type: 'movie',
            title: 'Avengers: Endgame',
            year: 2019,
            runtime: 181,
            certification: 'PG-13',
            rating: 8.4,
            genres: ['Action', 'Adventure', 'Sci-Fi'],
            popularity: 84,
            overview: 'After Thanos wipes out half of all life, the remaining Avengers assemble one last time for a daring plan to undo the damage, whatever the cost.',
            director: 'Anthony Russo, Joe Russo',
            cast: ['Robert Downey Jr.', 'Chris Evans', 'Mark Ruffalo', 'Scarlett Johansson'],
            poster: tmdb('or06FN3Dka5tukK1e9sl16pB3iy.jpg'),
            trailer: 'TcMBFSGVi1c'
        },
        {
            id: 'la-la-land',
            type: 'movie',
            title: 'La La Land',
            year: 2016,
            runtime: 128,
            certification: 'PG-13',
            rating: 8.0,
            genres: ['Romance', 'Comedy', 'Drama'],
            popularity: 78,
            overview: 'A jazz pianist and an aspiring actress fall in love in Los Angeles while chasing their dreams, until success begins to pull them in different directions.',
            director: 'Damien Chazelle',
            cast: ['Ryan Gosling', 'Emma Stone', 'John Legend', 'J. K. Simmons'],
            poster: tmdb('uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg'),
            posterFallback: 'Images/genre/romance.jpg',
            backdrop: 'Images/genre/romance.jpg',
            trailer: '0pdqf4P9MB8'
        },
        {
            id: 'titanic',
            type: 'movie',
            title: 'Titanic',
            year: 1997,
            runtime: 194,
            certification: 'PG-13',
            rating: 7.9,
            genres: ['Romance', 'Drama'],
            popularity: 77,
            overview: 'A young aristocrat falls for a penniless artist aboard the RMS Titanic during its ill-fated maiden voyage in 1912.',
            director: 'James Cameron',
            cast: ['Leonardo DiCaprio', 'Kate Winslet', 'Billy Zane', 'Kathy Bates'],
            poster: tmdb('9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg'),
            trailer: 'kVrqfYjkTdQ'
        },
        {
            id: 'get-out',
            type: 'movie',
            title: 'Get Out',
            year: 2017,
            runtime: 104,
            certification: 'R',
            rating: 7.8,
            genres: ['Horror', 'Thriller', 'Mystery'],
            popularity: 79,
            overview: "A young Black man visits his white girlfriend's family estate for the weekend, where their unsettling hospitality hides something far more sinister.",
            director: 'Jordan Peele',
            cast: ['Daniel Kaluuya', 'Allison Williams', 'Bradley Whitford', 'Catherine Keener'],
            poster: tmdb('tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg'),
            trailer: 'DzfpyUB60YY'
        },
        {
            id: 'a-quiet-place',
            type: 'movie',
            title: 'A Quiet Place',
            year: 2018,
            runtime: 90,
            certification: 'PG-13',
            rating: 7.5,
            genres: ['Horror', 'Sci-Fi', 'Drama'],
            popularity: 80,
            overview: 'A family fights to survive in silence in a world overrun by creatures that hunt by sound.',
            director: 'John Krasinski',
            cast: ['Emily Blunt', 'John Krasinski', 'Millicent Simmonds', 'Noah Jupe'],
            poster: tmdb('nAU74GmpUk7t5iklEp3bufwDq4n.jpg'),
            trailer: 'WR7cc5t7tv8'
        },

        // ---------- FREE TO WATCH (full films) ----------
        {
            id: 'big-buck-bunny',
            type: 'movie',
            format: 'Short Film',
            title: 'Big Buck Bunny',
            year: 2008,
            runtime: 10,
            certification: 'NR',
            rating: 6.4,
            genres: ['Animation', 'Comedy'],
            popularity: 66,
            overview: "A big, gentle rabbit's peaceful day in the meadow is ruined by three bullying rodents, so he plans a hilarious revenge.",
            director: 'Sacha Goedegebure',
            credit: BLENDER,
            ...youtubeFilm('aqz-KE-bpKQ')
        },
        {
            id: 'sintel',
            type: 'movie',
            format: 'Short Film',
            title: 'Sintel',
            year: 2010,
            runtime: 15,
            certification: 'NR',
            rating: 7.4,
            genres: ['Animation', 'Fantasy', 'Adventure'],
            popularity: 65,
            overview: 'A lonely young woman searches the world for the baby dragon she rescued and raised, whatever the journey costs her.',
            director: 'Colin Levy',
            cast: ['Halina Reijn', 'Thom Hoffman'],
            credit: BLENDER,
            ...youtubeFilm('eRsGyueVLvQ')
        },
        {
            id: 'tears-of-steel',
            type: 'movie',
            format: 'Short Film',
            title: 'Tears of Steel',
            year: 2012,
            runtime: 12,
            certification: 'NR',
            rating: 6.1,
            genres: ['Sci-Fi', 'Action'],
            popularity: 64,
            overview: 'In a future Amsterdam, a band of scientists and warriors restage a painful moment from the past in a last attempt to save the world from destructive robots.',
            director: 'Ian Hubert',
            cast: ['Derek de Lint', 'Sergio Hasselbaink', 'Rogier Schippers'],
            credit: BLENDER,
            ...youtubeFilm('R6MlUcmOul8')
        },
        {
            id: 'spring',
            type: 'movie',
            format: 'Short Film',
            title: 'Spring',
            year: 2019,
            runtime: 8,
            certification: 'NR',
            rating: 7.6,
            genres: ['Animation', 'Fantasy'],
            popularity: 63,
            overview: 'A shepherd girl and her dog face ancient spirits to keep the cycle of life turning.',
            director: 'Andy Goralczyk',
            credit: BLENDER,
            ...youtubeFilm('WhWc3b3KhnY')
        },
        {
            id: 'sprite-fright',
            type: 'movie',
            format: 'Short Film',
            title: 'Sprite Fright',
            year: 2021,
            runtime: 10,
            certification: 'NR',
            rating: 7.5,
            genres: ['Animation', 'Horror', 'Comedy'],
            popularity: 62,
            overview: "When a group of rowdy teenagers head into the woods, they discover that the forest's tiny mushroom sprites are not as cute as they look.",
            director: 'Matthew Luhn',
            credit: BLENDER,
            ...youtubeFilm('_cMxraX_5RE')
        },
        {
            id: 'cosmos-laundromat',
            type: 'movie',
            format: 'Short Film',
            title: 'Cosmos Laundromat',
            year: 2015,
            runtime: 12,
            certification: 'NR',
            rating: 7.3,
            genres: ['Animation', 'Comedy', 'Fantasy'],
            popularity: 61,
            overview: 'On a desolate island, a world-weary sheep named Franck meets a mysterious salesman who offers him the gift of a lifetime.',
            director: 'Mathieu Auvray',
            credit: BLENDER,
            ...youtubeFilm('Y-rmzh0PI3c')
        },
        {
            id: 'agent-327',
            type: 'movie',
            format: 'Short Film',
            title: 'Agent 327: Operation Barbershop',
            year: 2017,
            runtime: 4,
            certification: 'NR',
            rating: 7.7,
            genres: ['Animation', 'Action', 'Comedy'],
            popularity: 60,
            overview: 'Undercover in a quiet barbershop, Agent 327 discovers that his enemy has prepared a deadly welcome.',
            director: 'Colin Levy, Hjalti Hjálmarsson',
            credit: BLENDER,
            ...youtubeFilm('mN0zPOpADL4')
        },
        {
            id: 'elephants-dream',
            type: 'movie',
            format: 'Short Film',
            title: 'Elephants Dream',
            year: 2006,
            runtime: 11,
            certification: 'NR',
            rating: 6.4,
            genres: ['Animation', 'Sci-Fi'],
            popularity: 59,
            overview: 'Two strange characters, old Proog and young Emo, explore the endless rooms and machines of a surreal world, and see it very differently.',
            director: 'Bassam Kurdali',
            credit: BLENDER,
            ...youtubeFilm('TLkA0RELQ1g')
        }
    ];

    const series = [
        {
            id: 'stranger-things',
            type: 'series',
            title: 'Stranger Things',
            year: 2016,
            seasons: 5,
            network: 'Netflix',
            certification: 'TV-14',
            rating: 8.6,
            genres: ['Sci-Fi', 'Horror', 'Drama', 'Mystery'],
            popularity: 99,
            overview: 'When a young boy vanishes in 1980s Hawkins, Indiana, his friends, family and the local police chief uncover secret experiments, supernatural forces and a strange girl named Eleven.',
            creators: ['The Duffer Brothers'],
            cast: ['Millie Bobby Brown', 'Finn Wolfhard', 'Winona Ryder', 'David Harbour'],
            poster: tmdb('49WJfeN0moxb9IPfGn8AIqMGskD.jpg'),
            trailer: 'b9EkMc79ZSU'
        },
        {
            id: 'wednesday',
            type: 'series',
            title: 'Wednesday',
            year: 2022,
            seasons: 2,
            network: 'Netflix',
            certification: 'TV-14',
            rating: 8.0,
            genres: ['Comedy', 'Fantasy', 'Mystery'],
            popularity: 97,
            overview: 'Wednesday Addams investigates a string of murders while making new friends, and a few enemies, at Nevermore Academy.',
            creators: ['Alfred Gough', 'Miles Millar'],
            cast: ['Jenna Ortega', 'Emma Myers', 'Catherine Zeta-Jones', 'Luis Guzmán'],
            poster: tmdb('9PFonBhy4cQy7Jz20NpMygczOkv.jpg'),
            trailer: 'Di310WS8zLk'
        },
        {
            id: 'squid-game',
            type: 'series',
            title: 'Squid Game',
            year: 2021,
            seasons: 3,
            network: 'Netflix',
            certification: 'TV-MA',
            rating: 8.0,
            genres: ['Thriller', 'Drama', 'Action'],
            popularity: 96,
            overview: "Hundreds of cash-strapped players accept an invitation to compete in children's games for a huge prize, with deadly consequences for those who lose.",
            creators: ['Hwang Dong-hyuk'],
            cast: ['Lee Jung-jae', 'Park Hae-soo', 'Wi Ha-jun', 'Jung Ho-yeon'],
            poster: tmdb('dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg'),
            trailer: 'oqxAJKy0ii4'
        },
        {
            id: 'the-last-of-us',
            type: 'series',
            title: 'The Last of Us',
            year: 2023,
            seasons: 2,
            network: 'HBO',
            certification: 'TV-MA',
            rating: 8.6,
            genres: ['Drama', 'Action', 'Sci-Fi', 'Horror'],
            popularity: 95,
            overview: 'Twenty years after a fungal outbreak collapses civilisation, hardened survivor Joel is tasked with smuggling 14-year-old Ellie across a dangerous America.',
            creators: ['Craig Mazin', 'Neil Druckmann'],
            cast: ['Pedro Pascal', 'Bella Ramsey', 'Gabriel Luna'],
            poster: tmdb('uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg')
        },
        {
            id: 'the-boys',
            type: 'series',
            title: 'The Boys',
            year: 2019,
            network: 'Prime Video',
            certification: 'TV-MA',
            rating: 8.6,
            genres: ['Action', 'Comedy', 'Crime', 'Sci-Fi'],
            popularity: 94,
            overview: 'A group of vigilantes sets out to take down corrupt superheroes who abuse their fame and powers.',
            creators: ['Eric Kripke'],
            cast: ['Karl Urban', 'Jack Quaid', 'Antony Starr', 'Erin Moriarty'],
            poster: tmdb('stTEycfG9928HYGEISBFaG1ngjM.jpg'),
            trailer: 'M1bhOaLV4FU'
        },
        {
            id: 'arcane',
            type: 'series',
            title: 'Arcane',
            year: 2021,
            seasons: 2,
            network: 'Netflix',
            certification: 'TV-14',
            rating: 9.0,
            genres: ['Animation', 'Action', 'Sci-Fi', 'Fantasy', 'Drama'],
            popularity: 92,
            overview: 'In the gleaming city of Piltover and its oppressed underground, Zaun, two sisters end up on opposite sides of a growing war.',
            creators: ['Christian Linke', 'Alex Yee'],
            cast: ['Hailee Steinfeld', 'Ella Purnell', 'Kevin Alejandro', 'Katie Leung'],
            poster: tmdb('fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg'),
            trailer: 'fXmAurh012s'
        },
        {
            id: 'breaking-bad',
            type: 'series',
            title: 'Breaking Bad',
            year: 2008,
            seasons: 5,
            network: 'AMC',
            certification: 'TV-MA',
            rating: 9.5,
            genres: ['Crime', 'Drama', 'Thriller'],
            popularity: 90,
            overview: "A high school chemistry teacher diagnosed with terminal cancer turns to making methamphetamine to secure his family's future.",
            creators: ['Vince Gilligan'],
            cast: ['Bryan Cranston', 'Aaron Paul', 'Anna Gunn', 'Dean Norris'],
            poster: tmdb('ggFHVNu6YYI5L9pCfOacjizRGt.jpg')
        },
        {
            id: 'game-of-thrones',
            type: 'series',
            title: 'Game of Thrones',
            year: 2011,
            seasons: 8,
            network: 'HBO',
            certification: 'TV-MA',
            rating: 9.2,
            genres: ['Fantasy', 'Drama', 'Action', 'Adventure'],
            popularity: 89,
            overview: 'Noble families fight for control of the Iron Throne of Westeros while an ancient threat awakens beyond the Wall.',
            creators: ['David Benioff', 'D. B. Weiss'],
            cast: ['Emilia Clarke', 'Kit Harington', 'Peter Dinklage', 'Lena Headey'],
            poster: tmdb('1XS1oqL89opfnbLl8WnZY1O1uJx.jpg')
        },
        {
            id: 'money-heist',
            type: 'series',
            title: 'Money Heist',
            year: 2017,
            seasons: 5,
            seasonLabel: 'Parts',
            network: 'Netflix',
            certification: 'TV-MA',
            rating: 8.2,
            genres: ['Crime', 'Thriller', 'Drama', 'Action'],
            popularity: 86,
            overview: "A mysterious man known as the Professor recruits a crew of criminals to pull off the biggest heist in Spain's history.",
            creators: ['Álex Pina'],
            cast: ['Úrsula Corberó', 'Álvaro Morte', 'Itziar Ituño', 'Pedro Alonso'],
            poster: tmdb('reEMJA1uzscCbkpeRJeTT2bjqUp.jpg')
        },
        {
            id: 'peaky-blinders',
            type: 'series',
            title: 'Peaky Blinders',
            year: 2013,
            seasons: 6,
            network: 'BBC',
            certification: 'TV-MA',
            rating: 8.7,
            genres: ['Crime', 'Drama'],
            popularity: 85,
            overview: "In post-war Birmingham, Tommy Shelby and his family's gang build a criminal empire, whatever the price.",
            creators: ['Steven Knight'],
            cast: ['Cillian Murphy', 'Paul Anderson', 'Helen McCrory', 'Sophie Rundle'],
            poster: tmdb('vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg')
        },
        {
            id: 'dark',
            type: 'series',
            title: 'Dark',
            year: 2017,
            seasons: 3,
            network: 'Netflix',
            certification: 'TV-MA',
            rating: 8.7,
            genres: ['Sci-Fi', 'Mystery', 'Thriller', 'Drama'],
            popularity: 83,
            overview: 'A missing child sends four families in a small German town on a hunt for answers that spans generations and a time-travel conspiracy.',
            creators: ['Baran bo Odar', 'Jantje Friese'],
            cast: ['Louis Hofmann', 'Lisa Vicari', 'Oliver Masucci', 'Maja Schöne'],
            poster: tmdb('apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg')
        },
        {
            id: 'chernobyl',
            type: 'series',
            title: 'Chernobyl',
            year: 2019,
            seasons: 1,
            seasonLabel: 'Limited Series',
            network: 'HBO',
            certification: 'TV-MA',
            rating: 9.3,
            genres: ['Drama', 'History', 'Thriller'],
            popularity: 82,
            overview: 'The true story of the 1986 nuclear disaster and the scientists, workers and first responders who risked everything to contain it.',
            creators: ['Craig Mazin'],
            cast: ['Jared Harris', 'Stellan Skarsgård', 'Emily Watson'],
            poster: tmdb('hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg'),
            trailer: 's9APLXM9Ei8'
        }
    ];

    window.CINEVERSE_DATA = {
        movies,
        series,

        // Ordered lists used by the homepage rows and "View All" links.
        collections: {
            trending: {
                name: 'Trending Movies',
                ids: ['dune-part-two', 'avatar-the-way-of-water', 'interstellar', 'oppenheimer', 'the-batman', 'inception']
            },
            popular: {
                name: 'Popular Movies',
                ids: ['top-gun-maverick', 'spider-man-across-the-spider-verse', 'the-dark-knight', 'john-wick-chapter-4', 'guardians-of-the-galaxy-vol-3', 'barbie']
            },
            'top-rated': {
                name: 'Top Rated Movies',
                ids: ['the-shawshank-redemption', 'the-godfather', 'the-dark-knight', 'the-return-of-the-king', 'schindlers-list', '12-angry-men']
            },
            originals: {
                name: 'CineVerse Originals',
                ids: ['beyond-the-universe']
            },
            free: {
                name: 'Free to Watch',
                ids: ['big-buck-bunny', 'sintel', 'tears-of-steel', 'spring', 'sprite-fright', 'cosmos-laundromat', 'agent-327', 'elephants-dream']
            }
        },

        // Shown in the bell menu. "titleId" opens that title when clicked.
        notifications: [
            { id: 'n-free', titleId: 'big-buck-bunny', label: 'Watch Free', text: 'Eight full short films are now free to watch. Start with Big Buck Bunny.' },
            { id: 'n-beyond', titleId: 'beyond-the-universe', label: 'CineVerse Original', text: 'Beyond the Universe has arrived. Watch the teaser now.' },
            { id: 'n-dune', titleId: 'dune-part-two', label: 'Trending', text: 'Dune: Part Two is the #1 trending movie this week.' },
            { id: 'n-arcane', titleId: 'arcane', label: 'Series', text: 'Both seasons of Arcane are ready to binge.' },
            { id: 'n-oppenheimer', titleId: 'oppenheimer', label: 'Recommended', text: 'Loved Interstellar? Oppenheimer is also from Christopher Nolan.' }
        ]
    };
})();
