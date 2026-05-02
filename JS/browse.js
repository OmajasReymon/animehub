const animeGrid = document.getElementById("animeGrid");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");
const genreFilter = document.getElementById("genreFilter");
const statusFilter = document.getElementById("statusFilter");
const popularityFilter = document.getElementById("popularityFilter");
const browseInfiniteSentinel = document.getElementById("browseInfiniteSentinel");

const DEFAULT_BROWSE_LIMIT = 24;
const GENRE_BROWSE_LIMIT = 24;
const SEARCH_BROWSE_LIMIT = 24;

let currentAnime = [];
let activeController = null;
let activeFetchId = 0;
let activeSessionId = 0;
let currentMode = "browse";
let currentPage = 0;
let hasNextPage = false;
let isFetchingPage = false;
let infiniteObserver = null;

function getAnimeYearValue(anime) {
    const year = anime?.year || anime?.aired?.prop?.from?.year;
    return typeof year === "number" ? year : 0;
}

function getAnimeStatusBucket(status) {
    const normalized = String(status || "").trim().toLowerCase();

    if (normalized.includes("airing")) {
        return "airing";
    }

    if (normalized.includes("finished")) {
        return "complete";
    }

    if (normalized.includes("not yet") || normalized.includes("upcoming")) {
        return "upcoming";
    }

    return "";
}

function matchesGenre(anime, selectedGenreId) {
    if (!selectedGenreId) {
        return true;
    }

    return (anime?.genres || []).some((genre) => String(genre.mal_id) === selectedGenreId);
}

function matchesStatus(anime, selectedStatus) {
    if (!selectedStatus) {
        return true;
    }

    return getAnimeStatusBucket(anime?.status) === selectedStatus;
}

function matchesPopularity(anime, selectedPopularity) {
    if (!selectedPopularity) {
        return true;
    }

    const popularityRank =
        typeof anime?.popularity === "number" ? anime.popularity : Number.MAX_SAFE_INTEGER;

    if (selectedPopularity === "Top10") {
        return popularityRank <= 10;
    }

    if (selectedPopularity === "Top50") {
        return popularityRank <= 50;
    }

    if (selectedPopularity === "Top100") {
        return popularityRank <= 100;
    }

    if (selectedPopularity === "Top250") {
        return popularityRank <= 250;
    }

    return true;
}

function sortAnimeList(list) {
    return [...list].sort((first, second) => {
        const firstPopularity =
            typeof first?.popularity === "number" ? first.popularity : Number.MAX_SAFE_INTEGER;
        const secondPopularity =
            typeof second?.popularity === "number" ? second.popularity : Number.MAX_SAFE_INTEGER;

        if (firstPopularity !== secondPopularity) {
            return firstPopularity - secondPopularity;
        }

        const secondScore = typeof second?.score === "number" ? second.score : -1;
        const firstScore = typeof first?.score === "number" ? first.score : -1;

        if (secondScore !== firstScore) {
            return secondScore - firstScore;
        }

        const secondYear = getAnimeYearValue(second);
        const firstYear = getAnimeYearValue(first);

        if (secondYear !== firstYear) {
            return secondYear - firstYear;
        }

        return window.AnimeHubUI
            .getDisplayTitle(first)
            .localeCompare(window.AnimeHubUI.getDisplayTitle(second));
    });
}

function getEmptyMessage() {
    if (currentMode === "recommend") {
        return "No recommendations matched your filters.";
    }

    if (currentMode === "search") {
        return "No anime matched your search.";
    }

    return "No anime matched your filters.";
}

function mergeAnimeLists(existingList, incomingList) {
    const merged = [...existingList];
    const seenIds = new Set(
        existingList
            .map((anime) => anime?.mal_id)
            .filter((malId) => malId !== undefined && malId !== null)
    );

    (incomingList || []).forEach((anime) => {
        const malId = anime?.mal_id;

        if (malId !== undefined && malId !== null) {
            if (seenIds.has(malId)) {
                return;
            }

            seenIds.add(malId);
        }

        merged.push(anime);
    });

    return merged;
}

function renderInfiniteStatus(message = "") {
    if (!browseInfiniteSentinel) {
        return;
    }

    if (currentMode === "recommend") {
        browseInfiniteSentinel.hidden = true;
        browseInfiniteSentinel.textContent = "";
        return;
    }

    const shouldShow =
        Boolean(message) ||
        isFetchingPage ||
        hasNextPage ||
        currentAnime.length > 0;

    browseInfiniteSentinel.hidden = !shouldShow;

    if (!shouldShow) {
        browseInfiniteSentinel.textContent = "";
        return;
    }

    if (message) {
        browseInfiniteSentinel.textContent = message;
        return;
    }

    if (isFetchingPage) {
        browseInfiniteSentinel.textContent = "Loading more anime...";
        return;
    }

    if (hasNextPage) {
        browseInfiniteSentinel.textContent = "Scroll to load more anime...";
        return;
    }

    browseInfiniteSentinel.textContent = "You've reached the end of the anime list.";
}

