#!/usr/bin/env npx tsx
import { convertFile } from './converter_logic';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/convert.ts <file-path>');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  console.log(`Converting: ${filePath}...`);

  try {
    const result = await convertFile(filePath);
    const fileName = path.basename(filePath, path.extname(filePath)) + '.json';
    console.log(`Success! Saved to: /home/workspace/Mht/output/${fileName}`);
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

main();
