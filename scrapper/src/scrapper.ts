import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface ScraperConfig {
    url: string;
    className: string;
    downloadFolder: string;
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Error downloading file from ${url}:`, error);
        throw error;
    }
}

async function scrapeAndDownload(config: ScraperConfig): Promise<void> {
    try {
        if (!fs.existsSync(config.downloadFolder)) {
            fs.mkdirSync(config.downloadFolder, { recursive: true });
        }

        const response = await axios.get(config.url);
        const $ = cheerio.load(response.data);

        const urls: string[] = [];
        $(`.${config.className}`).each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                urls.push(href.startsWith('http') ? href : new URL(href, config.url).href);
            }
        });

        console.log(`found ${urls.length} urls`);

        for (const url of urls) {
            console.log(`processing URL: ${url}`);
            try {
                const pageResponse = await axios.get(url);
                const page$ = cheerio.load(pageResponse.data);

                page$('a').each((index, element) => {
                    const linkText = page$(element).text().trim();
                    if (linkText === 'Stáhnout') {
                        const downloadUrl = page$(element).attr('href');
                        if (downloadUrl) {
                            const fullDownloadUrl = downloadUrl.startsWith('http') 
                                ? downloadUrl 
                                : new URL(downloadUrl, url).href;

                            const baseName = `dataset_${Date.now()}_${index + 1}`;
                            const fileName = `${baseName}.xml.gz`;
                            const outputPath = path.join(config.downloadFolder, fileName);

                            console.log(`Found "Stáhnout" link: ${fullDownloadUrl}`);
                            console.log(`Downloading to: ${outputPath}`);

                            downloadFile(fullDownloadUrl, outputPath)
                                .then(() => console.log(`Successfully downloaded ${fileName}`))
                                .catch(error => console.error(`Failed to download ${fileName}:`, error));
                        }
                    }
                });
            } catch (error) {
                console.error(`Error processing ${url}:`, error);
            }
        }

    } catch (error) {
        console.error('Error scraping URLs:', error);
    }
}

async function main() {
    const baseUrl = 'https://data.gov.cz/datov%C3%A9-sady?poskytovatel=https%3A%2F%2Frpp-opendata.egon.gov.cz%2Fodrpp%2Fzdroj%2Forg%C3%A1n-ve%C5%99ejn%C3%A9-moci%2F66003008&kl%C3%AD%C4%8Dov%C3%A1-slova=prohl%C3%ADdka%20vozidla&kl%C3%AD%C4%8Dov%C3%A1-slova=prohl%C3%ADdky%20vozidel&str%C3%A1nka=';
    const className = 'flex-space-between';
    const downloadFolder = './downloads';

    for (let page = 1; page <= 239; page++) {
        const config: ScraperConfig = {
            url: `${baseUrl}${page}`,
            className: className,
            downloadFolder: downloadFolder
        };

        console.log(`Scraping page ${page}...`);
        await scrapeAndDownload(config);

        if (page < 239) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

main();