import '../tests/register-source.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createProject } from '../app/src/domain/project/factory.ts';
import { createTemplateProject } from '../app/src/domain/templates/templates.ts';
import { createScientificElement } from '../app/src/domain/scientific/elements.ts';
import { createChartObject } from '../app/src/domain/charts/chart.ts';
import { buildProjectJson } from '../app/src/domain/export/exporters.ts';

const cell = createProject();
cell.objects = [createScientificElement('cell', 600, 400)];
const mixed = createTemplateProject('comparison-panels');
mixed.objects.push(createScientificElement('cell', 280, 430));
mixed.objects.push(createChartObject({ kind: 'bar', title: 'Synthetic values (fixture)', labels: ['Control','Treatment'], values: [12,24] }, 900, 430));
const examples = [
  ['sample-processing', createTemplateProject('experimental-workflow')],
  ['cell-signaling', createTemplateProject('pathway-mechanism')],
  ['cell-schematic', cell],
  ['graphical-abstract', createTemplateProject('graphical-abstract')],
  ['schematic-with-plot', mixed],
];
await mkdir('examples', { recursive: true });
for (const [name, project] of examples) {
  project.metadata.title = 'M0 fixture: ' + name;
  await writeFile('examples/' + name + '.obf.json', buildProjectJson(project));
}
console.log('Created five editable, model-validated references. No visual or scientific review implied.');
