/* Parse selected Clausewitz fields. Unused sections, including ship designs, are skipped in place. */
(() => {
  'use strict';
  const all = true;
  const table = fields => ({'*': fields});
  const country = {
    name: all, type: all, terra_incognita: {systems: all}, surveyed_deposit_holders: all,
    intel_level: all, hyperlane_systems: all, starting_system: all,
    fleets_manager: {owned_fleets: all}, events: {anomalies: all}, relations_manager: {relation: {country: all, contact: all}}
  };
  const shape = {
    version: all, date: all, player: all, country: table(country),
    galactic_object: table({name: all, coordinate: {x: all, y: all}, planet: all,
      hyperlane: all, starbases: all, initializer: all, flags: all}),
    planets: {planet: table({name: all, planet_class: all, planet_size: all, deposits: all,
      owner: all, anomaly: all, anomaly_owner: all, planet_modifier: all, timed_modifier: all, flags: all})},
    deposit: table({type: all, killed: all}),
    ships: table({fleet: all}), starbase_mgr: {starbases: table({station: all})},
    megastructures: table({type: all, overclock_type: all, coordinate: {origin: all}}),
    archaeological_sites: {sites: table({type: all, location: all, visible_to: all, completed: all})}
  };
  function project(text) {
    const token = /"(?:\\[\s\S]|[^"\\])*"|#[^\r\n]*|[{}=]|[^\s{}="#]+/g;
    const braces = /"(?:\\[\s\S]|[^"\\])*"|#[^\r\n]*|[{}]/g;
    function next() {
      let m;
      while ((m = token.exec(text))) if (!m[0].startsWith('#')) return m[0];
      return null;
    }
    let at = next();
    function pop() { const value = at; at = next(); return value; }
    function scalar(raw) {
      return raw?.startsWith('"') ? raw.slice(1,-1).replace(/\\(["\\])/g,'$1') : raw;
    }
    function read(schema, nested) {
      const obj = Object.create(null);
      while (at !== null && at !== '}') {
        let key = '_';
        let first = at;
        if (first !== '{') {
          pop();
          if (at === '=') { key = scalar(first); pop(); first = at; }
          else { if (schema === true) (obj._ ??= []).push(scalar(first)); continue; }
        }
        if (first === null || first === '}') throw Error('Incomplete value');
        const child = schema === true ? true : (Object.hasOwn(schema,key) ? schema[key] : schema['*']);
        if (first !== '{') {
          const v = pop();
          if (child) (obj[key] ??= []).push(scalar(v));
        } else if (child) {
          pop();
          (obj[key] ??= []).push(read(child, true));
        } else {
          braces.lastIndex = token.lastIndex;
          let depth = 1, m;
          while (depth && (m = braces.exec(text))) {
            if (m[0] === '{') depth++;
            if (m[0] === '}') depth--;
          }
          if (depth) throw Error('Incomplete block');
          token.lastIndex = braces.lastIndex;
          at = next();
        }
      }
      if (nested) {
        if (at !== '}') throw Error('Incomplete block');
        pop();
      }
      return obj;
    }
    return read(shape,false);
  }
  const one = (o,k) => o?.[k]?.[0];
  const list = (o,k) => one(o,k)?._ ?? [];
  const entries = o => Object.entries(o ?? {}).filter(([k,v]) => /^\d+$/.test(k) && typeof v[0] === 'object');
  const valid = id => id != null && id !== '4294967295';
  function name(o) {
    if (typeof o === 'string') return o;
    if (!o) return '';
    const key = one(o,'key') || '';
    const vars = list(o,'variables');
    if (!vars.length && one(o,'literal') !== 'yes') return key;
    return {key,literal:one(o,'literal')==='yes',vars:vars.map(v=>[one(v,'key'),name(one(v,'value'))])};
  }
  function summarize(raw) {
    const playerBlock = one(raw,'player')?._?.[0];
    const player = one(playerBlock,'country');
    const countries = one(raw,'country'), home = one(countries,player);
    const visited = new Set(list(one(home,'terra_incognita'),'systems'));
    const survey = new Set(list(home,'surveyed_deposit_holders').filter(v=>one(v,'type')==='0').map(v=>one(v,'id')));
    const intel = list(home,'intel_level'), laneIntel = new Set(list(home,'hyperlane_systems'));
    const anomalies = new Set(list(one(home,'events'),'anomalies'));
    const contacts = new Set((one(home,'relations_manager')?.relation ?? []).filter(r=>one(r,'contact')==='yes').map(r=>one(r,'country')));
    const fleetOwner = new Map(), nations = Object.create(null), countryTypes = Object.create(null);
    for (const [id,[c]] of entries(countries)) {
      nations[id] = name(one(c,'name')) || '#'+id;
      countryTypes[id] = one(c,'type');
      for (const f of list(one(c,'fleets_manager'),'owned_fleets')) {
        const fleet = one(f,'fleet');
        if (valid(fleet) && ['normal','lost_control',undefined].includes(one(f,'ownership_status'))) fleetOwner.set(fleet,id);
      }
    }
    const ships = one(raw,'ships'), bases = one(one(raw,'starbase_mgr'),'starbases');
    const deposits = one(raw,'deposit'), planets = one(one(raw,'planets'),'planet');
    const planetSystem = new Map(), systemMap = new Map();
    for (const [id,[g]] of entries(one(raw,'galactic_object'))) {
      const c = one(g,'coordinate'), x = Number(one(c,'x')), y = Number(one(c,'y'));
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const firstBase = list(g,'starbases')[0];
      const station = one(one(bases,firstBase),'station');
      const fleet = one(one(ships,station),'fleet');
      const owner = valid(firstBase) ? (fleetOwner.get(fleet) ?? '?') : null;
      const intelLevel=Number(intel[id] || 0);
      const ownerKnown=owner===player || (visited.has(id) && intelLevel>=3 && (owner===null || contacts.has(owner)));
      const system = {id,x,y,name:name(one(g,'name')) || '#'+id,owner,ownerKnown,known:visited.has(id),intel:intelLevel,
        knownLanes:laneIntel.has(id),init:one(g,'initializer') || '',flags:Object.keys(one(g,'flags') ?? {}),
        lanes:list(g,'hyperlane').map(h=>one(h,'to')).filter(valid),planets:[],megas:[],arcModes:[],sites:[]};
      for (const pid of g.planet ?? []) {
        const p = one(planets,pid);
        if (!p || typeof p !== 'object') continue;
        const mods = [...(p.planet_modifier ?? []).filter(v=>typeof v==='string'),
          ...list(one(p,'timed_modifier'),'items').map(m=>one(m,'modifier'))];
        const world = {id:pid, name:name(one(p,'name')), type:one(p,'planet_class'),size:Number(one(p,'planet_size') || 0),
          owner:one(p,'owner') ?? null,survey:survey.has(pid),candidate:mods.some(m=>m?.includes('terraforming_candidate')),
          anomaly:one(p,'anomaly') || '',anomalyKnown:anomalies.has(pid),deposits:[]};
        for (const did of list(p,'deposits')) {
          const dep = one(deposits,did);
          if (dep && one(dep,'killed') !== 'yes' && one(dep,'type')) world.deposits.push(one(dep,'type'));
        }
        planetSystem.set(pid,system);system.planets.push(world);
      }
      systemMap.set(id,system);
    }
    for (const [, [m]] of entries(one(raw,'megastructures'))) {
      const sys = systemMap.get(one(one(m,'coordinate'),'origin'));
      if (sys && one(m,'type')) sys.megas.push(one(m,'type'));
      const stored=one(m,'overclock_type');
      const activeFurnace=/^orbital_arc_furnace_(?:3|4|restored)$/.test(one(m,'type'));
      const mode=stored ? stored.match(/^overclock_arc_furnace_[34]_(.+)$/)?.[1] ?? (activeFurnace?'unknown':null)
        : (activeFurnace?'balanced':null);
      if(sys && mode && !sys.arcModes.includes(mode))sys.arcModes.push(mode);
    }
    for (const [, [s]] of entries(one(one(raw,'archaeological_sites'),'sites'))) {
      const pos = one(s,'location');
      if (one(pos,'type')!=='2') continue;
      planetSystem.get(one(pos,'id'))?.sites.push({key:one(s,'type'),known:list(s,'visible_to').includes(player),
        completed:!!s.completed});
    }
    if (!systemMap.size || !home) throw Error('No player galaxy in text save');
    return {version:one(raw,'version'),date:one(raw,'date'),player,start:one(home,'starting_system'),
      countries:nations,countryTypes,systems:[...systemMap.values()]};
  }
  async function readFile(file) {
    const footer = new Uint8Array(await file.slice(Math.max(0,file.size-65557)).arrayBuffer());
    const end = new DataView(footer.buffer);
    let ptr=footer.length-22;
    for (;ptr>=0;ptr--) {
      if (end.getUint32(ptr,true)===0x06054b50 && ptr+22+end.getUint16(ptr+20,true)===footer.length) break;
    }
    let text;
    if (ptr<0) {
      const head = await file.slice(0,2048).text();
      if (!/\bversion\s*=/.test(head)) throw Error('Expected a Stellaris .sav or text gamestate');
      text=await file.text();
    } else {
      const offset=end.getUint32(ptr+16,true), size=end.getUint32(ptr+12,true);
      const dir=new DataView(await file.slice(offset,offset+size).arrayBuffer());
      const decoder=new TextDecoder();
      for(let i=0;i+46<=dir.byteLength;) {
        if(dir.getUint32(i,true)!==0x02014b50) throw Error('Invalid ZIP directory');
        const n=dir.getUint16(i+28,true), extra=dir.getUint16(i+30,true), comment=dir.getUint16(i+32,true);
        if(decoder.decode(new Uint8Array(dir.buffer,i+46,n))==='gamestate') {
          const local=dir.getUint32(i+42,true), method=dir.getUint16(i+10,true);
          const header=new DataView(await file.slice(local,local+30).arrayBuffer());
          if(header.getUint32(0,true)!==0x04034b50) throw Error('Invalid ZIP entry');
          const start=local+30+header.getUint16(26,true)+header.getUint16(28,true);
          let stream=file.slice(start,start+dir.getUint32(i+20,true)).stream();
          if(method===8) stream=stream.pipeThrough(new DecompressionStream('deflate-raw'));
          else if(method!==0) throw Error('Unsupported ZIP compression');
          text=await new Response(stream).text();break;
        }
        i+=46+n+extra+comment;
      }
      if(!text) throw Error('Missing gamestate');
    }
    return summarize(project(text));
  }
  globalThis.GalaxyReader={readFile};
  if (typeof WorkerGlobalScope!=='undefined' && self instanceof WorkerGlobalScope) {
    self.onmessage=async e=>{
      try { self.postMessage({galaxy:await readFile(e.data)}); }
      catch(err) { self.postMessage({error:err.message}); }
    };
  }
})();
