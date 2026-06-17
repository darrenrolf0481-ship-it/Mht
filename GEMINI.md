# Mht File Conversion Tool

This utility is designed to convert large files (MHT, PDF, DOCX, TXT) into a structured JSON format that is context-efficient for LLMs.

## How to use

Run the conversion script from the terminal:

```bash
npx tsx /home/workspace/Mht/scripts/convert.ts <path-to-file>
```

## Output

Converted files are saved as JSON in:
`/home/workspace/Mht/output/`

Each output file includes the original content plus structured "Sovereign Priority" metadata (telemetry, evidence flags, etc.) derived from the text.

## Supported Formats

- **.mht**: Parsed using a custom lightweight parser.
- **.pdf**: Parsed using `pdf-parse`.
- **.docx**: Parsed using `mammoth`.
- **.txt / other**: Read as UTF-8 plain text.
