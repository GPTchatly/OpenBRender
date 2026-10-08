// Maintainer ingestion only. Private imports retain the stricter runtime grammar.
// Never render original XML. These conversions are followed by strictSvg validation.
const SVG_NS = 'http://www.w3.org/2000/svg', XLINK_NS = 'http://www.w3.org/1999/xlink', XML_NS = 'http://www.w3.org/XML/1998/namespace';
function unprefixedSvg(source) {
  const doc = source.implementation.createDocument(SVG_NS, 'svg', null);
  const copy = (from, to) => {
    for (const attr of from.attributes) {
      if (attr.name === 'xmlns' || attr.prefix === 'xmlns') continue;
      if (attr.namespaceURI === XLINK_NS) to.setAttributeNS(XLINK_NS, 'xlink:' + attr.localName, attr.value);
      else if (attr.namespaceURI === XML_NS) to.setAttributeNS(XML_NS, 'xml:' + attr.localName, attr.value);
      else if (attr.namespaceURI) throw new Error('Unsupported attribute namespace.');
      else to.setAttribute(attr.name, attr.value);
    }
    for (const node of from.childNodes) {
      // Non-SVG elements keep their namespace, so the usual removal or rejection still applies.
      if (node.nodeType === 1 && node.namespaceURI === SVG_NS) copy(node, to.appendChild(doc.createElementNS(SVG_NS, node.localName)));
      else to.appendChild(doc.importNode(node, true));
    }
  };
  if ([...source.querySelectorAll('*')].some(el => [...el.attributes].some(attr => attr.namespaceURI === XLINK_NS)))
    doc.documentElement.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', XLINK_NS);
  copy(source.documentElement, doc.documentElement);
  return doc;
}
export function normalizeLibrarySvg(raw) {
  if (new TextEncoder().encode(raw).length > 2_000_000 || /<!|<\?(?!xml\s)/i.test(raw.replace(/<!--[\s\S]*?-->/g,'')))
    throw new Error('Unsupported XML declaration or source size.');
  let doc = new DOMParser().parseFromString(raw,'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('Invalid source XML.');
  const changes = new Set();
  // Before any check reads attribute names: ElementTree exports write SVG as "ns0:svg" and xlink as "ns1:href".
  if ([...doc.querySelectorAll('*')].some(el => el.prefix && el.namespaceURI === SVG_NS)) {
    doc = unprefixedSvg(doc); changes.add('XML namespace prefixes normalized');
  }
  const elements = [...doc.querySelectorAll('*')];
  if (elements.length > 10000) throw new Error('Source element budget exceeded.');
  for (const element of elements) {
    if (['script','foreignObject','image','iframe','animate','animateTransform','set','filter'].includes(element.localName))
      throw new Error('Active, raster, animation or unsupported filter content.');
    for (const attr of element.attributes) {
      if (/^on/i.test(attr.name) || /(?:javascript:|https?:|data:|@import|expression\s*\()/i.test(attr.value) && !attr.name.startsWith('xmlns'))
        throw new Error('Active or external source content.');
      if (['href','xlink:href'].includes(attr.name) && !/^#[^\s()]+$/.test(attr.value)) throw new Error('External reference.');
    }
  }
  const rules = [];
  for (const sheet of doc.querySelectorAll('style')) {
    const css = sheet.textContent.replace(/\/\*[\s\S]*?\*\//g,'');
    let rest = css;
    while (rest.trim()) {
      const rule = /^\s*([^{}]+)\{([^{}]*)\}/.exec(rest);
      if (!rule) throw new Error('Unsupported library stylesheet.');
      const selectors = rule[1].split(',').map(x=>x.trim());
      if (selectors.some(x=>!/^\.[A-Za-z_][\w-]*$/.test(x))) throw new Error('Only simple class stylesheet selectors are supported.');
      rules.push({selectors:selectors.map(x=>x.slice(1)),declarations:rule[2]});
      rest=rest.slice(rule[0].length);
    }
    sheet.remove(); changes.add('Class styles expanded into presentation attributes');
  }
  const inertDefaults = new Set(['font-variant','font-stretch','font-variation-settings','font-variant-ligatures','font-variant-caps','font-variant-numeric','font-variant-east-asian','font-variant-position','font-variant-alternates','font-feature-settings']);
  function declarations(text, values) {
    for (const declaration of text.split(';')) {
      if (!declaration.trim()) continue;
      const split=declaration.indexOf(':');
      if(split<1)throw new Error('Invalid style declaration.');
      const key=declaration.slice(0,split).trim(),value=declaration.slice(split+1).trim();
      if (/[!{}@\\]/.test(value)) throw new Error('Unsupported CSS value.');
      if(key.startsWith('-inkscape-')){changes.add('Non-rendering editor metadata removed');continue;}
      if(inertDefaults.has(key)&&/^normal$/i.test(value)||key==='word-spacing'&&/^0(?:px)?$/.test(value)||key==='enable-background'&&/^new(?: [\d. ]+)?$/.test(value)){
        changes.add('Default authoring presentation metadata removed');continue;
      }
      if(key==='line-height'&&/^(?:\d+(?:\.\d+)?%?)$/.test(value)) {changes.add('SVG 1.1 authoring line-height metadata removed');continue;}
      values.set(key,value);
    }
  }
  for (const element of [...doc.querySelectorAll('*')]) {
    if(element.localName==='metadata'){element.remove();changes.add('Non-rendering editor metadata removed');continue;}
    const values=new Map();
    const classes=(element.getAttribute('class')||'').split(/\s+/);
    for(const rule of rules)if(rule.selectors.some(c=>classes.includes(c)))declarations(rule.declarations,values);
    declarations(element.getAttribute('style')||'',values);
    const compositing=[];
    for(const [key,value] of values){
      // Browsers apply compositing only as CSS, so it stays in the style attribute.
      if(!['mix-blend-mode','isolation'].includes(key))element.setAttribute(key,value);
      else if(['normal','auto'].includes(value))changes.add('Default authoring presentation metadata removed');
      else compositing.push(key+': '+value);
    }
    if(element.hasAttribute('style')){element.removeAttribute('style');changes.add('Inline styles expanded into presentation attributes');}
    if(compositing.length)element.setAttribute('style',compositing.join('; '));
    for(const attr of [...element.attributes]){
      if(attr.name==='class'||attr.name==='data-name'||attr.name==='aria-label'){element.removeAttributeNode(attr);changes.add('Non-rendering editor metadata removed');}
      else if(attr.name.endsWith('opacity') && /^\.\d+$/.test(attr.value)){attr.value='0'+attr.value;changes.add('Numeric presentation syntax normalized');}
      else if(attr.name==='font-family'){
        const unquoted=attr.value.replace(/^(['"])(.*)\1$/,'$2');
        if(unquoted!==attr.value){attr.value=unquoted;changes.add('Quoted font-family syntax normalized');}
      }
    }
  }
  const ids=new Map(),names=new Set();
  for(const el of doc.querySelectorAll('[id]')){
    if(names.has(el.id))throw new Error('Duplicate source identifiers.');names.add(el.id);
    if(!/^[A-Za-z_][\w.-]{0,127}$/.test(el.id)){
      let id='library_id_'+ids.size;while(names.has(id)||doc.getElementById(id))id+='_';
      ids.set(el.id,id);el.id=id;changes.add('Local identifiers renamed without changing references');
    }
  }
  for(const el of doc.querySelectorAll('*'))for(const attr of el.attributes){
    if(['href','xlink:href'].includes(attr.name)&&ids.has(attr.value.slice(1)))attr.value='#'+ids.get(attr.value.slice(1));
    attr.value=attr.value.replace(/url\(#([^()]+)\)/g,(match,id)=>ids.has(id)?'url(#'+ids.get(id)+')':match);
  }
  const defaults={
    'text-indent':['0','0px'], 'text-align':['start'], 'text-transform':['none'],
    'writing-mode':['lr-tb','horizontal-tb'], 'text-decoration-line':['none'], 'text-decoration-style':['solid'],
    'background-color':['#ffffff00','transparent'], 'isolation':['auto'], 'direction':['ltr'], 'block-progression':['tb'],
    'text-orientation':['mixed'], 'unicode-bidi':['normal'],
    'baseline-shift':['baseline','0','0px'], 'word-spacing':['0','0px','normal'],
  };
  for(const el of doc.querySelectorAll('*')){
    for(const [name,values] of Object.entries(defaults))if(values.includes(el.getAttribute(name))){el.removeAttribute(name);changes.add('Default authoring presentation metadata removed');}
    // Decoration color has no rendering effect when no decoration is requested.
    if(el.hasAttribute('text-decoration-color')&&!el.hasAttribute('text-decoration-line')&&(!el.hasAttribute('text-decoration')||el.getAttribute('text-decoration')==='none')){el.removeAttribute('text-decoration-color');changes.add('Default authoring presentation metadata removed');}
    for(const name of inertDefaults)if(/^normal$/i.test(el.getAttribute(name)??'')){el.removeAttribute(name);changes.add('Default authoring presentation metadata removed');}
    for(const name of ['x','y','width','height','rx','ry'])if((el===doc.documentElement&&['x','y'].includes(name))||(['path','g','defs'].includes(el.localName)&&el.hasAttribute(name))){if(el.hasAttribute(name)){el.removeAttribute(name);changes.add('Non-rendering authoring geometry attributes removed');}}
  }
  function resolveColor(el,inherited='black'){
    const color=el.getAttribute('color')||inherited;
    for(const name of ['fill','stroke','stop-color'])if(el.getAttribute(name)==='currentColor')el.setAttribute(name,color);
    if(el.hasAttribute('color')){el.removeAttribute('color');changes.add('Current color made explicit');}
    for(const child of el.children)resolveColor(child,color);
  }
  resolveColor(doc.documentElement);
  // Resolve gradient templates to explicit attributes/stops, with cycle checks.
  const gradients=new Map([...doc.querySelectorAll('linearGradient,radialGradient')].map(el=>[el.id,el]));
  const done=new Set(),active=new Set();
  function resolve(el,depth=0){
    if(done.has(el))return;
    if(active.has(el)||depth>16)throw new Error('Cyclic or deep gradient templates.');
    active.add(el);
    const href=el.getAttribute('href')||el.getAttribute('xlink:href');
    if(href){
      const target=gradients.get(href.slice(1));if(!target)throw new Error('Unsupported gradient template target.');
      resolve(target,depth+1);
      const shared=['gradientUnits','gradientTransform','spreadMethod'];
      for(const attr of target.attributes)if(!['id','href','xlink:href'].includes(attr.name)&&!el.hasAttribute(attr.name)&&(target.localName===el.localName||shared.includes(attr.name)))el.setAttribute(attr.name,attr.value);
      if(!el.children.length)for(const child of target.children){const clone=child.cloneNode(true);clone.removeAttribute('id');el.appendChild(clone);}
      el.removeAttribute('href');el.removeAttributeNS('http://www.w3.org/1999/xlink','href');changes.add('Local gradient templates expanded');
    }
    active.delete(el);done.add(el);
  }
  for(const el of gradients.values())resolve(el);
  function resolveStops(el){
    // Stop properties apply only to stops and are not inherited (SVG 1.1/2).
    if(el.localName!=='stop'){
      for(const name of ['stop-color','stop-opacity'])if(el.hasAttribute(name)){el.removeAttribute(name);changes.add('Gradient stop presentation made explicit');}
    }
    for(const child of el.children)resolveStops(child);
  }
  resolveStops(doc.documentElement);
  return {svg:new XMLSerializer().serializeToString(doc.documentElement),changes:[...changes]};
}
