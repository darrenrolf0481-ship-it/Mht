// A lightweight MHT parser to extract text/html content
export function parseMHT(mhtContent: string): string {
  // Find the boundary
  const boundaryMatch = mhtContent.match(/boundary="?([^"\r\n]+)"?/i);
  if (!boundaryMatch) {
    // If no boundary, maybe it's just raw HTML saved with a weird extension
    if (mhtContent.toLowerCase().includes("<html")) {
      return mhtContent;
    }
    throw new Error("Invalid MHT file: No boundary found");
  }

  const boundary = boundaryMatch[1];
  const parts = mhtContent.split(new RegExp(`--${boundary}`));

  for (const part of parts) {
    if (part.includes("Content-Type: text/html")) {
      // Extract headers and body
      const [headersPart, ...bodyParts] = part.split(/\r?\n\r?\n/);
      let body = bodyParts.join("\n\n").trim();
      
      // Check encoding
      if (headersPart.includes("Content-Transfer-Encoding: quoted-printable")) {
        body = decodeQuotedPrintable(body);
      } else if (headersPart.includes("Content-Transfer-Encoding: base64")) {
        try {
          body = atob(body.replace(/\s/g, ""));
        } catch (e) {
          console.error("Failed to decode base64", e);
        }
      }
      
      return body;
    }
  }

  throw new Error("No HTML content found in MHT file");
}

function decodeQuotedPrintable(input: string): string {
  // Remove soft line breaks
  let decoded = input.replace(/=\r?\n/g, "");
  // Decode =XX hex characters
  decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  return decoded;
}
