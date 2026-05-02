function showTab(tabName, button) {
    document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active");
    });

    document.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.remove("active");
    });

    const activeTab = document.getElementById(tabName);

    if (activeTab) {
        activeTab.classList.add("active");
    }

    if (button) {
        button.classList.add("active");
    }

    if (window.AnimeHubHome?.loadTab) {
        window.AnimeHubHome.loadTab(tabName);
    }
}
