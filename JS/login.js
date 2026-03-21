function togglePassword() {
    const password = document.getElementById("password");
    password.type = password.type === "password" ? "text" : "password";
}

document.addEventListener("DOMContentLoaded", function(){

    document.getElementById("loginForm")
    .addEventListener("submit", async function(e) {

        e.preventDefault();

        console.log("LOGIN CLICKED");

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        // ✅ Basic validation
        if(!email || !password){
            alert("Please enter email and password");
            return;
        }

        try {
            const response = await fetch("http://127.0.0.1:5000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            // 🔥 FIX: handle non-JSON responses
            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error("Invalid server response");
            }

            console.log(data);

            // 🔥 FIX: check HTTP status
            if(!response.ok){
                alert(data.message || "Server error");
                return;
            }

            if (data.success) {

                // ✅ FIXED TYPO HERE
                localStorage.setItem("user", JSON.stringify({
                    user_id: data.user_id,
                    name: data.name,
                    email: data.email
                }));

                alert("Welcome, " + data.name + "!");
                window.location.href = "index.html";

            } else {
                alert(data.message || "Login failed");
            }

        } catch (error) {
            console.error("LOGIN ERROR:", error);
            alert("Server error. Make sure Flask is running.");
        }

    });

});