export interface FileFilter { name: string; extensions: string[] }
export interface OpenedTextFile { contents: string; fileName: string }
export const isDesktopRuntime = (): boolean => false;
export async function openDesktopTextFile(_filters: FileFilter[]): Promise<OpenedTextFile | null> { return null; }
export async function saveDesktopTextFile(_contents: string, _defaultName: string, _filters: FileFilter[]): Promise<boolean> { return false; }
export async function saveDesktopBinaryFile(_contents: Uint8Array, _defaultName: string, _filters: FileFilter[]): Promise<boolean> { return false; }
export async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 400_000_000)
    throw new Error("Invalid or oversized PNG export.");
  const bytes = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  return Uint8Array.from(bytes, character => character.charCodeAt(0));
}
