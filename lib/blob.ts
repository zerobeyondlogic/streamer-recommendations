import "server-only";

export function isBlobStorageConfigured() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return !!token && token !== "vercel_blob_token_here" && token.length > 30;
}
