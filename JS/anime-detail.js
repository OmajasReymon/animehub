const detailElements = {
    backButton: document.getElementById("backButton"),
    poster: document.getElementById("detailPoster"),
    score: document.getElementById("detailScore"),
    type: document.getElementById("detailType"),
    status: document.getElementById("detailStatus"),
    title: document.getElementById("detailTitle"),
    subtitle: document.getElementById("detailSubtitle"),
    description: document.getElementById("detailDescription"),
    genres: document.getElementById("detailGenres"),
    episodes: document.getElementById("detailEpisodes"),
    year: document.getElementById("detailYear"),
    studio: document.getElementById("detailStudio"),
    rating: document.getElementById("detailRating"),
    popularity: document.getElementById("detailPopularity"),
    members: document.getElementById("detailMembers"),
    favorites: document.getElementById("detailFavorites"),
    watchButton: document.getElementById("watchButton"),
    favoriteButton: document.getElementById("favoriteButton"),
    sourceButton: document.getElementById("sourceButton"),
    shareButton: document.getElementById("shareButton"),
    relatedGrid: document.getElementById("relatedGrid"),
    pageState: document.getElementById("pageState")
};

const params = new URLSearchParams(window.location.search);
const selectedMalId = params.get("mal_id");
let currentAnime = null;

function setPageState(message, isVisible) {
    if (!detailElements.pageState) {
        return;
    }

    detailElements.pageState.textContent = message;
    detailElements.pageState.hidden = !isVisible;
}

function renderGenres(anime) {
    detailElements.genres.innerHTML = "";

    const genres = window.AnimeHubUI.getGenreNames(anime);

    if (!genres.length) {
        const pill = document.createElement("span");
        pill.className = "genre-pill";
        pill.textContent = "Genre TBA";
        detailElements.genres.appendChild(pill);
        return;
    }

    genres.forEach((genre) => {
        const pill = document.createElement("span");
        pill.className = "genre-pill";
        pill.textContent = genre;
        detailElements.genres.appendChild(pill);
    });
}

function renderAnimeDetail(anime) {
    currentAnime = anime;
    document.title = `${window.AnimeHubUI.getDisplayTitle(anime)} | AnimeHub`;
    const hasTrailer = Boolean(
        window.AnimeHubUI.getPlayableEmbedUrl(anime) || window.AnimeHubUI.getPlayableUrl(anime)
    );
    const hasWatchLinks = window.AnimeHubUI.hasLegalWatchLinks(anime);

    detailElements.poster.src = window.AnimeHubUI.getImageUrl(anime);
    detailElements.poster.alt = window.AnimeHubUI.getDisplayTitle(anime);
    detailElements.score.textContent = `Score ${window.AnimeHubUI.getScoreText(anime.score)}`;
    detailElements.type.textContent = anime.type || "Anime";
    detailElements.status.textContent = anime.status || "Unknown";
    detailElements.status.className = `status-badge ${window.AnimeHubUI.getStatusClass(anime.status)}`;
    detailElements.title.textContent = window.AnimeHubUI.getDisplayTitle(anime);
    detailElements.subtitle.textContent = `${window.AnimeHubUI.getYear(anime)} - ${window.AnimeHubUI.getStudioName(anime)}`;
    detailElements.description.textContent = anime.synopsis || "No synopsis available yet.";
    detailElements.episodes.textContent = window.AnimeHubUI.getEpisodesText(anime);
    detailElements.year.textContent = window.AnimeHubUI.getYear(anime);
    detailElements.studio.textContent = window.AnimeHubUI.getStudioName(anime);
    detailElements.rating.textContent = anime.rating || "Not rated";
    detailElements.popularity.textContent =
        typeof anime.popularity === "number" ? `#${anime.popularity}` : "N/A";
    detailElements.members.textContent = window.AnimeHubUI.formatCount(anime.members);
    detailElements.favorites.textContent = window.AnimeHubUI.formatCount(anime.favorites);

    detailElements.watchButton.textContent = hasTrailer
        ? "Play Trailer"
        : window.AnimeHubUI.getDisplayTitle(anime)
            ? "Search Trailer"
            : anime?.url
            ? "Open Source"
            : "Open Details";
    detailElements.sourceButton.textContent = hasWatchLinks
        ? "Watch Legally"
        : anime.url
            ? "More Info"
            : "Anime Overview";

    renderGenres(anime);
    setPageState("", false);
}

