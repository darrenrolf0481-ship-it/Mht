import fs from 'fs-extra';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { extractMHTBody, processSovereignPriority } from '../src/lib/mhtParser';

export async function convertFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  let content = '';

  if (ext === '.mht' || ext === '.mhtml') {
    const raw = await fs.readFile(filePath, 'utf8');
    content = extractMHTBody(raw);
  } else if (ext === '.pdf') {
    const dataBuffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    content = textResult.text;
    await parser.destroy();
  } else if (ext === '.docx') {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    content = result.value;
  } else {
    content = await fs.readFile(filePath, 'utf8');
  }

  const structuredJson = processSovereignPriority(content);

  const fileName = path.basename(filePath, ext) + '.json';
  const outputPath = path.join('/home/workspace/Mht/output', fileName);
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, structuredJson, 'utf8');

  return structuredJson;
}
