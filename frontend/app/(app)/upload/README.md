Upload page — Backend integration notes

This Upload page currently runs in demo-mode (client-side simulated uploads). To connect to a real backend, follow these notes:

Recommended API

POST /api/upload
- Content-Type: multipart/form-data
- Field: file (single file per request) or multiple files depending on backend

Successful response (JSON):
{
  "success": true,
  "file": {
    "id": "server-generated-id",
    "name": "example.pdf",
    "size": 12345,
    "type": "application/pdf",
    "uploadedAt": "2026-08-27T00:00:00.000Z"
  }
}

Progress reporting

- Use XMLHttpRequest and the `xhr.upload.onprogress` event to report per-file progress and feed it into the page's progress UI. The helper `lib/uploadService.ts` includes an `uploadFileXHR` example that can be used.

Integration steps

1. Import the upload helper in the Upload page and replace the simulated `startUpload` behavior with calls to `uploadFileXHR(file, '/api/upload', onProgress)`.
2. Update the page's state transitions on success/error according to the server response.
3. Consider implementing retries with exponential backoff for transient failures.
4. When uploading very large files, consider chunked or resumable uploads (tus, tus-js-client, S3 multipart) if backend supports them.

Security & validation

- Enforce the same validations server-side (file type, size limit).
- Sanitize filenames and store files securely.
- Require authenticated sessions for uploads unless public uploads are desired.

