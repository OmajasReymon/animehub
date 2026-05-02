<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AnimeHub</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="stylesheet" href="CSS/index.css?v=20260321d">
<link rel="stylesheet" href="CSS/anime-card.css?v=20260321d">
<link rel="stylesheet" href="CSS/flash-message.css?v=20260321k">

</head>
<body>

<header class="navbar">
    <div class="logo">AnimeHub</div>

    <nav>
        <a href="index.php" class="active btn-primary">Home</a>
        <a href="browse.php" class="btn-outline">Browse</a>
    </nav>

    

   <div class="auth" id="authSection">

<!-- LOGIN BUTTONS -->
<div id="authButtons">
<a href="login.php" class="btn-outline">Sign in</a>
<a href="register.php" class="btn-outline">Sign up</a>
</div>


<!-- PROFILE ICON -->
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


<section class="hero">
    <h4>✨ FEATURED</h4>
    <h1>Discover Amazing Anime</h1>

    <p>
        Explore thousands of anime series and movies.
        Get personalized recommendations and track your favorites.
    </p>

    <button class="btn-start">Start Watching</button>
</section>



<section class="tabs">

<div class="tab-buttons">
<button class="tab active" onclick="showTab('trending', this)">Trending</button>
<button class="tab" onclick="showTab('top', this)">Top Rated</button>
<button class="tab" onclick="showTab('new', this)">New</button>
</div>


<div id="trending" class="tab-content active">

<h2>Trending Now</h2>

<div class="anime-grid" id="animeGrid">
</div>
</div>


<div id="top" class="tab-content">
<h2>Highest Rated</h2>
<div class="anime-grid" id="topAnimeGrid"></div>
</div>


<div id="new" class="tab-content">
<h2>New Releases</h2>
<div class="anime-grid" id="newAnimeGrid"></div>
</div>

</section>




<script src="JS/flash-message.js?v=20260321k"></script>
<script src="JS/index.js?v=20260321k"></script>
<script src="JS/anime-card.js?v=20260321k"></script>
<script src="JS/api.js?v=20260321k"></script>

<script>
document.addEventListener("DOMContentLoaded", function(){

    const user = JSON.parse(localStorage.getItem("user"));

    const authButtons = document.getElementById("authButtons");
    const profileMenu = document.getElementById("profileMenu");

    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const navUserName = document.getElementById("navUserName");
    const avatar = document.querySelector(".avatar");

    if(user){
        // ✅ USER LOGGED IN
        authButtons.style.display = "none";
        profileMenu.style.display = "flex";

        if(userName) userName.textContent = user.name;
        if(userEmail) userEmail.textContent = user.email;
        if(navUserName) navUserName.textContent = user.name;

        if(avatar){
            avatar.textContent = user.name.charAt(0).toUpperCase();
        }

    } else {
        authButtons.style.display = "block";
        profileMenu.style.display = "none";
    }

});


// ✅ TOGGLE DROPDOWN
function toggleMenu(){
    const menu = document.getElementById("dropdownMenu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}


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


// ✅ CLOSE DROPDOWN WHEN CLICK OUTSIDE
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
