let Jimp = require('jimp');
if (Jimp.Jimp) {
  Jimp = Jimp.Jimp;
}
const fs = require('fs');

const inputPath = 'C:\\Users\\Tadeo Leon Ferense\\Desktop\\BunkerNotas.png';
const outputPathIcon = 'assets/icon.png';
const outputPathAdaptive = 'assets/adaptive-icon.png';

console.log('Leyendo imagen desde:', inputPath);

if (!fs.existsSync(inputPath)) {
  console.error('El archivo no existe en el Escritorio. Por favor verifica el nombre y la extensión.');
  process.exit(1);
}

Jimp.read(inputPath)
  .then(image => {
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    console.log(`Dimensiones originales: ${width}x${height}`);

    // Redimensionar manteniendo relación de aspecto usando contain.
    // Para ser compatible con Jimp v0.x y v1.x:
    try {
      // Intentar método contain de Jimp v1 (recibe objeto)
      image.contain({ w: 1024, h: 1024, alignHorz: 0x02, alignVert: 0x02 }); // centro
    } catch (e) {
      // Fallback a Jimp v0 (recibe números y opcionales)
      image.contain(1024, 1024);
    }

    // Escribir a los assets
    image.writeAsync ? image.writeAsync(outputPathIcon) : image.write(outputPathIcon);
    image.writeAsync ? image.writeAsync(outputPathAdaptive) : image.write(outputPathAdaptive);
    
    console.log('Iconos actualizados con éxito en assets/icon.png y assets/adaptive-icon.png');
  })
  .catch(err => {
    console.error('Error procesando el ícono:', err);
  });
