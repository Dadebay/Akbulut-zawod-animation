import {assetUrl} from './assets.js';

// The portable edition uses the supplied aerial photograph instead of fetching tiles.
export default function StandaloneMap(){
  return <div className="reference-view">
    <img src={assetUrl('reference/aerial.jpg')} alt="Ak Bulut zawodynyň we daş-töwereginiň howa suraty"/>
    <div className="map-feed unconfigured"><i/>Dostluk · 37.770806, 65.355307<small>Oflayn howa suraty · GPS birikdirilmedi</small></div>
  </div>;
}
