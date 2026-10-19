import * as T from 'three';
import {OLD_PAVILION as LAYOUT} from './siteLayout.js';

// The railway-side dormitory has a green-roofed hall and a lower glazed
// solar annex opening onto its enclosed garden.
export function buildOldGardenPavilion(k,plants,solarPanel){
  const {box,cyl,rod,mesh,group,material,textPlate,m}=k;
  const {hall:H,annex:A,garden:G}=LAYOUT;
  const white=material('#e2e4db',.05,.79),base=material('#a8aea3',0,.93);
  const roof=material('#497c60',.27,.58),roofShade=material('#35624e',.26,.62),seam=material('#779982',.35,.54);
  const trim=material('#c7d0cb',.55,.42),glass=material('#263f4b',.4,.27),glassLight=material('#344e59',.38,.3);
  const dark=material('#364541',.45,.64),pavers=material('#b4b6a9',0,.95);

  box(G.east-G.west,.62,G.south-G.north,[(G.east+G.west)/2,-.40,(G.north+G.south)/2],base);

  const hall=group([H.x,0,H.z]);hall.name='old-pavilion-green-hall';
  hall.userData.buildingType='dormitory';hall.userData.label='ÝATAKHANA';
  box(H.width+.4,.15,H.depth+.4,[0,-.05,0],pavers,hall);
  box(H.width,H.height,H.depth,[0,H.height/2,0],white,hall);
  box(H.width+.08,.32,H.depth+.08,[0,.16,0],base,hall);
  const rise=1.1,slope=Math.atan2(rise,H.depth/2),slopeLength=Math.hypot(H.depth/2,rise)+.40;
  for(const side of [-1,1]){
    const sheet=box(H.width+.65,.12,slopeLength,[0,H.height+rise/2,side*H.depth/4],side>0?roof:roofShade,hall);
    sheet.rotation.x=side*slope;
    for(let x=-H.width/2;x<=H.width/2;x+=.65){
      const rib=box(.024,.035,slopeLength,[x,H.height+rise/2+.08,side*H.depth/4],seam,hall);
      rib.rotation.x=sheet.rotation.x;
    }
    box(H.width+.65,.13,.16,[0,H.height,side*(H.depth/2+.17)],trim,hall);
    box(H.width-1,.42,.035,[0,H.height-.52,side*(H.depth/2+.025)],glass,hall);
    for(let x=-H.width/2+.5;x<H.width/2;x+=.65)box(.045,.49,.07,[x,H.height-.52,side*(H.depth/2+.05)],white,hall);
    for(const x of [-H.width/2+.35,H.width/2-.35])cyl(.055,H.height,[x,H.height/2,side*(H.depth/2+.2)],trim,hall,undefined,12);
  }
  box(H.width+.7,.13,.22,[0,H.height+rise+.035,0],seam,hall);
  const gable=new T.Shape();gable.moveTo(-H.depth/2,0);gable.lineTo(H.depth/2,0);gable.lineTo(0,rise);gable.closePath();
  const gableGeo=new T.ExtrudeGeometry(gable,{depth:.10,bevelEnabled:false});gableGeo.rotateY(Math.PI/2);
  for(const side of [-1,1])mesh(gableGeo,white,[side*H.width/2,H.height,0],hall);
  // Dormitory entrance and sign face the courtyard.
  box(1.2,2.5,.06,[3,1.33,-H.depth/2-.04],roofShade,hall);
  box(.65,.60,.025,[3,1.95,-H.depth/2-.08],glass,hall);
  rod([3.43,1.15,-H.depth/2-.11],[3.43,1.43,-H.depth/2-.11],.02,trim,hall);
  box(1.8,.10,2.1,[3,.005,-H.depth/2-1.05],pavers,hall);
  const sign=textPlate('ÝATAKHANA',4.2,.52,[-.4,2.2,-H.depth/2-.075],hall,'#917627','#e2e4db');
  sign.rotation.y=Math.PI;

  // Its own flat roof and white fascia make the attached front volume distinct.
  const annex=group([A.x,0,A.z]);annex.rotation.y=-Math.PI/2;
  annex.name='old-pavilion-attached-solar-annex';
  annex.userData.buildingType='dormitory';annex.userData.label='ÝATAKHANA';
  const w=A.depth,d=A.width,h=A.height;
  box(w+.2,.15,d+.2,[0,-.05,0],pavers,annex);
  box(w,h,d,[0,h/2,0],white,annex);
  box(w+.12,.30,d+.12,[0,.15,0],base,annex);
  function glazing(width,height,pos,yaw=0){
    const g=group(pos,annex);g.rotation.y=yaw;
    const cols=Math.ceil(width/1.15),cw=width/cols;
    for(let col=0;col<cols;col++)for(let row=0;row<2;row++)
      box(cw-.045,height/2-.04,.04,[-width/2+cw*(col+.5),height/2*(row+.5),0],(col+row)%3===0?glassLight:glass,g);
    for(let col=0;col<=cols;col++)box(.05,height+.06,.09,[-width/2+cw*col,height/2,.03],trim,g);
    for(const y of [0,height/2,height])box(width+.08,.05,.09,[0,y,.03],trim,g);
  }
  glazing(w-.5,2.47,[0,.32,d/2+.03]);
  glazing(d-.55,2.47,[-w/2-.03,.32,0],-Math.PI/2);
  for(const x of [-w/2+.08,w/2-.08])box(.25,h+.15,.25,[x,(h+.15)/2,d/2+.06],white,annex);
  box(w+.38,.28,d+.30,[0,h+.04,0],white,annex);
  box(w-.25,.07,d-.18,[0,h+.22,0],base,annex);
  for(const z of [-d/2,d/2])box(w+.30,.20,.12,[0,h+.34,z],white,annex);
  for(const x of [-w/2,w/2])box(.12,.20,d+.3,[x,h+.34,0],white,annex);
  // Garden-side door and a shallow doorstep.
  box(1.40,2.45,.045,[0,1.37,d/2+.09],glass,annex);
  for(const x of [-.7,0,.7])box(.055,2.5,.09,[x,1.37,d/2+.125],trim,annex);
  for(const x of [-.12,.12])rod([x,1.05,d/2+.18],[x,1.45,d/2+.18],.018,trim,annex);
  box(2.1,.14,.65,[0,.07,d/2+.3],pavers,annex);

  // Two independently tilted rows on the annex's flat deck, with visible racks.
  const panelTilt=.40,panelY=3.85;
  for(const rowZ of [-.97,.97]){
    const row=group([0,panelY,rowZ],annex);row.rotation.x=panelTilt;
    for(const z of [-.55,.55])box(10.15,.065,.07,[0,-.075,z],trim,row);
    for(let col=0;col<9;col++){
      const x=(col-4)*1.12;
      solarPanel(1.05,1.58,[x,0,0],row);
      for(const zz of [-.55,.55]){
        const z=rowZ+zz*Math.cos(panelTilt),y=panelY-zz*Math.sin(panelTilt)-.08;
        rod([x,h+.27,z],[x,y,z],.025,trim,annex);
      }
      if(col%2===0)rod([x,h+.27,rowZ+.51],[x,panelY+.12,rowZ-.51],.023,trim,annex);
    }
  }
  box(.22,.38,.07,[w/2-.5,2.2,-d/2-.05],dark,annex);

  // Match the lawn colour and grain used by every planted bed on the site.
  const lawn=m.grass;
  const annexFront=A.x-A.width/2,gardenEnd=annexFront-.3;
  const lawnNorth=-77.1;
  box(gardenEnd-G.west,.14,G.south-lawnNorth,[(gardenEnd+G.west)/2,-.035,(lawnNorth+G.south)/2],lawn);
  box(G.east-gardenEnd,.14,G.south+61.5,[(G.east+gardenEnd)/2,-.035,(-61.5+G.south)/2],lawn);
  // Outline the exposed outside edges of the joined lawn, meeting the
  // existing fence at the west end and the solar annex at the east end.
  const lawnEdge=.22,annexNorth=A.z-A.depth/2;
  box(gardenEnd-G.west+2*lawnEdge,.14,lawnEdge,[(gardenEnd+G.west)/2,.06,lawnNorth-lawnEdge/2],white);
  box(lawnEdge,.14,G.north-lawnNorth,[G.west-lawnEdge/2,.06,(lawnNorth+G.north)/2],white);
  box(lawnEdge,.14,annexNorth-lawnNorth,[gardenEnd+lawnEdge/2,.06,(lawnNorth+annexNorth)/2],white);

  function fence(a,b,solid=false){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const g=group([(a[0]+b[0])/2,0,(a[1]+b[1])/2]);g.rotation.y=-Math.atan2(dz,dx);
    box(length,solid?1.72:.35,.22,[0,solid?.86:.175,0],white,g);
    const posts=Math.ceil(length/3);
    for(let i=0;i<=posts;i++){
      const x=-length/2+i*length/posts;
      box(.24,1.83,.28,[x,.915,0],white,g);
      box(.34,.11,.38,[x,1.86,0],white,g);
    }
    if(!solid){
      for(const y of [.52,1.56])box(length,.055,.055,[0,y,0],trim,g);
      for(let x=-length/2+.16;x<length/2;x+=.22)box(.022,1.12,.022,[x,1.03,0],trim,g);
    }
  }
  fence([G.west,G.north],[G.west,A.z-.85]);
  fence([G.west,A.z+.85],[G.west,G.south]);
  fence([G.west,G.south],[G.east,G.south],true);
  fence([G.east,G.south],[G.east,-61.5],true);
  // Fill the joined garden with varied, closely spaced conifers. The rows
  // overlap in plan view so the former open strip reads as one green canopy.
  for(let row=0;row<4;row++)for(let col=0;col<13;col++){
    const x=G.west+2.0+col*2.43+(row%2)*.95;
    const z=G.north+2.1+row*2.75+.18*Math.sin(col*1.7+row);
    if(x<gardenEnd-1.25)plants.plant(x,z,.52+.09*Math.sin(col*2.1+row*1.4),{plantedBed:true});
  }
  // A slim lattice light mast sits inside the garden corner, as photographed.
  const mast=group([G.west+1.9,0,G.south-1.7]);
  for(const x of [-.2,.2])for(const z of [-.2,.2])rod([x,0,z],[x*.55,5.3,z*.55],.025,trim,mast);
  for(let y=.45;y<5.2;y+=.65){
    for(const z of [-.19,.19]){rod([-.19,y,z],[.19,y+.56,z],.016,trim,mast);rod([-.19,y+.56,z],[.19,y,z],.016,trim,mast);}
    box(.42,.025,.42,[0,y,0],trim,mast);
  }
  for(const x of [-.33,.33]){box(.26,.15,.18,[x,5.35,0],white,mast);box(.23,.11,.025,[x,5.35,.10],m.light,mast);}
}
