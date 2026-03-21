async function recommendAnime(){

const title = document.getElementById("search").value;

const response = await fetch(`http://127.0.0.1:5000/recommend?title=${title}`);

const data = await response.json();

const results = document.getElementById("results");

results.innerHTML = "";

data.forEach(anime => {

results.innerHTML += `
<div>
<p>${anime}</p>
</div>
`;

});

}