function togglePassword() {
    const password = document.getElementById("password");
    password.type = password.type === "password" ? "text" : "password";
}

function showToast(message, type = "info", options = {}) {
    if (window.AnimeHubToast?.show) {
        window.AnimeHubToast.show(message, type, options);
        return;
    }

    alert(message);
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("loginForm")
        .addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!email || !password) {
                showToast("Please enter your email and password.", "warning", {
                    title: "Missing Details"
                });
                return;
            }

            try {
                const response = await fetch("http://127.0.0.1:5000/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                });

                let data;

                try {
                    data = await response.json();
                } catch (error) {
                    throw new Error("Invalid server response");
                }

                if (!response.ok) {
                    showToast(data.message || "Server error", "error", {
                        title: "Login Failed"
                    });
                    return;
                }

                if (data.success) {
                    localStorage.setItem("user", JSON.stringify({
                        user_id: data.user_id,
                        name: data.name,
                        email: data.email
                    }));

                    window.AnimeHubToast?.queue(`Welcome back, ${data.name}!`, "success", {
                        title: "Signed In"
                    });
                    window.location.href = data.redirect_url || "index.php";
                    return;
                }

                showToast(data.message || "Login failed", "error", {
                    title: "Login Failed"
                });
            } catch (error) {
                console.error("LOGIN ERROR:", error);
                showToast("Server error. Make sure Flask is running.", "error", {
                    title: "Connection Error"
                });
            }
        });
});
