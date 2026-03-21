// LOAD ANIME FROM FLASK API
fetch("http://127.0.0.1:5000/anime")
.then(res => res.json())
.then(data => {

    const grid = document.getElementById("animeGrid");

    grid.innerHTML = "";

    data.slice(0, 12).forEach(anime => {

        grid.innerHTML += `
        <div class="anime-card">
            <img src="${anime.images.jpg.image_url}">
            <h3>${anime.title}</h3>
            <p>⭐ ${anime.score || "N/A"}</p>

            <button onclick="addFavorite('${anime.title}')">
                ❤️ Add to Favorites
            </button>
        </div>
        `;
    });

})
.catch(err => console.log(err));


// ADD FAVORITE FUNCTION (CONNECT TO DATABASE)
function addFavorite(title){

    const user_id = localStorage.getItem("user_id");

    if(!user_id){
        alert("Please login first");
        return;
    }

    fetch("http://127.0.0.1:5000/add_favorite", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: user_id,
            title: title
        })
    })
    .then(res => res.json())
    .then(data => alert(data.message));
}