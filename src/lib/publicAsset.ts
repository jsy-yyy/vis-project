export function publicAssetPath(path: string) {
  const baseUrl = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL;
  return `${baseUrl}${path.replace(/^\/+/, "")}`;
}
