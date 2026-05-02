<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AnimeHub - Browse</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="stylesheet" href="CSS/browse.css?v=20260424a">
<link rel="stylesheet" href="CSS/anime-card.css?v=20260321d">
<link rel="stylesheet" href="CSS/flash-message.css?v=20260321k">
</head>

<body>

<header class="navbar">

<div class="logo">AnimeHub</div>

<nav>
<a href="index.php">Home</a>
<a href="browse.php" class="active">Browse</a>
</nav>



<div class="auth" id="authSection">

<!-- LOGIN BUTTONS -->
<div id="authButtons">
<a href="login.php" class="btn-outline">Sign in</a>
<a href="register.php" class="btn-outline">Sign up</a>
</div>

<!-- PROFILE MENU -->
<div class="profile-menu" id="profileMenu" style="display:none;">

<div class="avatar" onclick="toggleMenu()">A</div>

<div class="dropdown" id="dropdownMenu" style="display:none;">

<div class="dropdown-header">
<strong id="userName"></strong>
<p id="userEmail"></p>
</div>

<hr>

<a href="profile.php">👤 Profile</a>
<a href="favorites.php">❤️ My Favorites</a>
<a href="setting.php">⚙️ Settings</a>

<hr>

<a href="help.php">❓ Help & Services</a>
<a href="about.php">ℹ️ About Us</a>
<a href="contact.php">✉️ Contact Us</a>

<hr>

<a onclick="logout()" class="logout">🚪 Log out</a>

</div>
</div>

</div>

</header>

<!-- MAIN CONTENT -->
<div class="container">

<h1>Browse Anime</h1>
<p class="subtitle">Discover and explore our complete anime collection</p>

<!-- SEARCH -->
<div class="search-container">
<input type="text" id="searchInput" placeholder="Search by title..." autocomplete="off" onkeydown="if(event.key==='Enter'){searchAnime()}">
<button onclick="searchAnime()">Search</button>
<button onclick="getRecommendations()">Recommend</button>
</div>

<!-- FILTERS -->
<div class="filters">

<span class="filter-title">Filters:</span>

<select id="genreFilter">
<option value="">All Genres</option>
</select>

<select id="statusFilter">
<option value="">All Status</option>
<option value="airing">Ongoing</option>
<option value="complete">Completed</option>
<option value="upcoming">Upcoming</option>
</select>

<select id="popularityFilter">
<option value="">All Popularity</option>
<option value="Top10">Top 10</option>
<option value="Top50">Top 50</option>
<option value="Top100">Top 100</option>
<option value="Top250">Top 250</option>
</select>

<button onclick="clearFilters()" class="clear">Clear Filters</button>

</div>

<p class="results" id="resultCount"></p>

<!-- ANIME GRID -->
<div class="anime-grid" id="animeGrid"></div>
<div class="browse-scroll-status" id="browseInfiniteSentinel" hidden></div>

</div>

<!-- JS FILES -->
<script src="JS/flash-message.js?v=20260321k"></script>
<script src="JS/anime-card.js?v=20260321k"></script>
<script src="JS/browse.js?v=20260424a"></script>

<!-- AUTH + DROPDOWN SCRIPT -->
<script>
document.addEventListener("DOMContentLoaded", function(){

    const user = JSON.parse(localStorage.getItem("user"));

    const authButtons = document.getElementById("authButtons");
    const profileMenu = document.getElementById("profileMenu");

    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const avatar = document.querySelector(".avatar");

    if(user){
        // ✅ USER LOGGED IN
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


// ✅ TOGGLE DROPDOWN
function toggleMenu(){
    const menu = document.getElementById("dropdownMenu");
    if(menu){
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    }
}


// ✅ CLOSE DROPDOWN WHEN CLICK OUTSIDE
document.addEventListener("click", function(e){
    const avatar = document.querySelector(".avatar");
    const menu = document.getElementById("dropdownMenu");

    if (avatar && menu && !avatar.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = "none";
    }
});


// ✅ LOGOUT
function logout(){
    if (window.AnimeHubToast?.queue) {
        window.AnimeHubToast.queue("You have been logged out successfully.", "info", {
            title: "Signed Out"
        });
    }
    localStorage.removeItem("user");
    window.location.href = "index.php";
}
</script>

</body>
</html>
