const profileElements = {
    avatar: document.getElementById("avatarLetter"),
    username: document.getElementById("username"),
    email: document.getElementById("email"),
    handle: document.getElementById("profileHandle"),
    favoritesSaved: document.getElementById("favoritesSaved"),
    averageScore: document.getElementById("averageScore"),
    highRatedCount: document.getElementById("highRatedCount"),
    activityList: document.getElementById("activityList"),
    profileBio: document.getElementById("profileBio"),
    openSettingsButton: document.getElementById("openSettingsButton"),
    openFavoritesButton: document.getElementById("openFavoritesButton")
};

const currentUser = window.AnimeHubAccount.requireUser();

function formatScore(value) {
    return typeof value === "number" ? value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "") : "N/A";
}

function renderFavoriteHighlights(favorites) {
    profileElements.activityList.innerHTML = "";

    if (!favorites.length) {
        profileElements.activityList.innerHTML = `
            <p class="empty-copy">
                No favorites saved yet. Start exploring anime and add a few to build your profile.
            </p>
        `;
        return;
    }

    favorites.slice(0, 5).forEach((favorite) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "activity activity-button";
        item.innerHTML = `
            <div>
                <div class="activity-title">${favorite.title}</div>
                <div class="muted">${favorite.status || "Saved to favorites"}</div>
            </div>
            <div class="muted">Score ${formatScore(favorite.score)}</div>
        `;

        item.addEventListener("click", () => {
            if (favorite.mal_id) {
                window.location.href = `anime-detail.php?mal_id=${encodeURIComponent(favorite.mal_id)}`;
            }
        });

        profileElements.activityList.appendChild(item);
    });
}

function renderStats(favorites) {
    const scoredFavorites = favorites.filter((favorite) => typeof favorite.score === "number");
    const averageScore = scoredFavorites.length
        ? scoredFavorites.reduce((sum, favorite) => sum + favorite.score, 0) / scoredFavorites.length
        : null;
    const highRatedCount = favorites.filter((favorite) => typeof favorite.score === "number" && favorite.score >= 8).length;

    profileElements.favoritesSaved.textContent = String(favorites.length);
    profileElements.averageScore.textContent = formatScore(averageScore);
    profileElements.highRatedCount.textContent = String(highRatedCount);
}

function renderProfile(profile, favorites, settings) {
    profileElements.username.textContent = profile.name;
    profileElements.email.textContent = profile.email;
    profileElements.handle.textContent = settings.username || "@animefan";
    profileElements.profileBio.textContent = settings.bio || "Anime fan building a great watchlist on AnimeHub.";
    profileElements.avatar.textContent = profile.name.charAt(0).toUpperCase();

    renderStats(favorites);
    renderFavoriteHighlights(favorites);
}

async function loadProfilePage() {
    if (!currentUser) {
        return;
    }

    try {
        const [profile, favorites] = await Promise.all([
            window.AnimeHubAccount.fetchProfile(currentUser.user_id).catch(() => currentUser),
            window.AnimeHubAccount.fetchFavorites(currentUser.user_id).catch(() => [])
        ]);
        const settings = window.AnimeHubAccount.getSettings(profile);

        renderProfile(profile, favorites, settings);
    } catch (error) {
        console.error("PROFILE PAGE ERROR:", error);
        profileElements.username.textContent = currentUser.name;
        profileElements.email.textContent = currentUser.email;
        profileElements.avatar.textContent = currentUser.name.charAt(0).toUpperCase();
        profileElements.activityList.innerHTML = `
            <p class="empty-copy">We could not load your profile details right now.</p>
        `;
        profileElements.profileBio.textContent = "Please try refreshing the page.";
    }
}

profileElements.openSettingsButton?.addEventListener("click", () => {
    window.location.href = "setting.php";
});

profileElements.openFavoritesButton?.addEventListener("click", () => {
    window.location.href = "favorites.php";
});

loadProfilePage();
