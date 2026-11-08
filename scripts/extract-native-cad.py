# Requires NumPy. Source graph and shell layout follow the handoff package’s
# historical-tools/export_mesh.cpp; no decimated preview surfaces are used.
from pathlib import Path
import argparse,json,struct,hashlib
import numpy as np
parser=argparse.ArgumentParser(description='Extract selected full-resolution CAD occurrences from the handoff W3D exporter output.')
for name in ['mapping','events','shells','dwfx','out']:parser.add_argument('--'+name,type=Path,required=True)
args=parser.parse_args()
mapping=json.loads(args.mapping.read_text())
manifest=json.loads((Path(__file__).resolve().parents[1]/'src/industrial/cadInteriorCatalog.json').read_text())
objects=mapping['objects'];index={o['object_id']:i for i,o in enumerate(objects)}
targets={o['w3d_node']:i for i,o in enumerate(objects)}
selected={index[o['objectId']]:name for name,o in manifest['models'].items()}
stack=[];nodes=[];libs={};roots=[];shell=0
with args.events.open() as f:
 for line in f:
  r=json.loads(line);op=r[0]
  if op=='open':stack.append([r[1],r[3],None,-1,[],[]])
  elif op=='tag' and r[1] in targets:
   assert stack[-1][0]==r[2];stack[-1][3]=targets[r[1]]
  elif op=='matrix':stack[-1][2]=r[2:]
  elif op=='shell':stack[-1][4].append(shell);shell+=1
  elif op=='ref' and r[2]==60:
   assert r[3] in libs,r
   if libs[r[3]] is not None:stack[-1][5].append(libs[r[3]])
  elif op=='close':
   frame=stack.pop();assert frame[0]==r[1];name=frame[1]
   if not frame[4] and not frame[5]:
    if name.startswith('?'):libs[name]=None
    continue
   node=len(nodes);nodes.append([frame[2],frame[3],frame[4],frame[5]])
   if name.startswith('?'):libs[name]=node
   elif stack:stack[-1][5].append(node)
   else:roots.append(node)
  elif op=='done':assert r[2]==6
assert not stack
print('graph',len(nodes),'nodes',shell,'shells',flush=True)
mm=np.memmap(args.shells,dtype=np.uint8,mode='r');records=[];offset=0
while offset<len(mm):
 segment,n,nf,lod=struct.unpack_from('<4i',mm,offset);offset+=16
 assert lod==0
 records.append((offset,n,nf));offset+=n*12+nf*4
assert len(records)==shell and offset==len(mm)
parts={name:{'p':[],'f':[],'count':0} for name in selected.values()}
def walk(node,parent,owner):
 mat,tag,shells,children=nodes[node]
 world=np.array(mat,dtype=np.float64).reshape(4,4)@parent if mat is not None else parent
 if tag>=0:owner=tag
 coded=index.get(objects[owner].get('code_owner_object_id'),owner)
 if coded in selected:
  chunk=parts[selected[coded]]
  for shell in shells:
   offset,n,nf=records[shell]
   p=np.ndarray((n,3),dtype='<f4',buffer=mm,offset=offset)
   raw=np.ndarray((nf,),dtype='<i4',buffer=mm,offset=offset+n*12)
   assert nf%4==0 and np.all(raw[::4]==3)
   faces=raw.reshape(-1,4)[:,1:]
   assert not faces.size or 0<=faces.min() and faces.max()<n
   q=(p@world[:3,:3]+world[3,:3])*.01
   q=np.column_stack((q[:,1],q[:,0],-q[:,2])).astype(np.float32)
   chunk['p'].append(q);chunk['f'].append(faces+chunk['count']);chunk['count']+=n
 for child in children:walk(child,world,owner)
for root in roots:walk(root,np.eye(4),0)
output=args.out;output.mkdir(parents=True,exist_ok=True);meta={}
with (output/'geometry.bin').open('wb') as out:
 for name,chunk in parts.items():
  p=np.concatenate(chunk['p']);f=np.concatenate(chunk['f']).astype('<u4')
  normals=np.zeros_like(p)
  cross=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]])
  for column in range(3):np.add.at(normals,f[:,column],cross)
  normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-10)
  rec={}
  for key,a in [('p',p.astype('<f4')),('n',normals.astype('<f4')),('f',f)]:
   rec[key+'_offset']=out.tell();rec[key+'_bytes']=a.nbytes;out.write(a.tobytes())
  rec['size']=(p.max(0)-p.min(0)).tolist();meta[name]=rec
  print(name,len(p),'vertices',len(f),'triangles',flush=True)
(output/'geometry.json').write_text(json.dumps(meta))
(output/'provenance.json').write_text(json.dumps({'source':'FabrikaGenelMontaj.dwfx','sha256':hashlib.sha256(args.dwfx.read_bytes()).hexdigest()}))
