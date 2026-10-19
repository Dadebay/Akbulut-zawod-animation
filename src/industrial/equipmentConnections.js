import * as T from 'three';

const up=new T.Vector3(0,1,0);

// Ports are specified beside the geometry that owns them. Positions and outward
// normals are local to the machine, so placement, yaw and scale cannot separate
// a pipe from its flange. They are resolved before the static mesh batching pass.
export function machinePort(k,machine,name,position,direction,radius,medium,{nozzle=0,open=false}={}){
  const p=new T.Vector3(...position),n=new T.Vector3(...direction).normalize();
  if(nozzle)k.rod(p.clone().addScaledVector(n,-nozzle).toArray(),position,radius,k.m.steel,machine);
  const collar=k.ring(radius+.045,.035,position,k.m.steel,machine);
  collar.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);
  const port={machine,name,position:p,direction:n,radius,medium,open,connected:false};
  (machine.userData.ports??={})[name]=port;
  return port;
}

// Tangent, trimmed elbows stay inside each corner; unlike a Catmull-Rom spline
// they cannot overshoot an end flange or bow into neighbouring equipment.
export function roundedConnection(points,bend=.65){
  const p=points.map(v=>v.clone()).filter((v,i,all)=>!i||v.distanceToSquared(all[i-1])>1e-8);
  const path=new T.CurvePath();let last=p[0];
  const line=to=>{if(last.distanceToSquared(to)>1e-8)path.add(new T.LineCurve3(last,to));last=to;};
  for(let i=1;i<p.length-1;i++){
    const incoming=p[i].clone().sub(p[i-1]),outgoing=p[i+1].clone().sub(p[i]);
    const trim=Math.min(bend,incoming.length()*.35,outgoing.length()*.35);
    const a=p[i].clone().addScaledVector(incoming.normalize(),-trim),b=p[i].clone().addScaledVector(outgoing.normalize(),trim);
    line(a);path.add(new T.QuadraticBezierCurve3(a,p[i],b));last=b;
  }
  line(p.at(-1));return path;
}

