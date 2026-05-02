const HOME_TAB_LIMITS = {
    trending: 100,
    top: 100,
    new: 100
};

const homeTabConfig = {
    trending: {
        grid: document.getElementById("animeGrid"),
        url: `${window.AnimeHubUI.API_BASE_URL}/anime/trending?limit=${HOME_TAB_LIMITS.trending}`,
        loadingMessage: "Loading trending anime...",
        emptyMessage: "No trending anime available right now.",
        errorMessage: "Failed to load trending anime."
    },
    top: {
        grid: document.getElementById("topAnimeGrid"),
        url: `${window.AnimeHubUI.API_BASE_URL}/anime/top?limit=${HOME_TAB_LIMITS.top}`,
        loadingMessage: "Loading top rated anime...",
        emptyMessage: "No top rated anime available right now.",
        errorMessage: "Failed to load top rated anime."
    },
    new: {
        grid: document.getElementById("newAnimeGrid"),
        url: `${window.AnimeHubUI.API_BASE_URL}/anime/new?limit=${HOME_TAB_LIMITS.new}`,
        loadingMessage: "Loading new anime...",
        emptyMessage: "No new anime available right now.",
        errorMessage: "Failed to load new anime."
    }
};

const loadedHomeTabs = new Set();
const loadingHomeTabs = new Set();

async function loadHomeTab(tabName) {
    const tabConfig = homeTabConfig[tabName];

    if (!tabConfig?.grid || loadedHomeTabs.has(tabName) || loadingHomeTabs.has(tabName)) {
        return;
    }

    loadingHomeTabs.add(tabName);
    window.AnimeHubUI.renderEmptyState(tabConfig.grid, tabConfig.loadingMessage);

    try {
        const response = await fetch(tabConfig.url);
        const data = await response.json();

        window.AnimeHubUI.renderAnimeGrid(tabConfig.grid, data, {
            emptyMessage: tabConfig.emptyMessage
        });

        loadedHomeTabs.add(tabName);
    } catch (error) {
        console.error(`HOME TAB ERROR (${tabName}):`, error);
        window.AnimeHubUI.renderEmptyState(tabConfig.grid, tabConfig.errorMessage);
    } finally {
        loadingHomeTabs.delete(tabName);
    }
}

window.AnimeHubHome = {
    loadTab: loadHomeTab
};

loadHomeTab("trending");

if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
        loadHomeTab("top");
        loadHomeTab("new");
    });
} else {
    setTimeout(() => {
        loadHomeTab("top");
        loadHomeTab("new");
    }, 300);
}
