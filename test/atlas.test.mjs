import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import '../web/reader.js';
import '../web/model.js';
import '../web/map.js';
import '../web/highlights.js';

const catalog=JSON.parse(await readFile(new URL('../web/catalog.json',import.meta.url),'utf8'));
const source=String.raw`version="test" date="2200.01.01" player={ { country=0 } }
galactic_object={
  3={name={key="Home"} coordinate={x=5 y=-2} planet=8 planet=9 planet=10 hyperlane={{to=4}} starbases={0 2} }
  4={name={key="Border"} coordinate={x=6 y=2} planet=11 hyperlane={{to=3}} starbases={2} initializer="rubricator_system"}
  5={name={key="No outpost"} coordinate={x=9 y=3} starbases={4294967295 2}}
}
country={
  0={name={key="Home polity" literal=yes} starting_system=3 terra_incognita={systems={3}}
    intel_level={0 0 0 4} surveyed_deposit_holders={{type=0 id=8}}
    fleets_manager={owned_fleets={{fleet=90}}}}
  1={name={key="Foreign"} fleets_manager={owned_fleets={{fleet=91 ownership_status=lost_control debtor=0}}}}
}
planets={planet={
  8={name={key="a } literal"} planet_size=15 planet_class="pc_continental" deposits={1 2}}
  9={planet_size=15 planet_class="pc_toxic" timed_modifier={items={{modifier="toxic_terraforming_candidate"}}}}
  10={planet_size=20 planet_class="pc_toxic" deposits={3 4}}
  11={planet_size=15 planet_class="pc_relic"}
}}
ships={101={fleet=90} 102={fleet=91}} starbase_mgr={starbases={0={station=101} 2={station=102}}}
deposit={1={type=d_minerals_3} 2={type=d_crystalline_caverns} 3={type=d_minerals_3} 4={type=d_minerals_3 killed=yes}}
archaeological_sites={sites={0={type=omnirelic_site location={type=2 id=8} visible_to={1}}}}
megastructures={7={type=think_tank_ruined coordinate={origin=3}}}`;
const galaxy=await GalaxyReader.readFile(new Blob([source]));
const opts={scope:'colony',toxic:'all',min:15,view:'all'};
const inspect=opt=>GalaxyModel.inspect(galaxy,catalog,{...opts,...opt},HIGHLIGHTS);
const stats=(r,foreign=false)=>GalaxyModel.summarize(new Set(['3','4','5']),r,
  new Set(foreign?['unclaimed','player','npc','fallen','unknown']:['unclaimed','player']));

