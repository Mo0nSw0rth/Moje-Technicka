const API_URL = 'http://localhost:8000';

async function register() {
    try {
        const username = document.querySelector("#loginMail").value;
        const password = document.querySelector("#loginPsw").value;
        const passwordAgain = document.querySelector("#loginPswAgain").value;
        
        if (username == "" || password == "" || passwordAgain == "") {
            showMessage("Vyplňte všechny údaje", true);
            return;
        }

        if (!isValidEmail(username)) {
            showMessage("Nevalidní emailová adresa", true);
            return;
        }

        console.log(password)
        console.log(passwordAgain)
        if (password !== passwordAgain) {
            showMessage("Hesla se neshodují", true);
            return;
        }

        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include' 
        });

        const data = await response.json();
        if (!response.ok) {
            showMessage(data.detail, true);
            return;
        }

        showMessage("Úspěšně registrováno", false)
        setTimeout(function() {
            redirect("/dashboard");
        }, 1800);
    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
}

function redirect(path) {
    window.location.href =  path;
}

function showMessage(message, error) {
    Swal.fire({
        position: "top-end",
        icon: error ? 'error' : 'success',
        title: message,
        showConfirmButton: false,
        theme: 'light',
        timer: 1500
      });
}


function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}