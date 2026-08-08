import { scanLibrary } from "../library.js";
import { config } from "../config.js";

const tracks = await scanLibrary();
console.log(`Scanned ${tracks.length} tracks from ${config.libraryDir}`);
