declare module 'pdf-parse' {
  interface PdfData {
    numpages: number;
    numrender?: number;
    info: any;
    metadata: any;
    text: string;
    version?: string;
  }

  function pdfParse(dataBuffer: Buffer | Uint8Array, options?: any): Promise<PdfData>;
  export = pdfParse;
}
