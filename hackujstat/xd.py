import xml.etree.ElementTree as ET
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import time
import re
import json

# Inicializace Nominatim API
geolocator = Nominatim(user_agent="stk_station_geocoder")

# Funkce pro získání souřadnic
def get_coordinates(address):
    try:
        full_address = f"{address}, Czech Republic"
        print(f"Geocoding: {full_address}")  # Ladící výstup
        location = geolocator.geocode(full_address, timeout=10)
        if location:
            return location.latitude, location.longitude
        else:
            return None, None
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        print(f"Chyba při geocodingu {address}: {e}")
        return None, None

# Funkce pro rozdělení ulice a čísla popisného
def split_street_and_number(ulice):
    match = re.match(r"^(.*?)\s+(\d+/\d+|\d+)$", ulice)
    if match:
        street = match.group(1).strip()
        number = match.group(2).strip()
        return number, street
    return "", ulice.strip()

# Cesta k XML souboru
xml_file_path = "StaniceSeznam_20250301-20250301.xml"

# Parsování XML souboru bez namespace
try:
    tree = ET.parse(xml_file_path)
    root = tree.getroot()
except FileNotFoundError:
    print(f"Chyba: Soubor {xml_file_path} nebyl nalezen.")
    exit(1)
except ET.ParseError:
    print("Chyba: XML soubor je špatně formátovaný.")
    exit(1)

# Ignorování namespace (pokud selže, vrátíme se k původnímu řešení)
stations = []

for stanice in root.findall(".//Stanice"):  # Bez namespace
    adresa = stanice.find("Adresa")
    if adresa is not None:
        kraj = adresa.find("Kraj").text if adresa.find("Kraj") is not None else "Czech Republic"
        obec = adresa.find("Obec").text if adresa.find("Obec") is not None else ""
        ulice = adresa.find("Ulice").text if adresa.find("Ulice") is not None else ""
        psc = adresa.find("PSC").text if adresa.find("PSC") is not None else ""

        # Rozdělení ulice na číslo a název
        number, street = split_street_and_number(ulice)

        # Sestavení adresy ve formátu: číslo popisné, ulice, město, PSČ, stát
        formatted_address = f"{number}, {street}, {obec}, {psc}, {kraj}".strip(", ")
        print(f"Parsed address: {formatted_address}")  # Ladící výstup

        # Získání souřadnic
        lat, lon = get_coordinates(formatted_address)

        # Uložení dat stanice
        station_data = {
            "Cislo": stanice.find("Cislo").text,
            "Address": formatted_address,
            "Latitude": lat,
            "Longitude": lon
        }
        stations.append(station_data)

        # Výstup
        print(f"Stanice {station_data['Cislo']}: {formatted_address}")
        if lat and lon:
            print(f"Souřadnice: Latitude = {lat}, Longitude = {lon}")
        else:
            print("Souřadnice: Nenalezeno")
        print("-" * 50)

        time.sleep(1)

# Uložení do JSON
with open("stk_stations_coordinates.json", "w", encoding="utf-8") as f:
    json.dump(stations, f, ensure_ascii=False, indent=4)

print("Zpracování dokončeno. Souřadnice uloženy do 'stk_stations_coordinates.json'.")