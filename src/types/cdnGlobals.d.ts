interface Window {
  XLSX?: {
    read: (data: ArrayBuffer, opts: { type: 'array' }) => {
      SheetNames: string[];
      Sheets: Record<string, unknown>;
    };
    utils: {
      sheet_to_json: (
        sheet: unknown,
        opts?: { header?: number; defval?: string }
      ) => unknown[][];
    };
  };
  pdfjsLib?: {
    GlobalWorkerOptions: { workerSrc: string };
    getDocument: (src: { data: ArrayBuffer }) => {
      promise: Promise<{
        numPages: number;
        getPage: (pageNum: number) => Promise<{
          getTextContent: () => Promise<{
            items: Array<{ str?: string; transform?: number[] }>;
          }>;
        }>;
      }>;
    };
  };
  mammoth?: {
    convertToHtml: (input: {
      arrayBuffer: ArrayBuffer;
    }) => Promise<{ value: string }>;
    extractRawText: (input: {
      arrayBuffer: ArrayBuffer;
    }) => Promise<{ value: string }>;
  };
  Tesseract?: {
    recognize: (
      image: File | Blob | string,
      lang: string,
      opts?: { logger?: (m: { status: string; progress: number }) => void }
    ) => Promise<{ data: { text: string } }>;
  };
}
