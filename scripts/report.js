const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Configuration - Load from Environment Variables
const SITE_URL = process.env.SITE_URL || 'https://luharaadil.github.io/Scrap-and-RN-generation-daily-records-V2/';
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_GROUP_ID = process.env.LINE_GROUP_ID;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

// Wait for a specified number of milliseconds
const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

async function runReport() {
  console.log('Starting puppeteer...');
  // Initialize Puppeteer
  const browser = await puppeteer.launch({
    // headless: 'new' is the modern standard, ensuring optimal performance
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });
  
  const page = await browser.newPage();
  // Set viewport to a high resolution for a good quality screenshot
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  
  console.log(`Navigating to ${SITE_URL}...`);
  await page.goto(SITE_URL, { waitUntil: 'networkidle0', timeout: 60000 });
  
  // Explicitly wait for charts and dynamic Data to load
  console.log('Waiting for charts and data to load (10 seconds)...');
  await delay(10000); 
  
  // NOTE: You can optimize the wait time by waiting for a specific CSS class 
  // of the Main Report to be rendered:
  // await page.waitForSelector('.recharts-wrapper', { timeout: 15000 });

  const screenshotPath = 'main-report.png';
  console.log(`Taking screenshot and saving to ${screenshotPath}...`);
  
  // If you only want a specific section rather than the full page, use an ID or class:
  // const element = await page.$('#main-report-container');
  // await element.screenshot({ path: screenshotPath });
  
  // Full page screenshot
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();
  console.log('Screenshot taken!');

  // LINE Messaging API requires a public HTTPS URL to display images. 
  // You cannot upload local file attachments directly via the typical Push Message API.
  // We use ImgBB (a free image hosting API) to temporarily host the image and get a URL.
  await uploadToImgBBAndSendToLine(screenshotPath);
}

async function uploadToImgBBAndSendToLine(imagePath) {
  if (!IMGBB_API_KEY || !LINE_CHANNEL_ACCESS_TOKEN || !LINE_GROUP_ID) {
    console.error('Missing one or more required environment variables (IMGBB_API_KEY, LINE_CHANNEL_ACCESS_TOKEN, LINE_GROUP_ID).');
    return;
  }

  try {
    console.log('Uploading image to ImgBB to get a public URL...');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    
    // Upload image to ImgBB
    const imgbbRes = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData, {
      headers: formData.getHeaders()
    });
    
    // This URL will be accessed by the LINE app
    const imageUrl = imgbbRes.data.data.url;
    console.log(`Image uploaded successfully: ${imageUrl}`);
    
    console.log('Sending message to LINE Group...');
    // Call LINE Messaging API
    const lineResponse = await axios.post('https://api.line.me/v2/bot/message/push', {
      to: LINE_GROUP_ID,
      messages: [
        {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });
    
    console.log('Successfully sent message and image to LINE!');
  } catch (error) {
    console.error('Error during upload or LINE API call:');
    console.error(error.response ? error.response.data : error.message);
  }
}

runReport().catch(console.error);
