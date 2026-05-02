<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>My Favorites</title>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="CSS/favorites.css?v=20260321j">
</head>

<body>

<div class="container">

<div class="page-nav">
    <a href="index.php" class="nav-link">Home</a>
    <a href="browse.php" class="nav-link">Browse</a>
    <a href="profile.php" class="nav-link">Profile</a>
    <a href="setting.php" class="nav-link">Settings</a>
</div>

<div class="header">
<i class="fa-solid fa-heart"></i>
<h1>My Favorites</h1>
</div>

<p class="subtitle">Your collection of favorite anime series</p>

<div class="topbar">
<p id="count"></p>
<select id="sortFavorites" class="sort-btn">
    <option value="title">Sort: Title A-Z</option>
    <option value="score">Sort: Highest Score</option>
    <option value="status">Sort: Status</option>
</select>
</div>

<!-- GRID -->
<div class="grid" id="grid"></div>

<!-- EMPTY STATE -->
<div class="empty" id="empty" style="display:none;">
<i class="fa-regular fa-heart"></i>
<h2>No favorites yet</h2>
<p>Start adding anime to your favorites to see them here!</p>
<button class="browse" id="browseAnimeButton" type="button">Browse Anime</button>
</div>

</div>

<!-- JS -->
<script src="JS/account.js?v=20260321k"></script>
<script src="JS/favorites.js?v=20260321j"></script>

</body>
</html>
