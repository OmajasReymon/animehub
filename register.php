<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AnimeHub Register</title>

<link rel="stylesheet" href="CSS/register.css">

<!-- Google Font -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

</head>

<body>

<div class="container">

<div class="logo">A</div>

<h1>Create an account</h1>
<p class="subtitle">Join AnimeHub to start tracking your favorite shows</p>

<div class="card">

<!-- ✅ FORM -->
<form id="registerForm" onsubmit="register(event)">

<div class="form-group">
<label for="name">Name</label>
<div class="input-box">
<i>👤</i>
<input id="name" name="name" type="text" placeholder="Your name" required>
</div>
</div>

<div class="form-group">
<label for="email">Email</label>
<div class="input-box">
<i>✉️</i>
<input id="email" name="email" type="email" placeholder="you@example.com" required>
</div>
</div>

<div class="form-group">
<label for="password">Password</label>
<div class="input-box">
<i>🔒</i>
<input id="password" name="password" type="password" placeholder="Create a password" required>
<span class="toggle" onclick="togglePassword()">👁</span>
</div>
</div>

<div class="form-group">
<label for="confirmPassword">Confirm Password</label>
<div class="input-box">
<i>🔒</i>
<input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm your password" required>
</div>
</div>

<!-- 🔥 BUTTON -->
<button type="submit" class="btn">Create account</button>

</form>

<div class="divider"><span>OR CONTINUE WITH</span></div>

<div class="socials">
<button type="button" class="social-btn">🌐 Google</button>
<button type="button" class="social-btn">📘 Facebook</button>
</div>

</div>

<p class="footer">
Already have an account? <a href="login.php">Sign in</a>
</p>

</div>

<!-- ✅ LOAD JS LAST -->
<script src="JS/register.js"></script>

</body>
</html>