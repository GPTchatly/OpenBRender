import {createHash} from 'node:crypto';

// Explicitly reviewed derivatives only. This is never used for private imports.
export function adaptCuratedDrawing(record, raw) {
  if (record.id !== 'bioicons-lab-apparatus-kehan-incubator-e4cc4f80') return {svg:raw,changes:[]};
  const expected='80138BD0F03E774A2E999E9A00927E8FFE53F4DD932186BCA5AE2B4514168089';
  if(createHash('sha256').update(raw).digest('hex').toUpperCase()!==expected)
    throw new Error('Incubator adaptation requires the reviewed source bytes.');
  const doc=new DOMParser().parseFromString(raw,'image/svg+xml');
  const highlights=['rect18093','rect13368','rect13368-1'];
  const filters=['filter18407','filter13894','filter13894-9'];
  for(let i=0;i<highlights.length;i++){
    const el=doc.getElementById(highlights[i]);
    if(el?.localName!=='rect' || !el.getAttribute('style')?.includes('filter:url(#'+filters[i]+')'))
      throw new Error('Unexpected incubator highlight geometry.');
    el.setAttribute('style',el.getAttribute('style').replace('filter:url(#'+filters[i]+');','').replace('mix-blend-mode:normal;',''));
    const filter=doc.getElementById(filters[i]);
    if(filter?.localName!=='filter')throw new Error('Missing incubator highlight filter.');
    filter.remove();
  }
  return {svg:new XMLSerializer().serializeToString(doc.documentElement),changes:[
    'Curated vector adaptation: three Gaussian-blurred gloss highlights replaced by plain vector highlights; equipment geometry retained',
  ]};
}