export function createEquipmentConnections(k,root,equipment,rotors){
  const connections=[];
  function resolve(port){
    port.machine.updateWorldMatrix(true,false);root.updateWorldMatrix(true,false);
    const matrix=new T.Matrix4().copy(root.matrixWorld).invert().multiply(port.machine.matrixWorld);
    return {p:port.position.clone().applyMatrix4(matrix),n:port.direction.clone().transformDirection(matrix),r:port.radius*port.machine.scale.x};
  }
  function collar(point,direction,r){
    const q=k.ring(r+.045,.035,point.toArray(),k.m.steel,root);
    q.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);
  }
  function connect(from,to,{via=[],kind='duct',zone='BS',stages=[],material='powder',speed=1.2,shellMaterial=k.m.steel}={}){
    if(!from||!to)throw new Error('Missing equipment connection port');
    if(from.medium!==to.medium)throw new Error(`Incompatible equipment ports: ${from.name} → ${to.name}`);
    if(from.connected||to.connected)throw new Error(`Duplicate equipment connection: ${from.name} → ${to.name}`);
    const a=resolve(from),b=resolve(to),radius=Math.min(a.r,b.r),lead=Math.min(a.p.distanceTo(b.p)*.28,Math.max(.35,radius*1.5));
    const points=[a.p,a.p.clone().addScaledVector(a.n,lead),...via.map(p=>new T.Vector3(...p)),b.p.clone().addScaledVector(b.n,lead),b.p]
      .filter((p,i,all)=>!i||p.distanceToSquared(all[i-1])>1e-8);
    if(kind==='gravity'&&points.some((p,i)=>i&&p.y>points[i-1].y+.001))throw new Error(`Uphill gravity chute: ${from.name} → ${to.name}`);
    const path=roundedConnection(points,kind==='mechanical'?.18:Math.max(.5,radius*2));
    const shell=k.mesh(new T.TubeGeometry(path,Math.max(24,Math.ceil(path.getLength()*3)),radius,k.tablet?8:12,false),shellMaterial,[0,0,0],root);
    shell.userData.connection={from:from.name,to:to.name,kind,material};
    // Reducers seal differing nozzle diameters instead of a small pipe ending
    // in a larger open mouth. Both end planes coincide with their machine port.
    for(const e of [a,b])if(e.r>radius+.005){
      const reducer=k.cyl(e.r,lead,e.p.clone().addScaledVector(e.n,lead/2).toArray(),k.m.steel,root,radius,20);
      reducer.quaternion.setFromUnitVectors(up,e.n);
      collar(e.p.clone().addScaledVector(e.n,lead),e.n,radius);
    }
    for(let i=1;i<points.length;i++){
      const start=points[i-1],end=points[i],d=end.clone().sub(start),length=d.length();
      if(length<1.4)continue;
      const vertical=Math.hypot(d.x,d.z)<.05;
      if(kind==='mechanical'){
        if(vertical&&d.y>0){
          // A powered, enclosed bucket elevator performs the vertical lift.
          const mid=start.clone().lerp(end,.5),head=end.clone();
          k.box(.8,length,.65,mid.toArray(),equipment.enamel,root);
          for(let y=start.y+.6;y<end.y;y+=1)k.box(.86,.055,.71,[mid.x,y,mid.z],k.m.steel,root);
          equipment.gearmotor([head.x+.55,head.y-.65,head.z],root,.6,Math.PI/2);
        }else if(Math.abs(d.y)<.05){
          // The pipe and its elbow are stationary. Only the external motor
          // coupling rotates; the former end-mounted disc cut through the bend.
          // Centre the coupling along the straight run, away from both elbows.
          const motor=k.group(start.clone().lerp(end,.5).addScaledVector(d.clone().normalize(),1.08*.45).toArray(),root);
          motor.rotation.y=-Math.atan2(d.z,d.x);
          const housing=equipment.gearmotor([0,-.5,radius+.5],motor,.45);
          const drive=k.group([-1.08,.48,0],housing,true);
          drive.name='screw-drive-coupling';
          equipment.cylinder(.17,.18,[0,0,0],k.m.blue,drive,'x');
          k.box(.018,.045,.28,[-.095,0,0],k.m.steel,drive);
          rotors.push({object:drive,axis:'x',zone,speed:1.8});
        }
      }
      if(!vertical&&Math.abs(d.y)<.05&&start.y>2){
        for(let t=.5/Math.ceil(length/6);t<1;t+=1/Math.ceil(length/6)){
          const p=start.clone().lerp(end,t);collar(p,d.clone().normalize(),radius);
          // Paired posts carry overhead services outside the pipe envelope.
          const side=new T.Vector3(-d.z,0,d.x).normalize().multiplyScalar(radius+.25);
          const worldX=p.x+8,worldZ=p.z-25,inTower=worldX>-37.5&&worldX<-20.5&&worldZ>-9.5&&worldZ<19.5;
          const supportY=inTower?([24.5,18,12,6,0].find(y=>y<p.y-radius-.2)??0):0;
          for(const s of [-1,1]){const q=p.clone().addScaledVector(side,s);k.rod([q.x,supportY+.1,q.z],[q.x,q.y-radius-.05,q.z],.045,k.m.steel,root);}
          k.rod(p.clone().sub(side).add(new T.Vector3(0,-radius-.05,0)).toArray(),p.clone().add(side).add(new T.Vector3(0,-radius-.05,0)).toArray(),.045,k.m.steel,root);
        }
      }
    }
    from.connected=to.connected=true;
    const colors={raw:'#d5cbb1',powder:'#eee5cf',stucco:'#fff0cb',water:'#409ed4',slurry:'#d8c7a7',air:'#82b8c4',heat:'#e6a04d'};
    const indicator=k.material(colors[material]||colors.powder,0,.65,{depthTest:false,depthWrite:false});
    const dots=Array.from({length:Math.min(8,Math.max(2,Math.ceil(path.getLength()/8)))},()=>{
      const g=k.group([0,0,0],root,true),arrow=k.mesh(new T.ConeGeometry(.14,.42,6),indicator,[0,0,0],g);
      arrow.renderOrder=32;arrow.castShadow=false;g.visible=false;return g;
    });
    connections.push({path,dots,zone,stages,material,speed,length:path.getLength()});
    return path;
  }
  function capUnused(){
    root.traverse(g=>Object.values(g.userData.ports||{}).forEach(port=>{
      if(port.connected||port.open)return;
      const cap=k.cyl(port.radius,.035,port.position.toArray(),k.m.steel,g);
      cap.quaternion.setFromUnitVectors(up,port.direction);
    }));
  }
  return {connect,connections,capUnused};
}