function buildBrowseUrl(options = {}) {
    const params = new URLSearchParams();
    const query =
        typeof options.query === "string"
            ? options.query.trim()
            : "";
    const selectedGenreId =
        options.genreId !== undefined ? options.genreId : genreFilter?.value || "";
    const selectedStatus =
        options.status !== undefined ? options.status : statusFilter?.value || "";
    const limit =
        typeof options.limit === "number"
            ? options.limit
            : query
                ? SEARCH_BROWSE_LIMIT
                : selectedGenreId
                    ? GENRE_BROWSE_LIMIT
                    : DEFAULT_BROWSE_LIMIT;
    const page =
        typeof options.page === "number" && options.page > 0
            ? options.page
            : 1;

    params.set("limit", String(limit));
    params.set("page", String(page));

    if (query) {
        params.set("q", query);
    }

    if (selectedGenreId) {
        params.set("genre_id", selectedGenreId);
    }

    if (selectedStatus) {
        params.set("status", selectedStatus);
    }

    return `${window.AnimeHubUI.API_BASE_URL}/anime/browse?${params.toString()}`;
}

function renderCurrentAnime(emptyMessage = getEmptyMessage()) {
    const selectedGenreId = genreFilter?.value || "";
    const selectedStatus = statusFilter?.value || "";
    const selectedPopularity = popularityFilter?.value || "";

    const filteredAnime = currentAnime.filter((anime) => {
        return (
            matchesGenre(anime, selectedGenreId) &&
            matchesStatus(anime, selectedStatus) &&
            matchesPopularity(anime, selectedPopularity)
        );
    });

    const visibleAnime = currentMode === "browse"
        ? sortAnimeList(filteredAnime)
        : filteredAnime;
    const resultLabel = visibleAnime.length === 1 ? "anime" : "anime";

    if (resultCount) {
        if (currentMode === "recommend") {
            resultCount.textContent = `${visibleAnime.length} ${visibleAnime.length === 1 ? "result" : "results"} found`;
        } else if (hasNextPage) {
            resultCount.textContent = `Showing ${visibleAnime.length} ${resultLabel}. Keep scrolling for more.`;
        } else {
            resultCount.textContent = `Showing ${visibleAnime.length} ${resultLabel}.`;
        }
    }

    window.AnimeHubUI.renderAnimeGrid(animeGrid, visibleAnime, {
        emptyMessage
    });
    renderInfiniteStatus();
}

async function loadGenreOptions() {
    if (!genreFilter) {
        return;
    }

    try {
        const response = await fetch(`${window.AnimeHubUI.API_BASE_URL}/genres/anime`);
        const payload = await response.json();

        if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
            throw new Error(payload.message || "Failed to load genres");
        }

        const genreOptions = payload.data
            .filter((genre) => genre?.mal_id && genre?.name)
            .sort((first, second) => first.name.localeCompare(second.name));

        genreFilter.innerHTML = '<option value="">All Genres</option>';

        genreOptions.forEach((genre) => {
            const option = document.createElement("option");
            option.value = String(genre.mal_id);
            option.textContent = genre.name;
            genreFilter.appendChild(option);
        });
    } catch (error) {
        console.error("GENRE LOAD ERROR:", error);
    }
}

