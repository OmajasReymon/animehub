function showTab(tabName){

document.querySelectorAll(".tab-content")
.forEach(tab => tab.classList.remove("active"));

document.querySelectorAll(".tab")
.forEach(tab => tab.classList.remove("active"));

document.getElementById(tabName).classList.add("active");

event.target.classList.add("active");

}



function filterGenre(genre){

let cards=document.querySelectorAll("#genre-grid .anime-card");

cards.forEach(card=>{

if(genre==="all"){
card.style.display="block";
}
else{
card.style.display=
card.dataset.genre===genre ? "block":"none";
}

});

document.querySelectorAll(".genre")
.forEach(btn=>btn.classList.remove("active"));

event.target.classList.add("active");

}
function toggleMenu(){
const menu = document.getElementById("dropdownMenu")

menu.style.display =
menu.style.display === "block" ? "none" : "block"
}


function checkLogin(){

const user = JSON.parse(localStorage.getItem("user"))

if(user){

document.getElementById("authButtons").style.display="none"
document.getElementById("profileMenu").style.display="block"

document.getElementById("userName").innerText = user.name
document.getElementById("userEmail").innerText = user.email

document.querySelector(".avatar").innerText =
user.name.charAt(0).toUpperCase()

}
}

function logout(){

localStorage.removeItem("user")
location.reload()

}

checkLogin()