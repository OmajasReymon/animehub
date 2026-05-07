(function () {
    const elements = {
        identity: document.getElementById("adminIdentity"),
        status: document.getElementById("adminStatus"),
        totalUsers: document.getElementById("totalUsers"),
        totalAdmins: document.getElementById("totalAdmins"),
        totalFavorites: document.getElementById("totalFavorites"),
        activeCollectors: document.getElementById("activeCollectors"),
        usersTable: document.getElementById("usersTable"),
        favoritesTable: document.getElementById("favoritesTable"),
        logoutButton: document.getElementById("logoutButton")
    };

    const API_BASE_URL = window.AnimeHubAccount?.API_BASE_URL || "http://127.0.0.1:5000";

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function setStatus(message, type = "info") {
        if (!elements.status) {
            return;
        }

        elements.status.textContent = message;
        elements.status.className = `status ${type === "info" ? "" : type}`.trim();
    }

    function getStoredUser() {
        if (window.AnimeHubAccount?.getStoredUser) {
            return window.AnimeHubAccount.getStoredUser();
        }

        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch (error) {
            return null;
        }
    }

    function requireAdminUser() {
        const user = getStoredUser();

        if (!user) {
            setStatus("Please sign in with an admin account.", "error");
            window.setTimeout(() => {
                window.location.href = "login.php";
            }, 900);
            return null;
        }

        if (user.role !== "admin") {
            setStatus("Admin access only.", "error");
            if (elements.identity) {
                elements.identity.textContent = `${user.name || "Signed-in user"} is not an admin account.`;
            }
            return null;
        }

        return user;
    }

    function setText(element, value) {
        if (element) {
            element.textContent = String(value ?? 0);
        }
    }

    function renderStats(stats = {}) {
        setText(elements.totalUsers, stats.users);
        setText(elements.totalAdmins, stats.admins);
        setText(elements.totalFavorites, stats.favorites);
        setText(elements.activeCollectors, stats.activeCollectors);
    }

    function renderUsers(users = []) {
        if (!elements.usersTable) {
            return;
        }

        if (!users.length) {
            elements.usersTable.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
            return;
        }

        elements.usersTable.innerHTML = users.map((user) => {
            const role = user.role === "admin" ? "admin" : "user";

            return `
                <tr>
                    <td>${escapeHtml(user.user_id)}</td>
                    <td>${escapeHtml(user.name)}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td><span class="role-pill ${role}">${escapeHtml(role)}</span></td>
                </tr>
            `;
        }).join("");
    }

    function renderFavorites(favorites = []) {
        if (!elements.favoritesTable) {
            return;
        }

        if (!favorites.length) {
            elements.favoritesTable.innerHTML = '<tr><td colspan="4">No favorites saved yet.</td></tr>';
            return;
        }

        elements.favoritesTable.innerHTML = favorites.map((favorite) => `
            <tr>
                <td>${escapeHtml(favorite.user_name || `User #${favorite.user_id}`)}</td>
                <td>${escapeHtml(favorite.title || `Anime #${favorite.mal_id}`)}</td>
                <td>${escapeHtml(favorite.score || "N/A")}</td>
                <td>${escapeHtml(favorite.status || "Saved")}</td>
            </tr>
        `).join("");
    }

    async function loadDashboard() {
        const user = requireAdminUser();

        if (!user) {
            return;
        }

        if (elements.identity) {
            elements.identity.textContent = `${user.name} - ${user.email}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/admin/overview?admin_id=${encodeURIComponent(user.user_id)}`);
            const payload = await response.json();

            if (!response.ok || payload.success === false) {
                throw new Error(payload.message || "Failed to load admin dashboard.");
            }

            renderStats(payload.stats);
            renderUsers(payload.users);
            renderFavorites(payload.recentFavorites);
            setStatus("Dashboard loaded.", "success");
        } catch (error) {
            console.error("ADMIN DASHBOARD ERROR:", error);
            setStatus(error.message || "Server error. Make sure Flask is running.", "error");
        }
    }

    elements.logoutButton?.addEventListener("click", () => {
        if (window.AnimeHubAccount?.logout) {
            window.AnimeHubAccount.logout();
            return;
        }

        localStorage.removeItem("user");
        window.location.href = "index.php";
    });

    document.addEventListener("DOMContentLoaded", loadDashboard);
})();