test('sovereignty uses the primary station, including slot zero, independently of occupation',()=>{
  assert.deepEqual(galaxy.systems.map(s=>s.owner),['0','1',null]);
  assert.equal(galaxy.systems[0].planets[0].name,'a } literal');
  assert.deepEqual(galaxy.systems[0].lanes,['4']);
});
test('fallen and awakened owners are a distinct territory category after intel checks',async()=>{
  for(const [type,kind] of [['fallen_empire','fallen'],['awakened_fallen_empire','fallen'],['awakened_marauders','npc']]){
    const save=source.replace('1={name={key="Foreign"}','1={type='+type+' name={key="Foreign"}')
      .replace('systems={3}','systems={3 4}');
    const g=await GalaxyReader.readFile(new Blob([save]));
    const full=GalaxyModel.inspect(g,catalog,opts,HIGHLIGHTS);
    assert.deepEqual([...full.values()].map(r=>r.territory),['player',kind,'unclaimed']);
    assert.equal(GalaxyModel.summarize(new Set(['3','4','5']),full,new Set(['fallen','unclaimed'])).systems,kind==='fallen'?2:1);
    const fog=GalaxyModel.inspect(g,catalog,{...opts,view:'player'},HIGHLIGHTS);
    assert.equal(fog.get('4').territory,'unknown');
  }
});
test('positive save X is west and picking stays anchored when zooming',()=>{
  const map=Object.create(GalaxyMap.prototype);
  Object.assign(map,{rows:new Map([['west',{s:{id:'west',x:118,y:-47}}],['east',{s:{id:'east',x:-318,y:53}}]]),
    w:800,h:500,markerHits:[],queue(){},handlers:{hover(){}}});
  map.fit();
  const [west,north]=map.xy(118,-47),[east,south]=map.xy(-318,53);
  assert.ok(west<east && north<south);
  assert.equal(map.hit(west,north),'west');
  map.adjustZoom(2,west,north);
  assert.ok(Math.abs(map.xy(118,-47)[0]-west)<1e-8);
  assert.equal(map.hit(west,north),'west');
});
test('precursor homes, regions and named events have independent markers and bilingual titles',()=>{
  for(const note of Object.values(HIGHLIGHTS)){assert.ok(note.title.zh);assert.ok(note.title.en);}
  const s={...galaxy.systems[1],init:'vultaumar_system',flags:['precursor_1'],
    sites:[{key:'last_thought_site',known:false}]};
  const row=GalaxyModel.inspect({...galaxy,systems:[s]},catalog,opts,HIGHLIGHTS).get('4');
  assert.equal(row.homes.length,1);assert.match(row.homes[0].note.title.zh,/沃陶姆/);
  assert.equal(row.events.length,1);assert.match(row.events[0].note.title.en,/Last Thought/);
  assert.equal(row.clues.length,1);assert.match(row.clues[0].note.title.en,/Vultaum/);
});
test('size bins separate toxic worlds and apply the territory and world filters',()=>{
  assert.deepEqual(stats(inspect()).bins.get(15),[1,1]);
  assert.deepEqual(stats(inspect(),true).bins.get(15),[2,1]);
  assert.equal(stats(inspect({toxic:'candidate'})).toxic,1);
  assert.equal(stats(inspect({toxic:'off'})).toxic,0);
  const v=stats(inspect({min:20}));assert.equal(v.toxic,1);assert.equal(v.other,0);
  assert.equal(v.systems,2);assert.equal(v.excluded,1);
});
test('orbital totals include deposits on smaller and hidden-by-filter world classes, with surface sites counted separately',()=>{
  const v=stats(inspect({min:30,toxic:'off'}));
  assert.equal(v.resources.minerals,6);assert.equal(v.surface.rare_crystals,1);
  assert.equal(v.resources.rare_crystals,undefined);assert.equal(v.bins.size,0);
});
test('map symbols and planet rows distinguish fixed surface yields, job deposits, orbital artifacts and relic prizes',async()=>{
  const save=source.replace('deposits={1 2}','deposits={1 2 12 13 14 15}')
    .replace('deposits={3 4}','deposits={3 4 16}')
    .replace('deposit={1=', 'deposit={12={type=d_betharian_deposit} 13={type=d_artifacts_planet_2} 14={type=d_artifacts_planet_2} 15={type=d_artifacts_research_1} 16={type=d_alien_pets_deposit} 1=');
  const data=await GalaxyReader.readFile(new Blob([save]));
  const overlay={...opts,features:true,rare:true,rewards:true,min:99};
  const inspectWith=changes=>GalaxyModel.inspect(data,catalog,{...overlay,...changes},HIGHLIGHTS);
  const rows=inspectWith({}),home=rows.get('3'),v=stats(rows);
  assert.deepEqual(new Set(home.materialMarks),new Set(['rare_crystals','d_betharian_deposit','minor_artifacts','feature','reward']));
  assert.equal(home.locations.find(loc=>loc.planet.id==='8').features.d_artifacts_planet_2,2);
  assert.equal(v.surface.minor_artifacts,2);assert.equal(v.surfaceYield.minor_artifacts,4);
  assert.equal(v.resources.minor_artifacts,1);assert.equal(v.features.d_betharian_deposit,1);
  assert.equal(v.surfaceYield.rare_crystals,undefined);assert.equal(v.prizes.r_omnicodex,1);
  assert.equal(v.prizes.r_rubricator,undefined);assert.equal(stats(rows,true).prizes.r_rubricator,1);
  assert.deepEqual(inspectWith({resource:'d_betharian_deposit'}).get('3').materialMarks,['d_betharian_deposit']);
  assert.deepEqual(inspectWith({resource:'d_crystalline_caverns'}).get('3').materialMarks,['rare_crystals']);
  assert.deepEqual(inspectWith({resource:'r_omnicodex'}).get('3').materialMarks,['reward']);
  assert.deepEqual(inspectWith({features:false,rewards:false}).get('3').materialMarks,['minor_artifacts']);
  assert.deepEqual(inspectWith({view:'player'}).get('3').materialMarks,['d_betharian_deposit','minor_artifacts','rare_crystals']);
  assert.equal(stats(inspectWith({view:'player'})).features.d_alien_pets_deposit,undefined);
});
test('player records hide unsurveyed yields and undiscovered sites and other systems',()=>{
  const r=inspect({view:'player'});
  assert.equal(r.size,1);assert.equal(r.get('3').events.length,0);assert.equal(r.get('3').sites.length,0);
  assert.equal(stats(r).resources.minerals,3);
  const full=inspect();assert.equal(full.get('4').relic,true);
  assert.equal(full.get('3').ruins[0],'think_tank_ruined');assert.ok(full.get('4').events[0].note.en.includes('Rubricator'));
});
test('Arc Furnace yield follows the installed system overclock',async()=>{
  const withFurnace=source.replace('deposits={1 2}','deposits={1 2 12}')
    .replace('deposit={1=', 'deposit={12={type=d_arc_furnace_4} 1=')
    .replace('megastructures={7=', 'megastructures={8={type=orbital_arc_furnace_4 overclock_type=overclock_arc_furnace_4_balanced coordinate={origin=3}} 7=');
  const parsed=await GalaxyReader.readFile(new Blob([withFurnace]));
  const row=GalaxyModel.inspect(parsed,catalog,opts,HIGHLIGHTS).get('3');
  assert.equal(row.conditional,0);assert.equal(row.resources.minerals,8);assert.equal(row.resources.alloys,2);
});
