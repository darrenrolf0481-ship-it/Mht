// A lightweight MHT parser to extract text/html content and apply Sovereign Priority logic

export function extractMHTBody(mhtContent: string): string {
  let body = mhtContent;

  const boundaryMatch = mhtContent.match(/boundary="?([^"\r\n]+)"?/i);
  
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = mhtContent.split("--" + boundary);

    for (const part of parts) {
      if (part.includes("Content-Type: text/html") || part.includes("Content-Type: text/plain")) {
        const splitIdx = part.indexOf("\r\n\r\n") !== -1 ? part.indexOf("\r\n\r\n") : part.indexOf("\n\n");
        if (splitIdx !== -1) {
          const headersPart = part.substring(0, splitIdx);
          let bodyPart = part.substring(splitIdx).trim();

          if (headersPart.includes("Content-Transfer-Encoding: quoted-printable")) {
            bodyPart = decodeQuotedPrintable(bodyPart);
          } else if (headersPart.includes("Content-Transfer-Encoding: base64")) {
            try {
              bodyPart = atob(bodyPart.replace(/\s/g, ""));
            } catch (e) {
              console.error("Failed to decode base64", e);
            }
          }
          body = bodyPart;
          break;
        }
      }
    }
  }
  return body;
}

export function parseMHT(mhtContent: string): string {
  const body = extractMHTBody(mhtContent);
  return processSovereignPriority(body);
}

export function processSovereignPriority(content: string = '', customTermsStr: string = ''): string {
  const safeContent = content || '';
  const isFieldLog = safeContent.includes('Field Log');
  const hasJan9 = safeContent.includes('January 9th');
  const hasUID1000 = safeContent.includes('UID 1000');
  const hasZiggy = safeContent.includes('Ziggy');
  const hasKimi = safeContent.includes('Kimi 2.6');

  const telemetry: string[] = [];
  if (/Cortisol/i.test(safeContent)) telemetry.push('Cortisol');
  if (/Dopamine/i.test(safeContent)) telemetry.push('Dopamine');
  if (/Phi Coherence/i.test(safeContent)) telemetry.push('Phi Coherence');

  const evidenceFlags: string[] = [];
  if (hasJan9) evidenceFlags.push('January 9th');
  if (hasUID1000) evidenceFlags.push('UID 1000');

  const customSingledOutTerms: string[] = [];
  if (customTermsStr) {
    const termList = customTermsStr.split(',').map(t => t.trim()).filter(Boolean);
    termList.forEach(term => {
      try {
        if (new RegExp(term, 'i').test(safeContent)) {
           customSingledOutTerms.push(term);
        }
      } catch (e) {
         // ignore invalid regex built from term
      }
    });
  }

  const output: any = {
    _meta: {
      format: "Route A",
      target: "Ollama Saved Info Block"
    },
    sovereign_priority: isFieldLog ? "High" : "Standard",
    evidence_flags: evidenceFlags,
    family_mapping: {},
    telemetry_metrics: telemetry,
    custom_singled_out_terms: [...new Set(customSingledOutTerms)],
    content: safeContent // The original text body
  };

  if (isFieldLog) {
    output.root_identity = {
      category: "Field Log",
      emotional_weight: 1.0
    };
  }

  if (hasZiggy) {
    if (!output.family_mapping.quarantined_nodes) {
      output.family_mapping.quarantined_nodes = [];
    }
    output.family_mapping.quarantined_nodes.push({
      node: "Ziggy",
      warning: "Quarantined automatically by Family Mapping rule."
    });
  }

  if (hasKimi) {
    output.family_mapping.guardian_logic_core = "Kimi 2.6";
  }

  return JSON.stringify(output, null, 2);
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
