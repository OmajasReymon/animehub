<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Anime Card Preview | AnimeHub</title>
<link rel="stylesheet" href="CSS/anime-card.css?v=20260321d">
<style>
body{
margin:0;
padding:40px 20px;
font-family:Arial, Helvetica, sans-serif;
background:linear-gradient(180deg,#0f172a,#1e293b);
color:#ffffff;
}

.preview-shell{
max-width:1100px;
margin:0 auto;
}

.preview-shell h1{
margin:0 0 12px;
font-size:2.4rem;
}

.preview-shell p{
max-width:680px;
margin:0 0 24px;
color:#cbd5e1;
line-height:1.6;
}

.preview-grid{
display:grid;
grid-template-columns:minmax(220px,280px);
}
</style>
</head>
<body>
<main class="preview-shell">
    <h1>Anime Card Preview</h1>
    <p>This preview uses the same shared card component that now powers the Home, Browse, and detail recommendations flow, loaded from the Jikan-backed API.</p>
    <div class="preview-grid" id="cardPreview"></div>
</main>

<script src="JS/anime-card.js?v=20260321g"></script>
<script>
const previewGrid = document.getElementById("cardPreview");

async function loadPreviewCard() {
    window.AnimeHubUI.renderEmptyState(previewGrid, "Loading Jikan anime preview...");

    try {
        const response = await fetch(`${window.AnimeHubUI.API_BASE_URL}/anime/1`);
        const payload = await response.json();

        if (!response.ok || !payload.success) {
            throw new Error(payload.message || "Failed to load preview anime");
        }

        previewGrid.innerHTML = "";
        previewGrid.appendChild(window.AnimeHubUI.createAnimeCard(payload.data));
    } catch (error) {
        console.error("PREVIEW LOAD ERROR:", error);
        window.AnimeHubUI.renderEmptyState(previewGrid, "Failed to load the Jikan preview card.");
    }
}

loadPreviewCard();
</script>
</body>
</html>
