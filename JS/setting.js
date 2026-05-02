const settingsElements = {
    displayNameInput: document.getElementById("displayNameInput"),
    emailInput: document.getElementById("emailInput"),
    usernameInput: document.getElementById("usernameInput"),
    bioInput: document.getElementById("bioInput"),
    emailNotificationsToggle: document.getElementById("emailNotificationsToggle"),
    pushNotificationsToggle: document.getElementById("pushNotificationsToggle"),
    newReleaseAlertsToggle: document.getElementById("newReleaseAlertsToggle"),
    preferredLanguageSelect: document.getElementById("preferredLanguageSelect"),
    subtitlePreferenceSelect: document.getElementById("subtitlePreferenceSelect"),
    autoPlayToggle: document.getElementById("autoPlayToggle"),
    adultContentToggle: document.getElementById("adultContentToggle"),
    profileVisibilityToggle: document.getElementById("profileVisibilityToggle"),
    saveSettingsButton: document.getElementById("saveSettingsButton"),
    saveStatus: document.getElementById("saveStatus"),
    viewFavoritesButton: document.getElementById("viewFavoritesButton"),
    profilePageButton: document.getElementById("profilePageButton"),
    watchHistoryButton: document.getElementById("watchHistoryButton"),
    manageHistoryButton: document.getElementById("manageHistoryButton"),
    clearHistoryButton: document.getElementById("clearHistoryButton"),
    clearFavoritesButton: document.getElementById("clearFavoritesButton"),
    logoutButton: document.getElementById("logoutButton"),
    deleteAccountButton: document.getElementById("deleteAccountButton")
};

const settingsUser = window.AnimeHubAccount.requireUser();

function readSettingsForm() {
    return {
        username: settingsElements.usernameInput.value.trim() || "@animefan",
        bio: settingsElements.bioInput.value.trim() || "Anime fan building a great watchlist on AnimeHub.",
        notificationsEmail: settingsElements.emailNotificationsToggle.checked,
        notificationsPush: settingsElements.pushNotificationsToggle.checked,
        newReleaseAlerts: settingsElements.newReleaseAlertsToggle.checked,
        preferredLanguage: settingsElements.preferredLanguageSelect.value,
        subtitlePreference: settingsElements.subtitlePreferenceSelect.value,
        autoPlayNextEpisode: settingsElements.autoPlayToggle.checked,
        adultContent: settingsElements.adultContentToggle.checked,
        profileVisible: settingsElements.profileVisibilityToggle.checked
    };
}

function renderSettingsForm(profile, settings) {
    settingsElements.displayNameInput.value = profile.name || "";
    settingsElements.emailInput.value = profile.email || "";
    settingsElements.usernameInput.value = settings.username || "@animefan";
    settingsElements.bioInput.value = settings.bio || "";
    settingsElements.emailNotificationsToggle.checked = Boolean(settings.notificationsEmail);
    settingsElements.pushNotificationsToggle.checked = Boolean(settings.notificationsPush);
    settingsElements.newReleaseAlertsToggle.checked = Boolean(settings.newReleaseAlerts);
    settingsElements.preferredLanguageSelect.value = settings.preferredLanguage || "English";
    settingsElements.subtitlePreferenceSelect.value = settings.subtitlePreference || "English Subtitles";
    settingsElements.autoPlayToggle.checked = Boolean(settings.autoPlayNextEpisode);
    settingsElements.adultContentToggle.checked = Boolean(settings.adultContent);
    settingsElements.profileVisibilityToggle.checked = Boolean(settings.profileVisible);
}

async function loadSettingsPage() {
    if (!settingsUser) {
        return;
    }

    try {
        const profile = await window.AnimeHubAccount.fetchProfile(settingsUser.user_id).catch(() => settingsUser);
        const settings = window.AnimeHubAccount.getSettings(profile);

        renderSettingsForm(profile, settings);
    } catch (error) {
        console.error("SETTINGS PAGE ERROR:", error);
        settingsElements.saveStatus.textContent = "Could not load your settings right now.";
    }
}

settingsElements.saveSettingsButton?.addEventListener("click", async () => {
    if (!settingsUser) {
        return;
    }

    const name = settingsElements.displayNameInput.value.trim();
    const email = settingsElements.emailInput.value.trim();

    if (!name || !email) {
        settingsElements.saveStatus.textContent = "Name and email are required.";
        return;
    }

    settingsElements.saveStatus.textContent = "Saving changes...";

    try {
        const settingsPayload = readSettingsForm();
        const updatedProfile = await window.AnimeHubAccount.updateProfile(settingsUser.user_id, {
            name,
            email
        }, settingsPayload);

        window.AnimeHubAccount.saveSettings(updatedProfile?.settings || settingsPayload);
        window.AnimeHubAccount.setStoredUser(updatedProfile);

        settingsElements.saveStatus.textContent = "Settings saved successfully.";
    } catch (error) {
        console.error("SAVE SETTINGS ERROR:", error);
        settingsElements.saveStatus.textContent = error.message || "Failed to save settings.";
    }
});

settingsElements.viewFavoritesButton?.addEventListener("click", () => {
    window.location.href = "favorites.php";
});

settingsElements.profilePageButton?.addEventListener("click", () => {
    window.location.href = "profile.php";
});

settingsElements.watchHistoryButton?.addEventListener("click", () => {
    alert("Password changes are not set up yet.");
});

settingsElements.manageHistoryButton?.addEventListener("click", () => {
    alert("Watch history is not available yet.");
});

settingsElements.clearHistoryButton?.addEventListener("click", () => {
    alert("Watch history is not available yet.");
});

settingsElements.clearFavoritesButton?.addEventListener("click", async () => {
    if (!settingsUser) {
        return;
    }

    const shouldClear = window.confirm("Clear all favorites for this account?");

    if (!shouldClear) {
        return;
    }

    try {
        await window.AnimeHubAccount.clearFavorites(settingsUser.user_id);
        alert("Favorites cleared.");
    } catch (error) {
        console.error("CLEAR FAVORITES ERROR:", error);
        alert(error.message || "Failed to clear favorites.");
    }
});

settingsElements.logoutButton?.addEventListener("click", () => {
    window.AnimeHubAccount.logout();
});

settingsElements.deleteAccountButton?.addEventListener("click", () => {
    alert("Delete account is not enabled yet because it is irreversible.");
});

loadSettingsPage();
