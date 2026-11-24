// Illustrative data for trying the map before choosing a local save.
function exampleGalaxy(version) {
  const systems=[];
  let seed=7981;
  function random() {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const roots=['Ara','Ceti','Lyra','Vela','Carina','Eridanus'];
  const types=['pc_continental','pc_desert','pc_tropical','pc_arctic','pc_ocean'];
  const sites=Object.keys(globalThis.HIGHLIGHTS).filter(k=>k==='rubricator_system' || k==='vultaumar_system' || k==='wenkwort_system');
  for(let i=0;i<200;i++) {
    const a=i%5*1.2566+Math.floor(i/5)*.065+(random()-.5)*.26;
    const r=40+Math.floor(i/5)*5+(random()-.5)*19;
    const x=Math.cos(a)*r, y=Math.sin(a)*r, id=String(i);
    const owner=x<-38 && y<55?'1':x>30 && y>5?'2':x<36 && x>-45 && y<0?'0':null;
    const known=x<80 && y<60;
    const planets=[];
    for(let j=0;j<2+(i%5);j++){
      const toxic=random()<.13;
      const type=toxic?'pc_toxic':j===0 && i%2===0?types[i%5]:'pc_barren';
      planets.push({id:id+'-'+j,name:roots[i%6]+' '+(i+1)+' '+(j+1),type,size:8+Math.floor(random()*21),
        survey:known,candidate:toxic&&j===0,deposits:random()<.35?[i%6?'d_minerals_3':'d_rare_crystals_1']:[]});
    }
    if(i===18 || i===109) planets[0].type='pc_relic';
    if(i%29===6){planets[0].type='pc_continental';planets[0].deposits.push('d_betharian_deposit','d_crystalline_caverns');}
    if(i%47===18){planets[0].type='pc_relic';planets[0].deposits.push('d_artifacts_planet_2');}
    systems.push({id,x,y,name:roots[i%6]+' '+(i+1),owner,ownerKnown:known,known,intel:3,knownLanes:known,
      init:i%54===8?sites[Math.floor(i/54)%Math.max(1,sites.length)] || '':'',flags:i%20===5?['precursor_1']:[],
      planets,megas:i%64===11?['think_tank_ruined']:[],sites:[],lanes:[]});
  }
  const polaris=systems[35];
  polaris.name='NAME_Polaris';polaris.init='polaris_civilization';
  Object.assign(polaris.planets[1],{name:{key:'PLANET_NAME_FORMAT',vars:[['PARENT',polaris.name],['NUMERAL','II']]},
    type:'pc_ocean',size:23,candidate:false});
  polaris.sites.push({key:'site_polaris_seed_vault',planetId:polaris.planets[1].id,known:polaris.known});
  for(const s of systems){
    const nearest=systems.filter(o=>o!==s).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y)).slice(0,3);
    for(const o of nearest) if(!s.lanes.includes(o.id)){s.lanes.push(o.id);o.lanes.push(s.id);}
  }
  return {demo:true,date:'2200.01.01',version,player:'0',start:'1',countries:{0:'Lyra',1:'Vela',2:'Carina'},
    countryTypes:{0:'default',1:'default',2:'fallen_empire'},systems};
}
