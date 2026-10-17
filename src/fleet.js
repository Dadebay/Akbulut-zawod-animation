export const FACTORY=[37.770806,65.355307];
// Unlabelled excavation-like feature observed northeast on Google Maps.
// It has not been confirmed as the factory's source quarry.
export const CANDIDATE_AREA=[37.775154,65.363215];
export function parsePositions(payload,now=Date.now()){
  const rows=Array.isArray(payload)?payload:payload?.positions;
  if(!Array.isArray(rows))throw new Error('Invalid positions');
  const seen=new Set();
  return rows.map(row=>{
    const id=row.deviceId??row.id,lat=row.latitude,lng=row.longitude,stamp=Date.parse(row.fixTime??row.timestamp);
    if((typeof id!=='string'&&typeof id!=='number')||String(id).length===0||seen.has(String(id))||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('Invalid position');
    seen.add(String(id));
    return {id:String(id),name:String(row.name||`GPS-${id}`),lat,lng,time:stamp,fresh:row.valid!==false&&Number.isFinite(stamp)&&now-stamp<=30000&&stamp-now<=5000};
  });
}
