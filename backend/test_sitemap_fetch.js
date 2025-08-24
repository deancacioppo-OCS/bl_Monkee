const fetch = require('node-fetch');

const sitemapUrl = 'https://www.fassbenderinsurance.com/post-sitemap.xml';

async function testSitemapFetch() {
    console.log(`Attempting to fetch sitemap from: ${sitemapUrl}`);
    try {
        const response = await fetch(sitemapUrl);
        console.log(`Status: ${response.status}`);
        console.log("Headers:", response.headers.raw());
        const text = await response.text();
        console.log("Content:", text);
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

testSitemapFetch();