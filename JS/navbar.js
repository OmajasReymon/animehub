const userSection = document.getElementById("userSection");
const name = localStorage.getItem("name");

if (name) {
  // USER IS LOGGED IN → SHOW PROFILE ICON
  userSection.innerHTML = `
    <div class="profile-icon" onclick="goToProfile()">
      👤
    </div>
  `;
} else {
  // NOT LOGGED IN → SHOW LOGIN + REGISTER
  userSection.innerHTML = `
    <a href="login.php">Sign In</a>
    <a href="register.php">Sign Up</a>
  `;
}

function goToProfile() {
  alert("User: " + localStorage.getItem("name"));

  window.location.href = "profile.php";

  // later you can redirect to profile page
  // window.location.href = "profile.php";
}