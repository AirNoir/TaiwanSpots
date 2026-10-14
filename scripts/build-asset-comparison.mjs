import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(join(root,'src/data/spots.ts'),'utf8');
const spots=[...source.matchAll(/id: '([^']+)',\s+name: '([^']+)'/g)].map(m=>({id:m[1],name:m[2]}));
const selectionPath=join(root,'docs/asset-review-selections.json');
const selections=existsSync(selectionPath)?JSON.parse(readFileSync(selectionPath,'utf8')):{};
for(const spot of spots){
 const base=join(root,'assets/spots',spot.id),collection=join(base,'collection'),reference=join(base,'reference');
 const path=(area,file)=>`../assets/spots/${spot.id}/${area}/${file}`;
 spot.models=existsSync(collection)?readdirSync(collection).filter(f=>f.endsWith('.png')&&!/crystal|thumbnail|day/.test(f)).map(f=>({file:f,url:path('collection',f)})):[];
 spot.model=selections[spot.id]||'master.png';
 if(!spot.models.some(m=>m.file===spot.model))spot.model=spot.models[0]?.file;
 spot.photos=existsSync(reference)?readdirSync(reference).filter(f=>/\.(jpg|jpeg|webp)$/i.test(f)).map(f=>({file:f,url:path('reference',f)})):[];
 spot.thumbnail=existsSync(join(collection,'thumbnail.png'))?path('collection','thumbnail.png'):null;
 spot.sources=existsSync(join(reference,'sources.json'))?JSON.parse(readFileSync(join(reference,'sources.json'),'utf8')):null;
 spot.blueprint=existsSync(join(base,'blueprint.json'))?JSON.parse(readFileSync(join(base,'blueprint.json'),'utf8')):null;
 spot.photo=spot.blueprint?.references?.representative?.find(file=>spot.photos.some(photo=>photo.file===file));
}
const data=JSON.stringify(spots).replaceAll('<','\\u003c');
const template=readFileSync(join(root,'docs/asset-comparison.template.html'),'utf8');
writeFileSync(join(root,'docs/asset-comparison.html'),template.replace('__SPOT_DATA__',data));
console.log(JSON.stringify({spots:spots.length,models:spots.filter(s=>s.models.length).length,photos:spots.filter(s=>s.photos.length).length,paired:spots.filter(s=>s.models.length&&s.photos.length).length}));
