import * as T from 'three';

// Original lightweight reconstruction, not manufacturer CAD. Reference:
// https://railway.gov.tm/news/2774 — three-section CKD9A-1 in Turkmenistan.
// Silver/blue body, swept cab, twin front glazing and six axles per section.
export const TURKMEN_LOCO={sectionCentres:[-69.9,-49.8,-29.7],length:19.4,width:3.15};

export function buildTurkmenLocomotive(k,train,{z,bogie,coupling}){
  const {m,box,cyl,rod,ring,group,mesh,material,textPlate}=k;
  const silver=material('#e2e6e7',.38,.4),blue=material('#12579b',.3,.34),dark=material('#28343e',.6,.5),glass=material('#15313e',.45,.16),steel=material('#89969e',.8,.35),red=material('#a53539',.1,.5);
  function quad(points,mat,parent){
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
    const surface=mesh(geometry,mat,[0,0,0],parent);return surface;
  }
  function body(parent,cab){
    const sections=cab?[[-9.4,1.30,3.60],[-8.65,1.575,4.75],[-7.60,1.575,4.75],[7.9,1.575,4.75],[9.35,1.49,4.50]]:[[-9.35,1.49,4.50],[-7.9,1.575,4.75],[7.9,1.575,4.75],[9.35,1.49,4.50]];
    const vertices=[],indices=[];
    for(const [x,w,h] of sections)vertices.push(x,1.72,-w,x,1.72,w,x,h-.28,w,x,h,w-.26,x,h,-w+.26,x,h-.28,-w);
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<6;j++){const a=i*6+j,b=i*6+(j+1)%6,c=(i+1)*6+(j+1)%6,d=(i+1)*6+j;indices.push(a,c,b,a,d,c);}
    for(const [offset,reverse] of [[0,false],[(sections.length-1)*6,true]])for(let j=1;j<5;j++)indices.push(...(reverse?[offset,offset+j+1,offset+j]:[offset,offset+j,offset+j+1]));
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(geometry,silver,[0,0,0],parent);
  }
  function flag(parent,side){
    const g=group([-5.3,3.16,side*1.586],parent);if(side<0)g.rotation.y=Math.PI;
    box(.62,.38,.008,[0,0,0],material('#187345',0,.7),g);
    box(.08,.38,.011,[-.20,0,.006],red,g);
    const crescent=ring(.082,.012,[.04,.06,.015],silver,g,'z');crescent.scale.x=.65;
    for(const [x,y] of [[.18,.12],[.23,.05],[.18,-.02],[.13,.05],[.18,.05]])box(.017,.017,.008,[x,y,.015],silver,g);
  }
  for(const [i,cx] of TURKMEN_LOCO.sectionCentres.entries()){
    const g=group([cx,0,z],train,true),cab=i!==1;if(i===2)g.rotation.y=Math.PI;
    bogie(g,-5.7,true);bogie(g,5.7,true);
    box(19.4,.30,3.12,[0,1.48,0],dark,g,.04);
    box(19.25,.11,3.2,[0,1.69,0],silver,g,.025);
    box(5.9,.72,2.22,[0,.94,0],dark,g,.1);
    for(const side of [-1,1]){const tank=cyl(.20,3.3,[0,1.02,side*1.20],steel,g);tank.rotation.z=Math.PI/2;}
    body(g,cab);
    box(15.5,.10,2.55,[.15,4.79,0],blue,g,.05);
    for(const side of [-1,1]){
      const zz=side*1.59;
      box(18.0,.38,.025,[.15,2.01,zz],blue,g);
      box(18.0,.045,.03,[.15,2.25,zz],red,g);
      box(cab?15.0:17.8,.19,.025,[cab?1.55:.15,4.30,zz],blue,g);
      // Radiator banks, separate access doors, hinges and raised roof louvers.
      for(let x=-2.1;x<7.6;x+=1.6){
        box(1.32,1.27,.035,[x,3.48,zz],dark,g,.015);
        for(let y=2.90;y<4.09;y+=.10)box(1.25,.029,.04,[x,y,zz+side*.025],steel,g);
        box(1.28,.39,.025,[x,2.57,zz],silver,g,.015);
        box(.042,.13,.035,[x+.46,2.58,zz+side*.025],dark,g);
      }
      for(const x of [-7.1,-4.8]){
        box(.81,1.65,.03,[x,2.72,zz],silver,g,.025);
        for(const dx of [-.42,.42])box(.012,1.65,.025,[x+dx,2.72,zz+side*.024],dark,g);
        box(.04,.16,.045,[x+.27,2.7,zz+side*.04],steel,g);
        for(let n=0;n<4;n++)box(.64,.07,.28,[x,.52+n*.30,side*1.55],dark,g);
        for(const dx of [-.52,.52])rod([x+dx,1.15,side*1.67],[x+dx,3.21,side*1.67],.027,steel,g);
      }
      const label=textPlate('TÜRKMENISTAN',3.3,.36,[-4.8,3.79,zz+side*.025],g,'#12579b','#e2e6e7');if(side<0)label.rotation.y=Math.PI;
      const serial=textPlate(`CKD9A-1 · ${['A','B','C'][i]}`,1.8,.17,[3.4,1.49,side*1.58],g,'#e2e6e7','#28343e');if(side<0)serial.rotation.y=Math.PI;
      flag(g,side);
    }
    for(const x of [2.1,4.3,6.5]){
      cyl(.70,.07,[x,4.88,0],dark,g,undefined,k.tablet?16:40);ring(.72,.04,[x,4.92,0],steel,g);
      for(let n=-.5;n<=.51;n+=.17){const span=Math.sqrt(.65*.65-n*n);rod([x+n,4.94,-span],[x+n,4.94,span],.018,steel,g);}
    }
    box(.54,.22,.65,[-1.8,4.91,0],dark,g,.035);
    for(const x of [-9.7,9.7]){coupling(g,x,Math.sign(x));box(.13,.54,2.75,[x,1.0,0],dark,g,.03);}
    if(cab){
      // Sloped front glazing follows the nose instead of sitting on a box.
      for(const side of [-1,1]){
        const z1=side*.08,z2=side*1.13;
        const points=[[-9.28,3.83,z1],[-9.28,3.83,z2],[-8.76,4.63,z2],[-8.76,4.63,z1]];
        if(side<0)points.reverse();
        quad(points,glass,g);
        for(let n=0;n<4;n++)rod(points[n],points[(n+1)%4],.035,dark,g);
        rod([-9.31,3.85,side*.28],[-9.02,4.28,side*.86],.018,dark,g);
        box(1.20,.90,.025,[-7.53,3.80,side*1.591],glass,g,.04);
        box(.025,.88,.035,[-7.63,3.80,side*1.615],silver,g);
        rod([-8.1,3.49,side*1.51],[-8.38,3.53,side*1.88],.03,steel,g);
        box(.13,.31,.24,[-8.38,3.63,side*1.88],dark,g,.025);
      }
      box(.08,1.22,2.55,[-9.45,2.66,0],blue,g,.09);
      const noseLabel=textPlate('ÝÜPEK ÝOLY',1.66,.22,[-9.51,3.11,0],g,'#f4f6f7','#12579b');noseLabel.rotation.y=-Math.PI/2;
      for(const side of [-1,1]){
        const headlamp=cyl(.14,.08,[-9.53,2.33,side*.86],m.light,g);headlamp.rotation.z=Math.PI/2;
        const marker=cyl(.065,.08,[-9.53,2.68,side*.98],m.red,g);marker.rotation.z=Math.PI/2;
        for(const x of [-.15,.15]){const light=cyl(.11,.08,[-7.77,4.68,side*.16+x],m.light,g);light.rotation.z=Math.PI/2;}
      }
      for(const side of [-1,1])rod([-9.53,2.98,side*.61],[-9.53,3.29,side*.61],.022,steel,g);
      for(let y=2.28;y<2.95;y+=.1)box(.035,.028,1.1,[-9.51,y,0],dark,g);
      for(const side of [-1,1]){const horn=cyl(.085,.4,[-6.75,4.96,side*.32],steel,g,.04,12);horn.rotation.z=Math.PI/2;}
      cyl(.022,.47,[-6.1,5.06,.7],dark,g,undefined,8);
    }else{
      for(const x of [-9.38,9.38])box(.04,2.15,.74,[x,2.93,0],dark,g,.02);
    }
  }
}
