# Canvas Elements Checklist

This checklist defines the work needed to add visual whiteboard elements to the existing widget and note canvas.

## Shared canvas foundation

- [ ] Define a common canvas element model with an ID, position, size, z-order, style, and timestamps.
- [ ] Decide which existing widget and note fields should remain specialized element data.
- [ ] Add persistence and migration support for new elements in local storage.
- [ ] Add selection state for one element and multiple elements.
- [ ] Support moving, resizing, duplicating, deleting, and bringing elements forward or sending them backward.
- [ ] Support keyboard deletion, escape to cancel, and undo and redo for element changes.
- [ ] Prevent drawing elements from interfering with canvas panning or widget and note editing.
- [ ] Make all element coordinates work with the existing zoom and pan behavior.
- [ ] Add a compact canvas toolbar or insert menu for creating each element type.
- [ ] Reuse the existing blue, green, amber, and rose color palette where possible.
- [ ] Define neutral and transparent style options for elements that should not use an accent color.
- [ ] Add empty-board and dense-board states so the controls remain discoverable.
- [ ] Add tests for persistence, migration, selection, layering, zoom, and deletion.

## Objects

### Widgets

- [ ] Keep existing widget generation, streaming, retry, resize, and focus behavior unchanged.
- [ ] Allow widgets to participate in selection and multi-selection with other canvas elements.
- [ ] Allow connectors to attach to widget edges.
- [ ] Keep widget content readable when frames, drawings, or connectors overlap nearby areas.

### Notes

- [ ] Keep existing note editing, resizing, colors, widget linking, and focus-overlay behavior unchanged.
- [ ] Allow notes to participate in selection and multi-selection with other canvas elements.
- [ ] Allow connectors to attach to notes.
- [ ] Preserve the existing distinction between a full note card and a lightweight text box.

### Checklists

- [ ] Create a checklist card with a title and an editable list of items.
- [ ] Allow users to add, edit, reorder, check, uncheck, and delete checklist items.
- [ ] Support an empty checklist state with an obvious first-item affordance.
- [ ] Support resizing while keeping item text readable.
- [ ] Choose whether completed items are crossed out, moved to the bottom, or both.
- [ ] Allow checklist cards to use the shared color and fill styles.
- [ ] Allow connectors and frames to reference checklist cards.
- [ ] Persist checklist item order and checked state.
- [ ] Add tests for editing, reordering, persistence, and keyboard behavior.

### Text boxes

- [ ] Create a lightweight text box without the full note-card chrome.
- [ ] Support headings, labels, captions, and short paragraphs.
- [ ] Support font size, weight, alignment, color, and text wrapping.
- [ ] Support resizing without unexpectedly changing the text content.
- [ ] Decide whether text boxes use plain text, Markdown, or a deliberately smaller text format.
- [ ] Allow text boxes to be placed above frames and shapes.
- [ ] Add keyboard behavior for entering, committing, and cancelling text editing.

## Shapes

### Rectangles

- [ ] Create a resizable rectangle with configurable stroke and fill.
- [ ] Support transparent fill so the rectangle can enclose existing widgets and notes.
- [ ] Support rounded and square corners through a shared shape style.
- [ ] Allow rectangles to be sent behind widgets, notes, and other objects.
- [ ] Support optional labels without requiring a separate text box.

### Rounded rectangles

- [ ] Add a rounded rectangle preset with a consistent corner-radius scale.
- [ ] Keep resizing and styling behavior consistent with regular rectangles.
- [ ] Use rounded rectangles for callouts, groups, and lightweight sections.

### Circles

- [ ] Create circles with proportional resizing by default.
- [ ] Support an ellipse modifier when proportional resizing is intentionally changed.
- [ ] Support transparent and filled variants.
- [ ] Verify that circles remain visually correct at different zoom levels.

### Frames

- [ ] Define frames as named containers that visually group widgets, notes, checklists, and text boxes.
- [ ] Render frames behind the objects they contain.
- [ ] Decide whether objects move with a frame or are only visually enclosed by it.
- [ ] Support a frame title, color, fill opacity, and optional collapse behavior.
- [ ] Support resizing a frame without unexpectedly resizing its contents.
- [ ] Add a clear way to select a frame when its contents overlap it.
- [ ] Decide how nested frames behave before implementation.

## Connectors

### Lines

- [ ] Create straight lines with configurable color, width, opacity, and stroke style.
- [ ] Support endpoint handles for adjusting line length and direction.
- [ ] Allow lines to remain independent of other objects.
- [ ] Ensure lines do not capture pointer events when the user is trying to pan the canvas.

### Arrows

- [ ] Create arrows with a configurable start point and end point.
- [ ] Support arrowheads at the end, start, or both ends.
- [ ] Allow arrows to snap to widget, note, checklist, text box, and frame edges.
- [ ] Keep attached arrows connected when an object moves or resizes.
- [ ] Support optional connector labels such as “causes,” “next,” or “blocked by.”
- [ ] Decide whether connector labels are editable inline or through a small inspector.
- [ ] Store source and target element IDs when an arrow is attached to objects.
- [ ] Remove or safely detach references when a connected object is deleted.

