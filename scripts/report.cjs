const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const SITE_URL = process.env.SITE_URL || 'https://luharaadil.github.io/Scrap-and-RN-generation-daily-records/';
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_GROUP_ID = process.env.LINE_GROUP_ID;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

async function runReport() {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`Navigating to ${SITE_URL}...`);
    await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('Waiting 15 seconds for charts and data to render completely...');
    await delay(15000); 

    const screenshotPath = 'main-report.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot taken!');

    await uploadToImgBBAndSendToLine(screenshotPath);
  } catch (error) {
    console.error('Bot Error:', error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

async function uploadToImgBBAndSendToLine(imagePath) {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    
    const imgbbRes = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData, {
      headers: formData.getHeaders()
    });
    
    const imageUrl = imgbbRes.data.data.url;
    console.log(`Image URL: ${imageUrl}`);
    
    await axios.post('https://api.line.me/v2/bot/message/push', {
      to: LINE_GROUP_ID,
      messages: [{ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });
    console.log('Sent to LINE!');
  } catch (error) {
    console.error('Upload/LINE Error:', error.response ? error.response.data : error.message);
    throw error;
  }
}

runReport();