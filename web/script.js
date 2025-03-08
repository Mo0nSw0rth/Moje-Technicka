const vinInput = document.querySelector(".vinInput");
const API_URL = 'http://localhost:8000';

vinInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        redirect("/showcase/?vin=" + vinInput.value)
    }
});


function redirect(path) {
    window.location.href =  path;
}
