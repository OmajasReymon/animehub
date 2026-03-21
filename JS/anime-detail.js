document.addEventListener("DOMContentLoaded", loadAnimeDetail);

async function loadAnimeDetail(){
    const id = localStorage.getItem("selectedAnime");

    if(!id){
        alert("No anime selected");
        return;
    }

    try{
        const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
        const data = await res.json();

        const anime = data.data;

        displayAnime(anime);

        // 🔥 LOAD AI RECOMMENDATIONS
        getRecommendations(anime.title);

    }catch(err){
        console.error(err);
        alert("Failed to load anime");
    }
}


// DISPLAY MAIN ANIME
function displayAnime(anime){
    document.getElementById("animeDetail").innerHTML = `
        <div class="detail-container">

            img src="${anime.images.jpg.image_url}" alt="Anime Poster" class="poster">
            <div class="detail-info">
                <h1>${anime.title}</h1>
                <p><strong>⭐ Score:</strong> ${anime.score || "N/A"}</p>
                <p><strong>Status:</strong> ${anime.status}</p>
                <p><strong>Episodes:</strong> ${anime.episodes}</p>
                <p><strong>Year:</strong> ${anime.year || "N/A"}</p>

                <p class="synopsis">${anime.synopsis}</p>
            </div>

        </div>
    `;
}


// AI FETCH
async function getRecommendations(title){
    try{
        const res = await fetch(`http://127.0.0.1:5000/recommend?title=${encodeURIComponent(title)}`);
        const data = await res.json();

        if(data.success){
            displayRecommendations(data.data);
        }

    }catch(err){
        console.error("AI ERROR:", err);
    }
}


// DISPLAY AI RESULTS
function displayRecommendations(list){
    const container = document.getElementById("recommendations");

    if(!list.length){
        container.innerHTML = "<p>No recommendations found</p>";
        return;
    }

    container.innerHTML = list.map(anime => `
        <div class="anime-card" onclick="viewAnime(${anime.mal_id})">
            <img src="${anime.images.jpg.image_url}">
            <div class="overlay">
                <h3>${anime.title}</h3>
            </div>
        </div>
    `).join("");
}


// REUSE CLICK
function viewAnime(id){
    localStorage.setItem("selectedAnime", id);
    location.reload(); // reload detail page
}