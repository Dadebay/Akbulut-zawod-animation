// Resolve embedded files on demand; keep the resulting URLs for the page lifetime.
const urls=new Map();
export function assetUrl(path){
  const key=path.replace(/^\/+/, '');
  if(urls.has(key))return urls.get(key);
  const element=document.getElementById('akbulut-asset:'+key);
  if(!element)throw new Error('Embedded asset is missing: '+key);
  const encoded=element.textContent.trim(),parts=[];
  for(let i=0;i<encoded.length;i+=32768){
    const decoded=atob(encoded.slice(i,i+32768));
    const bytes=new Uint8Array(decoded.length);
    for(let j=0;j<decoded.length;j++)bytes[j]=decoded.charCodeAt(j);
    parts.push(bytes);
  }
  const url=URL.createObjectURL(new Blob(parts,{type:element.dataset.mime}));
  urls.set(key,url);
  element.remove();
  return url;
}
