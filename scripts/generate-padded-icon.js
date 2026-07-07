const { Jimp } = require('jimp');

async function processImage() {
  try {
    // 1. Read the original logo
    const logo = await Jimp.read('public/LOGO INTER.png');
    
    // 2. Create a new 1024x1024 transparent canvas
    const size = 1024;
    const canvas = new Jimp({ width: size, height: size, color: 0x00000000 });

    // 3. Resize logo to fit in "Safe Zone"
    const safeZone = 600; 
    
    logo.scaleToFit({ w: safeZone, h: safeZone });

    // 4. Center the logo on the canvas
    const x = (size - logo.bitmap.width) / 2;
    const y = (size - logo.bitmap.height) / 2;
    
    canvas.composite(logo, x, y);

    // 5. Save the new "Padded" asset
    await canvas.write('resources/icon.png');
    await canvas.write('resources/splash.png');
    
    console.log('✅ Success! Created padded icons in resources/ folder.');
    
  } catch (error) {
    console.error('❌ Error processing image:', error);
  }
}

processImage();