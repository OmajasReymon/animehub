const favoritesElements = {
    grid: document.getElementById("grid"),
    empty: document.getElementById("empty"),
    count: document.getElementById("count"),
    sortFavorites: document.getElementById("sortFavorites"),
    browseAnimeButton: document.getElementById("browseAnimeButton")
};

const favoritesUser = window.AnimeHubAccount.requireUser();
let favoritesState = [];

function showToast(message, type = "info", options = {}) {
    if (window.AnimeHubToast?.show) {
        window.AnimeHubToast.show(message, type, options);
        return;
    }

    alert(message);
}

function sortFavoritesList(list, sortMode) {
    const items = [...list];

    if (sortMode === "score") {
        return items.sort((first, second) => {
            const firstScore = typeof first.score === "number" ? first.score : -1;
            const secondScore = typeof second.score === "number" ? second.score : -1;
            return secondScore - firstScore;
        });
    }

    if (sortMode === "status") {
        return items.sort((first, second) => String(first.status || "").localeCompare(String(second.status || "")));
    }

    return items.sort((first, second) => String(first.title || "").localeCompare(String(second.title || "")));
}

function renderFavorites() {
    const sortMode = favoritesElements.sortFavorites?.value || "title";
    const favorites = sortFavoritesList(favoritesState, sortMode);

    favoritesElements.grid.innerHTML = "";

    if (!favorites.length) {
        favoritesElements.grid.style.display = "none";
        favoritesElements.empty.style.display = "block";
        favoritesElements.count.textContent = "0 anime saved";
        return;
    }

    favoritesElements.grid.style.display = "grid";
    favoritesElements.empty.style.display = "none";
    favoritesElements.count.textContent = `${favorites.length} anime saved`;

    favorites.forEach((anime) => {
        const card = document.createElement("article");
        card.className = "card";
        card.tabIndex = 0;
        card.innerHTML = `
            <span class="badge">${anime.status || "Unknown"}</span>
            <span class="rating">Score ${typeof anime.score === "number" ? anime.score.toFixed(2).replace(/0+$/, "").replace(/\.$/, "") : "N/A"}</span>
            <img src="${anime.image}" alt="${anime.title}">
            <button class="remove" type="button" aria-label="Remove ${anime.title} from favorites">Remove</button>
            <div class="info">
                <div class="title">${anime.title}</div>
                <div class="meta">MAL ID: ${anime.mal_id}</div>
            </div>
        `;

        card.addEventListener("click", () => {
            if (anime.mal_id) {
                window.location.href = `anime-detail.php?mal_id=${encodeURIComponent(anime.mal_id)}`;
            }
        });

        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                card.click();
            }
        });

        card.querySelector(".remove")?.addEventListener("click", async (event) => {
            event.stopPropagation();

            try {
                await window.AnimeHubAccount.removeFavorite(favoritesUser.user_id, anime.mal_id);
                favoritesState = favoritesState.filter((favorite) => favorite.mal_id !== anime.mal_id);
                renderFavorites();
                showToast(`${anime.title} was removed from your favorites.`, "success", {
                    title: "Favorite Removed"
                });
            } catch (error) {
                console.error("REMOVE FAVORITE ERROR:", error);
                showToast(error.message || "Failed to remove favorite", "error", {
                    title: "Remove Failed"
                });
            }
        });

        favoritesElements.grid.appendChild(card);
    });
}

async function loadFavorites() {
    if (!favoritesUser) {
        return;
    }

    try {
        favoritesElements.grid.innerHTML = "Loading favorites...";
        favoritesState = await window.AnimeHubAccount.fetchFavorites(favoritesUser.user_id);
        renderFavorites();
    } catch (error) {
        console.error("LOAD FAVORITES ERROR:", error);
        favoritesElements.grid.innerHTML = "Failed to load favorites.";
    }
}

favoritesElements.sortFavorites?.addEventListener("change", renderFavorites);
favoritesElements.browseAnimeButton?.addEventListener("click", () => {
    window.location.href = "browse.php";
});

loadFavorites();