async function loadRelatedAnime(anime) {
    window.AnimeHubUI.renderEmptyState(detailElements.relatedGrid, "Loading related anime...");

    try {
        const response = await fetch(
            `${window.AnimeHubUI.API_BASE_URL}/recommend?title=${encodeURIComponent(anime.title)}`
        );
        const data = await response.json();

        const relatedAnime = data.success
            ? data.data.filter((item) => item.mal_id !== anime.mal_id).slice(0, 6)
            : [];

        window.AnimeHubUI.renderAnimeGrid(detailElements.relatedGrid, relatedAnime, {
            emptyMessage: "No related anime found yet."
        });
    } catch (error) {
        console.error("RELATED ANIME ERROR:", error);
        window.AnimeHubUI.renderEmptyState(detailElements.relatedGrid, "Failed to load related anime.");
    }
}

async function loadAnimeDetail() {
    const cachedAnime = window.AnimeHubUI.getCachedAnime();

    if (!selectedMalId) {
        if (cachedAnime) {
            renderAnimeDetail(cachedAnime);
            await loadRelatedAnime(cachedAnime);
            return;
        }

        setPageState("No anime was selected. Go back to Home or Browse and choose a card.", true);
        return;
    }

    if (cachedAnime && String(cachedAnime.mal_id) === selectedMalId) {
        renderAnimeDetail(cachedAnime);
    } else {
        setPageState("Loading anime details...", true);
    }

    try {
        const response = await fetch(`${window.AnimeHubUI.API_BASE_URL}/anime/${selectedMalId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to load anime details");
        }

        window.AnimeHubUI.cacheSelectedAnime(data.data);
        renderAnimeDetail(data.data);
        await loadRelatedAnime(data.data);
    } catch (error) {
        console.error("DETAIL LOAD ERROR:", error);

        if (cachedAnime && String(cachedAnime.mal_id) === selectedMalId) {
            setPageState("Showing cached anime details. Live refresh failed.", true);
            await loadRelatedAnime(cachedAnime);
            return;
        }

        setPageState("Failed to load anime details. Please try again.", true);
    }
}

detailElements.backButton?.addEventListener("click", () => {
    if (window.history.length > 1) {
        window.history.back();
        return;
    }

    window.location.href = "browse.php";
});

detailElements.watchButton?.addEventListener("click", () => {
    if (!currentAnime) {
        return;
    }

    window.AnimeHubUI.openAnimePlayback(currentAnime);
});

detailElements.favoriteButton?.addEventListener("click", async () => {
    if (!currentAnime) {
        return;
    }

    await window.AnimeHubUI.addToFavorites(currentAnime);
});

detailElements.sourceButton?.addEventListener("click", () => {
    if (!currentAnime) {
        return;
    }

    if (window.AnimeHubUI.hasLegalWatchLinks(currentAnime)) {
        window.AnimeHubUI.openAnimeWatch(currentAnime);
        return;
    }

    if (currentAnime.url) {
        window.open(currentAnime.url, "_blank", "noopener");
        return;
    }

    window.AnimeHubUI.openAnimeDetail(currentAnime);
});

detailElements.shareButton?.addEventListener("click", async () => {
    if (!currentAnime) {
        return;
    }

    const shareData = {
        title: window.AnimeHubUI.getDisplayTitle(currentAnime),
        text: `Check out ${window.AnimeHubUI.getDisplayTitle(currentAnime)} on AnimeHub.`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            return;
        } catch (error) {
            console.error("SHARE FALLBACK:", error);
        }
    }

    try {
        await navigator.clipboard.writeText(window.location.href);
        alert("Anime link copied to clipboard.");
    } catch (error) {
        console.error("COPY LINK ERROR:", error);
        alert(window.location.href);
    }
});

loadAnimeDetail();
