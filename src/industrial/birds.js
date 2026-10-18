import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {smooth,angleDifference} from './motionPath.js';

export function buildBirds(k){
  const count=k.tablet?8:12,mat=k.material('#ffffff',0,.86,{vertexColors:true,side:T.DoubleSide});
  function colour(geometry,hex){
    const c=new T.Color(hex),values=[];
    for(let i=0;i<geometry.attributes.position.count;i++)values.push(c.r,c.g,c.b);
    geometry.setAttribute('color',new T.Float32BufferAttribute(values,3));return geometry;
  }
  const body=colour(new T.SphereGeometry(1,10,6),'#cbd0cb');body.scale(.34,.12,.13);
  const head=colour(new T.SphereGeometry(.12,8,6),'#dfe1d9');head.translate(.27,.08,0);
  const beak=colour(new T.ConeGeometry(.04,.19,6),'#a49463');beak.rotateZ(-Math.PI/2);beak.translate(.43,.07,0);
  const tail=colour(new T.ConeGeometry(.13,.32,4),'#777e7d');tail.rotateZ(Math.PI/2);tail.scale(1,.38,1);tail.translate(-.39,0,0);
  const bodyGeometry=mergeGeometries([body,head,beak,tail]);[body,head,beak,tail].forEach(g=>g.dispose());
  const wingGeometry=new T.BufferGeometry();
  wingGeometry.setAttribute('position',new T.Float32BufferAttribute([.12,0,0,-.18,0,0,-.42,0,.82,-.48,0,1.05,-.13,0,.91,.26,0,.30],3));
  wingGeometry.setIndex([0,1,2,0,2,4,2,3,4,0,4,5]);wingGeometry.computeVertexNormals();
  const colors=[];for(let i=0;i<6;i++){const c=new T.Color(i>=2&&i<=4?'#4d5659':'#d1d6d3');colors.push(c.r,c.g,c.b);}
  wingGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const bodies=k.instances(bodyGeometry,mat,count),wings=k.instances(wingGeometry,mat,count*2);
  for(const mesh of [bodies,wings]){mesh.castShadow=false;mesh.frustumCulled=false;}
  const route=new T.CatmullRomCurve3(Array.from({length:12},(_,i)=>{
    const a=i/12*Math.PI*2;return new T.Vector3(-35+190*Math.cos(a),45+3*Math.sin(a*2),-85+102*Math.sin(a));
  }),true,'catmullrom',.35);
  const length=route.getLength(),speed=9,bodyPose=new T.Object3D(),wingPose=new T.Object3D();
  const localFlap=new T.Quaternion(),axis=new T.Vector3(1,0,0);
  function update(time){
    for(let i=0;i<count;i++){
      const u=(time*speed/length+i/count)%1,point=route.getPointAt(u),tangent=route.getTangentAt(u);
      const before=route.getTangentAt((u-.001+1)%1),after=route.getTangentAt((u+.001)%1);
      const yaw=-Math.atan2(tangent.z,tangent.x),curvature=angleDifference(-Math.atan2(before.z,before.x),-Math.atan2(after.z,after.x))/(.002*length);
      bodyPose.position.copy(point);bodyPose.position.y+=(i%3)*1.1;
      bodyPose.rotation.set(Math.max(-.35,Math.min(.35,Math.atan(speed*speed*curvature/9.81))),yaw,Math.asin(tangent.y),'YXZ');
      bodyPose.scale.setScalar(.88+(i%4)*.06);bodyPose.updateMatrix();bodies.setMatrixAt(i,bodyPose.matrix);
      const cycle=(time+i*1.13)%8,flapping=smooth(cycle/.45)*smooth((3.7-cycle)/.65);
      const flap=.08+Math.sin(time*21+i*1.8)*.63*flapping;
      for(const [j,side] of [-1,1].entries()){
        wingPose.position.set(0,0,side*.07).applyQuaternion(bodyPose.quaternion).add(bodyPose.position);
        localFlap.setFromAxisAngle(axis,-side*flap+(side<0?Math.PI:0));wingPose.quaternion.copy(bodyPose.quaternion).multiply(localFlap);
        wingPose.scale.copy(bodyPose.scale);wingPose.updateMatrix();wings.setMatrixAt(i*2+j,wingPose.matrix);
      }
    }
    bodies.instanceMatrix.needsUpdate=true;wings.instanceMatrix.needsUpdate=true;
  }
  update(0);return {update};
}
