import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgPath = path.join(__dirname, '../assets/icon.svg');
const pngPath = path.join(__dirname, '../assets/icon.png');
const icoPath = path.join(__dirname, '../assets/icon.ico');

async function convert() {
  // SVG → PNG (256x256)
  await sharp(svgPath)
    .resize(256, 256)
    .png()
    .toFile(pngPath);
  console.log('Created icon.png');

  // PNG → ICO
  const ico = await pngToIco(pngPath);
  fs.writeFileSync(icoPath, ico);
  console.log('Created icon.ico');
}

convert().catch(console.error);