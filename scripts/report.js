const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

(async () => {
  try {
    console.log('Starting the report robot...');
    
    // 1. Launch the browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // 2. Set the screen size (Change these numbers if your report is wider)
    await page.setViewport({ width: 1920, height: 1080 });

    // 3. Go to your website
    console.log(`Visiting: ${process.env.SITE_URL}`);
    await page.goto(process.env.SITE_URL, { waitUntil: 'networkidle2' });

    // 4. WAIT: Give the charts 5 seconds to animate and finish loading
    console.log('Waiting for charts to render...');
    await new Promise(r => setTimeout(r, 5000));

    // 5. Take the screenshot
    const screenshotPath = 'report.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await browser.close();
    console.log('Screenshot captured!');

    // 6. Upload to ImgBB
    console.log('Uploading to ImgBB...');
    const form = new FormData();
    form.append('image', fs.createReadStream(screenshotPath));
    const imgResponse = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_KEY}`, form, {
      headers: form.getHeaders(),
    });
    const imageUrl = imgResponse.data.data.url;
    console.log(`Image Hosted at: ${imageUrl}`);

    // 7. Send to LINE Group
    console.log('Sending to LINE...');
    await axios.post('https://api.line.me/v2/bot/message/push', {
      to: process.env.GROUP_ID,
      messages: [
        {
          type: 'text',
          text: `📊 Daily Production Report - ${new Date().toLocaleDateString()}`
        },
        {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_TOKEN}`
      }
    });

    console.log('✅ Report sent successfully to LINE Group!');
  } catch (error) {
    console.error('❌ Error in automation:', error.message);
    process.exit(1);
  }
})();
