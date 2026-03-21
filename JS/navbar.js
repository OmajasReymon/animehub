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
    <a href="login.html">Sign In</a>
    <a href="register.html">Sign Up</a>
  `;
}

function goToProfile() {
  alert("User: " + localStorage.getItem("name"));

  window.location.href = "profile.html";

  // later you can redirect to profile page
  // window.location.href = "profile.html";
}