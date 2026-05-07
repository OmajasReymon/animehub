<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AnimeHub Admin</title>

<link rel="stylesheet" href="CSS/admin.css?v=20260507a">
<link rel="stylesheet" href="CSS/flash-message.css?v=20260321k">
</head>
<body>

<div class="admin-layout">

<header class="admin-header">
    <a href="index.php" class="brand">
        <span class="brand-mark">A</span>
        <span>AnimeHub</span>
    </a>

    <nav class="admin-nav">
        <a href="index.php">Home</a>
        <a href="browse.php">Browse</a>
        <a href="profile.php">Profile</a>
        <button type="button" id="logoutButton">Log out</button>
    </nav>
</header>

<main>

<section class="page-heading">
    <div>
        <p class="eyebrow">Admin</p>
        <h1>Dashboard</h1>
        <p id="adminIdentity" class="muted">Loading account...</p>
    </div>
    <a href="login.php" class="secondary-action">Switch Account</a>
</section>

<div class="status" id="adminStatus">Loading dashboard...</div>

<section class="stats-grid" aria-label="Admin overview">
    <article class="stat-card">
        <span class="stat-label">Users</span>
        <strong id="totalUsers">0</strong>
    </article>

    <article class="stat-card">
        <span class="stat-label">Admins</span>
        <strong id="totalAdmins">0</strong>
    </article>

    <article class="stat-card">
        <span class="stat-label">Favorites</span>
        <strong id="totalFavorites">0</strong>
    </article>

    <article class="stat-card">
        <span class="stat-label">Active Collectors</span>
        <strong id="activeCollectors">0</strong>
    </article>
</section>

<section class="admin-panel">
    <div class="panel-header">
        <div>
            <h2>Registered Users</h2>
            <p class="muted">Latest accounts in AnimeHub.</p>
        </div>
    </div>

    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                </tr>
            </thead>
            <tbody id="usersTable">
                <tr><td colspan="4">Loading users...</td></tr>
            </tbody>
        </table>
    </div>
</section>

<section class="admin-panel">
    <div class="panel-header">
        <div>
            <h2>Recent Favorites</h2>
            <p class="muted">Newest saved anime across users.</p>
        </div>
    </div>

    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>User</th>
                    <th>Anime</th>
                    <th>Score</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="favoritesTable">
                <tr><td colspan="4">Loading favorites...</td></tr>
            </tbody>
        </table>
    </div>
</section>

</main>

</div>

<script src="JS/flash-message.js?v=20260321k"></script>
<script src="JS/account.js?v=20260321k"></script>
<script src="JS/admin.js?v=20260507a"></script>
</body>
</html>
