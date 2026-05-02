(function () {
    const API_BASE_URL = "http://127.0.0.1:5000";
    const USER_KEY = "user";
    const SETTINGS_KEY = "animehub_settings";

    function getStoredUser() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY));
        } catch (error) {
            return null;
        }
    }

    function setStoredUser(user) {
        if (!user) {
            return;
        }

        const existingUser = getStoredUser() || {};
        const nextUser = {
            ...existingUser,
            ...user
        };

        if (user.settings) {
            nextUser.settings = user.settings;
        } else if (existingUser.settings) {
            nextUser.settings = existingUser.settings;
        }

        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    }

    function requireUser() {
        const user = getStoredUser();

        if (!user) {
            alert("Please login first");
            window.location.href = "login.php";
            return null;
        }

        return user;
    }

    function getDefaultSettings(user) {
        const emailPrefix = String(user?.email || "").split("@")[0];

        return {
            username: emailPrefix ? `@${emailPrefix}` : "@animefan",
            bio: "Anime fan building a great watchlist on AnimeHub.",
            notificationsEmail: true,
            notificationsPush: false,
            newReleaseAlerts: true,
            preferredLanguage: "English",
            subtitlePreference: "English Subtitles",
            autoPlayNextEpisode: true,
            adultContent: false,
            profileVisible: true
        };
    }

    function getSettings(user = getStoredUser()) {
        const defaults = getDefaultSettings(user);
        const storedUserSettings = user?.settings && typeof user.settings === "object" ? user.settings : null;

        try {
            const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            return {
                ...defaults,
                ...(stored || {}),
                ...(storedUserSettings || {})
            };
        } catch (error) {
            return {
                ...defaults,
                ...(storedUserSettings || {})
            };
        }
    }

    function saveSettings(settings) {
        const currentUser = getStoredUser();
        const nextSettings = {
            ...getDefaultSettings(currentUser),
            ...(currentUser?.settings || {}),
            ...(settings || {})
        };

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
        if (currentUser) {
            setStoredUser({
                ...currentUser,
                settings: nextSettings
            });
        }
        return nextSettings;
    }

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, options);
        let payload = null;

        try {
            payload = await response.json();
        } catch (error) {
            throw new Error("Invalid server response");
        }

        if (!response.ok || payload?.success === false) {
            throw new Error(payload?.message || "Request failed");
        }

        return payload;
    }

    async function fetchProfile(userId) {
        const payload = await fetchJson(`${API_BASE_URL}/user/${userId}`);
        const profile = payload?.data || null;

        if (profile) {
            setStoredUser(profile);
            if (profile.settings) {
                saveSettings(profile.settings);
            }
        }

        return profile;
    }

    async function updateProfile(userId, profileData, settings = null) {
        const payload = await fetchJson(`${API_BASE_URL}/user/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: userId,
                name: profileData.name,
                email: profileData.email,
                settings
            })
        });

        const profile = payload?.data || null;

        if (profile) {
            setStoredUser(profile);
            if (profile.settings) {
                saveSettings(profile.settings);
            }
        }

        return profile;
    }

    async function fetchFavorites(userId) {
        const payload = await fetchJson(`${API_BASE_URL}/favorites/${userId}`);
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    async function removeFavorite(userId, malId) {
        const payload = await fetchJson(`${API_BASE_URL}/remove_favorite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: userId,
                mal_id: malId
            })
        });

        return payload;
    }

    async function clearFavorites(userId) {
        const payload = await fetchJson(`${API_BASE_URL}/favorites/clear`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: userId
            })
        });

        return payload;
    }

    function logout() {
        if (window.AnimeHubToast?.queue) {
            window.AnimeHubToast.queue("You have been logged out successfully.", "info", {
                title: "Signed Out"
            });
        }

        localStorage.removeItem(USER_KEY);
        window.location.href = "index.php";
    }

    window.AnimeHubAccount = {
        API_BASE_URL,
        getStoredUser,
        setStoredUser,
        requireUser,
        getSettings,
        saveSettings,
        fetchProfile,
        updateProfile,
        fetchFavorites,
        removeFavorite,
        clearFavorites,
        logout
    };
})();
