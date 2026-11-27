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
  3={name={key="Home"} coordinate={x=5 y=-2} planet=8 planet=9 planet=10 hyperlane={{to=4} {to=4}} starbases={0 2} }
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
test('Leviathans distinguish recorded sites, sensed fleets and ordinary crystal swarms',async()=>{
  const save=`version="4.6.0" player={{country=0}}
    country={
      0={starting_system=1 terra_incognita={systems={1 2 3 4 5 6}} sensor_range_fleets={11 12 13 14 15}
         flags={found_crystal_construct=1 guardians_wraith_encountered=1}}
      1={type=crystal fleets_manager={owned_fleets={{fleet=11} {fleet=12}}}}
      2={type=guardian_wraith fleets_manager={owned_fleets={{fleet=13}}}}
      3={type=guardian_sphere fleets_manager={owned_fleets={{fleet=16}}}}
      4={type=guardian_dragon fleets_manager={owned_fleets={{fleet=14}}}}
      5={type=default fleets_manager={owned_fleets={{fleet=15}}}}
    }
    galactic_object={
      1={coordinate={x=0 y=0} initializer=hostile_init_07 flags={crystal_home_system=1} fleet_presence={11}}
      2={coordinate={x=1 y=0} flags={crystal_system=1} fleet_presence={12 15}}
      3={coordinate={x=2 y=0} flags={guardians_wraith_system=1}}
      4={coordinate={x=3 y=0} fleet_presence={13 14}}
      5={coordinate={x=4 y=0} initializer=guardians_init_technosphere fleet_presence={16}}
      6={coordinate={x=5 y=0} initializer=scavenger_system}
    }
    fleet={11={name={key=NAME_Crystal_Nidus} ships={1}} 12={name={key=NAME_Shardlings} ships={2}}
           13={ships={3}} 14={name={key=NAME_Shard} ships={4}} 15={name={key=NAME_Crystal_Nidus} ships={5}}
           16={name={key=NAME_The_Infinity_Machine} ships={6}}}`;
  const read=text=>GalaxyReader.readFile(new Blob([text]));
  const byView=(g,view)=>[...GalaxyModel.inspect(g,catalog,{view},HIGHLIGHTS).values()].map(row=>row.leviathans.map(v=>[v.key,v.present]));
  const g=await read(save);
  const visible=[['NAME_Wraith',true],['NAME_Shard',true]];
  assert.deepEqual(byView(g,'all'),[[['NAME_Crystal_Nidus',true]],[],[['NAME_Wraith',false]],visible,[['NAME_Infinity_Machine',true]],[['NAME_Scavenger_Bot',false]]]);
  assert.deepEqual(byView(g,'player'),[[['NAME_Crystal_Nidus',true]],[],[],visible,[],[]]);
  const cleared=await read(save.replace('fleet_presence={11}','fleet_presence={}'));
  assert.deepEqual(byView(cleared,'player')[0],[['NAME_Crystal_Nidus',false]]);
});
const opts={scope:'colony',toxic:'all',min:15,view:'all'};
const inspect=opt=>GalaxyModel.inspect(galaxy,catalog,{...opts,...opt},HIGHLIGHTS);
const stats=(r,foreign=false)=>GalaxyModel.summarize(new Set(['3','4','5']),r,
  new Set(foreign?['unclaimed','player','npc','fallen','unknown']:['unclaimed','player']));

test('4.5.4 player records recognize the original Chinese name of Stewart’s Resolve',()=>{
  const old=GalaxyModel.catalogForSave(catalog,'Cygnus v4.5.4');
  const current=GalaxyModel.catalogForSave(catalog,'Corona Borealis v4.6.0');
  const system={...galaxy.systems[0],init:'stewarts_resolve_system',name:{key:'斯图尔特之志',literal:true}};
  assert.equal(GalaxyModel.inspect({...galaxy,systems:[system]},old,{...opts,view:'player'},HIGHLIGHTS).get('3').fixedName,'NAME_Stewarts_Resolve');
  assert.equal(GalaxyModel.label('NAME_Stewarts_Resolve_III',old,'zh'),'斯图尔特之志 III');
  assert.equal(GalaxyModel.label('NAME_Stewarts_Resolve_III',current,'zh'),'斯图尔特的决心 III');
  assert.equal(current,catalog);
});

test('Lost Makers uses the player’s precursor choice and restoration flag independently of dig site visibility',async()=>{
  const save=source.replace('starting_system=3','government={origin=origin_lost_makers} flags={lost_makers_precursor_baol_1_selected=0} starting_system=3')
    .replace('1={name={key="Foreign"}','1={flags={origin_lost_makers_connection_restored=100 lost_makers_precursor_5_selected=1} name={key="Foreign"}')
    .replace('type=omnirelic_site','type=lost_makers_precursor_site');
  const read=text=>GalaxyReader.readFile(new Blob([text]));
  const g=await read(save);
  assert.deepEqual(g.lostMakers,{precursor:'precursor_baol_1',restored:false});
  assert.equal((await read(save.replace('selected=0','selected=0 origin_lost_makers_connection_restored=100'))).lostMakers.restored,true);
  assert.equal(galaxy.lostMakers,null);
  const row=view=>GalaxyModel.inspect(g,catalog,{...opts,view},HIGHLIGHTS).get('3');
  assert.deepEqual(row('player').events,[]);
  assert.equal(row('all').events[0].note.title.en,'Dig site · Subterranean Complex');
  assert.equal(row('all').prizes.size,0);
});

