(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const en={
    subtitle:'Stellaris save map',open:'Open save',filters:'Map layers',view:'View',all:'Full save',known:'Player records',
    worlds:'Planets',sizeLabels:'Label planet sizes',pool:'Non-toxic bodies',colony:'Colonizable types & candidates',bodies:'All bodies, including stars',
    toxic:'Toxic worlds',allToxic:'Include all',candidate:'Terraforming candidates only',off:'Hide and exclude',min:'Minimum size',
    layers:'Overlays',territory:'Empire territory',rare:'Orbital resources & artifacts',features:'Planetary resources & features',rewards:'Relic reward locations',
    markFilter:'Filter resource and feature markers',legend:'More map symbols',relic:'Relic worlds',events:'Events & dig sites',homes:'Precursor home systems',
    playerTerr:'Player',npcTerr:'Regular NPC',fallenTerr:'Fallen Empire',unknownTerr:'Unknown owner',
    countTerritory:'Territory to count',freeTerr:'Unclaimed systems always count.',
    clues:'Precursor clue regions',ruins:'Ruined megastructures',fit:'Fit',select:'Select',pan:'Pan',
    gesture:'Drag to select · Ctrl-click or Ctrl-drag to toggle · Scroll to zoom',inspect:'Inspect system',toggle:'Toggle selection',
    selection:'Selection',clear:'Clear',systems:'Systems',matched:'Matching bodies',
    distribution:'Size distribution',size:'Size',other:'Non-toxic',toxicShort:'Toxic',output:'Orbital resources',
    gross:'Base monthly yield in counted systems, across all sizes. Player records include only surveyed bodies.',
    surface:'Planetary resources & features',surfaceHint:'Counts are feature sites. Fixed base yields are listed separately. Job output depends on development.',
    direct:'Fixed surface yield per month',featureList:'Feature counts and planets',prizes:'Systems with possible relic rewards',locations:'Windows save locations'
  };
  const labels=[...document.querySelectorAll('[data-i]')].map(el=>[el,el.textContent,en[el.dataset.i]]);
  const model=globalThis.GalaxyModel;
  let g,cat,rows=new Map(),lang='zh',picked=null,selected=new Set(),loading=0,worker=null,loadingFile=false;
  const map=new GalaxyMap($('map'),{select:choose,hover:showHover,zoom:v=>{$('zoom-level').textContent=Math.round(v*100)+'%';}});
  const t=(zh,english)=>lang==='en'?english:zh;
  const local=key=>model.label(key,cat,lang);
  const nf=n=>n.toLocaleString(lang==='zh'?'zh-Hans':'en',{maximumFractionDigits:3});
  function locations(){
    document.querySelector('.filetools').insertBefore($('locations'),$('language'));
    const items=[
      [t('本地存档','Local saves'),'%USERPROFILE%\\Documents\\Paradox Interactive\\Stellaris\\save games'],
      [t('Steam Cloud · 进入数字账号，再打开 281990\\remote\\save games','Steam Cloud · Open your numbered account, then 281990\\remote\\save games'),'%ProgramFiles(x86)%\\Steam\\userdata']
    ];
    if(globalThis.LOCAL_SAVE_FOLDER)items.unshift([t('当前战役','Current campaign'),LOCAL_SAVE_FOLDER]);
    $('location-list').replaceChildren();$('copy-status').textContent='';
    for(const [caption,path] of items){
      const row=document.createElement('div'),label=document.createElement('label'),box=document.createElement('input'),btn=document.createElement('button');
      box.readOnly=true;box.value=path;label.append(caption,box);btn.textContent=t('复制','Copy');
      btn.onclick=async()=>{
        try{await navigator.clipboard.writeText(path);}
        catch{box.focus();box.select();if(!document.execCommand('copy')){$('copy-status').textContent=t('路径已选中，按 Ctrl+C 复制。','Path selected. Press Ctrl+C to copy.');return;}}
        $('copy-status').textContent=t('已复制 · ','Copied · ')+caption;
        btn.textContent=t('已复制','Copied');
        setTimeout(()=>{btn.textContent=t('复制','Copy');},1600);
      };
      row.append(label,btn);$('location-list').append(row);
    }
  }
  function options(){
    const checked=attribute=>new Set([...document.querySelectorAll('[data-'+attribute+']:checked')].map(el=>el.dataset[attribute]));
    return {min:Math.max(0,Number($('min').value)||0),toxic:$('toxic').value,scope:$('scope').value,view:$('view').value,
      resource:$('resource').value,shaded:checked('shade'),included:checked('count').add('unclaimed'),lang,
      ...Object.fromEntries(['sizes','territory','rare','features','rewards','relic','events','homes','ruins','clues'].map(k=>[k,$(k).checked]))};
  }
  function featureName(key){
    return local(key).replace(/£[\w]+£\s*/g,'').trim() || key;
  }
  function tagName(k){
    if(k==='reward')return t('遗珍奖励地点','Relic reward location');
    if(k==='feature')return t('其他特殊地貌','Other special features');
    return featureName(k);
  }
  function filterOptions(){
    const select=$('resource'),current=select.value;
    select.replaceChildren(new Option(t('全部标记','All markers'),''));
    const group=(name,items)=>{
      if(!items.length)return;
      const g=document.createElement('optgroup');g.label=name;
      for(const [key,label] of items)g.append(new Option(label,key));
      select.append(g);
    };
    group(t('标记种类','Marker types'),Object.entries(model.symbols).map(([k,symbol])=>
      [k,symbol[lang==='en'?1:0]+' · '+tagName(k)]));
    const features=new Set(),prizes=new Set();
    for(const row of rows.values()){
      for(const k of Object.keys(row.features))if(k!=='d_betharian_deposit')features.add(k);
      for(const k of row.prizes.keys())prizes.add(k);
    }
    const named=keys=>[...keys].map(k=>[k,featureName(k)+(cat.deposits[k]?.surfaceYield?' ('+Object.entries(cat.deposits[k].surfaceYield).map(([r,n])=>local(r)+' +'+nf(n)).join(', ')+')':'')])
      .sort((a,b)=>a[1].localeCompare(b[1],lang));
    group(t('当前视角的地貌','Features in this view'),named(features));
    group(t('当前视角的遗珍奖励','Relic rewards in this view'),named(prizes));
    select.value=[...select.options].some(o=>o.value===current)?current:'';
    select.lang=lang;
  }
  function tabLanguage(){
    document.documentElement.lang=lang==='zh'?'zh-Hans':'en';
    for(const [el,zh,english] of labels) el.textContent=lang==='en'?english:zh;
    locations();
    $('symbols').replaceChildren();$('symbols-main').replaceChildren();
    const primary=new Set(['d_betharian_deposit','minor_artifacts','reward','rare_crystals','exotic_gases','volatile_motes']);
    for(const [key,symbol] of Object.entries(model.symbols)){
      const button=document.createElement('button'),glyph=document.createElement('b');
      glyph.style.color=symbol[2];glyph.textContent=symbol[lang==='en'?1:0];button.append(glyph,' '+tagName(key));
      button.dataset.symbol=key;
      button.onclick=()=>{const select=$('resource');select.value=select.value===key?'':key;select.dispatchEvent(new Event('change'));};
      $(primary.has(key)?'symbols-main':'symbols').append(button);
    }
    $('lookup').placeholder=t('名称或 #ID','Name or #ID');
    $('map').setAttribute('aria-label',t('星系地图。可在下方搜索并加选星系。','Galaxy map. Use the system search below for keyboard selection.'));
  }
  function ownerText(r){
    if(r.owner===null)return t('无主','Unclaimed');
    if(r.owner==='?')return t('归属未知','Unknown territory');
    const n=local(g.countries[r.owner]) || '#'+r.owner;
    const kind={player:t('玩家自己','Player'),npc:t('普通 NPC','Regular NPC'),fallen:t('堕落帝国','Fallen Empire')};
    return kind[r.territory]+' · '+n;
  }
  function title(r){return local(r.s.name)+'  #'+r.s.id;}
  function planetName(p){return local(p.name) || '#'+p.id;}
  function featureText(key,count,alwaysCount=false){
    const def=cat.deposits[key];
    const resources=(def.surfaceStrategic ?? []).map(k=>{
      const n=def.surfaceYield?.[k];
      return local(k)+(n?' +'+nf(n*count)+t('/月','/mo'):'');
    });
    return featureName(key)+(count>1 || alwaysCount?' ×'+nf(count):'')+(resources.length?' ('+resources.join(' · ')+')':'');
  }
  function locationLines(r,opts){
    const lines=[];
    for(const {planet,features,orbital} of r.locations){
      const surface=opts.features?Object.entries(features).filter(([k])=>model.matchesFeature(k,cat.deposits[k],opts.resource)):[];
      const space=opts.rare?Object.entries(orbital).filter(([k])=>!opts.resource || opts.resource===k):[];
      if(!surface.length && !space.length)continue;
      const parts=[];
      if(surface.length)parts.push(t('地表 · ','Surface · ')+surface.map(([k,n])=>featureText(k,n)).join(t('、',', ')));
      if(space.length)parts.push(t('轨道 · ','Orbit · ')+space.map(([k,n])=>local(k)+' +'+nf(n)+t('/月','/mo')).join(' · '));
      lines.push(planetName(planet)+' ('+local(planet.type)+' '+planet.size+')\n  '+parts.join('\n  '));
    }
    return lines;
  }
  function describe(r,extended=false,symbol) {
    const opts=symbol?{...map.options,resource:symbol}:map.options,lines=[title(r)+'  ·  '+ownerText(r)];
    if(symbol)lines.push(tagName(symbol));
    const prizes=opts.rewards?[...r.prizes].filter(([k])=>!opts.resource || opts.resource==='reward' || opts.resource===k):[];
    if(prizes.length)lines.push(t('可能获得的遗珍 · ','Possible relic rewards · ')+prizes.map(([k])=>local(k)).join(' · '));
    const notes=symbol?[]:[...(opts.homes?r.homes:[]),...(opts.events?r.events:[]),...(opts.clues?r.clues:[])];
    const focusedReward=opts.resource==='reward' || r.prizes.has(opts.resource);
    for(const [,note] of prizes)if(focusedReward && !notes.some(n=>n.note===note)){
      const origin=[...r.homes,...r.events].find(n=>n.note===note);
      if(origin)notes.push(origin);
    }
    for(const {key,note} of notes){
      lines.push(note.title[lang]);
      const classic=/^(vultaumar|yuhtaan|fen_habbanis|irass|cybrex)_system$/.test(key);
      if(classic)lines.push(t('条件 · 本国正在追踪该先驱者。','Requires the matching precursor chain.'));
      lines.push(note[lang]);
    }
    if(prizes.length || (!symbol && ((opts.events && r.events.length) || (opts.homes && r.homes.length)))){
      lines.push(t('奖励领取状态未知。','Reward claim status unknown.'));
    }
    if(opts.events && !symbol){
      const sites=r.sites.map(v=>local(v.key)).filter(name=>!notes.some(({note})=>note.title[lang].includes(name)));
      if(sites.length)lines.push(t('考古点 · ','Sites · ')+sites.join(' · '));
    }
    const deposits=locationLines(r,opts);
    lines.push(...(extended?deposits:deposits.slice(0,3)));
    if(!extended && deposits.length>3)lines.push(t('点击查看全部 '+deposits.length+' 个天体。','Click for all '+deposits.length+' bodies.'));
    if(symbol)return lines.join('\n');
    if(r.worlds.length){
      const shown=extended?r.worlds:r.worlds.slice(0,6);
      const worlds=shown.map(p=>local(p.type)+' '+p.size+(p.candidate?t('（改造候选）',' (candidate)'):''));
      lines.push(worlds.join(' · ')+(shown.length<r.worlds.length?' +'+(r.worlds.length-shown.length):''));
    }
    if(opts.relic && r.relic && !r.worlds.some(p=>p.type==='pc_relic'))lines.push(local('pc_relic'));
    if(opts.ruins && r.ruins.length)lines.push([...new Set(r.ruins)].map(local).join(' · '));
    return lines.join('\n');
  }
  function showHover(id,x,y,symbol){
    const target=$('tooltip'),r=rows.get(id);
    if(!r){target.hidden=true;return;}
    target.textContent=describe(r,false,symbol);target.hidden=false;
    const plot=$('plot');
    target.style.left=Math.max(3,Math.min(plot.clientWidth-target.offsetWidth-3,x+14))+'px';
    target.style.top=Math.max(3,Math.min(plot.clientHeight-target.offsetHeight-3,y+16))+'px';
  }
  function details(){
    const r=rows.get(picked);
    $('system-detail').textContent=r?describe(r,true):'';
    $('toggle-one').disabled=!r;$('lookup').value=r?title(r):'';
    map.pick=r?.s.id ?? null;map.queue();
  }
  function lookup(){
    const input=$('lookup').value.trim(),match=input.match(/(?:^#?|#)(\d+)$/);
    let r=match?rows.get(match[1]):null;
    if(!r)r=[...rows.values()].find(r=>local(r.s.name).toLocaleLowerCase()===input.toLocaleLowerCase());
    picked=r?.s.id ?? null;details();
  }
  function choose(ids,toggle,focus){
    if(!toggle)selected=new Set();
    for(const id of ids) {
      if(toggle && selected.has(id))selected.delete(id);else selected.add(id);
    }
    if(focus!=null) picked=focus;
    map.selected=selected;details();stats();
  }
  function amountRows(container,data,plus){
    container.replaceChildren();
    for(const [k,n] of Object.entries(data).sort((a,b)=>b[1]-a[1])){
      const line=document.createElement('div'),label=document.createElement('span'),amount=document.createElement('b');
      line.className='amount';label.textContent=local(k);amount.textContent=(plus?'+':'')+nf(n);
      line.append(label,amount);container.append(line);
    }
  }
  function featureCounts(counts){
    const list=$('feature-counts');list.replaceChildren();
    if(!$('feature-list').open)return;
    for(const [key,count] of Object.entries(counts).sort((a,b)=>b[1]-a[1])){
      const entry=document.createElement('details'),head=document.createElement('summary');
      head.textContent=featureText(key,count,true);entry.append(head);
      entry.ontoggle=()=>{
        if(!entry.open || entry.children.length>1)return;
        const planets=document.createElement('ul');
        for(const id of selected){
          const row=rows.get(id);
          if(!row?.features[key] || !map.options.included.has(row.territory))continue;
          for(const loc of row.locations)if(loc.features[key]){
            const item=document.createElement('li'),button=document.createElement('button');
            button.textContent=local(row.s.name)+' · '+planetName(loc.planet)+' ×'+nf(loc.features[key]);
            button.onclick=()=>{picked=id;map.focusSystem(id);details();};
            item.append(button);planets.append(item);
          }
        }
        entry.append(planets);
      };
      list.append(entry);
    }
  }
  function stats(){
    const v=model.summarize(selected,rows,map.options.included);
    $('count-s').textContent=nf(v.systems);$('count-p').textContent=nf(v.other+v.toxic);
    $('excluded').textContent=v.excluded?t('按领地筛选略过 '+v.excluded+' 个星系。','Territory filters excluded '+v.excluded+' systems.'):'';
    const hist=$('hist');hist.replaceChildren();
    const max=Math.max(1,...[...v.bins.values()].flat());
    for(const [size,counts] of [...v.bins].sort((a,b)=>b[0]-a[0])){
      const row=document.createElement('div');row.className='bin';
      for(const [i,val] of [size,...counts].entries()){
        const cell=document.createElement('span');cell.textContent=nf(val);
        if(i){cell.style.setProperty('--w',(val/max*100)+'%');cell.style.setProperty('--bar',i===1?'#294641':'#453c2c');}
        row.append(cell);
      }hist.append(row);
    }
    if(!v.bins.size){const msg=document.createElement('p');msg.className='meta';msg.textContent=v.systems?t('没有符合条件的天体。','No matching bodies.'):t('在地图上拖动框选星系。','Drag across systems to select them.');hist.append(msg);}
    amountRows($('yields'),v.resources,true);
    const highlights={...v.surface};
    if(v.features.d_betharian_deposit)highlights.d_betharian_deposit=v.features.d_betharian_deposit;
    amountRows($('surface'),highlights,false);amountRows($('direct'),v.surfaceYield,true);
    $('direct-wrap').hidden=!Object.keys(v.surfaceYield).length;
    $('surface-wrap').hidden=!Object.keys(v.features).length;
    featureCounts(v.features);
    amountRows($('prizes'),v.prizes,false);$('prize-wrap').hidden=!Object.keys(v.prizes).length;
    const messages=[];
    if(v.systems && !Object.keys(v.resources).length)messages.push(t('无已计入的轨道产出。','No counted orbital yield.'));
    if(v.conditional)messages.push(t(v.conditional+' 处含条件产出，条件部分未计入。',v.conditional+' deposits have conditional output excluded from totals.'));
    if(v.unknown.size)messages.push(t('未识别矿藏 · ','Unmapped deposits · ')+[...v.unknown].join(', '));
    $('exceptions').textContent=messages.join(' ');
  }
  function render(geometryChanged=false){
    if(!g)return;
    const opt=options();rows=model.inspect(g,cat,opt,HIGHLIGHTS);
    if(geometryChanged || $('resource').lang!==lang){
      filterOptions();
      if(opt.resource!==$('resource').value){
        opt.resource=$('resource').value;rows=model.inspect(g,cat,opt,HIGHLIGHTS);
      }
    }
    map.options=opt;map.selected=selected;map.setRows(rows,geometryChanged);showHover(null);
    const count=$('material-count');count.hidden=!opt.resource;
    if(opt.resource){
      const n=[...rows.values()].filter(r=>r.materialMarks.length).length;
      count.textContent=t('当前视角 · '+nf(n)+' 个星系匹配',nf(n)+' matching systems in this view');
    }
    for(const button of document.querySelectorAll('[data-symbol]'))button.setAttribute('aria-pressed',String(button.dataset.symbol===opt.resource));
    $('territory-layers').hidden=!opt.territory;
    $('count-unknown').hidden=![...rows.values()].some(r=>r.territory==='unknown');
    if(geometryChanged || !rows.has(picked)) picked=rows.has(g.start)?g.start:(rows.keys().next().value ?? null);
    if(geometryChanged || $('systems').lang!==lang){
      const frag=document.createDocumentFragment();
      for(const r of rows.values()){const o=document.createElement('option');o.value=title(r);frag.append(o);}
      $('systems').replaceChildren(frag);$('systems').lang=lang;
    }
    $('map-name').textContent=g.demo?t('示例星图','Example galaxy'):local(g.countries[g.player]) || t('玩家星图','Player galaxy');
    $('map-meta').textContent=g.date+'  ·  '+nf(rows.size)+t(' 个星系',' systems');
    if(!loadingFile)$('save-label').textContent=g.demo?t('示例 · 打开 .sav 查看你的银河','Example · Open a .sav to view your galaxy'):g.version;
    details();stats();
  }
  function install(galaxy){
    g=galaxy;
    selected=new Set(g.demo?g.systems.filter(s=>s.x>-45 && s.x<24 && s.y<0 && s.y>-82).map(s=>s.id):[]);
    render(true);
  }
  function load(file){
    if(!file)return;
    worker?.terminate();worker=null;
    const ticket=++loading;loadingFile=true;
    $('save-label').textContent=t('正在读取 ','Reading ')+file.name;
    $('map-name').textContent=t('正在读取存档…','Reading save…');
    function finish(data){
      if(ticket!==loading)return;
      worker?.terminate();worker=null;loadingFile=false;
      if(data.error){
        render();const message=t('读取失败 · ','Read failed · ')+data.error;
        $('save-label').textContent=message;$('system-detail').textContent=message;
      }else install(data.galaxy);
    }
    try{
      const source=document.getElementById('reader-source');
      const url=source?URL.createObjectURL(new Blob([source.textContent],{type:'text/javascript'})):'reader.js';
      worker=new Worker(url);
      if(source)URL.revokeObjectURL(url);
      worker.onmessage=e=>finish(e.data);
      worker.onerror=e=>finish({error:e.message || t('无法读取文件','Could not read file')});
      worker.postMessage(file);
    }catch{
      GalaxyReader.readFile(file).then(galaxy=>finish({galaxy}),e=>finish({error:e.message}));
    }
  }
  async function start(){
    cat=globalThis.EMBEDDED_CATALOG ?? await (await fetch('catalog.json')).json();
    tabLanguage();install(globalThis.LOCAL_SNAPSHOT ?? exampleGalaxy());
    $('file').addEventListener('change',e=>{load(e.target.files[0]);e.target.value='';});
    $('language').onchange=e=>{lang=e.target.value;tabLanguage();render();};
    $('lookup').onchange=lookup;$('lookup').addEventListener('keydown',e=>{if(e.key==='Enter')lookup();});
    $('toggle-one').onclick=()=>{if(picked!=null)choose([picked],true,picked);};
    $('clear').onclick=()=>choose([],false);
    $('fit').onclick=()=>map.fit();$('zoom-in').onclick=()=>map.adjustZoom(1.4);$('zoom-out').onclick=()=>map.adjustZoom(1/1.4);
    for(const id of ['select-mode','pan-mode']) $(id).onclick=()=>{
      map.panMode=id==='pan-mode';$('select-mode').setAttribute('aria-pressed',String(!map.panMode));$('pan-mode').setAttribute('aria-pressed',String(map.panMode));
      $('map').style.cursor=map.panMode?'grab':'crosshair';
    };
    for(const id of ['scope','toxic','view','sizes','territory','rare','features','rewards','relic','events','homes','ruins','clues']) $(id).onchange=()=>render(id==='view');
    $('resource').onchange=()=>{
      const key=$('resource').value;
      if(key==='reward' || key.startsWith('r_'))$('rewards').checked=true;
      else if(key==='feature' || key.startsWith('d_'))$('features').checked=true;
      else if(key && !$('rare').checked && !$('features').checked){$('rare').checked=true;$('features').checked=true;}
      render();
    };
    $('feature-list').ontoggle=stats;
    for(const input of document.querySelectorAll('[data-shade],[data-count]')) input.onchange=()=>{
      map.options=options();map.queue();stats();
    };
    $('min').oninput=()=>render();
    document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});
    document.addEventListener('drop',e=>{if(e.dataTransfer.files.length){e.preventDefault();load(e.dataTransfer.files[0]);}});
  }
  start().catch(e=>{$('save-label').textContent=e.message;$('system-detail').textContent=t('地图加载失败 · ','Map could not load · ')+e.message;});
})();
