import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import '../web/reader.js';

const [output, save] = process.argv.slice(2);
if (!output) throw Error('Usage: node scripts/offline.mjs <output.html> [local.sav]');
const web = new URL('../web/', import.meta.url);
const read = file => readFile(new URL(file, web), 'utf8');
const escapeData = data => JSON.stringify(data).replaceAll('<', '\\u003c');
let html = await read('index.html');
const css = await read('atlas.css');
html = html.replace('<link rel="stylesheet" href="atlas.css">', () => '<style>'+css+'</style>');
const catalog = JSON.parse(await read('catalog.json'));
let embedded = 'globalThis.EMBEDDED_CATALOG='+escapeData(catalog)+';';
if (save) {
  const galaxy = await GalaxyReader.readFile(new Blob([await readFile(save)]));
  embedded += '\nglobalThis.LOCAL_SNAPSHOT='+escapeData(galaxy)+';';
  const directory=dirname(resolve(save));
  const envRoot=['ProgramFiles(x86)','USERPROFILE'].find(k=>process.env[k] && directory.toLowerCase().startsWith(process.env[k].toLowerCase()+'\\'));
  const location=envRoot?'%'+envRoot+'%'+directory.slice(process.env[envRoot].length):directory;
  embedded += '\nglobalThis.LOCAL_SAVE_FOLDER='+escapeData(location)+';';
}
html = html.replace('</head>', () => '<script>'+embedded+'</script></head>');
for (const match of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]) {
  const content = (await read(match[1])).replace(/<\/script/gi,'<\\/script');
  const id = match[1]==='reader.js' ? ' id="reader-source"' : '';
  html = html.replace(match[0], () => '<script'+id+'>'+content+'</script>');
}
await mkdir(dirname(resolve(output)), {recursive:true});
await writeFile(output, html);
console.log(resolve(output));
