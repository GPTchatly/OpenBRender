# Editing SVG artwork inside a figure

Select an imported SVG or a placed library icon, open **Style → Edit artwork**, or double-click it on the figure canvas. Unlock locked objects first. If the artwork is inside a figure group, ungroup that group to select the SVG.

The artwork editor opens an independent draft. Click a visible part or choose it from the searchable Parts list. Groups can be selected in the list and moved together. Gradient stops appear in the same list; clipping definitions are retained without exposing their geometry as ordinary parts.

- Change fill, outline, outline width and opacity. Color values accept the same safe paints as SVG import, including existing local gradient references. Group color edits reach painted descendants while preserving parts explicitly set to no fill or no stroke.
- Drag parts, nudge with arrow keys (Shift moves 10 units), or edit offsets and dimensions. Dimensions use the part's own coordinates and transform, before any enclosing group transform. Rotate in 15-degree steps or flip horizontally and vertically.
- Duplicate, delete, hide, show, raise or lower a part. Ordering operates inside its current parent group. Add a rectangle, ellipse or text label using the toolbar.
- Edit plain text labels and their font size. Styled text spans retain their structure and remain available for styling and transforms; this version does not rewrite their text.
- Expand **Path geometry** to edit SVG path commands. Invalid paths and unsafe content are rejected before becoming the draft. This version has no point/Bezier-handle tool.

**Undo/Redo** within the artwork editor affects the draft. Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z and Ctrl/Cmd+Y operate on artwork when focus is outside a text field. Input fields retain their normal text-editing shortcuts. Draft history is bounded to 50 changes and approximately 16 MB in each direction.

**Apply to figure** creates an independent asset for the selected copy. Other placed copies and the library original are preserved. The edited artwork fits the selected object's existing overall width and height; its position, rotation, opacity, layer and object identity remain intact. This means changing the artwork's outer bounds refits its contents to that placed size. Existing whole-icon fill/stroke overrides are incorporated into the draft so subsequent part colors remain visible.

Source, creator, license and existing attribution notes are retained. Edited artwork gains a modification note and loses the original's reviewed status. The project embeds both original and edited SVG data. Apply is one figure-history change and triggers normal local autosave. Cancel or Escape asks before discarding unapplied changes. Drafts themselves are not autosaved: apply before closing or refreshing the browser.

The editor uses the existing strict SVG validation and DOMPurify pipeline before rendering and committing. Scripts, remote resources and unsupported elements remain rejected. It uses no additional server, dependency, network access or project-format change. SVG icons remain vector artwork; bitmap editing is outside this feature.

## Validation

With the production build served by `npm start`:

```sh
npm test
npm run typecheck:domain
npm run build
npm run test:artwork-browser
npm run test:browser
```

The focused browser check covers copy isolation, cancel/undo/redo, gradient and clipping retention, dragging, geometry validation, text edits, placement/size preservation, attribution, autosave, portable reopen, SVG export and PNG pixel equality after reopening. Reports and screenshots are written to `reports/artwork` and bind their results to the tested build identifier.
