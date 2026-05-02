<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AnimeHub Settings</title>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="CSS/setting.css?v=20260321j">
<link rel="stylesheet" href="CSS/flash-message.css?v=20260321k">

</head>

<body>

<div class="container">

<div class="page-nav">
    <a href="index.php" class="nav-link">Home</a>
    <a href="browse.php" class="nav-link">Browse</a>
    <a href="profile.php" class="nav-link">Profile</a>
    <a href="favorites.php" class="nav-link">My Favorites</a>
</div>

<h1><i class="fa fa-gear"></i> Settings</h1>
<p class="subtitle">Manage your account settings and preferences</p>

<!-- ACCOUNT SETTINGS -->
<div class="card">

<h3><i class="fa fa-user"></i> Account Settings</h3>
<p class="small">Update your account information</p>

<div class="form-group">
<label>Display Name</label>
<input type="text" id="displayNameInput" placeholder="Your display name">
</div>

<div class="form-group">
<label>Email Address</label>
<input type="email" id="emailInput" placeholder="you@example.com">
</div>

<div class="form-group">
<label>Username</label>
<input type="text" id="usernameInput" placeholder="@username">
</div>

<div class="form-group">
<label>Bio</label>
<textarea id="bioInput" rows="4" placeholder="Tell people about your anime taste"></textarea>
</div>

<button class="save-btn" id="saveSettingsButton" type="button">Save Changes</button>
<p class="small status-text" id="saveStatus"></p>

</div>

<!-- NOTIFICATIONS -->
<div class="card">

<h3><i class="fa fa-bell"></i> Notifications</h3>
<p class="small">Configure how you receive notifications</p>

<div class="row">
<div>
<strong>Email Notifications</strong>
<div class="small">Receive emails about new episodes and updates</div>
</div>

<label class="switch">
<input type="checkbox" id="emailNotificationsToggle">
<span class="slider"></span>
</label>
</div>

<div class="divider"></div>

<div class="row">
<div>
<strong>Push Notifications</strong>
<div class="small">Get push notifications on your device</div>
</div>

<label class="switch">
<input type="checkbox" id="pushNotificationsToggle">
<span class="slider"></span>
</label>
</div>

<div class="divider"></div>

<div class="row">
<div>
<strong>New Release Alerts</strong>
<div class="small">Be notified when new anime are released</div>
</div>

<label class="switch">
<input type="checkbox" id="newReleaseAlertsToggle">
<span class="slider"></span>
</label>
</div>

</div>

<!-- PREFERENCES -->
<div class="card">

<h3><i class="fa fa-globe"></i> Preferences</h3>
<p class="small">Customize your viewing experience</p>

<div class="form-group">
<label>Preferred Language</label>
<select id="preferredLanguageSelect">
<option>English</option>
<option>Japanese</option>
<option>Spanish</option>
<option>French</option>
</select>
</div>

<div class="form-group">
<label>Subtitle Preference</label>
<select id="subtitlePreferenceSelect">
<option>English Subtitles</option>
<option>Japanese Subtitles</option>
<option>No Subtitles</option>
</select>
</div>

<div class="divider"></div>

<div class="row">
<div>
<strong>Auto-play Next Episode</strong>
<div class="small">Automatically start the next episode</div>
</div>

<label class="switch">
<input type="checkbox" id="autoPlayToggle">
<span class="slider"></span>
</label>
</div>

</div>

<!-- PRIVACY -->
<div class="card">

<h3><i class="fa fa-lock"></i> Privacy & Security</h3>
<p class="small">Manage your privacy settings</p>

<div class="row">
<div>
<strong>Show Adult Content</strong>
<div class="small">Display mature content in search and recommendations</div>
</div>

<label class="switch">
<input type="checkbox" id="adultContentToggle">
<span class="slider"></span>
</label>
</div>

<div class="divider"></div>

<div class="row">
<div>
<strong>Profile Visibility</strong>
<div class="small">Make your profile visible to other users</div>
</div>

<label class="switch">
<input type="checkbox" id="profileVisibilityToggle">
<span class="slider"></span>
</label>
</div>

<div class="divider"></div>

<button class="btn-outline" id="viewFavoritesButton" type="button">
<i class="fa fa-heart"></i> View Favorites
</button>

<button class="btn-outline" id="profilePageButton" type="button">
<i class="fa fa-user"></i> Open Profile
</button>

<button class="btn-outline" id="watchHistoryButton" type="button">
<i class="fa fa-lock"></i> Change Password
</button>

<button class="btn-outline" id="manageHistoryButton" type="button">
<i class="fa fa-eye"></i> Manage Watch History
</button>

</div>

<!-- DANGER ZONE -->
<div class="card danger">

<h3 style="color:#e11d48;">Danger Zone</h3>
<p class="small">Irreversible account actions</p>

<button class="btn-outline" id="clearHistoryButton" type="button">Clear Watch History</button>
<button class="btn-outline" id="clearFavoritesButton" type="button">Clear Favorites</button>

<button class="delete" id="logoutButton" type="button">Log Out</button>
<button class="btn-outline" id="deleteAccountButton" type="button">Delete Account</button>

</div>

</div>

<script src="JS/flash-message.js?v=20260321k"></script>
<script src="JS/account.js?v=20260321k"></script>
<script src="JS/setting.js?v=20260321k"></script>
</body>
</html>
