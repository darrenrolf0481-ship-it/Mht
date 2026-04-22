import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export type ExportFormat = 'html' | 'pdf' | 'docx' | 'json' | 'gem_code';

export async function exportFiles(files: {name: string, html: string, originalHtml?: string, rawHtml?: string}[], format: ExportFormat): Promise<{blob: Blob, filename: string}> {
  if (format === 'gem_code') {
    // Generate an inner wrapping for Google Gem Knowledge base injection
    let gemPayload = ``;
    files.forEach((f, index) => {
      gemPayload += `--- DOCUMENT ${index + 1}: ${f.name} ---\n\`\`\`json\n${f.originalHtml || f.html}\n\`\`\`\n\n`;
    });
    const blob = new Blob([gemPayload.trim()], { type: 'text/markdown' });
    const filename = files.length === 1 ? `${files[0].name.replace(/\.[^/.]+$/, "")}_gem_inject.md` : 'gem_global_inject.md';
    return { blob, filename };
  }

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(files, null, 2)], { type: 'application/json' });
    const filename = files.length === 1 ? `${files[0].name.replace(/\.[^/.]+$/, "")}_translated.json` : 'translated_files.json';
    return { blob, filename };
  }

  if (files.length === 1) {
    const blob = await createBlob(files[0].html, format);
    const baseName = files[0].name.replace(/\.[^/.]+$/, "");
    const ext = format === 'docx' ? 'doc' : format; // We use .doc extension for the msword mime type trick
    return { blob, filename: `${baseName}_translated.${ext}` };
  } else {
    const zip = new JSZip();
    for (const file of files) {
      const blob = await createBlob(file.html, format);
      const ext = format === 'docx' ? 'doc' : format;
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      zip.file(`${baseName}_translated.${ext}`, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { blob: zipBlob, filename: 'translated_files.zip' };
  }
}

async function createBlob(html: string, format: ExportFormat): Promise<Blob> {
  if (format === 'html') {
    return new Blob([html], { type: 'text/html' });
  } else if (format === 'docx') {
    // A reliable, zero-dependency way to create a Word-compatible document from HTML
    const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>${html}</body></html>`;
    return new Blob([fullHtml], { type: 'application/vnd.ms-word' });
  } else if (format === 'pdf') {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '800px';
      // Let height be auto-determined by content, but give a reasonable default
      iframe.style.height = '2000px'; 
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      document.body.appendChild(iframe);
      
      const content = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:20px;}</style></head><body>${html}</body></html>`;
      
      iframe.contentWindow?.document.open();
      iframe.contentWindow?.document.write(content);
      iframe.contentWindow?.document.close();
      
      setTimeout(async () => {
        try {
          const body = iframe.contentWindow?.document.body;
          if (!body) throw new Error("Failed to access iframe body");
          
          // Adjust iframe height to match content
          iframe.style.height = `${body.scrollHeight}px`;
          
          const canvas = await html2canvas(body, {
            scale: 2, // Better quality
            useCORS: true,
            logging: false
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          // Calculate PDF dimensions (A4 size: 210x297mm)
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });
          
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          // Handle multi-page PDF if content is longer than one page
          let heightLeft = pdfHeight;
          let position = 0;
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
          
          while (heightLeft >= 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
          }
          
          const blob = pdf.output('blob');
          document.body.removeChild(iframe);
          resolve(blob);
        } catch (e) {
          document.body.removeChild(iframe);
          reject(e);
        }
      }, 1500); // Wait for fonts/images to load
    });
  }
  throw new Error("Unsupported format");
}
