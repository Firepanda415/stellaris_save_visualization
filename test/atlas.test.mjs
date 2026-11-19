import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import '../web/reader.js';
import '../web/model.js';
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
const stats=(r,foreign=false)=>GalaxyModel.summarize(new Set(['3','4','5']),r,foreign,'0');

test('sovereignty uses the primary station, including slot zero, independently of occupation',()=>{
  assert.deepEqual(galaxy.systems.map(s=>s.owner),['0','1',null]);
  assert.equal(galaxy.systems[0].planets[0].name,'a } literal');
  assert.deepEqual(galaxy.systems[0].lanes,['4']);
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
