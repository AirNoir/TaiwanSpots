/* Islandia / Xiangshan. Hand-built miniature; photo-based composition, compressed distances. */
'use strict';
(() => {
const T=window.THREE,host=document.querySelector('#viewport');
if(!T){document.querySelector('#loading').textContent='模型元件載入失敗，請重新整理。';return;}
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.appendChild(renderer.domElement);
const scene=new T.Scene(),world=new T.Group();scene.add(world);
const camera=new T.PerspectiveCamera(34,1,.1,160);
scene.add(new T.HemisphereLight(0xf2f7ff,0x928266,1.35));
const sun=new T.DirectionalLight(0xffedcd,3.4);sun.position.set(-7,15,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:10,bottom:-9,near:1,far:40});sun.shadow.bias=-.00012;sun.shadow.normalBias=.018;sun.shadow.radius=3;scene.add(sun);
const fill=new T.DirectionalLight(0xd7e9ef,1.5);fill.position.set(8,8,-6);scene.add(fill);
let seed=7821;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
function noise(x,y,z){return Math.sin(x*1.73+y*2.37+z*1.11)*.43+Math.sin(x*3.61-y*2.1+z*2.7)*.28+Math.cos(x*6.1+y*4.3-z*5.2)*.17+Math.sin(x*13.7+y*9.1+z*11.3)*.08;}
function material(c,roughness=.8,metalness=0){return new T.MeshStandardMaterial({color:c,roughness,metalness});}
const stone=material('#e4ded0'),soil=material('#d2b598'),grass=material('#657142'),bark=material('#67523a'),ivory=material('#d8d3bf'),metal=material('#7d887f',.46,.45),glass=material('#537a79',.3,.36),darkGlass=material('#445859',.35,.35),edgeMetal=material('#b5bfba',.38,.48),asphalt=material('#90938a');
const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,12,8),batches=new Map(),obj=new T.Object3D();
function instance(geo,mat,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,color=null){const key=geo.uuid+mat.uuid;if(!batches.has(key))batches.set(key,{geo,mat,items:[]});obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.rotation.set(rx,ry,rz);obj.updateMatrix();batches.get(key).items.push({matrix:obj.matrix.clone(),color});}
function box(mat,x,y,z,w,h,d,ry=0){instance(cube,mat,x,y,z,w,h,d,0,ry);}
function mesh(geo,mat,x=0,y=0,z=0,parent=world){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const lineGeo=new T.CylinderGeometry(1,.95,1,6);
function line(a,b,r,mat=metal){const A=new T.Vector3(...a),B=new T.Vector3(...b),length=A.distanceTo(B),mid=A.clone().add(B).multiplyScalar(.5),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),B.sub(A).normalize()),e=new T.Euler().setFromQuaternion(q);instance(lineGeo,mat,mid.x,mid.y,mid.z,r,length,r,e.x,e.y,e.z);}
function rounded(w,h,d,r=.05){const g=new T.BoxGeometry(w,h,d,5,5,5),p=g.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i),c=v.clone();c.set(clamp(c.x,-w/2+r,w/2-r),clamp(c.y,-h/2+r,h/2-r),clamp(c.z,-d/2+r,d/2-r));v.sub(c).normalize().multiplyScalar(r).add(c);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();return g;}
function textureCanvas(size,draw){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
// Procedural, non-photographic sandstone: broad weathering, warped strata, pores and lichen.
const rockMap=textureCanvas(1024,(ctx,s)=>{const im=ctx.createImageData(s,s);for(let y=0;y<s;y++)for(let x=0;x<s;x++){const u=x/s,v=y/s;const n=noise(u*8,v*8,2),fine=rand(),seam=Math.pow(Math.max(0,Math.cos(v*58+Math.sin(u*12)*2+noise(u*5,v*4,0)*2)),24);const pits=fine<.025?-38:0;const tint=25*n+25*(fine-.5)-seam*17+pits;const i=(y*s+x)*4;im.data[i]=141+tint;im.data[i+1]=129+tint;im.data[i+2]=109+tint;im.data[i+3]=255;}ctx.putImageData(im,0,0);for(let k=0;k<550;k++){const x=rand()*s,y=rand()*s;ctx.fillStyle=rand()<.7?'#66674735':'#e2ddbd55';ctx.beginPath();ctx.ellipse(x,y,1+rand()*6,1+rand()*4,rand()*6.28,0,6.28);ctx.fill();}for(let j=0;j<12;j++){let x=rand()*s,y=rand()*s;ctx.beginPath();ctx.moveTo(x,y);for(let k=0;k<9;k++){x+=rand()*30-12;y+=rand()*26;ctx.lineTo(x,y);}ctx.strokeStyle='#45473b66';ctx.lineWidth=.6+rand()*1.5;ctx.stroke();}});
rockMap.wrapS=rockMap.wrapT=T.RepeatWrapping;
const rockMat=new T.MeshStandardMaterial({map:rockMap,roughness:.96,vertexColors:true});
// Object-space triplanar mapping keeps weathering continuous over sculpted rock poles.
rockMat.onBeforeCompile=shader=>{
shader.vertexShader='varying vec3 vRockP; varying vec3 vRockN;\n'+shader.vertexShader;
shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRockP=position;vRockN=normal;');
shader.fragmentShader=`varying vec3 vRockP; varying vec3 vRockN;
float rh(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float rn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(rh(i),rh(i+vec3(1,0,0)),f.x),mix(rh(i+vec3(0,1,0)),rh(i+vec3(1,1,0)),f.x),f.y),mix(mix(rh(i+vec3(0,0,1)),rh(i+vec3(1,0,1)),f.x),mix(rh(i+vec3(0,1,1)),rh(i+vec3(1,1,1)),f.x),f.y),f.z);}
float rf(vec3 p){return .5*rn(p)+.25*rn(p*2.03)+.125*rn(p*4.13)+.0625*rn(p*8.21);}
`+shader.fragmentShader;
shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
vec3 rp=vRockP;float weather=rf(rp*5.7);float grit=rn(rp*280.);
float fracture=1.-smoothstep(.0,.024,abs(rn(rp*4.+vec3(0,rf(rp*3.),0))-.49));
float crust=smoothstep(.51,.65,rf(rp*21.));
vec3 sandstone=mix(vec3(.26,.23,.18),vec3(.57,.50,.37),weather);
sandstone*=.82+grit*.30;sandstone*=1.-fracture*.12;
sandstone=mix(sandstone,vec3(.49,.48,.36),crust*.45);
diffuseColor.rgb*=sandstone*1.03;`);
shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
float relief=rf(vRockP*55.)*.0035+rn(vRockP*240.)*.0008;
vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
vec3 rr1=cross(dpdy,normal),rr2=cross(normal,dpdx);
float det=dot(dpdx,rr1);
normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*rr1+dFdy(relief)*rr2));`);
};
const earthMap=rockMap.clone();earthMap.needsUpdate=true;earthMap.repeat.set(3,2);soil.map=earthMap;soil.bumpMap=earthMap;soil.bumpScale=.10;soil.onBeforeCompile=rockMat.onBeforeCompile;soil.bumpMap=null;
const pavementMap=textureCanvas(256,(ctx,s)=>{const im=ctx.createImageData(s,s);for(let i=0;i<s*s;i++){const v=155+rand()*70;im.data[i*4]=v;im.data[i*4+1]=v-5;im.data[i*4+2]=v-16;im.data[i*4+3]=255;}ctx.putImageData(im,0,0);});stone.map=pavementMap;stone.bumpMap=pavementMap;stone.bumpScale=.012;
const R=5.7;function edge(a){return R*(1+.035*Math.sin(a*3+.8)+.016*Math.cos(a*7));}
function ground(x,z){const t=clamp((z+.45)/4.9,0,1);return .48+1.42*t+.12*Math.sin(x*.9)*Math.sin(z*.8)*t;}
// A watertight organic terrain plate with exposed earth; city is at its lower end.
const seg=160,rings=55,verts=[],cols=[],idx=[];
for(let j=0;j<=rings;j++)for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,r=edge(a)*j/rings,x=Math.cos(a)*r,z=Math.sin(a)*r;verts.push(x,ground(x,z),z);const path=Math.abs(x-.13*Math.sin(z*1.2))<.72&&z>-.4;const col=new T.Color(path?'#958b69':z<-.4?'#999b83':'#5e6b38');col.multiplyScalar(.87+noise(x*.7,z*.7,3)*.16);cols.push(col.r,col.g,col.b);}
for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){const a=j*(seg+1)+i,b=a+seg+1;idx.push(a,a+1,b,a+1,b+1,b);}
const topGeo=new T.BufferGeometry();topGeo.setAttribute('position',new T.Float32BufferAttribute(verts,3));topGeo.setAttribute('color',new T.Float32BufferAttribute(cols,3));topGeo.setIndex(idx);topGeo.computeVertexNormals();mesh(topGeo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));
const sv=[],si=[],uv=[];
for(let j=0;j<=18;j++)for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,t=j/18,r=edge(a)*(1-.035*(1-t))+.025*Math.sin(a*22+j*.6),x=Math.cos(a)*r,z=Math.sin(a)*r;sv.push(x,lerp(-.6,ground(x,z),t),z);uv.push(i/seg*3,t);}
for(let j=0;j<18;j++)for(let i=0;i<seg;i++){const a=j*(seg+1)+i,b=a+seg+1;si.push(a,b,a+1,a+1,b,b+1);}
const sideGeo=new T.BufferGeometry();sideGeo.setAttribute('position',new T.Float32BufferAttribute(sv,3));sideGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));sideGeo.setIndex(si);sideGeo.computeVertexNormals();mesh(sideGeo,soil);
const bottomShape=new T.Shape();for(let i=0;i<=seg;i++){const a=-i/seg*Math.PI*2,r=edge(a)*.966;if(i===0)bottomShape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else bottomShape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}const bottom=mesh(new T.ShapeGeometry(bottomShape),soil,0,-.601,0);bottom.rotation.x=Math.PI/2;
// High landing -> descending stone trench. Every tread is explicit and grounded.
const stairTops=[],treadGeo=rounded(.386,.16,.218,.018);
for(let i=0;i<25;i++){const z=4.85-i*.202,top=2.04-i*.052,x=.10+.10*Math.sin(z*1.1);stairTops.push({x,z,top});for(let c=0;c<3;c++){instance(treadGeo,stone,x+(c-1)*.400,top-.08,z,1,1,1,0,(rand()-.5)*.025);}}
for(let r=0;r<3;r++)for(let c=0;c<4;c++)mesh(rounded(.38,.14,.23,.018),stone,(c-1.5)*.396+.1,2.015-.07,4.93+r*.23);
// The photo's high left stone has a straighter wall; the right stone has a slanted roof.
const rocks=[[-1.26,2.58,.83,1.18,.93,-.05,.52],[1.38,2.1,1.07,.82,1.18,-.30,.64],[-1.06,.50,.69,.79,.70,.22,.62],[1.61,.06,.72,.56,.74,.45,.68],[-2.66,2.92,.69,1.0,.72,.23,.59],[2.72,1.87,.71,.64,.72,.25,.73]];
for(let k=0;k<rocks.length;k++){const [x,z,sx,sy,sz,ang,power]=rocks[k];const geo=new T.SphereGeometry(1,80,56),p=geo.attributes.position,cs=[];for(let i=0;i<p.count;i++){let vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i);const rawY=vy;const f=v=>Math.sign(v)*Math.pow(Math.abs(v),power);const n=noise(vx*2.8+k,vy*2.3,vz*2.1)*.065;vx=f(vx);vy=f(vy);vz=f(vz);const crevice=Math.exp(-Math.pow((vy+.17+vx*.18+Math.sin(vz*2)*.06)/.037,2))*.020;vx*=1+n-crevice;vz*=1+n-crevice;vy*=1+n;if(k===1)vy-=vx*.19;if(k===0)vy=Math.min(vy,.88+vx*.08);p.setXYZ(i,vx,vy,vz);const tint=clamp(.91+noise(vx*3,vy*2+k,vz*4)*.16,.55,1.1),moss=clamp((-.28-rawY)*.7,0,.3);cs.push(tint*(1-moss*.35),tint*(1-moss*.15),tint*(1-moss*.8));}geo.setAttribute('color',new T.Float32BufferAttribute(cs,3));geo.computeVertexNormals();const m=mesh(geo,rockMat,x,ground(x,z)+sy*.79,z);m.scale.set(sx,sy,sz);m.rotation.y=ang;}
// Scatter small buried stones and dark ground contacts at the rock feet.
const pebbleGeo=new T.IcosahedronGeometry(1,1);
for(let i=0;i<170;i++){const r=rocks[Math.floor(rand()*rocks.length)],a=rand()*6.28,x=r[0]+Math.cos(a)*r[2]*(1+rand()*.35),z=r[1]+Math.sin(a)*r[4]*(1+rand()*.25);if(Math.abs(x)<.78)continue;const s=.025+rand()*.07;instance(pebbleGeo,stone,x,ground(x,z)+s*.35,z,s*1.4,s*.8,s,rand(),rand());}
// Compact urban blocks with sidewalks and continuous street corridors.
const base=.495,buildingMats=[];
function facade(tone,style){const map=textureCanvas(256,(ctx,s)=>{ctx.fillStyle=tone;ctx.fillRect(0,0,s,s);const cols=style?8:6,rows=style?18:12,cw=s/cols,rh=s/rows;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const b=rand();ctx.fillStyle=style?`rgb(${65+b*40},${91+b*35},${96+b*33})`:(b>.88?'#bcb797':b>.45?'#727e7a':'#556765');ctx.fillRect(x*cw+cw*.18,y*rh+rh*.18,cw*.64,rh*.58);ctx.fillStyle=style?'#c1c7bf77':'#e5dfc5';ctx.fillRect(x*cw+cw*.12,y*rh+rh*.83,cw*.76,1.7);if(!style&&b<.17){ctx.fillStyle='#acae9c';ctx.fillRect(x*cw+cw*.55,y*rh+rh*.55,cw*.37,rh*.25);}}});return new T.MeshStandardMaterial({map,roughness:style?.40:.82,metalness:style?.18:0});}
for(const c of ['#d3cbbc','#bec6c0','#c2b49f','#d4d3bc','#acb8b3','#b6aaa1'])buildingMats.push(facade(c,0));buildingMats.push(facade('#79938f',1),facade('#72868b',1));
const sidewalk=material('#b9b8a6'),roof=material('#acae9d'),roofDark=material('#777f73'),tank=material('#b9beb5',.45,.35);
let buildingCount=0;
function building(x,z,w,d,h,type=0){const mt=buildingMats[type%buildingMats.length];box(mt,x,base+h/2,z,w,h,d);buildingCount++;
box(roof,x,base+h+.022,z,w+.025,.045,d+.025);const parapet=.03;box(ivory,x,base+h+.06,z-d/2,w,.065,.025);box(ivory,x-w/2,base+h+.06,z,.025,.065,d);box(ivory,x+w/2,base+h+.06,z,.025,.065,d);box(ivory,x,base+h+.06,z+d/2,w,.065,.025);
box(roofDark,x+w*.13,base+h+.10,z-d*.10,w*.35,.15,d*.37);
if(w>.23){const cy=new T.CylinderGeometry(.04,.04,.075,8);instance(cy,tank,x-w*.25,base+h+.065,z+d*.23,1,1,1);}
if(type<4&&h>.48){for(let y=.18;y<h-.05;y+=.16)box(ivory,x,base+y,z+d/2+.025,w*.76,.022,.07);}
}
const landmarks=[{x:-.75,z:-2.63,w:.95,d:1.0},{x:1.18,z:-2.85,w:1.00,d:.92},{x:2.32,z:-3.54,w:.57,d:.59}];
function inLandmark(x,z,w=.0,d=.0){return landmarks.some(l=>Math.abs(x-l.x)<(l.w+w)/2+.17&&Math.abs(z-l.z)<(l.d+d)/2+.18);}
for(let row=0;row<8;row++){const z=-.7-row*.60;for(let col=0;col<18;col++){const x=-5.05+col*.59;if(x*x+z*z>28.5||inLandmark(x,z,.40,.40))continue;const w=.29+rand()*.14,d=.31+rand()*.12,h=.20+Math.pow(rand(),1.9)*.85;box(sidewalk,x,base-.016,z,.51,.03,.51);building(x,z,w,d,h,Math.floor(rand()*8));}}
// Two wider avenues, planted blocks, and restrained road markings.
for(const z of [-1.58,-3.38]){const width=2*Math.sqrt(28-z*z);box(asphalt,0,.489,z,width,.012,.13);for(let x=-width/2+.1;x<width/2;x+=.27)box(ivory,x,.497,z,.10,.005,.01);}
for(let i=0;i<60;i++){const x=(rand()-.5)*9,z=-.56-Math.floor(rand()*8)*.60;if(x*x+z*z>27||inLandmark(x,z,.15,.1))continue;box(rand()>.6?ivory:roofDark,x,.545,z,.11,.055,.052);box(darkGlass,x,.578,z,.054,.014,.049);}
// Taipei 101: podium, tapered base, eight bamboo-like sections, crown and spire.
function ringSquare(x,z,y,size,h,mat){box(mat,x,y,z,size,h,size);}
const tx=-.75,tz=-2.63;box(ivory,tx,base+.14,tz,.98,.28,.9);box(glass,tx,base+.23,tz,.90,.10,.81);
mesh(new T.CylinderGeometry(.32,.44,.62,4),glass,tx,base+.59,tz).rotation.y=Math.PI/4;
for(let k=1;k<16;k++){const f=k/16,w=lerp(.622,.452,f);ringSquare(tx,tz,base+.28+f*.62,w,.006,edgeMetal);}
for(let side=0;side<4;side++){const a=side*Math.PI/2;for(let k=-4;k<=4;k++){const u=k/10;line([tx+Math.cos(a)*.622*u+Math.sin(a)*.311,base+.28,tz-Math.sin(a)*.622*u+Math.cos(a)*.311],[tx+Math.cos(a)*.452*u+Math.sin(a)*.226,base+.90,tz-Math.sin(a)*.452*u+Math.cos(a)*.226],.004,edgeMetal);}
const badge=mesh(new T.TorusGeometry(.057,.009,6,20),edgeMetal,tx+Math.sin(a)*.277,base+.62,tz+Math.cos(a)*.277);badge.rotation.y=a;}
let ty=base+.9;
for(let tier=0;tier<8;tier++){const h=.30,bt=.385,tt=.465;const g=new T.CylinderGeometry(tt/Math.SQRT2,bt/Math.SQRT2,h,4,1,false);mesh(g,glass,tx,ty+h/2,tz).rotation.y=Math.PI/4;
ringSquare(tx,tz,ty+h+.006,tt+.023,.029,edgeMetal);
for(let side=0;side<4;side++){const a=side*Math.PI/2;for(let k=1;k<8;k++){const f=k/8,s=lerp(bt,tt,f),yy=ty+h*f;const px=tx+Math.sin(a)*(s/2+.004),pz=tz+Math.cos(a)*(s/2+.004);box(edgeMetal,px,yy,pz,s,.005,.009,a);}for(let k=-3;k<=3;k++){const t=k/8;const A=[tx+Math.cos(a)*bt*t+Math.sin(a)*bt/2,ty,tz-Math.sin(a)*bt*t+Math.cos(a)*bt/2];const B=[tx+Math.cos(a)*tt*t+Math.sin(a)*tt/2,ty+h,tz-Math.sin(a)*tt*t+Math.cos(a)*tt/2];line(A,B,.004,edgeMetal);}
const ornament=mesh(new T.TorusGeometry(.025,.008,5,12),edgeMetal,tx+Math.sin(a)*(tt/2+.016),ty+h-.038,tz+Math.cos(a)*(tt/2+.016));ornament.rotation.y=a;
}ty+=.337;}
mesh(new T.CylinderGeometry(.095,.17,.43,4),glass,tx,ty+.215,tz).rotation.y=Math.PI/4;
for(let i=0;i<6;i++)ringSquare(tx,tz,ty+i*.063,.21-i*.012,.012,edgeMetal);
mesh(new T.CylinderGeometry(.025,.067,.25,8),metal,tx,ty+.54,tz);mesh(new T.CylinderGeometry(.005,.016,.30,8),edgeMetal,tx,ty+.815,tz);
// Nanshan: chamfered glass shaft, deep vertical fins, split crown and terraced podium.
const nx=1.18,nz=-2.85,nh=2.61;
for(let i=0;i<3;i++){box(darkGlass,nx-.12,base+.075+i*.11,nz+.15,.98-i*.08,.1,.72-i*.06);box(ivory,nx-.12,base+.13+i*.11,nz+.15,1.00-i*.08,.02,.74-i*.06);}
const points=[[-.28,-.18],[-.19,-.28],[.19,-.28],[.28,-.18],[.28,.18],[.19,.28],[-.19,.28],[-.28,.18]];
const shape=new T.Shape(points.map(p=>new T.Vector2(...p)));const ng=new T.ExtrudeGeometry(shape,{depth:nh,bevelEnabled:false});ng.rotateX(-Math.PI/2);mesh(ng,darkGlass,nx,base,nz);
for(let side=0;side<4;side++){const a=side*Math.PI/2;for(let k=-5;k<=5;k++){const lateral=k*.043;box(edgeMetal,nx+Math.cos(a)*lateral+Math.sin(a)*.283,base+nh/2,nz-Math.sin(a)*lateral+Math.cos(a)*.283,.009,nh,.009,a);}for(let k=1;k<43;k++){const y=base+k*nh/43;box(metal,nx+Math.sin(a)*.283,y,nz+Math.cos(a)*.283,.42,.006,.01,a);}}
box(glass,nx,base+nh+.13,nz,.48,.25,.45);
for(const s of [-1,1]){box(darkGlass,nx+s*.235,base+nh+.26,nz,.025,.49,.50);for(let k=0;k<9;k++)box(edgeMetal,nx+s*.252,base+nh+.30,nz-.22+k*.055,.01,.53,.009);}
for(let k=-5;k<=5;k++)box(edgeMetal,nx+k*.043,base+nh+.33,nz+.257,.009,.43,.012);
for(let k=0;k<5;k++)box(metal,nx,base+nh+.15+k*.062,nz+.257,.49,.009,.012);
// Farglory's clipped crown, visible beside the two main landmarks in the reference.
const fx=2.32,fz=-3.54,fh=2.30;building(fx,fz,.40,.42,fh,6);
const crown=new T.BufferGeometry();crown.setAttribute('position',new T.Float32BufferAttribute([-.2,0,.21,.2,0,.21,.10,.24,.12,-.16,.24,.12,-.2,0,-.21,.2,0,-.21,.10,.24,-.12,-.16,.24,-.12],3));crown.setIndex([0,1,2,0,2,3,1,5,6,1,6,2,5,4,7,5,7,6,4,0,3,4,3,7,3,2,6,3,6,7]);crown.computeVertexNormals();mesh(crown,glass,fx,base+fh+.05,fz);
// Lush subtropical canopy: branched trunks, asymmetric leaf clusters and fern fronds.
const leafMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.87});const leafGeo=new T.IcosahedronGeometry(1,1),leafColors=['#425e2c','#566f31','#687f38','#7b9149','#355737'];
function foliage(x,y,z,sx,sy,sz){instance(leafGeo,leafMat,x,y,z,sx,sy,sz,rand(),rand()*6.28,rand(),new T.Color(leafColors[Math.floor(rand()*leafColors.length)]));}
function tree(x,z,s=1){const y=ground(x,z),h=.6*s;line([x,y-.02,z],[x+.05*s,y+h,z],.035*s,bark);for(let j=0;j<5;j++){const a=j*2.399,r=.20*s,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r,yy=y+h+(j%2)*.16*s;line([x,y+h*.55,z],[xx,yy,zz],.014*s,bark);for(let k=0;k<10;k++){const b=k*2.399,rr=.15*s*Math.sqrt(rand());foliage(xx+Math.cos(b)*rr,yy+(rand()-.4)*.23*s,zz+Math.sin(b)*rr,.115*s,.09*s,.105*s);}}foliage(x,y+h+.18*s,z,.22*s,.17*s,.20*s);}
function blocked(x,z){return Math.abs(x-.10*Math.sin(z))<.83&&z>-.25||rocks.some(r=>Math.pow((x-r[0])/(r[2]+.18),2)+Math.pow((z-r[1])/(r[4]+.18),2)<1);}
for(let i=0;i<260;i++){const x=(rand()-.5)*11,z=-.2+rand()*5.5;if(x*x+z*z>30||blocked(x,z))continue;tree(x,z,.46+rand()*.58);}
for(const p of [[-3.7,1.0,1.7],[3.9,1.8,1.65],[-4.1,3.1,1.4],[3.6,.2,1.35]])tree(...p);
// Trees bridge city to forest without covering the landmarks.
for(let i=0;i<60;i++){const x=(rand()-.5)*10,z=-.18-rand()*.40;if(x*x+z*z<28&&!blocked(x,z))tree(x,z,.25+rand()*.30);}
for(let i=0;i<430;i++){const x=(rand()-.5)*10.5,z=rand()*5.5;if(x*x+z*z>29||blocked(x,z))continue;foliage(x,ground(x,z)+.06,z,.055+rand()*.06,.045,.065);}
// Ferns use paired leaflets, rather than spherical ground cover.
const fernMat=material('#4d682f'),leaflet=new T.SphereGeometry(1,6,4);
for(const [x,z] of [[-.82,3.8],[2.66,3.14],[-2.52,1.38],[.86,.64],[3.38,2.6],[-3.34,3.75]]){const y=ground(x,z);for(let k=0;k<7;k++){const a=k/7*6.28;for(let j=1;j<8;j++){const t=j/8,cx=x+Math.cos(a)*t*.4,cz=z+Math.sin(a)*t*.4,cy=y+Math.sin(t*Math.PI*.78)*.28;for(const s of [-1,1])instance(leaflet,fernMat,cx+Math.sin(a)*s*.05,cy,cz-Math.cos(a)*s*.05,.035*(1-t*.6),.012,.075*(1-t*.4),.3,a+s*.55);}}}
// Two tiny hikers standing on exact treads, looking toward the skyline.
const skin=material('#d8b18c'),hair=material('#514438'),pants=material('#414d50'),rust=material('#a85c3c'),sage=material('#719080'),bag=material('#c4ae7c');
function person(index,xx,coat,hat){const st=stairTops[index],g=new T.Group();g.position.set(st.x+xx,st.top,st.z);world.add(g);function part(geo,mat,x,y,z,sx=1,sy=1,sz=1){const m=mesh(geo,mat,x,y,z,g);m.scale.set(sx,sy,sz);return m;}for(const x of [-.044,.044]){part(new T.CapsuleGeometry(.024,.10,3,6),pants,x,.09,0);part(rounded(.068,.04,.105,.013),pants,x,.022,-.021);}part(new T.CapsuleGeometry(.074,.13,5,10),coat,0,.255,0);part(sphere,skin,0,.439,-.009,.083,.096,.08);part(sphere,hair,0,.482,.022,.086,.065,.078);part(rounded(.128,.151,.076,.022),bag,0,.27,.096);for(const x of [-.063,.063]){part(new T.CapsuleGeometry(.011,.14,3,6),bag,x,.27,.065);const arm=part(new T.CapsuleGeometry(.024,.12,3,6),coat,x*1.6,.255,-.009);arm.rotation.z=x>0?.23:-.23;part(sphere,skin,x*1.65,.176,-.018,.023,.028,.022);}if(hat){part(new T.CylinderGeometry(.113,.11,.022,16),ivory,0,.505,0);part(sphere,ivory,0,.52,0,.077,.047,.078);}}
person(8,-.20,rust,false);person(12,.20,sage,true);
// Flush trail interpretation sign at the right of the high landing.
line([1.06,ground(1.06,4.28),4.28],[1.06,2.35,4.28],.034,bark);const sign=mesh(rounded(.36,.035,.24,.01),bark,1.06,2.36,4.28);sign.rotation.x=.30;
// Leaf litter, moss cushions and delicate grass at the forest floor.
const grassBlade=new T.BufferGeometry();grassBlade.setAttribute('position',new T.Float32BufferAttribute([-.03,0,0,.03,0,0,.018,.20,.017,0,0,-.025,0,0,.025,-.016,.15,.015],3));grassBlade.computeVertexNormals();
const bladeMat=new T.MeshStandardMaterial({color:'#637540',roughness:1,side:T.DoubleSide});
for(let i=0;i<1700;i++){const x=(rand()-.5)*11,z=rand()*5.6;if(x*x+z*z>30||Math.abs(x)<.74&&z>-.25)continue;const s=.3+rand()*.5;instance(grassBlade,bladeMat,x,ground(x,z)+.01,z,s,s,s,0,rand()*6.28);}
const litterMat=material('#8b764f');for(let i=0;i<420;i++){const x=(rand()-.5)*10,z=rand()*5.4;if(x*x+z*z>28||Math.abs(x)<.75)continue;instance(leaflet,litterMat,x,ground(x,z)+.012,z,.018+rand()*.028,.006,.016,0,rand()*6.28);}
// Commit static instance batches. All sides of each object are real geometry.
let instances=0;for(const batch of batches.values()){const im=new T.InstancedMesh(batch.geo,batch.mat,batch.items.length);batch.items.forEach((it,i)=>{im.setMatrixAt(i,it.matrix);if(it.color)im.setColorAt(i,it.color);});im.castShadow=true;im.receiveShadow=true;world.add(im);instances+=batch.items.length;}
const shadow=mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.18}),0,-.62,0,scene);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
// Orbit around a physical scene. Render only while interacting or changing view.
let yaw=-9,pitch=31,distance=22,target=new T.Vector3(0,1.2,0),scheduled=false,renderTimes=[];
function render(){scheduled=false;const start=performance.now(),aspect=camera.aspect,fit=aspect<1?1.03/aspect:1;const az=yaw*Math.PI/180,el=pitch*Math.PI/180,d=distance*fit;camera.position.set(target.x+Math.sin(az)*Math.cos(el)*d,target.y+Math.sin(el)*d,target.z+Math.cos(az)*Math.cos(el)*d);camera.lookAt(target);renderer.render(scene,camera);renderer.shadowMap.autoUpdate=false;renderTimes.push(performance.now()-start);if(renderTimes.length>120)renderTimes.shift();host.dataset.yaw=yaw.toFixed(1);host.dataset.pitch=pitch.toFixed(1);host.dataset.distance=distance.toFixed(2);host.dataset.drawCalls=renderer.info.render.calls;host.dataset.triangles=renderer.info.render.triangles;host.dataset.buildings=buildingCount+2;host.dataset.instances=instances;host.dataset.meanRenderMs=(renderTimes.reduce((a,b)=>a+b,0)/renderTimes.length).toFixed(1);}
function requestRender(){if(!scheduled){scheduled=true;requestAnimationFrame(render);}}
function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();requestRender();}new ResizeObserver(resize).observe(host);
function view(y,p,d,t,button){yaw=y;pitch=p;distance=d;target.set(...t);document.body.dataset.view=button;document.querySelectorAll('nav button').forEach(el=>el.classList.toggle('active',el.id===button));requestRender();}
const hero=()=>view(-9,31,22,[0,1.2,0],'hero');document.querySelector('#hero').onclick=hero;document.querySelector('#reset').onclick=hero;
document.querySelector('#detail').onclick=()=>view(-12,24,10.5,[0,1.9,2.0],'detail');document.querySelector('#city').onclick=()=>view(-7,26,12,[.25,2.05,-2.75],'city');document.querySelector('#back').onclick=()=>view(171,32,22,[0,1.2,0],'back');
document.querySelector('#zoom-in').onclick=()=>{distance=clamp(distance*.84,6,34);requestRender();};document.querySelector('#zoom-out').onclick=()=>{distance=clamp(distance/ .84,6,34);requestRender();};
const pointers=new Map();let last=null,pinch=null;
host.addEventListener('pointerdown',e=>{e.preventDefault();host.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});last={x:e.clientX,y:e.clientY};pinch=null;});
host.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1&&last){yaw-=(e.clientX-last.x)*.32;pitch=clamp(pitch+(e.clientY-last.y)*.22,8,78);last={x:e.clientX,y:e.clientY};}else if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)distance=clamp(distance*pinch/d,6,34);pinch=d;last=null;}requestRender();});
function release(e){pointers.delete(e.pointerId);last=null;pinch=null;}host.addEventListener('pointerup',release);host.addEventListener('pointercancel',release);host.addEventListener('lostpointercapture',release);
host.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.001),6,34);requestRender();},{passive:false});
host.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')yaw-=8;if(e.key==='ArrowRight')yaw+=8;if(e.key==='ArrowUp')pitch=clamp(pitch+5,8,78);if(e.key==='ArrowDown')pitch=clamp(pitch-5,8,78);if(e.key==='+')distance=clamp(distance*.9,6,34);if(e.key==='-')distance=clamp(distance/.9,6,34);if(e.key==='Home')hero();requestRender();}});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#loading').style.display='block';document.querySelector('#loading').textContent='3D 顯示暫停，請重新整理。';});
document.querySelector('#about').onclick=()=>document.querySelector('#notes').showModal();document.querySelector('#close').onclick=()=>document.querySelector('#notes').close();document.querySelector('#loading').style.display='none';host.dataset.ready='true';resize();
})();
