const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const count = document.getElementById("count");

const user = JSON.parse(localStorage.getItem("user"));

if(!user){
    alert("Please login first");
    window.location.href = "login.html";
}

// -----------------------------
// LOAD FAVORITES FROM BACKEND
// -----------------------------
async function loadFavorites(){
    try{
        grid.innerHTML = "Loading...";

        const res = await fetch(`http://127.0.0.1:5000/favorites/${user.user_id}`);
        const data = await res.json();

        if(!data.success){
            grid.innerHTML = "Failed to load favorites";
            return;
        }

        const favorites = data.data;

        grid.innerHTML = "";

        if(favorites.length === 0){
            grid.style.display = "none";
            empty.style.display = "block";
            count.textContent = "0 anime saved";
            return;
        }

        grid.style.display = "grid";
        empty.style.display = "none";
        count.textContent = `${favorites.length} anime saved`;

        favorites.forEach(anime => {

            const card = document.createElement("div");
            card.classList.add("card");

            card.innerHTML = `
                <span class="badge">${anime.status || "Unknown"}</span>
                <span class="rating">⭐ ${anime.score || "N/A"}</span>

                <img src="${anime.image}" alt="">

                <button class="remove" onclick="removeFavorite(${anime.mal_id})">🗑</button>

                <div class="info">
                    <div class="title">${anime.title}</div>
                    <div class="meta">ID: ${anime.mal_id}</div>
                </div>
            `;

            grid.appendChild(card);
        });

    }catch(err){
        console.error(err);
        grid.innerHTML = "Error loading favorites";
    }
}

// -----------------------------
// REMOVE FAVORITE
// -----------------------------
async function removeFavorite(mal_id){
    try{
        const res = await fetch("http://127.0.0.1:5000/remove_favorite", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.user_id,
                mal_id: mal_id
            })
        });

        const data = await res.json();

        if(data.success){
            loadFavorites(); // refresh UI
        }else{
            alert(data.message);
        }

    }catch(err){
        console.error(err);
        alert("Failed to remove");
    }
}

// -----------------------------
// LOAD ON START
// -----------------------------
loadFavorites();