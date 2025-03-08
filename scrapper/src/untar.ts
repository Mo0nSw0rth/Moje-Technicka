import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

interface UnzipConfig {
    sourceFolder: string;
    destinationFolder: string;  
}

async function unzipFile(filePath: string, outputPath: string): Promise<void> {
    try {
        const readStream = fs.createReadStream(filePath);
        const writeStream = fs.createWriteStream(outputPath);
        const gunzip = zlib.createGunzip();

        readStream
            .pipe(gunzip)
            .pipe(writeStream)
            .on('finish', () => {
                console.log(`Unzipped ${path.basename(filePath)} to ${path.basename(outputPath)}`);
            })
            .on('error', (error) => {
                console.error(`Error unzipping ${path.basename(filePath)}:`, error);
                throw error;
            });
    } catch (error) {
        console.error(`Failed to process ${path.basename(filePath)}:`, error);
        throw error;
    }
}

async function unzipAll(config: UnzipConfig): Promise<void> {
    try {
        if (!fs.existsSync(config.destinationFolder)) {
            fs.mkdirSync(config.destinationFolder, { recursive: true });
        }

        const files = fs.readdirSync(config.sourceFolder);

        const gzFiles = files.filter(file => file.endsWith('.xml.gz'));

        if (gzFiles.length === 0) {
            console.log(`No .xml.gz files found in ${config.sourceFolder}`);
            return;
        }

        console.log(`Found ${gzFiles.length} .xml.gz files to unzip`);

        const batchSize = 10;
        const delayMs = 1000;

        for (let i = 0; i < gzFiles.length; i += batchSize) {
            const batch = gzFiles.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(gzFiles.length / batchSize)}`);

            const unzipPromises = batch.map(async (file) => {
                const sourcePath = path.join(config.sourceFolder, file);
                const fileNameWithoutExt = file.replace('.xml.gz', '.xml');
                const destinationPath = path.join(config.destinationFolder, fileNameWithoutExt);

                await unzipFile(sourcePath, destinationPath);
            });

            await Promise.all(unzipPromises);

            if (i + batchSize < gzFiles.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        console.log(`Unzipping completed. Files are saved in ${config.destinationFolder}`);
    } catch (error) {
        console.error('Error unzipping files:', error);
    }
}

async function main() {
    const config: UnzipConfig = {
        sourceFolder: './downloads', 
        destinationFolder: './unzipped' 
    };

    await unzipAll(config);
}

main();