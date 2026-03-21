const animeGrid = document.getElementById("animeGrid");
const resultCount = document.getElementById("resultCount");

const user = JSON.parse(localStorage.getItem("user"));

let currentAnime = [];

// -----------------------------
// FETCH ANIME FROM JIKAN
// -----------------------------
async function fetchAnime(query = "naruto"){
    try{
        animeGrid.innerHTML = "Loading...";

        const res = await fetch(`http://127.0.0.1:5000/anime/search?q=${query}`);
        const data = await res.json();

        currentAnime = data;

        displayAnime(currentAnime);

    }catch(err){
        animeGrid.innerHTML = "Failed to load anime.";
        console.error(err);
    }
}

// -----------------------------
// DISPLAY ANIME
// -----------------------------
function displayAnime(animeList){
    animeGrid.innerHTML = "";
    resultCount.textContent = `${animeList.length} results found`;

    animeList.forEach(anime => {

        const card = document.createElement("div");
        card.classList.add("anime-card");

        card.innerHTML = `
            <img src="${anime.images.jpg.image_url}" alt="">
            <h3>${anime.title}</h3>
            <p>⭐ ${anime.score || "N/A"}</p>

            <button onclick='addToFavorites(${JSON.stringify(anime)})'>
                ❤️ Add to Favorites
            </button>
        `;

        animeGrid.appendChild(card);
    });
}

// -----------------------------
// SEARCH
// -----------------------------
function searchAnime(){
    const query = document.getElementById("searchInput").value;
    fetchAnime(query);
}

// -----------------------------
// ADD TO FAVORITES (BACKEND)
// -----------------------------
async function addToFavorites(anime){
    if(!user){
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    try{
        const res = await fetch("http://127.0.0.1:5000/add_favorite", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.user_id,
                mal_id: anime.mal_id,
                title: anime.title,
                image: anime.images.jpg.image_url,
                score: anime.score,
                status: anime.status
            })
        });

        const data = await res.json();

        if(data.success){
            alert("Added to favorites ❤️");
        }else{
            alert(data.message);
        }

    }catch(err){
        console.error(err);
        alert("Failed to add favorite");
    }
}
async function getRecommendations(){
    const query = document.getElementById("searchInput").value;

    if(!query){
        alert("Enter anime title first");
        return;
    }

    try{
        animeGrid.innerHTML = "Getting recommendations...";

        const res = await fetch(`http://127.0.0.1:5000/recommend?title=${query}`);
        const data = await res.json();

        if(!data.success || data.data.length === 0){
            animeGrid.innerHTML = "No recommendations found.";
            return;
        }

        displayAnime(data.data);

    }catch(err){
        console.error(err);
        animeGrid.innerHTML = "Failed to load recommendations.";
    }
}
// -----------------------------
// INITIAL LOAD
// -----------------------------
fetchAnime();