async function fetchAnimeList(url, mode, options = {}) {
    const append = options.append === true;

    if (append && (isFetchingPage || !hasNextPage)) {
        return;
    }

    if (!append) {
        activeSessionId += 1;

        if (activeController) {
            activeController.abort();
        }

        currentAnime = [];
        currentPage = 0;
        hasNextPage = false;
    }

    const sessionId = activeSessionId;
    const fetchId = ++activeFetchId;
    const controller = new AbortController();

    activeController = controller;
    currentMode = mode;
    isFetchingPage = true;

    if (!append) {
        window.AnimeHubUI.renderEmptyState(animeGrid, options.loadingMessage || "Loading anime...");
    }

    renderInfiniteStatus(
        append ? options.loadingMoreMessage || "Loading more anime..." : ""
    );

    try {
        const response = await fetch(url, {
            signal: controller.signal
        });
        const payload = await response.json();

        if (sessionId !== activeSessionId) {
            return;
        }

        if (!response.ok || payload?.success === false) {
            throw new Error(payload?.message || "Failed to load anime");
        }

        let items = [];

        if (Array.isArray(payload)) {
            items = payload;
        } else if (Array.isArray(payload?.data)) {
            items = payload.data;
        }

        currentAnime = append ? mergeAnimeLists(currentAnime, items) : items;
        hasNextPage = currentMode !== "recommend" && Boolean(payload?.pagination?.has_next_page);
        currentPage =
            typeof payload?.pagination?.current_page === "number" && payload.pagination.current_page > 0
                ? payload.pagination.current_page
                : (append ? currentPage + 1 : 1);

        renderCurrentAnime(options.emptyMessage || getEmptyMessage());
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        console.error("ANIME LOAD ERROR:", error);

        if (sessionId !== activeSessionId) {
            return;
        }

        if (!append) {
            currentAnime = [];
            hasNextPage = false;

            if (resultCount) {
                resultCount.textContent = "0 results found";
            }

            window.AnimeHubUI.renderEmptyState(animeGrid, options.errorMessage || "Failed to load anime.");
        }

        renderInfiniteStatus(append ? "Could not load more anime." : "");
    } finally {
        if (fetchId === activeFetchId) {
            isFetchingPage = false;

            if (activeController === controller) {
                activeController = null;
            }
        }

        renderInfiniteStatus();
    }
}

function loadDefaultAnime(page = 1, append = false) {
    fetchAnimeList(
        buildBrowseUrl({
            page
        }),
        "browse",
        {
            append,
            loadingMessage: "Loading anime...",
            loadingMoreMessage: "Loading more anime...",
            emptyMessage: "No anime available right now.",
            errorMessage: "Failed to load anime."
        }
    );
}

function searchAnime(page = 1, append = false) {
    const query = searchInput?.value.trim() || "";

    if (!query) {
        loadDefaultAnime(1, false);
        return;
    }

    fetchAnimeList(
        buildBrowseUrl({
            query,
            page,
            limit: SEARCH_BROWSE_LIMIT
        }),
        "search",
        {
            append,
            loadingMessage: "Searching anime...",
            loadingMoreMessage: "Loading more search results...",
            emptyMessage: "No anime matched your search.",
            errorMessage: "Failed to search anime."
        }
    );
}

function maybeLoadNextPage() {
    if (currentMode === "recommend" || !hasNextPage || isFetchingPage) {
        return;
    }

    const query = searchInput?.value.trim() || "";

    if (currentMode === "search" || query) {
        searchAnime(currentPage + 1, true);
        return;
    }

    loadDefaultAnime(currentPage + 1, true);
}

function ensureInfiniteObserver() {
    if (!browseInfiniteSentinel || infiniteObserver) {
        return;
    }

    infiniteObserver = new IntersectionObserver(
        (entries) => {
            const [entry] = entries;

            if (!entry?.isIntersecting) {
                return;
            }

            maybeLoadNextPage();
        },
        {
            rootMargin: "600px 0px 600px 0px"
        }
    );

    infiniteObserver.observe(browseInfiniteSentinel);
}

function getRecommendations() {
    const query = searchInput?.value.trim() || "";

    if (!query) {
        alert("Enter an anime title first");
        return;
    }

    fetchAnimeList(
        `${window.AnimeHubUI.API_BASE_URL}/recommend?title=${encodeURIComponent(query)}`,
        "recommend",
        {
            loadingMessage: "Getting recommendations...",
            emptyMessage: "No recommendations matched your filters.",
            errorMessage: "Failed to load recommendations."
        }
    );
}

function clearFilters() {
    if (genreFilter) genreFilter.value = "";
    if (statusFilter) statusFilter.value = "";
    if (popularityFilter) popularityFilter.value = "";
    if (searchInput) searchInput.value = "";

    loadDefaultAnime(1, false);
}

function refreshBrowseResults() {
    if (currentMode === "recommend") {
        renderCurrentAnime();
        return;
    }

    const query = searchInput?.value.trim() || "";

    if (query) {
        searchAnime(1, false);
        return;
    }

    loadDefaultAnime(1, false);
}

genreFilter?.addEventListener("change", refreshBrowseResults);
statusFilter?.addEventListener("change", refreshBrowseResults);
popularityFilter?.addEventListener("change", () => renderCurrentAnime());

if (searchInput) {
    searchInput.value = "";
}

ensureInfiniteObserver();
loadGenreOptions();
loadDefaultAnime(1, false);
