// Demo UploadService
// Exposes a minimal API compatible with the Upload page.
// Replace simulateUpload with a real API call (e.g., using XMLHttpRequest for progress or fetch+streams).

export type UploadProgressCallback = (percent: number) => void;
export type UploadResult = { success: boolean; error?: string; uploadedAt?: string };

export async function uploadFileDemo(file: File, onProgress?: UploadProgressCallback): Promise<UploadResult> {
  return new Promise((resolve) => {
    const totalMs = 1200 + Math.random() * 3000;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      onProgress?.(pct);
      if (pct >= 100) {
        clearInterval(timer);
        // small chance of simulated failure
        if (Math.random() < 0.08) {
          resolve({ success: false, error: "Simulated network error" });
        } else {
          resolve({ success: true, uploadedAt: new Date().toISOString() });
        }
      }
    }, 120);
  });
}

export async function uploadFilesDemo(files: File[], onFileProgress?: (index:number, pct:number)=>void) {
  // run uploads in parallel; returns results array
  const promises = files.map((f, i) =>
    uploadFileDemo(f, (pct) => onFileProgress?.(i, pct))
  );
  return Promise.all(promises);
}

// Example of how to wire a real backend upload using XMLHttpRequest for progress reporting.
// Keep as reference; don't export this by default.
export function uploadFileXHR(file: File, url: string, onProgress?: UploadProgressCallback): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);

    xhr.open("POST", url, true);
    xhr.timeout = 60_000;

    xhr.upload.onprogress = function (ev) {
      if (ev.lengthComputable) {
        const percent = Math.round((ev.loaded / ev.total) * 100);
        onProgress?.(percent);
      }
    };

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve({ success: true, uploadedAt: json.uploadedAt || new Date().toISOString() });
        } catch (e) {
          resolve({ success: true, uploadedAt: new Date().toISOString() });
        }
      } else {
        resolve({ success: false, error: `Upload failed: ${xhr.status}` });
      }
    };

    xhr.onerror = function () {
      resolve({ success: false, error: "Cannot reach the server. Check that the backend is running and your connection is stable." });
    };

    xhr.ontimeout = function () {
      resolve({ success: false, error: "Upload timed out. The file may be too large or the server is busy." });
    };

    xhr.send(form);
  });
}
