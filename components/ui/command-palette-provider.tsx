import { getSearchEntries } from "@/lib/search";
import { CommandPalette } from "./command-palette";

export async function CommandPaletteProvider() {
  const entries = await getSearchEntries();
  return <CommandPalette entries={entries} />;
}
