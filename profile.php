<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Anime Profile</title>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="CSS/profile.css?v=20260321j">

</head>

<body>

<div class="container">

<div class="page-nav">
    <a href="index.php" class="nav-link">Home</a>
    <a href="browse.php" class="nav-link">Browse</a>
    <a href="favorites.php" class="nav-link">My Favorites</a>
    <a href="setting.php" class="nav-link">Settings</a>
</div>

<!-- Profile Header -->
<div class="card">
<div class="card-content">

<div class="profile-header">

<div class="avatar" id="avatarLetter">A</div>

<div class="profile-info">

<h1 id="username">Loading profile...</h1>

<div class="profile-meta muted">
<i class="fa fa-envelope"></i>
<span id="email">Loading email...</span>
</div>

<div class="profile-meta muted">
<i class="fa fa-at"></i>
<span id="profileHandle">@animefan</span>
</div>

</div>

<div class="profile-actions">
    <button class="edit-btn" id="openSettingsButton" type="button">Open Settings</button>
    <button class="ghost-btn" id="openFavoritesButton" type="button">View Favorites</button>
</div>

</div>

</div>
</div>

<!-- Stats -->
<div class="stats">

<div class="card">
<div class="card-content stat-box">

<div class="icon-box">
<i class="fa fa-star"></i>
</div>

<div>
<div class="stat-value" id="favoritesSaved">0</div>
<div class="stat-label">Favorites Saved</div>
</div>

</div>
</div>

<div class="card">
<div class="card-content stat-box">

<div class="icon-box">
<i class="fa fa-clock"></i>
</div>

<div>
<div class="stat-value" id="averageScore">N/A</div>
<div class="stat-label">Average Score</div>
</div>

</div>
</div>

<div class="card">
<div class="card-content stat-box">

<div class="icon-box">
<i class="fa fa-chart-line"></i>
</div>

<div>
<div class="stat-value" id="highRatedCount">0</div>
<div class="stat-label">Score 8+ Picks</div>
</div>

</div>
</div>

</div>

<!-- Recent Activity -->
<div class="card">

<div class="card-header">
<h3>Favorite Highlights</h3>
<p class="muted">Quick access to the anime you saved.</p>
</div>

<div class="card-content" id="activityList"></div>

</div>

<!-- About -->
<div class="card">

<div class="card-header">
<h3>About</h3>
</div>

<div class="card-content">
<p class="about" id="profileBio">Loading profile bio...</p>
</div>

</div>

</div>

<script src="JS/account.js?v=20260321k"></script>
<script src="JS/profile.js?v=20260321j"></script>

</body>
</html>
