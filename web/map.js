(() => {
  'use strict';
  const resourceSymbols={
    rare_crystals:['晶','C'],exotic_gases:['气','G'],volatile_motes:['微','M'],sr_zro:['泽','Z'],
    sr_dark_matter:['暗','D'],sr_living_metal:['活','L'],nanites:['纳','N'],minor_artifacts:['文','A'],astral_threads:['丝','T']
  };
  function color(id) {
    if(id===null || id==='?') return '#8b999f';
    return 'hsl('+((Number(id)*137.508+158)%360)+' 48% 66%)';
  }
  // Clip each territory cell against nearby systems. The radius leaves empty inter-arm space unclaimed.
  function territoryCells(rows) {
    if(!rows.length) return new Map();
    const xs=rows.map(r=>r.s.x), ys=rows.map(r=>r.s.y);
    const span=Math.max(1,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
    const radius=Math.max(3,Math.min(38,span/Math.sqrt(rows.length)*.95)), stride=2*radius;
    const tiles=new Map(), cells=new Map();
    const bucket=(x,y)=>Math.floor(x/stride)+','+Math.floor(y/stride);
    for(const {s} of rows){const k=bucket(s.x,s.y);if(!tiles.has(k))tiles.set(k,[]);tiles.get(k).push(s);}
    for(const {s,owner} of rows){
      if(owner===null || owner==='?') continue;
      let poly=Array.from({length:16},(_,i)=>[radius*Math.cos(i*Math.PI/8),radius*Math.sin(i*Math.PI/8)]);
      for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) {
        for(const other of tiles.get(bucket(s.x+i*stride,s.y+j*stride)) ?? []) {
          if(other===s) continue;
          const dx=other.x-s.x,dy=other.y-s.y,b=(dx*dx+dy*dy)/2;
          if(b===0 || b>2*radius*radius)continue;
          const out=[];
          for(let k=0;k<poly.length;k++) {
            const a=poly[k], c=poly[(k+1)%poly.length];
            const v=a[0]*dx+a[1]*dy-b,w=c[0]*dx+c[1]*dy-b;
            if(v<=0)out.push(a);
            if((v<=0)!==(w<=0))out.push([a[0]+(c[0]-a[0])*v/(v-w),a[1]+(c[1]-a[1])*v/(v-w)]);
          }
          poly=out;
        }
      }
      cells.set(s.id,poly.map(([x,y])=>[x+s.x,y+s.y]));
    }
    return cells;
  }
  class GalaxyMap {
    constructor(canvas,handlers) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.handlers=handlers;
      this.rows=new Map();this.selected=new Set();this.zoom=1;this.center=[0,0];this.panMode=false;
      this.options={};this.pick=null;this.drag=null;this.frame=0;
      new ResizeObserver(()=>this.resize()).observe(canvas);
      canvas.addEventListener('pointerdown',e=>this.down(e));
      canvas.addEventListener('pointermove',e=>this.move(e));
      canvas.addEventListener('pointerup',e=>this.up(e));
      canvas.addEventListener('pointercancel',()=>{this.drag=null;this.queue();});
      canvas.addEventListener('pointerleave',()=>{if(!this.drag)this.handlers.hover(null);});
      canvas.addEventListener('contextmenu',e=>e.preventDefault());
      canvas.addEventListener('wheel',e=>{e.preventDefault();this.adjustZoom(Math.exp(-Math.sign(e.deltaY)*.2),...this.pos(e));},{passive:false});
      canvas.addEventListener('keydown',e=>{
        if(e.key==='+' || e.key==='=')this.adjustZoom(1.4);
        else if(e.key==='-')this.adjustZoom(1/1.4);
        else if(e.key==='Home')this.fit();
        else if(e.key.startsWith('Arrow')){
          const step=65/this.scale;
          if(e.key==='ArrowLeft')this.center[0]-=step;
          if(e.key==='ArrowRight')this.center[0]+=step;
          if(e.key==='ArrowUp')this.center[1]-=step;
          if(e.key==='ArrowDown')this.center[1]+=step;
          this.queue();
        }else return;
        e.preventDefault();
      });
    }
    setRows(rows,geometryChanged) {
      this.rows=rows;
      if(geometryChanged){this.cells=territoryCells([...rows.values()]);this.fit();}
      this.queue();
    }
    resize(){
      const b=this.canvas.getBoundingClientRect();this.w=b.width;this.h=b.height;
      this.dpr=Math.min(window.devicePixelRatio || 1,2);
      this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);
      this.queue();
    }
    fit(){
      const points=[...this.rows.values()].map(r=>r.s);
      if(points.length){
        const xs=points.map(s=>s.x),ys=points.map(s=>s.y);
        const l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys);
        this.center=[(l+r)/2,(t+b)/2];this.extent=[Math.max(20,r-l),Math.max(20,b-t)];
      }
      this.zoom=1;this.queue();
    }
    get scale(){return Math.min(Math.max(this.w-50,1)/(this.extent?.[0]||1), Math.max(this.h-46,1)/(this.extent?.[1]||1))*this.zoom;}
    xy(x,y){return [(x-this.center[0])*this.scale+this.w/2,(y-this.center[1])*this.scale+this.h/2];}
    pos(e){const b=this.canvas.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top];}
    adjustZoom(f,x=this.w/2,y=this.h/2){
      const old=this.scale; this.zoom=Math.min(35,Math.max(.45,this.zoom*f));
      this.center[0]+=(x-this.w/2)*(1/old-1/this.scale);this.center[1]+=(y-this.h/2)*(1/old-1/this.scale);
      this.handlers.hover(null);this.queue();
    }
    hit(x,y){
      let best=null,limit=100;
      for(const {s} of this.rows.values()){
        const [sx,sy]=this.xy(s.x,s.y),d=(x-sx)**2+(y-sy)**2;
        if(d<limit){limit=d;best=s.id;}
      }
      return best;
    }
    down(e){
      if(this.drag || e.button>2)return;
      const [x,y]=this.pos(e);
      this.canvas.setPointerCapture(e.pointerId);
      this.drag={x,y,endX:x,endY:y,c:this.center.slice(),pan:this.panMode || e.button!==0 || e.altKey,
        toggle:e.ctrlKey||e.metaKey,pointer:e.pointerId};this.handlers.hover(null);
    }
    move(e){
      const [x,y]=this.pos(e),d=this.drag;
      if(!d){this.handlers.hover(this.hit(x,y),x,y);return;}
      if(e.pointerId!==d.pointer)return;
      d.endX=x;d.endY=y;
      if(d.pan)this.center=[d.c[0]-(x-d.x)/this.scale,d.c[1]-(y-d.y)/this.scale];
      this.queue();
    }
    up(e){
      const d=this.drag;if(!d || d.pointer!==e.pointerId)return;
      this.drag=null;const [x,y]=this.pos(e);
      if(!d.pan){
        const box=Math.hypot(x-d.x,y-d.y)>4;
        const ids=[];
        if(box){
          for(const {s} of this.rows.values()){
            const [sx,sy]=this.xy(s.x,s.y);
            if(sx>=Math.min(x,d.x) && sx<=Math.max(x,d.x) && sy>=Math.min(y,d.y) && sy<=Math.max(y,d.y))ids.push(s.id);
          }
        }else{const id=this.hit(x,y);if(id!==null)ids.push(id);}
        this.handlers.select(ids,d.toggle||e.ctrlKey||e.metaKey,box?null:ids[0]);
      }
      this.queue();
    }
    queue(){if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});}
    draw(){
      if(!this.w||!this.h)return;
      const ctx=this.ctx,opts=this.options,scale=this.scale;
      ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      const bg=ctx.createRadialGradient(this.w*.48,this.h*.48,0,this.w*.48,this.h*.48,Math.max(this.w,this.h)*.69);
      bg.addColorStop(0,'#14282c');bg.addColorStop(.55,'#101e24');bg.addColorStop(1,'#0b141a');
      ctx.fillStyle=bg;ctx.fillRect(0,0,this.w,this.h);
      ctx.fillStyle='#739198';ctx.globalAlpha=.33;
      for(let i=1;i<=160;i++){const x=((i*7919)%197)/197*this.w,y=((i*i*491+37*i)%331)/331*this.h;ctx.fillRect(x,y,1,1);}
      ctx.globalAlpha=1;
      ctx.save();ctx.translate(this.w/2,this.h/2);ctx.scale(scale,scale);ctx.translate(-this.center[0],-this.center[1]);
      if(opts.territory && this.cells){
        ctx.globalAlpha=.24;
        for(const [id,pts] of this.cells){
          if(!pts.length)continue;
          ctx.fillStyle=color(this.rows.get(id).owner);ctx.beginPath();ctx.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);ctx.closePath();ctx.fill();
        }
        ctx.globalAlpha=1;
      }
      ctx.strokeStyle='#4a6469';ctx.lineWidth=.8/scale;ctx.beginPath();
      for(const {s} of this.rows.values())for(const id of s.lanes){
        const t=this.rows.get(id)?.s;
        if(!t || Number(id)<=Number(s.id) || (opts.view==='player' && (!s.knownLanes || !t.knownLanes)))continue;
        ctx.moveTo(s.x,s.y);ctx.lineTo(t.x,t.y);
      }ctx.stroke();ctx.restore();
      ctx.font='600 11px "Segoe UI", sans-serif';ctx.textBaseline='middle';
      const visible=[];
      for(const r of this.rows.values()){
        const {s,owner}=r,[x,y]=this.xy(s.x,s.y);
        if(x< -45||y< -15||x>this.w+12||y>this.h+12)continue;
        const selected=this.selected.has(s.id) && (opts.foreign || owner===null || owner===opts.player);
        const rad=selected?3.6:this.zoom>2?3.1:2.15;
        ctx.fillStyle=selected?'#b0f9d2':opts.territory && owner!==null && owner!=='?'?color(owner):'#9cadb1';
        ctx.beginPath();ctx.arc(x,y,rad,0,2*Math.PI);ctx.fill();
        if((selected && (this.selected.size<80 || this.zoom>2)) || this.pick===s.id){ctx.strokeStyle=this.pick===s.id?'#fff4cc':'#73d6b9';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,rad+2.5,0,Math.PI*2);ctx.stroke();}
        visible.push({r,x,y,priority:(this.pick===s.id?1000:0)+(r.relic||r.ruins.length||r.events.length?80:0)+(r.worlds[0]?.size||0)});
      }
      visible.sort((a,b)=>b.priority-a.priority);
      const occupied=new Set();
      function space(x,y,width){
        const cells=[];
        for(let i=Math.floor(x/8);i<=Math.floor((x+width)/8);i++)for(let j=Math.floor((y-5)/8);j<=Math.floor((y+5)/8);j++){
          const key=i+','+j;if(occupied.has(key))return false;cells.push(key);
        }
        for(const key of cells)occupied.add(key);
        return true;
      }
      for(const {r,x,y} of visible){
        if(opts.sizes && r.worlds.length){
          let tx=x+5;
          const worlds=r.worlds.slice(0,this.zoom>=3?8:3);
          const width=worlds.reduce((w,p)=>w+ctx.measureText(String(p.size)).width+2,0)+(worlds.length<r.worlds.length?7:0);
          if(space(tx,y-5,width)){
            for(const p of worlds){
              const str=String(p.size);ctx.fillStyle=p.type==='pc_toxic'?'#f1c57d':'#c8e7dd';
              ctx.strokeStyle='#101b21';ctx.lineWidth=2.5;ctx.strokeText(str,tx,y-5);ctx.fillText(str,tx,y-5);
              tx+=ctx.measureText(str).width+2;
            }
            if(worlds.length<r.worlds.length){ctx.fillStyle='#a5b6b5';ctx.fillText('+',tx,y-5);}
          }
        }
        const marks=[];
        if(opts.rare)for(const resource of r.rare){
          if(opts.resource && resource!==opts.resource)continue;
          const symbol=resourceSymbols[resource]?.[opts.lang==='en'?1:0] ?? '◆';
          marks.push([symbol,'#81dced']);
        }
        if(opts.relic && r.relic)marks.push(['◇','#dba5f0']);
        if(opts.ruins && r.ruins.length)marks.push(['▣','#ef9b7c']);
        if(opts.events && r.events.length)marks.push(['✦','#ffd094']);
        if(opts.clues && r.clues.length)marks.push(['•','#f3d99a']);
        let mx=x+3;
        if(marks.length){
          if(space(mx,y+9,marks.length*11)){
            for(const [text,c] of marks){ctx.fillStyle=c;ctx.fillText(text,mx,y+9);mx+=11;}
          }else{
            ctx.fillStyle=marks[0][1];ctx.fillRect(x-2,y+3,4,2);
          }
        }
      }
      const d=this.drag;
      if(d && !d.pan){
        ctx.fillStyle='#79e3bd25';ctx.strokeStyle='#9af1cd';ctx.lineWidth=1;
        ctx.fillRect(d.x,d.y,d.endX-d.x,d.endY-d.y);ctx.strokeRect(d.x,d.y,d.endX-d.x,d.endY-d.y);
      }
      this.handlers.zoom(this.zoom);
    }
  }
  globalThis.GalaxyMap=GalaxyMap;
})();
