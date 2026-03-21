const name = localStorage.getItem("name");
const email = localStorage.getItem("email");

// If not logged in → redirect
if (!name) {
  window.location.href = "login.html";
}

// Set username
document.getElementById("username").innerText = name;

// Set email
document.getElementById("email").innerText = email;

// Set avatar letter (first letter of name)
document.getElementById("avatarLetter").innerText = name.charAt(0).toUpperCase();