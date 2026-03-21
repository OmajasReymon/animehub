

// Example: Save settings locally

document.querySelector(".save-btn").onclick = () => {

const name = document.querySelector("input[type='text']").value
const email = document.querySelector("input[type='email']").value

localStorage.setItem("name",name)
localStorage.setItem("email",email)

alert("Settings saved!")

}