### Dividers

- [ ] Create horizontal and vertical divider presets.
- [ ] Support changing divider length, color, width, and dash style.
- [ ] Keep dividers independent from object connectors unless the user explicitly attaches them.
- [ ] Add snapping to nearby grid positions or alignment guides if needed.

## Drawing

### Pen strokes

- [ ] Add a freehand pen tool that records a path of canvas points.
- [ ] Support stroke color, width, opacity, and rounded line caps.
- [ ] Smooth or simplify paths so normal drawing does not create excessive stored points.
- [ ] Allow a completed stroke to be selected, moved, duplicated, and deleted.
- [ ] Keep pen drawing separate from canvas panning while the pen tool is active.
- [ ] Define how strokes behave when the user zooms or resizes the browser.

### Highlighter strokes

- [ ] Add a highlighter tool with wider strokes and lower opacity.
- [ ] Support highlighter colors that remain visible over widgets, notes, and text.
- [ ] Decide whether highlighter strokes sit above or below text and other objects.
- [ ] Allow highlighter strokes to be selected and deleted without requiring pixel-perfect selection.
- [ ] Avoid storing highlighter strokes as permanent raster images so they remain editable.

## Interaction and styling

- [ ] Add hover states that make selectable elements discoverable without making the canvas noisy.
- [ ] Add visible selection bounds and handles for selected elements.
- [ ] Add alignment guides or grid snapping only where they improve placement.
- [ ] Support shift-modified proportional resizing for shapes and images if needed.
- [ ] Define pointer, touch, and keyboard behavior for each tool.
- [ ] Make the toolbar usable in both light and dark themes.
- [ ] Add accessible labels and keyboard focus states for every tool.
- [ ] Make colors and strokes distinguishable without relying on color alone.

## Canvas agent and tools

One canvas agent interprets slash commands and coordinates native canvas tools and a widget-generation specialist.
The specialist wraps the existing data and OpenUI generation flow.
Native objects retain structured, editable state regardless of whether the user or AI creates them.

### Command context and routing

- [ ] Pass the active board, cursor position, selected element IDs, and relevant element content to the canvas agent.
- [ ] Route requests for checklists, text, shapes, frames, connectors, and drawing to native canvas tools.
- [ ] Delegate charts and rich dashboard widgets to the existing OpenUI generation flow through a tool.
- [ ] Resolve references such as “this widget” and “that checklist” from selection and command context.
- [ ] Ask for clarification when a requested target cannot be identified reliably.

### Native canvas tools

- [ ] Define typed, validated tool inputs for creating and updating each supported element type.
- [ ] Share the underlying canvas mutations between manual controls and AI tools.
- [ ] Create and populate checklist cards with real item IDs, text, order, and checked state.
- [ ] Support adding, editing, checking, unchecking, reordering, and removing checklist items by ID.
- [ ] Create and edit text boxes, shapes, frames, lines, arrows, and dividers with position and style controls.
- [ ] Support pen and highlighter paths through structured drawing tools.
- [ ] Support moving, resizing, restyling, and deleting existing elements.
- [ ] Return created element IDs so later tool calls can connect or group those elements.

### Widget specialist

- [ ] Expose the existing widget-generation flow as a tool callable by the canvas agent.
- [ ] Pass the widget prompt and relevant board context to the specialist.
- [ ] Preserve streamed widget progress and return the resulting widget ID and completion status.
- [ ] Report generation failures so the canvas agent can explain which part of a request remains incomplete.

### Combined commands

- [ ] Support “Create a launch checklist here” with editable, initially unchecked items.
- [ ] Support “Turn this widget's risks into a checklist” using the selected widget's content.
- [ ] Support “Connect this widget to the checklist with a blue arrow.”
- [ ] Support “Group these items in a frame called Q4 priorities.”
- [ ] Support requests that combine widget generation, native objects, and connections.
- [ ] Keep generated tasks unchecked unless the user explicitly requests a completion-state change.

### Execution and verification

- [ ] Make command changes undoable through the same history used for manual edits.
- [ ] Validate target IDs against the active board before applying changes.
- [ ] Prevent retries from duplicating already-created objects.
- [ ] Stop pending actions when a command is cancelled and report any changes already applied.
- [ ] Verify routing, object editing, dependent tool calls, partial failures, and persistence with focused tests.
- [ ] Verify the complete slash-command flow from a user's perspective, including manual editing of the result.

## Release checklist

- [ ] Verify that existing boards containing only widgets and notes load without migration errors.
- [ ] Verify that existing widget and note interactions still work after adding the new layer.
- [ ] Verify that every new element persists after reload.
- [ ] Verify that elements remain aligned after zooming, panning, and changing browser size.
- [ ] Verify that deleting an element does not leave broken connector references.
- [ ] Verify that dense boards remain usable with overlapping objects.
- [ ] Verify that the feature works in light and dark themes.
- [ ] Run type checks, lint checks, and focused tests before shipping.
