penpot.ui.open("Atoryn Agent Bridge", "ui.html", { width: 400, height: 600 });

const findPage = (ref, refs = new Map()) => {
  if (!ref) return penpot.currentPage;
  const mapped = refs.get(ref);
  if (mapped && mapped.id && mapped.name !== undefined && mapped.getShapeById) return mapped;
  return penpot.currentFile.pages.find((page) => page.id === ref || page.name === ref);
};

const findShape = (ref, refs = new Map()) => {
  if (!ref) return null;
  const mapped = refs.get(ref);
  if (mapped && mapped.resize) return mapped;
  return penpot.currentPage?.getShapeById?.(ref) || null;
};

const asFill = (fill) => {
  if (typeof fill === "string") return { fillColor: fill, fillOpacity: 1 };
  if (!fill || typeof fill !== "object") return null;
  return {
    fillColor: fill.color || fill.fillColor || "#000000",
    fillOpacity: Number.isFinite(fill.opacity) ? fill.opacity : Number.isFinite(fill.fillOpacity) ? fill.fillOpacity : 1,
  };
};

const asStroke = (stroke) => {
  if (typeof stroke === "string") return { strokeColor: stroke, strokeOpacity: 1, strokeStyle: "solid", strokeWidth: 1, strokeAlignment: "inner" };
  if (!stroke || typeof stroke !== "object") return null;
  return {
    strokeColor: stroke.color || stroke.strokeColor || "#000000",
    strokeOpacity: Number.isFinite(stroke.opacity) ? stroke.opacity : Number.isFinite(stroke.strokeOpacity) ? stroke.strokeOpacity : 1,
    strokeStyle: stroke.style || stroke.strokeStyle || "solid",
    strokeWidth: Number.isFinite(stroke.width) ? stroke.width : Number.isFinite(stroke.strokeWidth) ? stroke.strokeWidth : 1,
    strokeAlignment: stroke.alignment || stroke.strokeAlignment || "inner",
  };
};

function applyVisual(shape, spec = {}) {
  if (!shape) return;
  if (spec.name !== undefined) shape.name = spec.name;
  if (Number.isFinite(spec.x)) shape.x = spec.x;
  if (Number.isFinite(spec.y)) shape.y = spec.y;
  if (Number.isFinite(spec.width) || Number.isFinite(spec.height)) {
    shape.resize(Number.isFinite(spec.width) ? spec.width : shape.width, Number.isFinite(spec.height) ? spec.height : shape.height);
  }
  if (Number.isFinite(spec.opacity)) shape.opacity = spec.opacity;
  if (typeof spec.visible === "boolean") shape.visible = spec.visible;
  if (typeof spec.locked === "boolean") shape.blocked = spec.locked;
  if (Number.isFinite(spec.radius)) shape.borderRadius = spec.radius;
  if (Number.isFinite(spec.rotation)) shape.rotate(spec.rotation);

  if (spec.fill !== undefined || spec.fills !== undefined) {
    const raw = spec.fills ?? (Array.isArray(spec.fill) ? spec.fill : [spec.fill]);
    shape.fills = raw.map(asFill).filter(Boolean);
  }
  if (spec.stroke !== undefined || spec.strokes !== undefined) {
    const raw = spec.strokes ?? (Array.isArray(spec.stroke) ? spec.stroke : [spec.stroke]);
    shape.strokes = raw.map(asStroke).filter(Boolean);
  }

  if (shape.type === "text") {
    if (spec.text !== undefined) shape.characters = String(spec.text || " ");
    if (spec.fontFamily !== undefined) shape.fontFamily = String(spec.fontFamily);
    if (spec.fontSize !== undefined) shape.fontSize = String(spec.fontSize);
    if (spec.fontWeight !== undefined) shape.fontWeight = String(spec.fontWeight);
    if (spec.lineHeight !== undefined) shape.lineHeight = String(spec.lineHeight);
    if (spec.letterSpacing !== undefined) shape.letterSpacing = String(spec.letterSpacing);
    if (spec.textAlign !== undefined) shape.align = spec.textAlign;
    if (spec.verticalAlign !== undefined) shape.verticalAlign = spec.verticalAlign;
    if (spec.textTransform !== undefined) shape.textTransform = spec.textTransform;
    if (spec.textDecoration !== undefined) shape.textDecoration = spec.textDecoration;
    if (spec.growType !== undefined) shape.growType = spec.growType;
  }
}

