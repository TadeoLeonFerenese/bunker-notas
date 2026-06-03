const { Jimp } = require('jimp');
const fs = require('fs');

const buffer = fs.readFileSync('C:\\Users\\Tadeo Leon Ferense\\Downloads\\bunkerLogo.png');
Jimp.read(buffer)
  .then(image => {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      const brightness = (red + green + blue) / 3;
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const diff = max - min;
      
      // If the pixel is mostly gray/white (low saturation, high brightness)
      if (diff < 40 && brightness > 120) {
        // Factor goes from 0 (at brightness 120) to 1 (at brightness 255)
        let factor = (brightness - 120) / 135; 
        
        // As factor approaches 1 (white), we make it black (0).
        // Let's multiply the rgb values by (1 - factor^2) for a smoother transition
        const darken = Math.max(0, 1 - Math.pow(factor, 1.5));
        
        this.bitmap.data[idx + 0] = red * darken;
        this.bitmap.data[idx + 1] = green * darken;
        this.bitmap.data[idx + 2] = blue * darken;
      }
    });
    
    // Ensure square size and save
    image.resize({ w: 1024, h: 1024 });
    image.write('assets/icon.png');
    image.write('assets/adaptive-icon.png');
    console.log('Iconos generados con éxito.');
  })
  .catch(err => {
    console.error('Error procesando imagen:', err);
  });
