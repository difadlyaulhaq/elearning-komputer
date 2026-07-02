import { FileViewerClient } from "./FileViewerClient";

export default async function ViewFilePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; name?: string }>;
}) {
  const { url, name } = await searchParams;
  
  return <FileViewerClient initialUrl={url || ''} initialName={name || ''} />;
}
