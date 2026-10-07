import { mkdir, writeFile } from 'node:fs/promises';
const wrap = body => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + body + '</svg>';
const valid = [
  '<path d="M0 0L10 10Z"/>',
  '<path d="M0 0 10 10 20 0Z"/>',
  '<path d="M0 0H10V20h-5v-5Z"/>',
  '<path d="M0 0C10 0 10 20 20 20S30 20 40 0"/>',
  '<path d="M0 0Q10 20 20 0T40 0"/>',
  '<path d="M0 0A10 20 30 0 1 50 50"/>',
  '<path d="m1e1-1e1l.5.5"/>',
  '<rect x="0" y="0" width="50" height="30" rx="4" ry="4"/>',
  '<circle cx="50" cy="50" r="20"/>',
  '<ellipse cx="50" cy="50" rx="30" ry="10"/>',
  '<line x1="0" y1="0" x2="10" y2="10" stroke="black"/>',
  '<polygon points="0,0 10,0 10,10" fill="none"/>',
  '<polyline points="0 0 10 10 20 0"/>',
  '<g transform="translate(10 10) rotate(30) scale(0.5)"><rect width="10" height="10"/></g>',
  '<g transform="matrix(-1 0 0 1 50 0)"><circle r="5"/></g>',
  '<g transform="skewX(10) skewY(5)"><rect width="5" height="5"/></g>',
  '<g><g><g><circle r="5"/></g></g></g>',
  '<text x="5" y="20">α β Δ μ °C ± ×</text>',
  '<text x="5" y="20">H₂O Ca²⁺</text>',
  '<text><tspan x="0" y="20">First line</tspan><tspan x="0" y="40">Second line</tspan></text>',
  '<text font-style="italic" font-weight="bold">Gene</text>',
  '<text style="font-family:STIX Two Text;font-size:12;fill:#066f79">Protein</text>',
  '<title>Title &amp; meaning</title><desc>&lt;safe text&gt;</desc>',
  '<metadata>Creator &amp; license; data only.</metadata>',
  '<rect width="10" height="10" opacity="0.5" fill="rgba(10,20,30,0.5)"/>',
  '<path d="M0 0L10 10" stroke="#123" stroke-width="2" stroke-dasharray="2 3" stroke-linecap="round"/>',
  '<defs><linearGradient id="g"><stop offset="0" stop-color="white"/><stop offset="100%" stop-color="teal"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/>',
  '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/></radialGradient></defs><circle r="10" fill="url(#g)"/>',
  '<defs><clipPath id="c"><circle r="10"/></clipPath></defs><rect width="10" height="10" clip-path="url(#c)"/>',
  '<!-- inert comment --><rect width="10" height="10" fill="currentColor"/>',
];
const rejected = [
  '<script>steal()</script>', '<rect onload="steal()"/>', '<rect oNlOaD="steal()"/>',
  '<rect xmlns:e="urn:evil" e:onload="steal()"/>', '<foreignObject><div>active</div></foreignObject>',
  '<animate/>', '<set/>', '<use href="https://tracker.invalid"/>',
  '<use href="#a"/><rect id="a"/>', '<image href="data:image/svg+xml;base64,PHN2Zz4="/>',
  '<rect fill="url(https://tracker.invalid)"/>', '<rect style="fill:u\\72l(https://tracker.invalid)"/>',
  '<style>@import "https://tracker.invalid"</style>', '<g xml:base="https://tracker.invalid"/>',
  '<rect id="a"/><circle id="a"/>', '<rect clip-path="url(#missing)"/>',
  '<defs><clipPath id="c"><rect clip-path="url(#c)"/></clipPath></defs>',
  '<path d="M0 0L1e999 1"/>', '<filter><feGaussianBlur/></filter>',
  '<metadata><a href="javascript:steal()">active</a></metadata>',
];
const entries = [...valid.map((body, i) => ({ name: 'accepted-' + String(i + 1).padStart(2, '0'), body, accepted: true })),
  ...rejected.map((body, i) => ({ name: 'rejected-' + String(i + 1).padStart(2, '0'), body, accepted: false }))];
await mkdir('tests/fixtures/svg', { recursive: true });
for (const entry of entries) await writeFile('tests/fixtures/svg/' + entry.name + '.svg', wrap(entry.body));
await writeFile('tests/fixtures/svg/manifest.json', JSON.stringify(entries.map(({name,accepted}) => ({file:name + '.svg', accepted})), null, 2) + '\n');
console.log('Created 50 SVG structural fixtures; visual fidelity remains unverified.');
