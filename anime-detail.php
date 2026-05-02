<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Anime Detail | AnimeHub</title>
<link rel="stylesheet" href="CSS/flash-message.css?v=20260321k">
<link rel="stylesheet" href="CSS/anime-card.css?v=20260321d">
<link rel="stylesheet" href="CSS/anime-detail.css?v=20260321d">
</head>
<body>

<header class="navbar">
    <div class="logo">AnimeHub</div>

    <nav>
        <a href="index.php">Home</a>
        <a href="browse.php" class="active">Browse</a>
    </nav>

    <div class="auth" id="authSection">
        <div id="authButtons">
            <a href="login.php" class="btn-outline">Sign in</a>
            <a href="register.php" class="btn-outline">Sign up</a>
        </div>

        <div class="profile-menu" id="profileMenu" style="display:none;">
            <div class="avatar" onclick="toggleMenu()">A</div>

            <div class="dropdown" id="dropdownMenu" style="display:none;">
                <div class="dropdown-header">
                    <strong id="userName"></strong>
                    <p id="userEmail"></p>
                </div>

                <hr>

                <a href="profile.php">Profile</a>
                <a href="favorites.php">My Favorites</a>
                <a href="setting.php">Settings</a>

                <hr>

                <a href="help.php">Help &amp; Services</a>
                <a href="about.php">About Us</a>
                <a href="contact.php">Contact Us</a>

                <hr>

                <a onclick="logout()" class="logout">Log out</a>
            </div>
        </div>
    </div>
</header>

<main class="detail-shell">
    <button class="back-btn" id="backButton" type="button">Back</button>
    <p class="page-state" id="pageState" hidden>Loading anime details...</p>

    <section class="detail-layout">
        <aside class="poster-panel">
            <div class="poster-card">
                <div class="poster-frame">
                    <img id="detailPoster" src="" alt="Anime poster">
                    <span class="poster-score" id="detailScore">Score N/A</span>
                </div>

                <div class="detail-actions">
                    <button class="primary-action" id="watchButton" type="button">Play Trailer</button>
                    <button class="secondary-action" id="favoriteButton" type="button">Add to Favorites</button>
                    <button class="secondary-action" id="sourceButton" type="button">Watch Legally</button>
                </div>
            </div>
        </aside>

        <section class="detail-content">
            <div class="detail-kicker">
                <span class="type-badge" id="detailType">Anime</span>
                <span class="status-badge neutral" id="detailStatus">Unknown</span>
            </div>

            <h1 class="detail-title" id="detailTitle">Loading...</h1>
            <p class="detail-subtitle" id="detailSubtitle">Please wait while we load the anime details.</p>
            <p class="detail-description" id="detailDescription">No synopsis available yet.</p>

            <div class="genre-list" id="detailGenres"></div>

            <section class="stats-grid">
                <article class="stat-card">
                    <span class="stat-label">Episodes</span>
                    <strong class="stat-value" id="detailEpisodes">N/A</strong>
                </article>

                <article class="stat-card">
                    <span class="stat-label">Year</span>
                    <strong class="stat-value" id="detailYear">N/A</strong>
                </article>

                <article class="stat-card">
                    <span class="stat-label">Studio</span>
                    <strong class="stat-value" id="detailStudio">N/A</strong>
                </article>

                <article class="stat-card">
                    <span class="stat-label">Rating</span>
                    <strong class="stat-value" id="detailRating">N/A</strong>
                </article>

                <article class="stat-card">
                    <span class="stat-label">Popularity</span>
                    <strong class="stat-value" id="detailPopularity">N/A</strong>
                </article>

                <article class="stat-card">
                    <span class="stat-label">Members</span>
                    <strong class="stat-value" id="detailMembers">N/A</strong>
                </article>

                <article class="stat-card">
                    <span class="stat-label">Favorites</span>
                    <strong class="stat-value" id="detailFavorites">N/A</strong>
                </article>

                <article class="stat-card stat-card-wide">
                    <span class="stat-label">Share</span>
                    <button class="share-button" id="shareButton" type="button">Copy Link</button>
                </article>
            </section>
        </section>
    </section>

    <section class="related-section">
        <div class="section-heading">
            <h2>You Might Also Like</h2>
            <p>Recommendations based on the anime you opened.</p>
        </div>

        <div class="related-grid" id="relatedGrid"></div>
    </section>
</main>

<script src="JS/flash-message.js?v=20260321k"></script>
<script src="JS/anime-card.js?v=20260321k"></script>
<script src="JS/anime-detail.js?v=20260321k"></script>
<script>
document.addEventListener("DOMContentLoaded", function(){
    const user = JSON.parse(localStorage.getItem("user"));
    const authButtons = document.getElementById("authButtons");
    const profileMenu = document.getElementById("profileMenu");
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const avatar = document.querySelector(".avatar");

    if(user){
        if(authButtons) authButtons.style.display = "none";
        if(profileMenu) profileMenu.style.display = "flex";
        if(userName) userName.textContent = user.name;
        if(userEmail) userEmail.textContent = user.email;

        if(avatar){
            avatar.textContent = user.name.charAt(0).toUpperCase();
        }
    } else {
        if(authButtons) authButtons.style.display = "block";
        if(profileMenu) profileMenu.style.display = "none";
    }
});

function toggleMenu(){
    const menu = document.getElementById("dropdownMenu");

    if(menu){
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    }
}

function logout(){
    if (window.AnimeHubToast?.queue) {
        window.AnimeHubToast.queue("You have been logged out successfully.", "info", {
            title: "Signed Out"
        });
    }
    localStorage.removeItem("user");
    window.location.href = "index.php";
}

document.addEventListener("click", function(e){
    const avatar = document.querySelector(".avatar");
    const menu = document.getElementById("dropdownMenu");

    if (avatar && menu && !avatar.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = "none";
    }
});
</script>
</body>
</html>
