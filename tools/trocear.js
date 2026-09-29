// Corta una captura de página entera en trozos del alto de una pantalla para poder leerlos.
// Uso: node tools/trocear.js <png> <alto-trozo> [desde] [hasta]
const sharp = require('sharp');
const path = require('path');
const [,, archivo, altoTxt = '900', desdeTxt = '0', hastaTxt] = process.argv;
(async () => {
  const meta = await sharp(archivo).metadata();
  const alto = +altoTxt;
  const hasta = hastaTxt ? +hastaTxt : meta.height;
  const hechos = [];
  for (let y = +desdeTxt, i = 0; y < hasta; y += alto, i++) {
    const h = Math.min(alto, meta.height - y);
    if (h <= 0) break;
    const salida = archivo.replace(/\.png$/, '') + '-t' + i + '.png';
    await sharp(archivo).extract({ left: 0, top: y, width: meta.width, height: h }).toFile(salida);
    hechos.push(path.basename(salida));
  }
  console.log(meta.width + 'x' + meta.height, hechos.join(' '));
})();
