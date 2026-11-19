(() => {
  'use strict';
  function label(name,cat,lang) {
    if (!name) return '';
    if (typeof name==='object') {
      if (name.literal) return name.key;
      const vars=new Map(name.vars.map(([k,v])=>[k.toLowerCase(),label(v,cat,lang)]));
      const fmt=label(name.key,cat,lang);
      const result=fmt.replace(/[$%]([^$%|]+)(?:\|[^$%]*)?[$%]/g,(raw,k)=>vars.get(k.toLowerCase()) ?? raw);
      if (vars.size && (result===name.key || /[$%]/.test(result))) return [...vars.values()].join(' ');
      return result;
    }
    return cat.names[name]?.[lang==='en'?0:1] || cat.names[name]?.[0] || name;
  }
  const add=(obj,key,n=1)=>{obj[key]=(obj[key]??0)+n;};
  // Symbol, English symbol, map color. Keep the map and its key in the same order.
  const symbols={
    d_betharian_deposit:['贝','B','#ffd479'],minor_artifacts:['文','A','#f0b4e9'],reward:['珍','R','#d8acff'],
    rare_crystals:['晶','C','#95e5fa'],exotic_gases:['气','G','#a5e89a'],volatile_motes:['微','M','#ffaa83'],
    sr_zro:['泽','Z','#adc6ff'],sr_dark_matter:['暗','D','#cbb4fa'],sr_living_metal:['活','L','#d0e2df'],
    nanites:['纳','N','#9be6d9'],astral_threads:['丝','T','#f6c0e4'],feature:['特','F','#ded3a6']
  };
  function matchesFeature(key,def,filter) {
    if(!filter || filter===key)return true;
    const resources=def.surfaceStrategic ?? [];
    if(filter==='feature')return !resources.length && key!=='d_betharian_deposit';
    return resources.includes(filter);
  }
  function materialMarks(row,cat,opt) {
    const tags=new Set(), filter=opt.resource;
    if(opt.rare)for(const k of row.orbitalRare)if(!filter || filter===k)tags.add(k);
    if(opt.features)for(const key of Object.keys(row.features)) {
      const resources=cat.deposits[key].surfaceStrategic ?? [];
      if(!matchesFeature(key,cat.deposits[key],filter))continue;
      if(key==='d_betharian_deposit')tags.add(key);
      else if(resources.length)for(const k of resources){if(!filter || filter===key || filter===k)tags.add(k);}
      else tags.add('feature');
    }
    if(opt.rewards && row.prizes.size && (!filter || filter==='reward' || row.prizes.has(filter)))tags.add('reward');
    return Object.keys(symbols).filter(k=>tags.has(k));
  }
  function inspect(g,cat,opt,highlights) {
    const colonizable=new Set(cat.colonizable), strategic=new Set(cat.strategic);
    const systems=new Map();
    for(const s of g.systems) {
      if(opt.view==='player' && !s.known) continue;
      const full=opt.view==='all', owner=full || s.ownerKnown ? s.owner : '?';
      let territory='npc';
      if(owner===null) territory='unclaimed';
      else if(owner==='?') territory='unknown';
      else if(owner===g.player) territory='player';
      else if(['fallen_empire','awakened_fallen_empire'].includes(g.countryTypes?.[owner])) territory='fallen';
      const row={s,owner,territory,worlds:[],resources:{},surface:{},surfaceYield:{},features:{},locations:[],
        conditional:0,unknown:new Set(),orbitalRare:new Set(),prizes:new Map(),
        relicWorlds:[],ruins:[],structures:[],events:[],homes:[],clues:[],sites:[],anomalies:[]};
      const seen=new Set();
      function event(key,group) {
        const note=highlights[key];
        if(!note || seen.has(note)) return;
        seen.add(note);
        if(note.relic) row.prizes.set(note.relic,note);
        row[note.home?'homes':group].push({key,note});
      }
      for(const p of s.planets) {
        const visible=full || p.survey;
        if(visible) {
          if(p.type==='pc_relic') row.relicWorlds.push(p);
          const toxic=p.type==='pc_toxic';
          const matches=toxic ? opt.toxic==='all' || (opt.toxic==='candidate' && p.candidate) :
            opt.scope==='bodies' || colonizable.has(p.type) || p.candidate;
          if(matches && p.size>=opt.min) row.worlds.push(p);
          const features={}, orbital={};
          for(const dep of p.deposits) {
            const def=cat.deposits[dep];
            if(!def) {row.unknown.add(dep);continue;}
            if(def.branches){
              const modes=full || s.owner===g.player ? (s.arcModes ?? []) : [];
              if(!modes.length || modes.some(mode=>!def.branches[mode]))row.conditional++;
              for(const mode of modes)for(const [key,amount] of Object.entries(def.branches[mode] ?? {}))
                add(row.resources,key,amount);
            }else if(def.conditional) row.conditional++;
            for(const [resource,n] of Object.entries(def.yield ?? {})) {
              add(row.resources,resource,n);
              if(strategic.has(resource)){row.orbitalRare.add(resource);add(orbital,resource,n);}
            }
            if(def.important || def.surfaceStrategic?.length){
              add(features,dep);add(row.features,dep);
              for(const k of def.surfaceStrategic ?? [])add(row.surface,k);
              for(const [k,n] of Object.entries(def.surfaceYield ?? {}))add(row.surfaceYield,k,n);
            }
          }
          if(Object.keys(features).length || Object.keys(orbital).length)row.locations.push({planet:p,features,orbital});
        }
        if(p.anomaly && (full || p.anomalyKnown)){
          row.anomalies.push({key:p.anomaly,planet:p});
          event(p.anomaly,'events');
        }
      }
      if(full) {
        event(s.init,'events');
        for(const f of s.flags) event(f,/^precursor_(?:[1-5]|baol_1|zroni_1|inetian|adakkaria)$/.test(f)?'clues':'events');
      }
      for(const site of s.sites) if(full || site.known) {row.sites.push(site);event(site.key,'events');}
      if(full || s.owner===g.player){
        for(const k of s.megas){
          if(/ruin/.test(k))row.ruins.push(k);else row.structures.push(k);
        }
      }
      row.materialMarks=materialMarks(row,cat,opt);
      row.worlds.sort((a,b)=>b.size-a.size || Number(a.id)-Number(b.id));
      systems.set(s.id,row);
    }
    return systems;
  }
  function summarize(ids,rows,included) {
    const totals={systems:0,excluded:0,toxic:0,other:0,bins:new Map(),resources:{},surface:{},surfaceYield:{},features:{},prizes:{},conditional:0,unknown:new Set()};
    for(const id of ids) {
      const row=rows.get(id);
      if(!row) continue;
      if(!included.has(row.territory)){totals.excluded++;continue;}
      totals.systems++;
      for(const p of row.worlds) {
        const toxic=p.type==='pc_toxic';
        if(toxic) totals.toxic++; else totals.other++;
        const bin=totals.bins.get(p.size) ?? [0,0];
        bin[toxic?1:0]++;totals.bins.set(p.size,bin);
      }
      for(const [k,n] of Object.entries(row.resources)) add(totals.resources,k,n);
      for(const [k,n] of Object.entries(row.surface)) add(totals.surface,k,n);
      for(const [k,n] of Object.entries(row.features)) add(totals.features,k,n);
      for(const [k,n] of Object.entries(row.surfaceYield)) add(totals.surfaceYield,k,n);
      for(const k of row.prizes.keys())add(totals.prizes,k);
      totals.conditional+=row.conditional;
      for(const k of row.unknown) totals.unknown.add(k);
    }
    return totals;
  }
  globalThis.GalaxyModel={inspect,summarize,label,symbols,matchesFeature};
})();
