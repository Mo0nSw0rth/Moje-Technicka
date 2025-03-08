async function addVehicleToUser() {
    try {
        const inputData = document.querySelector("#vinInput").value;
        
        const url = "http://localhost:8000/addVehicleToUser";
        const data = {
            vehicle_vin: inputData
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
            credentials: 'include' 
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Response:", result);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

async function loadVehicles() {
    const url = "http://localhost:8000/getUserVehicles";
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: 'include'
    })
    res = await response.json()
    console.log(res)
    const cars = document.querySelector(".cars")
    for (const item of res) {
        const carElement = document.createElement("div");
        carElement.classList.add("carBox");
        

        const url = "http://localhost:8000/getByVin/" + item.vehicle_vin;
        fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include'
        }).then(r => r.json()).then(r => {
            const dateResults = getLatestInspectionDetails(r)
            const vinData = document.createElement("a");
            vinData.href = "/showcase?vin=" + item.vehicle_vin;
            vinData.target = "_blank";
            vinData.style.color = "white";
            const brandData = document.createElement("span");
            const modelData = document.createElement("span");
            const lastCheckData = document.createElement("span");
            const nextCheckData = document.createElement("span");
            const statusData = document.createElement("span");
            statusData.classList.add("state");
            vinData.innerHTML = r[0].vehicle_vin
            brandData.innerHTML = r[0].vehicle_brand
            modelData.innerHTML = r[0].vehicle_model
            lastCheckData.innerHTML = dateResults.newestInspectionDate
            nextCheckData.innerHTML = dateResults.nextInspectionDate
            dateResults.isNextInspectionOverdue ? statusData.classList.add("red") : dateResults.daysUntilNextInspection < 30 ? statusData.classList.add("orange") : statusData.classList.add("green")

            carElement.appendChild(vinData)
            carElement.appendChild(brandData)
            carElement.appendChild(modelData)
            carElement.appendChild(lastCheckData)
            carElement.appendChild(nextCheckData)
            carElement.appendChild(statusData)

            const button = document.createElement('button');
            button.className = 'trashButton';
            button.onclick = () => {
                removeVehicle(r[0].vehicle_vin);
            }

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-trash';
            icon.style.color = '#940000';

            button.appendChild(icon);

            carElement.appendChild(button);
        })
        cars.appendChild(carElement)
    } 
}

function getLatestInspectionDetails(inspections) {
    if (!inspections || inspections.length === 0) {
        return {
            newestInspectionDate: null,
            nextInspectionDate: null,
            isNextInspectionOverdue: null,
            daysUntilNextInspection: null
        };
    }

    const sortedInspections = [...inspections].sort((a, b) => {
        return new Date(b.inspection_date) - new Date(a.inspection_date);
    });

    const newestInspection = sortedInspections[0];
    const nextInspectionDate = new Date(newestInspection.next_inspection_date);

    const currentDate = new Date("2025-03-08");
    const isNextInspectionOverdue = nextInspectionDate < currentDate;

    const timeDifference = nextInspectionDate - currentDate;
    const daysUntilNextInspection = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

    return {
        newestInspectionDate: newestInspection.inspection_date,
        nextInspectionDate: newestInspection.next_inspection_date,
        isNextInspectionOverdue,
        daysUntilNextInspection
    };
}

async function removeVehicle(vin) {
    try {        
        const url = "http://localhost:8000/removeVehicleFromUser";
        const data = {
            vehicle_vin: vin
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
            credentials: 'include' 
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Response:", result);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

async function logout() {
    try {        
        const url = "http://localhost:8000/logout";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include' 
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Response:", result);
        redirect("/login");
    } catch (error) {
        console.error("Error:", error.message);
    }
}

window.onload = () => {
    loadVehicles();
    const token = getCookie('access_token');
    if (!token) {
        redirect("/login")
    }
};

function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
            return cookie.substring(name.length + 1);
        }
    }
    return null;
}


function redirect(path) {
    window.location.href =  path;
}