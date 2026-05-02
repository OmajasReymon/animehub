(function () {
    const API_BASE_URL = "http://127.0.0.1:5000";
    const SELECTED_ANIME_KEY = "animehub_selected_anime";
    const COUNT_FORMATTER = new Intl.NumberFormat();
    const animeDetailCache = new Map();
    const animeDetailRequests = new Map();
    const FALLBACK_POSTER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800">' +
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#334155"/>' +
        "</linearGradient></defs>" +
        '<rect width="600" height="800" fill="url(#bg)"/>' +
        '<text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" ' +
        'fill="#e2e8f0" font-family="Arial, sans-serif" font-size="42">AnimeHub</text>' +
        '<text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" ' +
        'fill="#94a3b8" font-family="Arial, sans-serif" font-size="20">No image available</text>' +
        "</svg>"
    );

    const ICONS = {
        play: [
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
            '<path d="M8 6.5v11l8.5-5.5L8 6.5z" fill="currentColor"></path>',
            "</svg>"
        ].join(""),
        watch: [
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
            '<path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3z" fill="currentColor"></path>',
            '<path d="M5 5h6v2H7v10h10v-4h2v6H5V5z" fill="currentColor"></path>',
            "</svg>"
        ].join(""),
        favorite: [
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
            '<path d="M12 20.5l-1.2-1.1C5.4 14.6 2 11.5 2 7.8 2 5 4.2 3 7 3c1.6 0 3.1.7 4 1.9C11.9 3.7 13.4 3 15 3c2.8 0 5 2 5 4.8 0 3.7-3.4 6.8-8.8 11.6L12 20.5z" fill="currentColor"></path>',
            "</svg>"
        ].join(""),
        details: [
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
            '<path d="M11 10h2v7h-2zm0-3h2v2h-2z" fill="currentColor"></path>',
            '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="currentColor"></path>',
            "</svg>"
        ].join("")
    };

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch (error) {
            return null;
        }
    }

    function showToast(message, type = "info", options = {}) {
        if (window.AnimeHubToast?.show) {
            window.AnimeHubToast.show(message, type, options);
            return;
        }

        alert(message);
    }

    function cacheSelectedAnime(anime) {
        if (!anime || !anime.mal_id) {
            return;
        }

        localStorage.setItem(SELECTED_ANIME_KEY, JSON.stringify(anime));
    }

    function getCachedAnime() {
        try {
            return JSON.parse(localStorage.getItem(SELECTED_ANIME_KEY));
        } catch (error) {
            return null;
        }
    }

    function getDisplayTitle(anime) {
        return anime?.title_english || anime?.title || anime?.title_japanese || "Untitled Anime";
    }

    function getImageUrl(anime) {
        return (
            anime?.images?.jpg?.large_image_url ||
            anime?.images?.jpg?.image_url ||
            anime?.images?.webp?.large_image_url ||
            anime?.images?.webp?.image_url ||
            FALLBACK_POSTER
        );
    }

    function getScoreText(score) {
        if (typeof score !== "number") {
            return "N/A";
        }

        return score.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    }

    function getYear(anime) {
        return anime?.year || anime?.aired?.prop?.from?.year || "TBA";
    }

    function getStudioName(anime) {
        if (anime?.studios?.length) {
            return anime.studios[0].name;
        }

        return "Unknown Studio";
    }

    function getGenreNames(anime) {
        return (anime?.genres || []).map((genre) => genre.name).filter(Boolean);
    }

    function getEpisodesText(anime) {
        if (typeof anime?.episodes === "number" && anime.episodes > 0) {
            return anime.episodes === 1 ? "1 episode" : `${anime.episodes} eps`;
        }

        return "Episodes TBA";
    }

    function getStatusClass(status) {
        const normalized = (status || "").toLowerCase();

        if (normalized.includes("airing")) {
            return "ongoing";
        }

        if (normalized.includes("finished")) {
            return "completed";
        }

        if (normalized.includes("not yet") || normalized.includes("upcoming")) {
            return "upcoming";
        }

        return "neutral";
    }

    function formatCount(value) {
        if (typeof value !== "number") {
            return "N/A";
        }

        return COUNT_FORMATTER.format(value);
    }

    function addWatchLink(links, seen, label, url, description) {
        if (!url) {
            return;
        }

        const normalizedUrl = url.trim();

        if (!normalizedUrl || seen.has(normalizedUrl)) {
            return;
        }

        seen.add(normalizedUrl);
        links.push({
            label,
            url: normalizedUrl,
            description
        });
    }

    function getLegalWatchLinks(anime) {
        const links = [];
        const seen = new Set();
        const title = getDisplayTitle(anime).trim();
        const encodedTitle = encodeURIComponent(title);
        const streamingLinks = Array.isArray(anime?.streaming) ? anime.streaming : [];

        streamingLinks.forEach((stream) => {
            addWatchLink(
                links,
                seen,
                stream?.name || "Official Stream",
                stream?.url,
                "Open a provider link listed in the Jikan data."
            );
        });

        addWatchLink(
            links,
            seen,
            "MyAnimeList",
            anime?.url,
            "Open the official MyAnimeList page for this anime."
        );

        if (title) {
            addWatchLink(
                links,
                seen,
                "Crunchyroll Search",
                `https://www.crunchyroll.com/search?q=${encodedTitle}`,
                "Search Crunchyroll for this title."
            );

            addWatchLink(
                links,
                seen,
                "Netflix Search",
                `https://www.netflix.com/search?q=${encodedTitle}`,
                "Search Netflix for this title."
            );

            addWatchLink(
                links,
                seen,
                "YouTube Search",
                `https://www.youtube.com/results?search_query=${encodedTitle}%20anime`,
                "Search YouTube for official trailers, clips, or channel uploads."
            );
        }

        return links;
    }

    function hasLegalWatchLinks(anime) {
        return getLegalWatchLinks(anime).length > 0;
    }

    function getPlayableUrl(anime) {
        return anime?.trailer?.url || "";
    }

    function getTrailerYoutubeId(anime) {
        return anime?.trailer?.youtube_id || "";
    }

    function getPlayableEmbedUrl(anime) {
        const youtubeId = getTrailerYoutubeId(anime);

        return (
            anime?.trailer?.embed_url ||
            (youtubeId ? `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0` : "")
        );
    }

    function hasPlayableTrailer(anime) {
        return Boolean(getPlayableEmbedUrl(anime) || getPlayableUrl(anime));
    }

    function getTrailerSearchUrl(anime) {
        const title = getDisplayTitle(anime).trim();

        if (!title) {
            return "";
        }

        return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} official anime trailer`)}`;
    }

    function openPendingPlaybackWindow() {
        const pendingWindow = window.open("", "_blank");

        if (!pendingWindow) {
            return null;
        }

        try {
            pendingWindow.opener = null;
            pendingWindow.document.title = "Opening trailer...";
            pendingWindow.document.body.innerHTML = `
                <div style="font-family:Arial,sans-serif;padding:24px;line-height:1.6;color:#0f172a;">
                    <h1 style="margin:0 0 12px;font-size:20px;">Opening trailer...</h1>
                    <p style="margin:0;">AnimeHub is preparing the best trailer source for this anime.</p>
                </div>
            `;
        } catch (error) {
            return pendingWindow;
        }

        return pendingWindow;
    }

    function navigatePendingWindow(pendingWindow, url) {
        if (!pendingWindow || !url) {
            return false;
        }

        try {
            pendingWindow.location.replace(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    function closePendingWindow(pendingWindow) {
        if (!pendingWindow || pendingWindow.closed) {
            return;
        }

        try {
            pendingWindow.close();
        } catch (error) {
            // Ignore close failures from browser policies.
        }
    }

    function getQuickActionLabel(anime) {
        if (hasPlayableTrailer(anime)) {
            return "Play";
        }

        if (anime?.mal_id || getDisplayTitle(anime).trim()) {
            return "Play";
        }

        if (hasLegalWatchLinks(anime)) {
            return "Watch";
        }

        return "Open";
    }

    function syncModalBodyState() {
        const playbackModal = document.getElementById("animePlaybackModal");
        const watchOptionsModal = document.getElementById("animeWatchOptionsModal");
        const hasOpenModal = Boolean(
            (playbackModal && !playbackModal.hidden) ||
            (watchOptionsModal && !watchOptionsModal.hidden)
        );

        document.body.classList.toggle("modal-open", hasOpenModal);
    }

    function ensurePlaybackModal() {
        let modal = document.getElementById("animePlaybackModal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "animePlaybackModal";
        modal.className = "anime-playback-modal";
        modal.setAttribute("hidden", "");
        modal.innerHTML = `
            <div class="anime-playback-backdrop" data-close-playback="true"></div>
            <div class="anime-playback-dialog" role="dialog" aria-modal="true" aria-labelledby="animePlaybackTitle">
                <button type="button" class="anime-playback-close" aria-label="Close trailer" data-close-playback="true">Close</button>
                <div class="anime-playback-header">
                    <h2 id="animePlaybackTitle">Anime Trailer</h2>
                </div>
                <div class="anime-playback-frame-wrap">
                    <iframe
                        id="animePlaybackFrame"
                        class="anime-playback-frame"
                        src=""
                        title="Anime trailer"
                        loading="lazy"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
        `;

        modal.addEventListener("click", (event) => {
            if (event.target.closest("[data-close-playback='true']")) {
                closePlaybackModal();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closePlaybackModal();
            }
        });

        document.body.appendChild(modal);
        return modal;
    }

    function openPlaybackModal(anime) {
        const embedUrl = getPlayableEmbedUrl(anime);

        if (!embedUrl) {
            return false;
        }

        const modal = ensurePlaybackModal();
        const frame = modal.querySelector("#animePlaybackFrame");
        const title = modal.querySelector("#animePlaybackTitle");

        if (!frame || !title) {
            return false;
        }

        title.textContent = `${getDisplayTitle(anime)} Trailer`;
        frame.src = embedUrl;
        modal.hidden = false;
        syncModalBodyState();
        return true;
    }

    function closePlaybackModal() {
        const modal = document.getElementById("animePlaybackModal");

        if (!modal) {
            return;
        }

        const frame = modal.querySelector("#animePlaybackFrame");

        if (frame) {
            frame.src = "";
        }

        modal.hidden = true;
        syncModalBodyState();
    }

    function ensureWatchOptionsModal() {
        let modal = document.getElementById("animeWatchOptionsModal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "animeWatchOptionsModal";
        modal.className = "anime-watch-options-modal";
        modal.setAttribute("hidden", "");
        modal.innerHTML = `
            <div class="anime-playback-backdrop" data-close-watch-options="true"></div>
            <div class="anime-playback-dialog watch-options-dialog" role="dialog" aria-modal="true" aria-labelledby="animeWatchOptionsTitle">
                <button type="button" class="anime-playback-close" aria-label="Close watch options" data-close-watch-options="true">Close</button>
                <div class="anime-playback-header">
                    <h2 id="animeWatchOptionsTitle">Watch Options</h2>
                    <p class="watch-options-description" id="animeWatchOptionsDescription">
                        These links open official pages or search results in a new tab.
                    </p>
                </div>
                <div class="watch-options-grid" id="animeWatchOptionsGrid"></div>
            </div>
        `;

        modal.addEventListener("click", (event) => {
            if (event.target.closest("[data-close-watch-options='true']")) {
                closeWatchOptions();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeWatchOptions();
            }
        });

        document.body.appendChild(modal);
        return modal;
    }

    function closeWatchOptions() {
        const modal = document.getElementById("animeWatchOptionsModal");

        if (!modal) {
            return;
        }

        modal.hidden = true;
        syncModalBodyState();
    }

    function openWatchOptions(anime) {
        const watchLinks = getLegalWatchLinks(anime);

        if (!watchLinks.length) {
            return false;
        }

        const modal = ensureWatchOptionsModal();
        const title = modal.querySelector("#animeWatchOptionsTitle");
        const description = modal.querySelector("#animeWatchOptionsDescription");
        const grid = modal.querySelector("#animeWatchOptionsGrid");

        if (!title || !description || !grid) {
            return false;
        }

        title.textContent = `${getDisplayTitle(anime)} Watch Options`;
        description.textContent = "These links open official pages or search results in a new tab.";
        grid.innerHTML = "";

        watchLinks.forEach((link) => {
            const anchor = document.createElement("a");
            anchor.className = "watch-option-link";
            anchor.href = link.url;
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";

            const label = document.createElement("strong");
            label.className = "watch-option-label";
            label.textContent = link.label;

            const note = document.createElement("span");
            note.className = "watch-option-note";
            note.textContent = link.description;

            anchor.append(label, note);
            grid.appendChild(anchor);
        });

        modal.hidden = false;
        syncModalBodyState();
        return true;
    }

    function openAnimeWatch(anime) {
        if (openWatchOptions(anime)) {
            return;
        }

        const fallbackUrl = anime?.url || "";

        if (fallbackUrl) {
            window.open(fallbackUrl, "_blank", "noopener");
            return;
        }

        openAnimeDetail(anime);
    }

    function openAnimeDetail(animeOrId) {
        const malId = typeof animeOrId === "object" ? animeOrId?.mal_id : animeOrId;

        if (!malId) {
            return;
        }

        if (typeof animeOrId === "object") {
            cacheSelectedAnime(animeOrId);
        }

        window.location.href = `anime-detail.php?mal_id=${encodeURIComponent(malId)}`;
    }

    async function loadAnimeDetailData(malId) {
        if (!malId) {
            return null;
        }

        if (animeDetailCache.has(malId)) {
            return animeDetailCache.get(malId);
        }

        if (animeDetailRequests.has(malId)) {
            return animeDetailRequests.get(malId);
        }

        const request = fetch(`${API_BASE_URL}/anime/${malId}`)
            .then(async (response) => {
                const payload = await response.json();

                if (!response.ok || !payload?.success || !payload?.data) {
                    throw new Error(payload?.message || "Failed to load anime details");
                }

                animeDetailCache.set(malId, payload.data);
                return payload.data;
            })
            .catch((error) => {
                console.error("ANIME DETAIL LOOKUP ERROR:", error);
                return null;
            })
            .finally(() => {
                animeDetailRequests.delete(malId);
            });

        animeDetailRequests.set(malId, request);
        return request;
    }

    async function hydrateAnimePlaybackData(anime) {
        if (!anime || hasPlayableTrailer(anime)) {
            return anime;
        }

        const cachedAnime = getCachedAnime();

        if (cachedAnime && cachedAnime.mal_id === anime.mal_id) {
            Object.assign(anime, cachedAnime);

            if (hasPlayableTrailer(anime)) {
                return anime;
            }
        }

        const detailAnime = await loadAnimeDetailData(anime?.mal_id);

        if (detailAnime) {
            Object.assign(anime, detailAnime);
            cacheSelectedAnime(anime);
        }

        return anime;
    }

    async function openAnimePlayback(anime) {
        const needsAsyncLookup = !hasPlayableTrailer(anime);
        const pendingWindow = needsAsyncLookup ? openPendingPlaybackWindow() : null;
        const playableAnime = await hydrateAnimePlaybackData(anime);

        if (openPlaybackModal(playableAnime)) {
            closePendingWindow(pendingWindow);
            return;
        }

        const playableUrl = getPlayableUrl(playableAnime);
        const trailerSearchUrl = getTrailerSearchUrl(playableAnime);
        const fallbackUrl = playableAnime?.url || "";

        if (playableUrl) {
            if (!navigatePendingWindow(pendingWindow, playableUrl)) {
                window.open(playableUrl, "_blank", "noopener");
            }
            return;
        }

        if (trailerSearchUrl) {
            showToast("No embedded trailer was available, so YouTube search was opened instead.", "info", {
                title: "Trailer Search"
            });
            if (!navigatePendingWindow(pendingWindow, trailerSearchUrl)) {
                window.open(trailerSearchUrl, "_blank", "noopener");
            }
            return;
        }

        if (fallbackUrl) {
            if (!navigatePendingWindow(pendingWindow, fallbackUrl)) {
                window.open(fallbackUrl, "_blank", "noopener");
            }
            return;
        }

        closePendingWindow(pendingWindow);

        if (!playableUrl && !fallbackUrl) {
            if (hasLegalWatchLinks(playableAnime)) {
                openAnimeWatch(playableAnime);
                return;
            }

            openAnimeDetail(playableAnime);
        }
    }

    async function addToFavorites(anime, options = {}) {
        const user = getCurrentUser();

        if (!user) {
            showToast("Please sign in before adding favorites.", "warning", {
                title: "Login Required"
            });
            window.location.href = "login.php";
            return { success: false, requires_login: true };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/add_favorite`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    mal_id: anime.mal_id,
                    title: getDisplayTitle(anime),
                    image: getImageUrl(anime),
                    score: anime.score,
                    status: anime.status
                })
            });

            let data = null;

            try {
                data = await response.json();
            } catch (error) {
                data = { success: false, message: "Invalid server response" };
            }

            const message = data?.message || (data?.success ? "Added to favorites" : "Could not add to favorites");

            if (options.silent !== true) {
                showToast(message, data?.success ? "success" : "warning", {
                    title: data?.success ? "Favorite Saved" : "Favorite Not Saved"
                });
            }

            return data;
        } catch (error) {
            console.error("ADD FAVORITE ERROR:", error);

            if (options.silent !== true) {
                showToast("Failed to add favorite.", "error", {
                    title: "Favorite Error"
                });
            }

            return { success: false, message: "Failed to add favorite" };
        }
    }

    function createChip(label, className) {
        const chip = document.createElement("span");
        chip.className = className;
        chip.textContent = label;
        return chip;
    }

    function createActionButton(iconMarkup, label, className) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `card-action ${className}`;
        button.innerHTML = `${iconMarkup}<span>${label}</span>`;
        return button;
    }

    function createAnimeCard(anime) {
        const card = document.createElement("article");
        card.className = "anime-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Open details for ${getDisplayTitle(anime)}`);

        const media = document.createElement("div");
        media.className = "card-media";

        const image = document.createElement("img");
        image.src = getImageUrl(anime);
        image.alt = getDisplayTitle(anime);
        image.loading = "lazy";

        const status = createChip(anime?.status || "Unknown", `card-chip card-status ${getStatusClass(anime?.status)}`);
        const rating = createChip(`Score ${getScoreText(anime?.score)}`, "card-chip card-rating");

        const overlay = document.createElement("div");
        overlay.className = "card-overlay";

        const actions = document.createElement("div");
        actions.className = "card-actions";

        const playButton = createActionButton(ICONS.play, "Play", "card-action-play");
        const watchButton = createActionButton(ICONS.watch, "Watch", "card-action-watch");
        const favoriteButton = createActionButton(ICONS.favorite, "Favorite", "card-action-favorite");
        const detailButton = createActionButton(ICONS.details, "Details", "card-action-details");
        const quickPlayButton = document.createElement("button");
        quickPlayButton.type = "button";
        quickPlayButton.className = "card-quick-play";
        quickPlayButton.setAttribute(
            "aria-label",
            `Play a trailer or preview for ${getDisplayTitle(anime)}`
        );
        quickPlayButton.innerHTML = `
            <span class="card-quick-play-icon">${ICONS.play}</span>
            <span class="card-quick-play-label">${getQuickActionLabel(anime)}</span>
        `;

        playButton.addEventListener("click", async (event) => {
            event.stopPropagation();
            await openAnimePlayback(anime);
        });

        watchButton.addEventListener("click", (event) => {
            event.stopPropagation();
            openAnimeWatch(anime);
        });

        quickPlayButton.addEventListener("click", async (event) => {
            event.stopPropagation();
            await openAnimePlayback(anime);
        });

        favoriteButton.addEventListener("click", async (event) => {
            event.stopPropagation();
            await addToFavorites(anime);
        });

        detailButton.addEventListener("click", (event) => {
            event.stopPropagation();
            openAnimeDetail(anime);
        });

        actions.append(playButton, watchButton, favoriteButton, detailButton);

        const meta = document.createElement("div");
        meta.className = "card-meta";

        const episodes = document.createElement("p");
        episodes.className = "card-episodes";
        episodes.textContent = getEpisodesText(anime);

        const genres = document.createElement("div");
        genres.className = "card-genres";

        const genreNames = getGenreNames(anime).slice(0, 3);

        if (genreNames.length) {
            genreNames.forEach((genre) => {
                genres.appendChild(createChip(genre, "card-genre"));
            });
        } else {
            genres.appendChild(createChip("Genre TBA", "card-genre"));
        }

        meta.append(episodes, genres);
        overlay.append(actions, meta);
        media.append(image, status, rating, quickPlayButton, overlay);

        const info = document.createElement("div");
        info.className = "card-info";

        const title = document.createElement("h3");
        title.className = "card-title";
        title.textContent = getDisplayTitle(anime);

        const subtitle = document.createElement("p");
        subtitle.className = "card-subtitle";
        subtitle.textContent = `${getYear(anime)} - ${getStudioName(anime)}`;

        info.append(title, subtitle);
        card.append(media, info);

        card.addEventListener("click", () => {
            const supportsHover = window.matchMedia("(hover: hover)").matches;

            if (!supportsHover && !card.classList.contains("is-active")) {
                document.querySelectorAll(".anime-card.is-active").forEach((activeCard) => {
                    if (activeCard !== card) {
                        activeCard.classList.remove("is-active");
                    }
                });

                card.classList.add("is-active");
                return;
            }

            openAnimeDetail(anime);
        });

        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openAnimeDetail(anime);
            }
        });

        return card;
    }

    function renderEmptyState(container, message) {
        container.innerHTML = "";

        const state = document.createElement("p");
        state.className = "grid-state";
        state.textContent = message;
        container.appendChild(state);
    }

    function renderAnimeGrid(container, animeList, options = {}) {
        if (!container) {
            return;
        }

        const items = Array.isArray(animeList) ? animeList : [];
        const renderToken = String(Date.now() + Math.random());
        const chunkThreshold = typeof options.chunkThreshold === "number" ? options.chunkThreshold : 48;
        const chunkSize = typeof options.chunkSize === "number" ? options.chunkSize : 24;
        const useChunkedRender = items.length > chunkThreshold;

        container.dataset.renderToken = renderToken;

        container.innerHTML = "";

        if (!items.length) {
            renderEmptyState(container, options.emptyMessage || "No anime found.");
            return;
        }

        if (!useChunkedRender) {
            const fragment = document.createDocumentFragment();

            items.forEach((anime) => {
                fragment.appendChild(createAnimeCard(anime));
            });

            container.appendChild(fragment);
            return;
        }

        const appendChunk = (startIndex) => {
            if (container.dataset.renderToken !== renderToken) {
                return;
            }

            const fragment = document.createDocumentFragment();
            const endIndex = Math.min(startIndex + chunkSize, items.length);

            for (let index = startIndex; index < endIndex; index += 1) {
                fragment.appendChild(createAnimeCard(items[index]));
            }

            container.appendChild(fragment);

            if (endIndex < items.length) {
                window.requestAnimationFrame(() => appendChunk(endIndex));
            }
        };

        appendChunk(0);
    }

    window.AnimeHubUI = {
        API_BASE_URL,
        addToFavorites,
        cacheSelectedAnime,
        createAnimeCard,
        formatCount,
        getCachedAnime,
        getCurrentUser,
        getDisplayTitle,
        getEpisodesText,
        getGenreNames,
        getImageUrl,
        getLegalWatchLinks,
        getPlayableUrl,
        getPlayableEmbedUrl,
        getScoreText,
        getStatusClass,
        getStudioName,
        getYear,
        hasLegalWatchLinks,
        openAnimeDetail,
        openAnimePlayback,
        openAnimeWatch,
        closePlaybackModal,
        closeWatchOptions,
        renderAnimeGrid,
        renderEmptyState
    };

    document.addEventListener("click", (event) => {
        if (event.target.closest(".anime-card")) {
            return;
        }

        document.querySelectorAll(".anime-card.is-active").forEach((card) => {
            card.classList.remove("is-active");
        });
    });
})();
