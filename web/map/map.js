var map = L.map("map").setView([49.8515023, 15.2844155], 7);
var startCoords = [49.8515023, 15.2844155]

function getIcon(color) {
    return {
        iconUrl: "https://cdn.moondev.eu/markers/" + color + "_marker.png",
        iconSize: [24, 32],
    };
}
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);


function getQuery(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}


window.onload = () => {
    if (getQuery("stkStanice")) {
        getStation(getQuery("stkStanice"));
    }
}

        
async function getStation(id) {
    const url = "http://localhost:8000/getSTKData/" + id;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    })
    const data = await response.json();
    if (data) {
        const loc = data[0].geolocation
        const ABloc = loc.split(", ");
        L.marker([ABloc[0], ABloc[1]], { icon: L.icon(getIcon("blue_gray")) })
        .addTo(map)
        .bindTooltip(
            "Název: " + data[0].operator_name + "<br>" + 
            "Email: " + data[0].operator_email + "<br>" +
            "Phone: " + data[0].operator_phone,
            {
                permanent: false,
                direction: "top",
                offset: [0, -10]
            }
        )
        .on('mouseover', function(e) {
            this.openTooltip();
        })
        .on('mouseout', function(e) {
            this.closeTooltip();
        });
    }
}

async function search() {
    var e = document.getElementById("kraj");
    var value = e.value;

    const url = "http://localhost:8000/getSTKByRegion/" + value;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    })
    const data = await response.json();
    if (data) {
        for (const x of data) {
            const loc = x.geolocation
            const ABloc = loc.split(", ");
            if (ABloc[0] == 0 || ABloc[1] == 0) {
                continue;
            }
            if (x.operator_name.includes("DEKRA")) {
                console.log(x)
            }
            L.marker([ABloc[0], ABloc[1]], { icon: L.icon(getIcon("blue_gray")) })
            .addTo(map)
            .bindTooltip(
                "Název: " + x.operator_name + "<br>" + 
                "Email: " + x.operator_email + "<br>" +
                "Phone: " + x.operator_phone,
                {
                    permanent: false,
                    direction: "top",
                    offset: [0, -10]
                }
            )
            .on('mouseover', function(e) {
                this.openTooltip();
            })
            .on('mouseout', function(e) {
                this.closeTooltip();
            });
        }
        
    }
}