test('fixed names come from the system template and only known sites appear in player records',()=>{
  const polaris={...galaxy.systems[0],init:'polaris_civilization',name:'NAME_Polaris'};
  const key='site_polaris_seed_vault',site={key,known:false,planetId:'8'};
  const inspectOne=(changes,view='all')=>GalaxyModel.inspect({...galaxy,systems:[{...polaris,sites:[site],...changes}]},catalog,{...opts,view},HIGHLIGHTS).get('3');
  const full=inspectOne({});
  assert.equal(full.fixedName,'NAME_Polaris');
  assert.equal(catalog.names[full.fixedName][1],'勾陈一');
  assert.deepEqual(full.fixedSites,[{key,site}]);
  assert.deepEqual(inspectOne({sites:[]}).fixedSites,[{key,site:undefined}]);
  assert.deepEqual(inspectOne({},'player').fixedSites,[]);
  assert.equal(inspectOne({name:{key:'勾陈一',literal:true,vars:[]}},'player').fixedName,'NAME_Polaris');
  assert.ok(inspectOne({sites:[{...site,known:true}]},'player').fixedSites[0].site);
  assert.equal(inspectOne({init:'basic_init_01'}).fixedName,null);
  assert.equal(inspectOne({init:'basic_init_01',name:{key:'勾陈一',literal:true,vars:[]}}).fixedName,null);
  assert.equal(inspectOne({name:'Renamed'}).fixedName,'NAME_Polaris');
  assert.equal(inspectOne({name:'Renamed'},'player').fixedName,null);
  assert.deepEqual(inspectOne({sites:[site,{key:'site_command_center',known:true}]}).fixedSites,[{key,site}]);
});

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
  const full=inspect();assert.deepEqual(full.get('4').relicWorlds.map(p=>p.id),['11']);
  assert.equal(full.get('3').ruins[0],'think_tank_ruined');assert.ok(full.get('4').events[0].note.en.includes('Rubricator'));
});
test('a system keeps its known dig sites, anomalies and resource locations independently of planet and overlay filters',async()=>{
  const save=source.replace('planet_size=15 planet_class="pc_continental"', 'anomaly=ALPHA_CENTAURI_CAT planet_size=15 planet_class="pc_continental"')
    .replace('visible_to={1}', 'visible_to={0} completed={{country=1 date="2201.03.01"} {country=0 date="2202.04.03"}}')
    .replace('starting_system=3', 'events={anomalies={8}} starting_system=3');
  const g=await GalaxyReader.readFile(new Blob([save]));
  const opt={...opts,view:'player',min:30,rare:false,events:false,resource:'minor_artifacts'};
  const row=GalaxyModel.inspect(g,catalog,opt,HIGHLIGHTS).get('3');
  assert.deepEqual(row.worlds,[]);
  assert.deepEqual(row.locations.map(loc=>loc.planet.id),['8']);
  assert.equal(row.surface.rare_crystals,1);
  assert.equal(row.sites[0].planetId,'8');
  assert.equal(row.sites[0].playerCompletedOn,'2202.04.03');
  assert.deepEqual(row.anomalies.map(a=>[a.planet.id,a.key]),[['8','ALPHA_CENTAURI_CAT']]);
  const hidden=source.replace('planet_size=15 planet_class="pc_toxic"', 'anomaly=HIDDEN_CAT planet_size=15 planet_class="pc_toxic"');
  const unseen=await GalaxyReader.readFile(new Blob([hidden]));
  assert.deepEqual(GalaxyModel.inspect(unseen,catalog,opt,HIGHLIGHTS).get('3').anomalies,[]);
});
test('Arc Furnace yield follows the installed system overclock',async()=>{
  const withFurnace=source.replace('deposits={1 2}','deposits={1 2 12}')
    .replace('deposit={1=', 'deposit={12={type=d_arc_furnace_4} 1=')
    .replace('megastructures={7=', 'megastructures={8={type=orbital_arc_furnace_4 overclock_type=overclock_arc_furnace_4_balanced coordinate={origin=3}} 7=');
  const parsed=await GalaxyReader.readFile(new Blob([withFurnace]));
  const row=GalaxyModel.inspect(parsed,catalog,opts,HIGHLIGHTS).get('3');
  assert.equal(row.conditional,0);assert.equal(row.resources.minerals,8);assert.equal(row.resources.alloys,2);
});
