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
  function inspect(g,cat,opt,highlights) {
    const colonizable=new Set(cat.colonizable), strategic=new Set(cat.strategic);
    const systems=new Map();
    for(const s of g.systems) {
      if(opt.view==='player' && !s.known) continue;
      const full=opt.view==='all', owner=full || s.ownerKnown ? s.owner : '?';
      const row={s,owner,worlds:[],resources:{},surface:{},conditional:0,unknown:new Set(),rare:new Set(),
        relic:false,ruins:[],events:[],clues:[],sites:[]};
      const seen=new Set();
      function event(key,group) {
        const note=highlights[key];
        if(!note || seen.has(note)) return;
        seen.add(note);
        row[group].push({key,note});
      }
      for(const p of s.planets) {
        const visible=full || p.survey;
        if(visible) {
          if(p.type==='pc_relic') row.relic=true;
          const toxic=p.type==='pc_toxic';
          const matches=toxic ? opt.toxic==='all' || (opt.toxic==='candidate' && p.candidate) :
            opt.scope==='bodies' || colonizable.has(p.type) || p.candidate;
          if(matches && p.size>=opt.min) row.worlds.push(p);
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
              if(strategic.has(resource)) row.rare.add(resource);
            }
            for(const k of def.surfaceStrategic ?? []) {row.rare.add(k);add(row.surface,k);}
          }
        }
        if(p.anomaly && (full || p.anomalyKnown)) event(p.anomaly,'events');
      }
      if(full) {
        event(s.init,'events');
        for(const f of s.flags) event(f,/^precursor_(?:[1-5]|baol_1|zroni_1|inetian|adakkaria)$/.test(f)?'clues':'events');
      }
      for(const site of s.sites) if(full || site.known) {row.sites.push(site);event(site.key,'events');}
      if(full || s.owner===g.player) row.ruins=s.megas.filter(k=>/ruin/.test(k));
      row.worlds.sort((a,b)=>b.size-a.size || Number(a.id)-Number(b.id));
      systems.set(s.id,row);
    }
    return systems;
  }
  function summarize(ids,rows,foreign,player) {
    const totals={systems:0,excluded:0,toxic:0,other:0,bins:new Map(),resources:{},surface:{},conditional:0,unknown:new Set()};
    for(const id of ids) {
      const row=rows.get(id);
      if(!row) continue;
      if(!foreign && row.owner!==null && row.owner!==player){totals.excluded++;continue;}
      totals.systems++;
      for(const p of row.worlds) {
        const toxic=p.type==='pc_toxic';
        if(toxic) totals.toxic++; else totals.other++;
        const bin=totals.bins.get(p.size) ?? [0,0];
        bin[toxic?1:0]++;totals.bins.set(p.size,bin);
      }
      for(const [k,n] of Object.entries(row.resources)) add(totals.resources,k,n);
      for(const [k,n] of Object.entries(row.surface)) add(totals.surface,k,n);
      totals.conditional+=row.conditional;
      for(const k of row.unknown) totals.unknown.add(k);
    }
    return totals;
  }
  globalThis.GalaxyModel={inspect,summarize,label};
})();
