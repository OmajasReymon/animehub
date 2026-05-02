function togglePassword(){
    const pass = document.getElementById("password");
    pass.type = pass.type === "password" ? "text" : "password";
}

async function register(e){
    e.preventDefault();
    console.log("REGISTER CLICKED");

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // ✅ Validation
    if(!name || !email || !password || !confirmPassword){
        alert("Please fill in all fields");
        return;
    }

    if(password !== confirmPassword){
        alert("Passwords do not match");
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/register",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("Invalid server response");
        }

        if(!response.ok){
            alert(data.message || "Server error");
            return;
        }

        if (data.success) {

            // ✅ SAVE USER (VERY IMPORTANT)
            const userData = {
                user_id: data.user_id,
                name: data.name,
                email: data.email
            };

            localStorage.setItem("user", JSON.stringify(userData));

            // ✅ DEBUG (optional - helps you verify)
            console.log("Saved user:", userData);

            // ✅ REDIRECT (force refresh behavior)
            window.location.href = data.redirect_url || "index.php";

        } else {
            alert(data.message || "Registration failed");
        }

    } catch (error){
        console.error("REGISTER ERROR:", error);
        alert("Server error. Make sure Flask is running.");
    }
}
