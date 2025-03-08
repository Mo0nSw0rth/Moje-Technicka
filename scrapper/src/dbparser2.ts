import fs from 'fs';
import { parseStringPromise } from 'xml2js';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hackujstat',
  password: 'hackujstat',
  port: 5432,
});

async function parseXMLFile(filePath: string) {
  try {
    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const result = await parseStringPromise(xmlData);

    console.log(JSON.stringify(result, null, 2)); 

    const stations = result?.['ns0:DatovaSada']?.['ns0:DatovyObsah']?.[0]?.['ns2:StaniceSeznam']?.[0]?.['ns2:Stanice'];

    if (!stations || !Array.isArray(stations)) {
      throw new Error('No station data found in XML');
    }

    for (const station of stations) {
      const stationData = {
        number: station?.['ns2:Cislo']?.[0] ?? null,
        geolocation: station?.['ns2:Geolokace']?.[0] ?? null,
        street: station?.['ns2:Adresa']?.[0]?.['ns2:Ulice']?.[0] ?? null,
        city: station?.['ns2:Adresa']?.[0]?.['ns2:Obec']?.[0] ?? null,
        okres: station?.['ns2:Adresa']?.[0]?.['ns2:Okres']?.[0] ?? null,
        kraj: station?.['ns2:Adresa']?.[0]?.['ns2:Kraj']?.[0] ?? null,
        postal_code: station?.['ns2:Adresa']?.[0]?.['ns2:PSC']?.[0] ?? null,
        operator_name: station?.['ns2:Provozovatel']?.[0]?.['ns2:Nazev']?.[0] ?? null,
        operator_phone: station?.['ns2:Provozovatel']?.[0]?.['ns2:Kontakt']?.[0]?.['ns2:Telefon']?.[0] ?? null,
        operator_email: station?.['ns2:Provozovatel']?.[0]?.['ns2:Kontakt']?.[0]?.['ns2:Email']?.[0] ?? null,
      };

      console.log('Inserting:', stationData);
      await insertIntoDatabase(stationData);
    }

    console.log('Data inserted successfully');
  } catch (error) {
    console.error('Error parsing XML:', error);
  }
}

async function insertIntoDatabase(data: any) {
  const query = `
    INSERT INTO stations (number, geolocation, street, city, okres, kraj, postal_code, operator_name, operator_phone, operator_email)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (number) DO NOTHING;
  `;
  const values = [
    data.number,
    data.geolocation,
    data.street,
    data.city,
    data.okres,
    data.kraj,
    data.postal_code,
    data.operator_name,
    data.operator_phone,
    data.operator_email,
  ];

  await pool.query(query, values);
}

parseXMLFile('C:\\Users\\pohlv\\Desktop\\Moje-Technicka\\scrapper\\src\\stanice_upraveno.xml').then(() => pool.end());
