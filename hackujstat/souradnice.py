import xml.etree.ElementTree as ET
from geopy.geocoders import Nominatim


tree = ET.parse("stanice.xml")
root = tree.getroot()


namespaces = {
    "ds": "istp:opendata:schemas:DatovaSada:v1",
    "ss": "istp:opendata:schemas:StaniceSeznam:v1"
}


stanice_seznam = root.find("ds:DatovyObsah/ss:StaniceSeznam", namespaces)

pocet = 0
chyby = 0

if stanice_seznam is not None:
    for stanice in stanice_seznam.findall("ss:Stanice", namespaces):
        adresa_elem = stanice.find("ss:Adresa/ss:Ulice", namespaces)

        if adresa_elem is not None:
            adresa = adresa_elem.text
            #print(f"Načtená adresa: {adresa}")

            #-
            geolocator = Nominatim(user_agent="moje_aplikace")  
            try:
                location = geolocator.geocode(adresa)
            except:
                print("chyba_timeout")
                x, y = 0, 0
            if location:
                x, y = location.latitude, location.longitude
            else:
                print("Adresa nebyla nalezena")
                x, y = 0,0
                chyby +=1
                print(chyby)
            #-
            latitude = x
            longitude = y


            geolokace = ET.Element("{istp:opendata:schemas:StaniceSeznam:v1}Geolokace")
            geolokace.text = f"{latitude}, {longitude}"


            cislo_elem = stanice.find("ss:Cislo", namespaces)
            if cislo_elem is not None:

                children = list(stanice)


                for i, child in enumerate(children):
                    if child == cislo_elem:
                        stanice.insert(i + 1, geolokace)
        pocet += 1
        print(pocet)

tree.write("stanice_upraveno.xml", encoding="utf-8", xml_declaration=True)