function applyLayout(shape, layoutSpec) {
  if (!shape || !layoutSpec || typeof shape.addFlexLayout !== "function") return null;
  let layout = shape.flex || null;
  if (!layout) layout = shape.addFlexLayout();
  const props = [
    "dir", "wrap", "alignItems", "alignContent", "justifyItems", "justifyContent",
    "rowGap", "columnGap", "verticalPadding", "horizontalPadding",
    "topPadding", "rightPadding", "bottomPadding", "leftPadding",
    "horizontalSizing", "verticalSizing",
  ];
  for (const prop of props) if (layoutSpec[prop] !== undefined) layout[prop] = layoutSpec[prop];
  return layout;
}

function tokenCatalog() {
  return penpot.library.local.tokens;
}

function findToken(ref) {
  for (const set of tokenCatalog().sets) {
    const token = set.tokens.find((item) => item.id === ref || item.name === ref);
    if (token) return token;
  }
  return null;
}

function findComponent(ref) {
  return penpot.library.local.components.find((item) => item.id === ref || item.name === ref || `${item.path}/${item.name}` === ref) || null;
}

async function applyAction(action, refs) {
  switch (action.op) {
    case "page.create": {
      const existing = action.reuse !== false ? findPage(action.name, refs) : null;
      const page = existing || penpot.createPage();
      page.name = action.name || "Untitled";
      if (action.ref) refs.set(action.ref, page);
      if (action.activate !== false) await penpot.openPage(page);
      return { op: action.op, id: page.id, ref: action.ref || null };
    }
    case "page.rename": {
      const page = findPage(action.pageId || action.id || action.ref || action.name, refs);
      if (!page) throw new Error("Page not found");
      page.name = action.patch?.name || action.newName || action.name;
      return { op: action.op, id: page.id };
    }
    case "page.switch": {
      const page = findPage(action.pageId || action.id || action.ref || action.name, refs);
      if (!page) throw new Error("Page not found");
      await penpot.openPage(page);
      return { op: action.op, id: page.id };
    }
    case "page.delete": {
      const page = findPage(action.pageId || action.id || action.ref || action.name, refs);
      if (!page) throw new Error("Page not found");
      const id = page.id; page.remove(); return { op: action.op, id };
    }
    case "node.create": {
      const spec = action.node || {};
      let shape;
      if (spec.type === "text") shape = penpot.createText(String(spec.text || " "));
      else if (spec.type === "ellipse") shape = penpot.createEllipse();
      else if (spec.type === "path") shape = penpot.createPath();
      else if (["board", "frame"].includes(spec.type)) shape = penpot.createBoard();
      else shape = penpot.createRectangle();
      if (!shape) throw new Error("Could not create shape");
      applyVisual(shape, spec);
      if (spec.layout) applyLayout(shape, spec.layout);
      const parent = findShape(action.parentRef || action.parentId, refs);
      if (parent?.appendChild) parent.appendChild(shape);
      if (action.ref) refs.set(action.ref, shape);
      return { op: action.op, id: shape.id, ref: action.ref || null };
    }
    case "node.update": {
      const shape = findShape(action.id || action.ref, refs);
      if (!shape) throw new Error(`Shape not found: ${action.id || action.ref}`);
      applyVisual(shape, action.patch || {});
      if (action.patch?.layout) applyLayout(shape, action.patch.layout);
      return { op: action.op, id: shape.id };
    }
    case "node.delete": {
      const shape = findShape(action.id || action.ref, refs); if (shape) shape.remove();
      return { op: action.op, id: shape?.id || action.id || action.ref };
    }
    case "node.reorder": {
      const shape = findShape(action.id || action.ref, refs); if (!shape) throw new Error("Shape not found");
      if (Number.isInteger(action.index)) shape.setParentIndex(action.index);
      else if (action.position === "front") shape.bringToFront();
      else if (action.position === "back") shape.sendToBack();
      else if (action.position === "forward") shape.bringForward();
      else if (action.position === "backward") shape.sendBackward();
      return { op: action.op, id: shape.id };
    }
    case "node.group": {
      const shapes = (action.ids || action.refs || []).map((id) => findShape(id, refs)).filter(Boolean);
      const group = penpot.group(shapes); if (action.name) group.name = action.name;
      if (action.ref) refs.set(action.ref, group);
      return { op: action.op, id: group.id, count: shapes.length };
    }
    case "node.ungroup": {
      const group = findShape(action.id || action.ref, refs); if (!group) throw new Error("Group not found");
      const shapes = penpot.ungroup(group); return { op: action.op, ids: shapes.map((shape) => shape.id) };
    }
    case "component.create": {
      const shapes = (action.ids || action.refs || []).map((id) => findShape(id, refs)).filter(Boolean);
      if (!shapes.length) throw new Error("component.create requires shapes");
      const component = penpot.library.local.createComponent(shapes);
      if (action.name) component.name = action.name;
      if (action.path !== undefined) component.path = action.path;
      if (action.ref) refs.set(action.ref, component);
      return { op: action.op, id: component.id, ref: action.ref || null };
    }
    case "component.instantiate": {
      const component = refs.get(action.componentRef) || findComponent(action.componentId || action.componentName || action.componentRef);
      if (!component?.instance) throw new Error("Component not found");
      const instance = component.instance();
      applyVisual(instance, action.patch || {});
      const parent = findShape(action.parentRef || action.parentId, refs);
      if (parent?.appendChild) parent.appendChild(instance);
      if (action.ref) refs.set(action.ref, instance);
      return { op: action.op, id: instance.id, componentId: component.id };
    }
    case "component.detach": {
      const shape = findShape(action.id || action.ref, refs); if (!shape) throw new Error("Component not found");
      shape.detach(); return { op: action.op, id: shape.id };
    }
    case "token.create": {
      const catalog = tokenCatalog();
      let set = catalog.sets.find((item) => item.id === action.setId || item.name === action.setName);
      if (!set) set = catalog.addSet({ name: action.setName || "Atoryn/Core", active: action.active !== false });
      if (action.active === true) set.active = true;
      let token = set.tokens.find((item) => item.name === action.name);
      if (!token) token = set.addToken({ type: action.type, name: action.name, value: action.value });
      else token.value = action.value;
      if (action.description !== undefined) token.description = action.description;
      return { op: action.op, id: token.id, setId: set.id, name: token.name };
    }
    case "token.update": {
      const token = findToken(action.id || action.name); if (!token) throw new Error("Token not found");
      if (action.patch?.name !== undefined) token.name = action.patch.name;
      if (action.patch?.value !== undefined) token.value = action.patch.value;
      if (action.patch?.description !== undefined) token.description = action.patch.description;
      return { op: action.op, id: token.id };
    }
    case "token.delete": {
      const token = findToken(action.id || action.name); if (token) token.remove();
      return { op: action.op, id: token?.id || null };
    }
    case "token.apply": {
      const token = findToken(action.tokenId || action.tokenName); if (!token) throw new Error("Token not found");
      const shapes = (action.ids || action.refs || []).map((id) => findShape(id, refs)).filter(Boolean);
      token.applyToShapes(shapes, action.properties);
      return { op: action.op, tokenId: token.id, count: shapes.length };
    }
    case "selection.set": {
      const shapes = (action.ids || action.refs || []).map((id) => findShape(id, refs)).filter(Boolean); penpot.selection = shapes;
      return { op: action.op, count: shapes.length };
    }
    case "viewport.fit": {
      const shapes = (action.ids || action.refs || []).map((id) => findShape(id, refs)).filter(Boolean);
      if (shapes.length) penpot.viewport.zoomIntoView(shapes); else penpot.viewport.zoomToFitAll();
      return { op: action.op, count: shapes.length };
    }
    case "revision.create": {
      const version = await penpot.currentFile.saveVersion(action.label || "Atoryn revision");
      return { op: action.op, id: version.id };
    }
    default:
      return { op: action.op, skipped: true, reason: "Not mapped by plugin v0.8" };
  }
}

async function applyBatch(command) {
  const results = [];
  const refs = new Map();
  for (const action of command.batch?.actions || []) results.push(await applyAction(action, refs));
  const validation = penpot.currentFile.validate();
  return {
    commandId: command.id,
    sequence: command.sequence,
    status: validation.length ? "failed" : "applied",
    fileId: penpot.currentFile.id,
    fileRevision: penpot.currentFile.revn,
    pageId: penpot.currentPage?.id,
    validationErrors: validation,
    results,
  };
}

penpot.ui.onMessage(async (message) => {
  if (message?.type === "bridge:hello") {
    penpot.ui.sendMessage({ type: "bridge:context", fileId: penpot.currentFile.id, fileName: penpot.currentFile.name, pageId: penpot.currentPage?.id, pageName: penpot.currentPage?.name, pluginVersion: "0.8" });
    return;
  }
  if (message?.type !== "bridge:apply" || !message.command) return;
  try {
    const result = await applyBatch(message.command);
    penpot.ui.sendMessage({ type: "bridge:result", result });
  } catch (error) {
    penpot.ui.sendMessage({ type: "bridge:result", result: { commandId: message.command.id, sequence: message.command.sequence, status: "failed", error: error.message } });
  }
});
