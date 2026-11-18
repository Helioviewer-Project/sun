const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
// Metadata only needs getElementsByTagName; keep tests independent of a browser.
global.DOMParser=class {parseFromString(xml){return {getElementsByTagName(tag){const matches=[...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`,'g'))];return matches.map(m=>({textContent:m[1]}));}}}};
const {HelioviewerJp2Metadata}=require('../.test-dist/HelioviewerJp2Metadata');
const {CreatePlaneWithTexture}=require('../.test-dist/model_builder');
const {Texture}=require('three');
const header=fs.readFileSync('tests/fixtures/spice.xml','utf8');
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<3e-7,`${actual} != ${expected}`);
test('real SPICE header: row-scaled PC, FITS reference pixel and center',()=>{
 const meta=new HelioviewerJp2Metadata(header,new Date('2021-08-21T07:05:31Z'));
 const w=meta.planeWcs(),r=meta.radiusInArcsec();
 close(w.xx*r,4*0.927240653919);close(w.xy*r,4*-0.102790911342);
 close(w.yx*r,1.098*1.3641747883);close(w.yy*r,1.098*0.927240653919);
 close(w.centerX*r,-0.038375011609444*3600 + 4*-0.102790911342*2.5);
 close(w.centerY*r,-0.026110239703361*3600 + 1.098*0.927240653919*2.5);
});
test('explicit CD takes precedence over PC and CDELT',()=>{
 const cd=header.replace('</fits>','<CD1_1>0.001</CD1_1><CD1_2>0.0002</CD1_2><CD2_1>-0.0003</CD2_1><CD2_2>0.0004</CD2_2></fits>');
 const meta=new HelioviewerJp2Metadata(cd,new Date('2021-08-21T07:05:31Z'));
 const w=meta.planeWcs(),r=meta.radiusInArcsec();
 close(w.xx*r,3.6);close(w.xy*r,0.72);close(w.yx*r,-1.08);close(w.yy*r,1.44);
});
test('SPICE is a bounded curved patch; coronagraph dimensions retain legacy behavior',async()=>{
 const meta=new HelioviewerJp2Metadata(header,new Date('2021-08-21T07:05:31Z'));
 const info={width:192,height:611,solar_radius:240};
 const patch=await CreatePlaneWithTexture(new Texture(),meta,info,602);
 const pos=patch.children[0].geometry.getAttribute('position');
 assert.ok(pos.count>4);
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i)-0.001;if(x*x+y*y<1)close(x*x+y*y+z*z,1);}
 const plane=await CreatePlaneWithTexture(new Texture(),meta,info,4);
 close(plane.children[0].geometry.parameters.width,192/240);
 close(plane.children[0].geometry.parameters.height,611/240);
});
test('reflected WCS keeps surface triangles front facing',async()=>{
 const meta={width:()=>2,height:()=>2,glOffsetX:()=>0,planeWcs:()=>({xx:-0.1,xy:0,yx:0,yy:0.1,centerX:0,centerY:0})};
 const patch=await CreatePlaneWithTexture(new Texture(),meta,{width:2,height:2,solar_radius:10},602);
 const normal=patch.children[0].geometry.getAttribute('normal');
 for(let i=0;i<normal.count;i++)assert.ok(normal.getZ(i)>0);
});
