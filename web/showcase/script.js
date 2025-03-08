function getQuery(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

async function loadVehicles() {

    const url = "http://localhost:8000/getByVinPublic/" + getQuery("vin");
    fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: 'include'
    }).then(r => r.json()).then(r => {

        const data = sortByInspectionDate(r)
        const latest = data[0];
        console.log(latest)
        const protocol_number = document.querySelector("#protocol_number");
        const station_number = document.querySelector("#station_number");
        const station_region = document.querySelector("#station_region");
        const responsible_person = document.querySelector("#responsible_person");
        const inspection_type = document.querySelector("#inspection_type");
        const inspection_scope = document.querySelector("#inspection_scope");
        const vehicle_vin = document.querySelector("#vehicle_vin");
        const vehicle_type = document.querySelector("#vehicle_type");
        const vehicle_category = document.querySelector("#vehicle_category");
        const vehicle_brand = document.querySelector("#vehicle_brand");
        const vehicle_model = document.querySelector("#vehicle_model");
        const engine_type = document.querySelector("#engine_type");
        const technical_responsible_person = document.querySelector("#technical_responsible_person");
        const sticker_applied = document.querySelector("#sticker_applied");
        const overall_result = document.querySelector("#overall_result");
        const next_inspection_date = document.querySelector("#next_inspection_date");

        protocol_number.innerHTML = latest.protocol_number;
        station_number.innerHTML = latest.station_number;
        station_region.innerHTML = latest.station_region;
        responsible_person.innerHTML = latest.responsible_person;
        inspection_type.innerHTML = latest.inspection_type;
        inspection_scope.innerHTML = latest.inspection_scope;
        vehicle_vin.innerHTML = latest.vehicle_vin;
        vehicle_type.innerHTML = latest.vehicle_type;
        vehicle_category.innerHTML = latest.vehicle_category;
        vehicle_brand.innerHTML = latest.vehicle_brand;
        vehicle_model.innerHTML = latest.vehicle_model;
        engine_type.innerHTML = latest.engine_type;
        technical_responsible_person.innerHTML = latest.technical_responsible_person;
        sticker_applied.innerHTML = latest.sticker_applied ? 'Ano' : 'Ne';
        overall_result.innerHTML = latest.overall_result;
        next_inspection_date.innerHTML = latest.next_inspection_date;

        station_number.href = "/map/?stkStanice=" + latest.station_number;
        station_number.target = "_blank";
        station_number.style.color = "white";

        const timeline = document.querySelector(".timeline");
        for (const x of r) {
            const dateSpan = document.createElement("span")
            dateSpan.classList.add("date");
            dateSpan.textContent = x.inspection_date;
            timeline.appendChild(dateSpan)
        }
    })
}

function sortByInspectionDate(inspections) {
    return inspections.sort((a, b) => {
        const dateA = new Date(a.inspection_date);
        const dateB = new Date(b.inspection_date);
        return dateB - dateA;
    });
}

window.onload = () => loadVehicles();