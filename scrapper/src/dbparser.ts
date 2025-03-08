import * as fs from 'fs';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import { Pool } from 'pg';

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hackujstat',
    password: 'hackujstat',
    port: 5432,
});

interface Inspection {
    CisloProtokolu: string[];
    DatumProhlidky: string[];
    Stanice: [{
        Cislo: string[];
        Kraj: string[];
    }];
    CasoveUdaje: [{
        Zahajeni: string[];
        Ukonceni: string[];
    }];
    OdpovednaOsoba: string[];
    DruhProhlidky: string[];
    RozsahProhlidky: string[];
    Vozidlo: [{
        Vin: string[];
        Druh: string[];
        Kategorie: string[];
        Znacka: string[];
        ObchodniOznaceni: string[];
        TypMotoru: string[];
    }];
    Registrace: [{
        DatumPrvniRegistrace: string[];
    }];
    TechnickaCast: [{
        OdpovednaOsoba: string[];
    }];
    Vysledek: [{
        ZavadaSeznam: [{
            Zavada: Array<{
                Kod: string[];
                Zavaznost: string[];
            }>;
        }];
        DatumPristiProhlidky: string[];
        NalepkaVylepena: string[];
        VysledekCelkovy: string[];
    }];
}

interface DataSet {
    DatovaSada: {
        DatovyObsahInfo: [{
            ID: string[];
            CasVytvoreni: string[];
            CasovePokrytiZacatek: string[];
            CasovePokrytiKonec: string[];
        }];
        DatovyObsah: [{
            ProhlidkaSeznam: [{
                Prohlidka: Inspection[];
            }];
        }];
    };
}
async function processXMLFile(filePath: string) {
    try {
        const xmlContent = fs.readFileSync(filePath, 'utf-8');
        const result: DataSet = await parseStringPromise(xmlContent, {
            explicitArray: true,
            trim: true
        });

        const datasetInfo = result.DatovaSada.DatovyObsahInfo?.[0] || {};
        const inspections = result.DatovaSada.DatovyObsah?.[0]?.ProhlidkaSeznam?.[0]?.Prohlidka || [];

        if (inspections.length === 0) {
            console.log(`No inspections found in ${filePath}`);
            return;
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const inspection of inspections) {
                const inspectionValues = [
                    inspection.CisloProtokolu?.[0] || null,
                    inspection.DatumProhlidky?.[0] || null,
                    inspection.Stanice?.[0]?.Cislo?.[0] || null,
                    inspection.Stanice?.[0]?.Kraj?.[0] || null,
                    inspection.CasoveUdaje?.[0]?.Zahajeni?.[0] || null,
                    inspection.CasoveUdaje?.[0]?.Ukonceni?.[0] || null,
                    inspection.OdpovednaOsoba?.[0] || null,
                    inspection.DruhProhlidky?.[0] || null,
                    inspection.RozsahProhlidky?.[0] || null,
                    inspection.Vozidlo?.[0]?.Vin?.[0] || null,
                    inspection.Vozidlo?.[0]?.Druh?.[0] || null,
                    inspection.Vozidlo?.[0]?.Kategorie?.[0] || null,
                    inspection.Vozidlo?.[0]?.Znacka?.[0] || null,
                    inspection.Vozidlo?.[0]?.ObchodniOznaceni?.[0] || null,
                    inspection.Vozidlo?.[0]?.TypMotoru?.[0] || null,
                    inspection.Registrace?.[0]?.DatumPrvniRegistrace?.[0] || null,
                    inspection.TechnickaCast?.[0]?.OdpovednaOsoba?.[0] || null,
                    inspection.Vysledek?.[0]?.DatumPristiProhlidky?.[0] || null,
                    inspection.Vysledek?.[0]?.NalepkaVylepena?.[0] === 'true' || false,
                    inspection.Vysledek?.[0]?.VysledekCelkovy?.[0] ? parseInt(inspection.Vysledek[0].VysledekCelkovy[0]) : null,
                    datasetInfo.CasVytvoreni?.[0] || null,
                    datasetInfo.CasovePokrytiZacatek?.[0] || null,
                    datasetInfo.CasovePokrytiKonec?.[0] || null,
                    datasetInfo.ID?.[0] || null
                ];

                const insertInspectionQuery = `
                    INSERT INTO inspection_records (
                        protocol_number, inspection_date, station_number, station_region,
                        start_time, end_time, responsible_person, inspection_type,
                        inspection_scope, vehicle_vin, vehicle_type, vehicle_category,
                        vehicle_brand, vehicle_model, engine_type, first_registration_date,
                        technical_responsible_person, next_inspection_date, sticker_applied,
                        overall_result, created_at, time_coverage_start, time_coverage_end,
                        dataset_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
                    RETURNING id
                `;

                const inspectionResult = await client.query(insertInspectionQuery, inspectionValues);
                const inspectionId = inspectionResult.rows[0].id;

                const defects = inspection.Vysledek?.[0]?.ZavadaSeznam?.[0]?.Zavada || [];
                for (const defect of defects) {
                    const insertDefectQuery = `
                        INSERT INTO inspection_defects (inspection_id, defect_code, severity)
                        VALUES ($1, $2, $3)
                    `;
                    await client.query(insertDefectQuery, [
                        inspectionId,
                        defect.Kod?.[0] || null,
                        defect.Zavaznost?.[0] || null
                    ]);
                }
            }

            await client.query('COMMIT');
            console.log(`Successfully processed ${filePath}`);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

async function processFolder(folderPath: string) {
    try {
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.xml') {
                const fullPath = path.join(folderPath, file);
                await processXMLFile(fullPath);
            }
        }
    } catch (error) {
        console.error('Error processing folder:', error);
    } finally {
        await pool.end();
    }
}

const folderPath = 'C:\\Users\\pohlv\\Desktop\\hackujstat\\scrapper\\unzipped';
processFolder(folderPath);