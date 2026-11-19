(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const en={
    subtitle:'Stellaris save map',open:'Open save',filters:'Map layers',view:'View',all:'Full save',known:'Player records',
    worlds:'Planets',sizeLabels:'Label planet sizes',pool:'Non-toxic bodies',colony:'Colonizable types & candidates',bodies:'All bodies, including stars',
    toxic:'Toxic worlds',allToxic:'Include all',candidate:'Terraforming candidates only',off:'Hide and exclude',min:'Minimum size',
    layers:'Overlays',territory:'Empire territory',rare:'Strategic resources',relic:'Relic worlds',events:'Events & precursor homes',
    clues:'Precursor clue regions',ruins:'Ruined megastructures',fit:'Fit',select:'Select',pan:'Pan',
    gesture:'Drag to select · Ctrl-click or Ctrl-drag to toggle · Scroll to zoom',inspect:'Inspect system',toggle:'Toggle selection',
    selection:'Selection',clear:'Clear',foreign:'Include foreign territory',systems:'Systems',matched:'Matching bodies',
    distribution:'Size distribution',size:'Size',other:'Non-toxic',toxicShort:'Toxic',output:'Orbital resources',
    gross:'Base monthly yield in counted systems, across all sizes. Player records include only surveyed bodies.',
    surface:'Surface resources',surfaceHint:'Number of features. Output depends on jobs.',locations:'Windows save locations'
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
    return {min:Math.max(0,Number($('min').value)||0),toxic:$('toxic').value,scope:$('scope').value,view:$('view').value,
      resource:$('resource').value,player:g?.player,lang,...Object.fromEntries(['sizes','foreign','territory','rare','relic','events','ruins','clues'].map(k=>[k,$(k).checked]))};
  }
  function tabLanguage(){
    document.documentElement.lang=lang==='zh'?'zh-Hans':'en';
    for(const [el,zh,english] of labels) el.textContent=lang==='en'?english:zh;
    locations();
    const resource=$('resource'),current=resource.value;
    resource.replaceChildren(new Option(t('全部战略资源','All strategic resources'),''));
    for(const k of cat.strategic)resource.add(new Option(local(k),k));
    resource.value=current;
    $('lookup').placeholder=t('名称或 #ID','Name or #ID');
    $('resource').setAttribute('aria-label',t('战略资源类型','Strategic resource type'));
    $('map').setAttribute('aria-label',t('星系地图。可在下方搜索并加选星系。','Galaxy map. Use the system search below for keyboard selection.'));
  }
  function ownerText(r){
    if(r.owner===null)return t('无主','Unclaimed');
    if(r.owner==='?')return t('归属未知','Unknown territory');
    const n=local(g.countries[r.owner]) || '#'+r.owner;
    return r.owner===g.player?t('己方 · ','Player · ')+n:n;
  }
  function title(r){return local(r.s.name)+'  #'+r.s.id;}
  function describe(r,extended=false) {
    const opts=map.options,lines=[title(r)+'  ·  '+ownerText(r)];
    if(r.worlds.length){
      const shown=extended?r.worlds:r.worlds.slice(0,6);
      const worlds=shown.map(p=>local(p.type)+' '+p.size+(p.candidate?t('（改造候选）',' (candidate)'):''));
      lines.push(worlds.join(' · ')+(shown.length<r.worlds.length?' +'+(r.worlds.length-shown.length):''));
    }
    if(opts.rare && r.rare.size)lines.push([...r.rare].map(k=>local(k)+(r.resources[k]?' +'+nf(r.resources[k]):'')+(r.surface[k]?t('（地貌）',' (surface)'):'' )).join(' · '));
    if(opts.relic && r.relic && !r.worlds.some(p=>p.type==='pc_relic'))lines.push(local('pc_relic'));
    if(opts.ruins && r.ruins.length)lines.push([...new Set(r.ruins)].map(local).join(' · '));
    if(opts.events && r.sites.length)lines.push(t('考古点 · ','Sites · ')+r.sites.map(v=>local(v.key)).join(' · '));
    const notes=[...(opts.events?r.events:[]),...(opts.clues?r.clues:[])];
    if(opts.events && r.events.length)lines.push(t('事件可能收益（领取状态未知）','Possible event rewards (claim status unknown)'));
    for(const {key,note} of notes){
      const classic=/^(vultaumar|yuhtaan|fen_habbanis|irass|cybrex)_system$/.test(key);
      lines.push((classic?t('本国正在追踪该先驱者时，','While following this precursor chain: '):'')+note[lang]);
    }
    return lines.join('\n');
  }
  function showHover(id,x,y){
    const target=$('tooltip'),r=rows.get(id);
    if(!r){target.hidden=true;return;}
    target.textContent=describe(r);target.hidden=false;
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
  function stats(){
    const v=model.summarize(selected,rows,$('foreign').checked,g.player);
    $('count-s').textContent=nf(v.systems);$('count-p').textContent=nf(v.other+v.toxic);
    $('excluded').textContent=v.excluded?t('已略过 '+v.excluded+' 个他国或归属未知星系。','Excluded '+v.excluded+' foreign or unknown systems.'):'';
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
    amountRows($('yields'),v.resources,true);amountRows($('surface'),v.surface,false);
    $('surface-wrap').hidden=!Object.keys(v.surface).length;
    const messages=[];
    if(v.systems && !Object.keys(v.resources).length)messages.push(t('无已计入的轨道产出。','No counted orbital yield.'));
    if(v.conditional)messages.push(t(v.conditional+' 处含条件产出，条件部分未计入。',v.conditional+' deposits have conditional output excluded from totals.'));
    if(v.unknown.size)messages.push(t('未识别矿藏 · ','Unmapped deposits · ')+[...v.unknown].join(', '));
    $('exceptions').textContent=messages.join(' ');
  }
  function render(geometryChanged=false){
    if(!g)return;
    const opt=options();rows=model.inspect(g,cat,opt,HIGHLIGHTS);
    map.options=opt;map.selected=selected;map.setRows(rows,geometryChanged);showHover(null);
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
    for(const id of ['scope','toxic','view','sizes','foreign','territory','rare','resource','relic','events','ruins','clues']) $(id).onchange=()=>render(id==='view');
    $('min').oninput=()=>render();
    document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});
    document.addEventListener('drop',e=>{if(e.dataTransfer.files.length){e.preventDefault();load(e.dataTransfer.files[0]);}});
  }
  start().catch(e=>{$('save-label').textContent=e.message;$('system-detail').textContent=t('地图加载失败 · ','Map could not load · ')+e.message;});
})();
