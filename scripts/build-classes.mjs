import { writeFileSync } from 'fs';
import { join } from 'path';
import { fetchClassData, OUT } from './fetch-data.mjs';

// Rebuild official classes/subclasses only (resolving refSubclassFeature/refClassFeature
// pointers), so homebrew data (appended by merge-wikidot.mjs) is left untouched.
const { processedClasses, processedSubclasses } = await fetchClassData();
writeFileSync(join(OUT, 'classes.json'), JSON.stringify(processedClasses, null, '\t'));
writeFileSync(join(OUT, 'subclasses.json'), JSON.stringify(processedSubclasses, null, '\t'));
console.log(`Wrote ${processedClasses.length} classes, ${processedSubclasses.length} subclasses`);