/* .log — mapa 3D de Buenos Aires
   Calles: OpenStreetMap (© colaboradores de OpenStreetMap, ODbL).
   Manzanas: derivadas de las calles. Alturas: ilustrativas, no reales. */
(function(){
  const D = window.MAPA_DATA;
  const box = document.getElementById("mapa-canvas");
  const AZUL = 0x085cf0, ROSA = 0xff4684, LINEA = 0x9a9a9a;

  /* ---------- datos: calles ---------- */
  const [nombresTxt, viasTxt] = D.calles.split("\n");
  const NOMBRES = nombresTxt.split("|");
  const CALLES = viasTxt.split(";").map(v => {
    const a = v.split(",").map(Number);
    let x = a[2], y = a[3]; const pts = [[x*D.u, y*D.u]];
    for (let i = 4; i < a.length; i += 2){ x += a[i]; y += a[i+1]; pts.push([x*D.u, y*D.u]); }
    return {clase:a[0], nombre:NOMBRES[a[1]], pts};
  });

  /* ---------- lugares del catálogo (coordenadas en metros desde el Obelisco) ---------- */
  const LUG = [
    {id:"iglesia-san-nicolas-de-bari", nombre:"Iglesia San Nicolás de Bari", hoy:"Obelisco", x:0, y:0, modelo:true, rot:0, alto:70, cerca:250, terreno:0,
     hoyN:"Obelisco", hoyA:"1936", antesA:"1733–1931", imgHoy:"img/i06-obelisco.jpg", imgAntes:"img/san-nicolas-trazo.png",
     txtHoy:"Levantado en la Plaza de la República, donde estaba la iglesia. Proyecto de Alberto Prebisch.",
     txtAntes:"En su torre se izó por primera vez la bandera en Buenos Aires (1812). Fue demolida en 1931 para las obras de la Diagonal Norte."},
    {id:"pabellon-argentino", nombre:"Pabellón Argentino", hoy:"Plaza San Martín", x:520, y:1010, modelo:true, rot:-0.529, alto:40, cerca:260, terreno:0,
     hoyN:"Plaza San Martín", hoyA:"hoy", antesA:"1889–1933", imgHoy:"img/plaza-san-martin-hoy.png", imgAntes:"img/pabellon-trazo.png",
     txtHoy:"El terreno volvió a ser parte de la Plaza San Martín, en Retiro.",
     txtAntes:"Hierro y vidrio, de Albert Ballu, para la Exposición Universal de París de 1889. Trasladado a la Plaza San Martín, fue sede del Museo Nacional de Bellas Artes (1911–1933)."},
    {id:"palacio-miro", nombre:"Palacio Miró", hoy:"Plaza Lavalle", x:-385, y:278},
    {id:"palacio-unzue", nombre:"Palacio Unzué", hoy:"Biblioteca Nacional", x:-1140, y:2070, modelo:true, rot:-0.367, alto:40, cerca:300, terreno:110,
     hoyN:"Biblioteca Nacional", hoyA:"1992", antesA:"1887–1958", imgHoy:"img/biblioteca-hoy.png", imgAntes:"img/unzue-trazo.png",
     txtHoy:"Obra de Clorindo Testa, Francisco Bullrich y Alicia Cazzaniga, levantada en el mismo terreno del palacio.",
     txtAntes:"Residencia aristocrática en Recoleta y luego residencia presidencial: allí vivieron Perón y Evita. Fue demolido en 1958."},
    {id:"penitenciaria-nacional", nombre:"Penitenciaría Nacional", hoy:"Parque Las Heras", x:-2470, y:2190, modelo:true, rot:-0.379, alto:20, cerca:480, terreno:0,
     hoyN:"Parque Las Heras", hoyA:"hoy", antesA:"1877–1962", imgHoy:"img/las-heras-hoy.png", imgAntes:"img/penitenciaria-trazo.png",
     txtHoy:"Tras el cierre y la demolición de la cárcel, el terreno se transformó en un parque público.",
     txtAntes:"Proyecto de Ernesto Bunge: pabellones en abanico alrededor de un centro de vigilancia. Funcionó hasta 1962."}
  ];


  /* ---------- escena ---------- */
  const W = () => box.clientWidth, H = () => box.clientHeight;
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.setClearColor(0xffffff, 1);
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const ciudad = new THREE.Group(); scene.add(ciudad);   // calles + manzanas: se aplastan en la vista 2D
  const cam = new THREE.PerspectiveCamera(38, W()/H(), 5, 20000);
  const P = (x, y, z) => new THREE.Vector3(x, z || 0, -y);   // x este, y norte, z altura

  // piso
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshBasicMaterial({color:0xffffff}));
  piso.rotation.x = -Math.PI/2; piso.position.set(-1400, -0.5, -700); scene.add(piso);

  // calles: líneas finas (las avenidas un poco más marcadas)
  const capas = [[], [], []];
  CALLES.forEach(c => {
    const k = c.clase <= 1 ? 0 : (c.clase <= 3 ? 1 : 2);
    for (let i = 0; i < c.pts.length - 1; i++){
      capas[k].push(c.pts[i][0], 0.2, -c.pts[i][1], c.pts[i+1][0], 0.2, -c.pts[i+1][1]);
    }
  });
  [0x5a7cf0, 0xb4b4b4, 0xd9d9d9].forEach((col, k) => {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(capas[k], 3));
    ciudad.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:col, transparent:true, opacity:k ? 1 : .55})));
  });

  /* ---------- manzanas: volúmenes simples ---------- */
  function rnd(i){ const s = Math.sin(i*127.1 + 311.7)*43758.5453; return s - Math.floor(s); }
  function dentro(px, py, poly){ let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi)*(py - yi)/(yj - yi) + xi)) c = !c; }
    return c; }
  function alto(cx, cy, i){
    const dc = Math.hypot(cx - 250, cy - 150);                  // microcentro
    const base = dc < 900 ? 34 : dc < 1800 ? 24 : 15;
    return base + rnd(i)*base*0.9;
  }
  const MZ = D.manzanas.map((m, i) => {
    const poly = []; for (let k = 1; k < m.length; k += 2) poly.push([m[k], m[k+1]]);
    let cx = 0, cy = 0; poly.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= poly.length; cy /= poly.length;
    // canteros y plazoletas de la 9 de Julio: franjas angostas sobre el eje, van planas (dejan ver el Obelisco)
    const xs = poly.map(p => p[0]), canter = Math.abs(cx) < 70 && Math.max(...xs) - Math.min(...xs) < 65;
    const terreno = LUG.some(l => l.terreno && Math.hypot(cx - l.x, cy - l.y) < l.terreno);
    return {plaza:(m[0] === 1 && !(Math.abs(cx - 560) < 200 && Math.abs(cy - 170) < 200)) || canter || terreno, poly, cx, cy, i};
  });
  // la manzana de cada lugar se pinta de azul
  LUG.forEach(l => { if (l.modelo) return; const m = MZ.find(z => dentro(l.x, l.y, z.poly)); if (m) { m.lugar = l; l.mz = m; } });

  const geoms = {blanco:[], azul:[], plaza:[]};
  MZ.forEach(m => {
    const sh = new THREE.Shape(m.poly.map(p => new THREE.Vector2(p[0], p[1])));
    const h = m.lugar ? 6 : (m.plaza ? 1.2 : alto(m.cx, m.cy, m.i));
    const g = new THREE.ExtrudeGeometry(sh, {depth:h, bevelEnabled:false});
    g.rotateX(-Math.PI/2);          // la forma (x,y) queda en el plano x,-z; la altura en +y
    (m.lugar ? geoms.azul : m.plaza ? geoms.plaza : geoms.blanco).push(g);
  });
  function capa(lista, colorCara, colorLinea, op){
    if (!lista.length) return;
    const g = THREE.BufferGeometryUtils.mergeBufferGeometries(lista, false);
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({color:colorCara, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1, transparent:op < 1, opacity:op}));
    ciudad.add(mesh);
    ciudad.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), new THREE.LineBasicMaterial({color:colorLinea})));
    return mesh;
  }
  capa(geoms.blanco, 0xffffff, LINEA, 1);
  capa(geoms.plaza, 0xf0f0f0, 0xc8c8c8, 1);
  capa(geoms.azul, AZUL, AZUL, 0.9);

  // marcadores de los lugares: columna azul + etiqueta
  const etq = document.getElementById("mapa-etiquetas");
  LUG.forEach(l => {
    if (!l.modelo){
      const col = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 140, 6), new THREE.MeshBasicMaterial({color:AZUL}));
      col.position.copy(P(l.x, l.y, 70)); ciudad.add(col);
    }
    l.el = document.createElement("button");
    l.el.className = "mp-etq";
    l.el.innerHTML = `<b>${l.nombre}</b><span>hoy: ${l.hoy}</span>`;
    // clic/toque en el marcador: zoom suave y centrado en el lugar (el archivo se abre desde la ficha)
    l.el.addEventListener("click", e => { e.preventDefault(); window.__mapaEnfocar && window.__mapaEnfocar(l); });
    etq.appendChild(l.el);
    l.anc = P(l.x, l.y, l.modelo ? l.alto + 12 : 150); l.ancY = l.anc.y;
  });

  // marcador de búsqueda (rosa)
  const pin = new THREE.Group();
  pin.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 110, 6), new THREE.MeshBasicMaterial({color:ROSA})));
  pin.children[0].position.y = 55;
  const anillo = new THREE.Mesh(new THREE.RingGeometry(14, 22, 32), new THREE.MeshBasicMaterial({color:ROSA, side:THREE.DoubleSide}));
  anillo.rotation.x = -Math.PI/2; anillo.position.y = 0.6; pin.add(anillo);
  pin.visible = false; scene.add(pin);
  const pinEl = document.createElement("div"); pinEl.className = "mp-etq mp-pin"; pinEl.hidden = true; etq.appendChild(pinEl);


  /* =====================================================================
     HOY / ANTES — modelos 3D en cada lugar
     Antes: volumen blanco con trazo azul, armado a partir de los dibujos.
     Hoy: volumen "real" (piedra, hormigón, árboles). Medidas ilustrativas.
     ===================================================================== */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cc, 0.8));
  const sol = new THREE.DirectionalLight(0xffffff, 0.55); sol.position.set(-1.2, 2, 1.6); scene.add(sol);

  const MODELOS = [];
  function nuevoModelo(l, cual){
    const m = {lugar:l, cual, raiz:new THREE.Group(), solido:new THREE.Group(), fantasma:new THREE.Group(), k:0, obj:0};
    m.raiz.position.copy(P(l.x, l.y, 0)); m.raiz.rotation.y = l.rot || 0;
    m.raiz.add(m.solido, m.fantasma); scene.add(m.raiz);
    m.matF = new THREE.LineBasicMaterial({color:AZUL, transparent:true, opacity:0, depthWrite:false});
    MODELOS.push(m); return m;
  }
  // coordenadas del mapa (x este, y norte) → coordenadas locales del modelo
  function local(l, X, Y){ const c = Math.cos(l.rot || 0), s = Math.sin(l.rot || 0), dx = X - l.x, dy = Y - l.y;
    return [dx*c + dy*s, -dx*s + dy*c]; }   // [a lo largo, hacia el norte]
  // líneas con "mano": se repite cada trazo un poco corrido y pasado de largo
  let semilla = 1;
  function temblor(arr, a){
    const out = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i += 6){
      const dx = arr[i+3]-arr[i], dy = arr[i+4]-arr[i+1], dz = arr[i+5]-arr[i+2];
      const L = Math.hypot(dx, dy, dz) || 1, ext = Math.min(0.6, L*0.08)*rnd(semilla++);
      const ux = dx/L*ext, uy = dy/L*ext, uz = dz/L*ext;
      out[i]   = arr[i]   - ux + (rnd(semilla++)-.5)*a; out[i+1] = arr[i+1] - uy + (rnd(semilla++)-.5)*a; out[i+2] = arr[i+2] - uz + (rnd(semilla++)-.5)*a;
      out[i+3] = arr[i+3] + ux + (rnd(semilla++)-.5)*a; out[i+4] = arr[i+4] + uy + (rnd(semilla++)-.5)*a; out[i+5] = arr[i+5] + uz + (rnd(semilla++)-.5)*a;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(out, 3)); return g;
  }
  function segs(arr){ const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); return g; }
  function rayas(m, arr, mat, mano, sinFantasma){
    m.solido.add(new THREE.LineSegments(segs(arr), mat));
    if (mano) m.solido.add(new THREE.LineSegments(temblor(arr, mano), mat.userData.suelto));
    if (!sinFantasma) m.fantasma.add(new THREE.LineSegments(segs(arr), m.matF));
  }
  function polil(pts, cerrada){ const a = [];
    for (let i = 0; i < pts.length - (cerrada ? 0 : 1); i++){ const p = pts[i], q = pts[(i+1)%pts.length]; a.push(p[0],p[1],p[2], q[0],q[1],q[2]); }
    return a; }
  const bordes = (g, u) => Array.from(new THREE.EdgesGeometry(g, u || 20).attributes.position.array);
  const caja = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y + h/2, z);
  // techo mansarda / tronco de pirámide rectangular
  function tronco(w, h, d, ins, x, y, z){
    const g = new THREE.BoxGeometry(w, h, d), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0){ p.setX(i, p.getX(i)*(w/2 - ins)/(w/2)); p.setZ(i, p.getZ(i)*(d/2 - ins)/(d/2)); }
    g.computeVertexNormals(); return g.translate(x, y + h/2, z);
  }
  function prisma(w, h, d, x, y, z){   // techo a dos aguas, cumbrera a lo largo de x
    const sh = new THREE.Shape(); sh.moveTo(-d/2, 0); sh.lineTo(d/2, 0); sh.lineTo(0, h); sh.closePath();
    return new THREE.ExtrudeGeometry(sh, {depth:w, bevelEnabled:false}).rotateY(Math.PI/2).translate(x - w/2, y, z);
  }
  function arco(cx, y0, w, h, n){ const r = w/2, pts = [[cx - r, y0], [cx - r, y0 + h - r]];
    for (let i = 1; i < (n||8); i++){ const t = Math.PI - Math.PI*i/(n||8); pts.push([cx + r*Math.cos(t), y0 + h - r + r*Math.sin(t)]); }
    pts.push([cx + r, y0 + h - r], [cx + r, y0]); return pts; }
  function circ(cx, cy, r, n){ const p = []; for (let i = 0; i < n; i++){ const t = 2*Math.PI*i/n; p.push([cx + r*Math.cos(t), cy + r*Math.sin(t)]); } return p; }
  const rect = (x0, y0, x1, y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const enX = (x0, pts) => pts.map(p => [x0, p[1], p[0]]);   // dibujo sobre la cara x = cte (u = z)
  const enZ = (z0, pts) => pts.map(p => [p[0], p[1], z0]);   // dibujo sobre la cara z = cte (u = x)
  const plana = g => { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); return g; };

  // kit "trazo": caras blancas + línea azul a mano alzada
  function kitTrazo(m, mano){
    mano = mano || 0.28;
    const cara = new THREE.MeshBasicMaterial({color:0xffffff, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1});
    const tz = new THREE.LineBasicMaterial({color:AZUL}); tz.userData.suelto = new THREE.LineBasicMaterial({color:AZUL, transparent:true, opacity:.45});
    const P_ = (g, u) => { m.solido.add(new THREE.Mesh(g, cara)); rayas(m, bordes(g, u), tz, mano); };
    const R_ = (pts, cerrada) => rayas(m, polil(pts, cerrada !== false), tz, mano*0.6);
    const cruz = (x, y, z, s) => { P_(caja(.28*s, 2.6*s, .28*s, x, y, z)); P_(caja(1.5*s, .28*s, .28*s, x, y + 1.6*s, z)); };
    const cupula = (x, y, z, r, alto, seg) => P_(new THREE.SphereGeometry(r, seg || 12, 5, 0, Math.PI*2, 0, Math.PI/2).scale(1, alto || 1, 1).translate(x, y, z), 8);
    return {P_, R_, cruz, cupula};
  }
  // kit "sólido": material iluminado + borde fino
  function kitSolido(m, color, colorBorde){
    const mat = new THREE.MeshLambertMaterial({color, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1});
    const borde = new THREE.LineBasicMaterial({color:colorBorde});
    const S_ = (g, matX, u) => { g = plana(g); m.solido.add(new THREE.Mesh(g, matX || mat)); rayas(m, bordes(g, u || 25), borde); };
    return {S_, mat, borde};
  }
  // árboles: copas low-poly instanciadas dentro del polígono de la manzana
  function arboles(m, poly, n, evitar){
    const l = m.lugar;
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const copa = new THREE.IcosahedronGeometry(1, 0), tronc = new THREE.CylinderGeometry(.25, .35, 1, 5).translate(0, .5, 0);
    const mc = new THREE.InstancedMesh(copa, new THREE.MeshLambertMaterial({color:0xffffff, flatShading:true}), n);
    const mt = new THREE.InstancedMesh(tronc, new THREE.MeshLambertMaterial({color:0x7a6650}), n);
    const verdes = [0x5c9a52, 0x6fae5f, 0x4f8a48, 0x82b86c, 0x8f6f7f].map(c => new THREE.Color(c));
    const o = new THREE.Object3D(); let k = 0, s = 7;
    for (let tries = 0; k < n && tries < n*40; tries++){
      const X = x0 + rnd(s++)*(x1 - x0), Y = y0 + rnd(s++)*(y1 - y0);
      if (!dentro(X, Y, poly)) continue;
      const [a, b] = local(l, X, Y);
      if (evitar && evitar.some(e => Math.abs(a - e[0]) < e[2] && Math.abs(b - e[1]) < e[3])) continue;
      const r = 2.6 + rnd(s++)*2.6, h = 2.5 + rnd(s++)*2.5;
      o.position.set(a, 0, -b); o.rotation.set(0, 0, 0); o.scale.set(1, h, 1); o.updateMatrix(); mt.setMatrixAt(k, o.matrix);
      o.position.set(a, h + r*0.7, -b); o.rotation.set(rnd(s++), rnd(s++)*3, 0); o.scale.set(r, r*0.85, r); o.updateMatrix(); mc.setMatrixAt(k, o.matrix);
      mc.setColorAt(k, verdes[Math.floor(rnd(s++)*(verdes.length - (rnd(s++) < .9 ? 1 : 0)))]);
      k++;
    }
    mc.count = mt.count = k; mc.instanceMatrix.needsUpdate = true; if (mc.instanceColor) mc.instanceColor.needsUpdate = true;
    m.solido.add(mc, mt);
  }
  // césped con la forma de la manzana
  function cesped(m, poly, color){
    const l = m.lugar;
    const sh = new THREE.Shape(poly.map(p => { const [a, b] = local(l, p[0], p[1]); return new THREE.Vector2(a, b); }));
    const g = new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2).translate(0, .15, 0);
    m.solido.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({color:color || 0xcfe2bf})));
  }
  const mzDe = l => { const z = MZ.find(q => dentro(l.x, l.y, q.poly)); return z ? z.poly : null; };

  /* ================= SAN NICOLÁS DE BARI → OBELISCO ================= */
  function igleSanNicolas(m){
    const {P_, R_, cruz, cupula} = kitTrazo(m);
    P_(caja(42, 14, 16, 1, 0, 0));
    P_(caja(42.8, .7, 16.8, 1, 13.3, 0));
    [-15, -7, 1, 9, 16].forEach(x => [8.1, -8.7].forEach(z => {
      const sh = new THREE.Shape(); sh.moveTo(-1.7, 0); sh.absarc(0, 0, 1.7, Math.PI, 0, true); sh.closePath();
      P_(new THREE.ExtrudeGeometry(sh, {depth:.6, bevelEnabled:false, curveSegments:5}).translate(x, 14, z), 30);
    }));
    [-15, -7, 1, 9].forEach(x => [8.05, -8.05].forEach(z => {
      R_(enZ(z, rect(x - .9, 7.6, x + .9, 10.4))); R_(enZ(z, rect(x - .55, 7.95, x + .55, 10.05)));
    }));
    R_(enZ(8.05, rect(14.5, 0, 18.5, 6.4))); R_(enZ(8.05, rect(15, 0, 18, 5.9)));
    P_(caja(6, 18, 18, 25, 0, 0));
    const fr = new THREE.Shape(); fr.moveTo(-9, 0); fr.lineTo(9, 0); fr.lineTo(0, 6.5); fr.closePath();
    P_(new THREE.ExtrudeGeometry(fr, {depth:6, bevelEnabled:false}).rotateY(-Math.PI/2).translate(28, 18, 0));
    [-8.6, 8.6].forEach(z => { P_(caja(1.3, 19, 1.3, 28.2, 0, z)); P_(caja(.9, 2.2, .9, 28.2, 19, z)); });
    R_(enX(28.06, arco(0, 0, 5.4, 9, 10))); R_(enX(28.06, arco(0, 0, 4.2, 8.2, 10)));
    R_(enX(28.06, [[0, 0], [0, 5.8]]), false);
    R_(enX(28.06, circ(0, 12.6, 2.1, 20))); R_(enX(28.06, circ(0, 12.6, 1.2, 16)));
    for (let i = 0; i < 8; i++){ const t = Math.PI*i/4; R_(enX(28.06, [[1.2*Math.cos(t), 12.6 + 1.2*Math.sin(t)], [2.1*Math.cos(t), 12.6 + 2.1*Math.sin(t)]]), false); }
    R_(enX(28.06, [[-7, 18.8], [7, 18.8], [0, 23.6]]));
    P_(caja(5.6, 14, 5.6, 25, 18, 0));
    P_(caja(6.6, .8, 6.6, 25, 31.6, 0));
    P_(caja(5, 7, 5, 25, 32.4, 0));
    P_(caja(6, .7, 6, 25, 39.4, 0));
    [27.56, 22.44].forEach(x => [-1.1, 1.1].forEach(c => R_(enX(x, arco(c, 33.2, 1.2, 5, 6)))));
    [2.56, -2.56].forEach(z => [23.9, 26.1].forEach(c => R_(enZ(z, arco(c, 33.2, 1.2, 5, 6)))));
    R_(enX(28.86, rect(-1.2, 24.5, 1.2, 28.5))); R_(enX(28.86, circ(0, 22, .9, 12)));
    P_(new THREE.CylinderGeometry(2.1, 2.1, 2.4, 8).translate(25, 41.3, 0), 30);
    cupula(25, 42.5, 0, 2.3, 1.35, 8);
    P_(new THREE.CylinderGeometry(.45, .45, 1.4, 6).translate(25, 46.3, 0), 40);
    cruz(25, 47, 0, 1);
    P_(caja(8, 12, 13, -24, 0, 0));
    P_(new THREE.CylinderGeometry(4.8, 4.8, 3, 12).translate(-23, 13.5, 0), 30);
    cupula(-23, 15, 0, 5, 1, 12);
    P_(new THREE.CylinderGeometry(.6, .6, 1.6, 6).translate(-23, 20.6, 0), 40);
    cruz(-23, 21.4, 0, 1.1);
    P_(caja(7, 9, 7, -27.5, 0, 6.5));
    cupula(-27.5, 9, 6.5, 2.4, 1, 8);
    cruz(-27.5, 11.2, 6.5, .75);
    R_(enZ(10.06, arco(-27.5, 0, 2.6, 5, 8))); R_(enZ(10.06, circ(-27.5, 7, .8, 12)));
  }
  function obelisco(m){
    const piedra = new THREE.MeshLambertMaterial({color:0xf1ece2});
    const borde = new THREE.LineBasicMaterial({color:0xb8ad9c});
    const junta = new THREE.LineBasicMaterial({color:0xd3cabb});
    const B = 6.8/2, T = 3.5/2, H = 63.5, Hp = 4.2;
    m.solido.add(new THREE.Mesh(new THREE.BoxGeometry(9, .35, 9).translate(0, .175, 0), new THREE.MeshLambertMaterial({color:0xdedad2})));
    const fuste = plana(new THREE.CylinderGeometry(T*Math.SQRT2, B*Math.SQRT2, H, 4, 1).rotateY(Math.PI/4).translate(0, H/2 + .35, 0));
    const punta = plana(new THREE.ConeGeometry(T*Math.SQRT2, Hp, 4).rotateY(Math.PI/4).translate(0, H + .35 + Hp/2, 0));
    [fuste, punta].forEach(g => { m.solido.add(new THREE.Mesh(g, piedra)); rayas(m, bordes(g), borde); });
    const j = [];
    for (let y = 4.2; y < H; y += 4.2){ const s = (B + (T - B)*y/H) + .02, yy = y + .35;
      j.push(...polil([[-s,yy,-s],[s,yy,-s],[s,yy,s],[-s,yy,s]], true)); }
    m.solido.add(new THREE.LineSegments(segs(j), junta));
    const vent = new THREE.Mesh(new THREE.PlaneGeometry(.7, .9), new THREE.MeshBasicMaterial({color:0x3a3530}));
    vent.position.set(0, H + 1.4, T*0.62 + .05); m.solido.add(vent);
    m.solido.add(new THREE.LineSegments(segs(polil([[-1.6,1.2,B+.03],[1.6,1.2,B+.03],[1.6,3.4,B+.03],[-1.6,3.4,B+.03]], true)), borde));
  }

  /* ================= PABELLÓN ARGENTINO → PLAZA SAN MARTÍN ================= */
  function pabellon(m){
    const {P_, R_, cupula} = kitTrazo(m, .32);
    const angel = (x, y, z) => {             // pedestal + figura alada
      P_(caja(1.6, 1, 1.6, x, y, z)); P_(caja(.7, 2.4, .7, x, y + 1, z));
      R_([[x, y + 3.2, z], [x - 2.2, y + 4.6, z + .4], [x - 1.4, y + 2.4, z + .2]]);
      R_([[x, y + 3.2, z], [x + 2.2, y + 4.6, z - .4], [x + 1.4, y + 2.4, z - .2]]);
      R_([[x, y + 3.4, z], [x + .6, y + 4.9, z], [x + 1.1, y + 5.4, z]], false);
    };
    // nave principal y nave alta (claraboya)
    P_(caja(60, 14, 32, 2, 0, 0));
    P_(caja(61, .8, 33, 2, 13.4, 0));
    P_(caja(52, 7, 16, 4, 14, 0));
    P_(prisma(52, 3.5, 16, 4, 21, 0));
    // fachada principal (oeste, -x) con frontón en arco
    P_(caja(8, 20, 36, -32, 0, 0));
    const ar = new THREE.Shape(); ar.moveTo(-12, 0); ar.absarc(0, 0, 12, Math.PI, 0, true); ar.closePath();
    P_(new THREE.ExtrudeGeometry(ar, {depth:8, bevelEnabled:false, curveSegments:10}).rotateY(-Math.PI/2).translate(-28, 20, 0), 25);
    const fx = -36.06;
    R_(enX(fx, arco(0, 4, 13, 27, 12))); R_(enX(fx, arco(0, 4.6, 11.6, 25.6, 12)));
    for (let u = -4.5; u <= 4.5; u += 3) R_(enX(fx, [[u, 4.6], [u, 24]]), false);
    for (let v = 9; v < 25; v += 4) R_(enX(fx, [[-5.8, v], [5.8, v]]), false);
    [-12.5, 12.5].forEach(c => { R_(enX(fx, arco(c, 4, 6, 13, 8))); R_(enX(fx, arco(c, 4.6, 4.8, 12, 8))); R_(enX(fx, [[c, 4.6], [c, 15]]), false); });
    P_(caja(1.4, .7, 36.6, -36.6, 9, 0));                          // balcón corrido
    for (let u = -16; u <= 16; u += 4) R_(enX(-37.3, [[u, 9.7], [u, 11]]), false);
    R_(enX(fx, rect(-15, 0, 15, 4))); for (let u = -12; u <= 12; u += 6) R_(enX(fx, rect(u - 2, 0.6, u + 2, 3.4)));
    // pilonos con ángeles en las esquinas
    [[-36, 18.5], [-36, -18.5]].forEach(([x, z]) => { P_(caja(4, 26, 4, x, 0, z)); P_(caja(4.8, 1, 4.8, x, 26, z)); angel(x, 27, z); });
    [[32, 16.5], [32, -16.5]].forEach(([x, z]) => { P_(caja(3.4, 20, 3.4, x, 0, z)); P_(caja(4, .9, 4, x, 20, z)); });
    [[-28, 18.4], [-28, -18.4]].forEach(([x, z]) => { P_(caja(2.4, 30, 2.4, x, 0, z)); P_(caja(3.2, 1.4, 3.2, x, 30, z)); cupula(x, 31.4, z, 1.6, 1.6, 8); });
    // galería lateral (sur, +z): arcos altos y ventanas
    for (let x = -24; x <= 26; x += 7){ R_(enZ(16.06, arco(x, 2.5, 4.4, 9.5, 8))); R_(enZ(16.06, arco(x, 3, 3.4, 8.5, 8))); R_(enZ(16.06, rect(x - 1.6, 10.6, x + 1.6, 12.6))); }
    for (let x = -27.5; x <= 30; x += 14) P_(caja(1.2, 14.6, 1, x, 0, 16.4));
    for (let x = -24; x <= 26; x += 7){ R_(enZ(-16.06, arco(x, 2.5, 4.4, 9.5, 8))); }
    // cúpulas
    P_(new THREE.CylinderGeometry(8.5, 8.5, 4, 12).translate(6, 23.5, 0), 25);
    cupula(6, 25.5, 0, 8.5, 1.35, 12);
    P_(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 8).translate(6, 38, 0), 30);
    R_([[6, 39.2, 0], [6, 45, 0]], false);
    P_(new THREE.CylinderGeometry(5, 5, 3, 10).translate(20, 22.5, 0), 25);
    cupula(20, 24, 0, 5, 1.3, 10);
    R_([[20, 30.5, 0], [20, 34, 0]], false);
    P_(caja(4, 4, 4, 30, 20.9, 8)); cupula(30, 24.9, 8, 2.4, 1.6, 8); R_([[30, 28.7, 8], [30, 32, 8]], false);
  }
  function plazaSanMartin(m){
    const l = m.lugar, poly = mzDe(l);
    const {S_} = kitSolido(m, 0xe7e2d8, 0xb8ad9c);
    if (poly) cesped(m, poly);
    // monumento ecuestre
    const bronce = new THREE.MeshLambertMaterial({color:0x5b5a4c});
    const mx = -20, mz = 8;
    S_(caja(18, 1.2, 18, mx, 0, mz)); S_(caja(12, 1.2, 12, mx, 1.2, mz)); S_(caja(5, 9, 7, mx, 2.4, mz));
    S_(caja(1.6, 1.8, 4.6, mx, 13.2, mz), bronce); S_(caja(1.2, 1.8, 1.2, mx, 11.4, mz - 1.6), bronce); S_(caja(1.2, 1.8, 1.2, mx, 11.4, mz + 1.6), bronce);
    S_(caja(.9, 2.2, .9, mx, 15, mz), bronce); S_(caja(.6, 1.8, .6, mx, 14.4, mz - 2.6), bronce);
    // senderos
    const sd = [], s = 1.1;
    [[-60, -40, 60, 40], [-60, 40, 60, -40], [-80, 8, 80, 8]].forEach(([a, b, c, d]) => sd.push(a, s, -b, c, s, -d));
    m.solido.add(new THREE.LineSegments(segs(sd), new THREE.LineBasicMaterial({color:0xd8cfbf})));
    if (poly) arboles(m, poly, 95, [[mx, -mz, 14, 14]]);
  }

  /* ================= PENITENCIARÍA NACIONAL → PARQUE LAS HERAS ================= */
  function penitenciaria(m){
    const {P_, R_} = kitTrazo(m, .5);
    const A = 112, B = 122;                                     // muro perimetral
    P_(caja(2 * A, 7, 2, 0, 0, B)); P_(caja(2 * A, 7, 2, 0, 0, -B));
    P_(caja(2, 7, 2 * B, A, 0, 0)); P_(caja(2, 7, 2 * B, -A, 0, 0));
    [[A, B], [A, -B], [-A, B], [-A, -B]].forEach(([x, z]) => P_(caja(5, 10, 5, x, 0, z)));
    // centro de vigilancia y pabellones en abanico
    const cx = 18, cz = -20;
    P_(new THREE.CylinderGeometry(9, 9, 15, 8).translate(cx, 7.5, cz), 30);
    P_(new THREE.ConeGeometry(9.5, 5, 8).translate(cx, 17.5, cz), 30);
    P_(new THREE.CylinderGeometry(2, 2, 3, 8).translate(cx, 21, cz), 30);
    for (let i = 0; i < 7; i++){
      const t = THREE.MathUtils.degToRad(-75 + i*32), L = 66;
      const g = (geo) => geo.translate(L/2 + 11, 0, 0).rotateY(t).translate(cx, 0, cz);
      P_(g(caja(L, 10, 9, 0, 0, 0)));
      P_(g(prisma(L, 3.2, 9, 0, 10, 0)));
      P_(g(caja(5, 13, 11, L/2 - 1, 0, 0)));
      const Y = new THREE.Vector3(0, 1, 0), C = new THREE.Vector3(cx, 0, cz);
      const tr = (u, v, w) => { const q = new THREE.Vector3(u + L/2 + 11, v, w).applyAxisAngle(Y, t).add(C); return [q.x, q.y, q.z]; };
      for (let x = -L/2 + 5; x < L/2 - 5; x += 6) [4.56, -4.56].forEach(w => R_(rect(x - 1, 5.5, x + 1, 7.8).map(([u, v]) => tr(u, v, w))));
    }
    // muro curvo de los patios
    const R = 100, a0 = -95, a1 = 135, n = 28;
    for (let i = 0; i < n; i++){
      const t0 = THREE.MathUtils.degToRad(a0 + (a1 - a0)*i/n), t1 = THREE.MathUtils.degToRad(a0 + (a1 - a0)*(i + 1)/n);
      const xa = cx + R*Math.cos(t0), za = cz - R*Math.sin(t0), xb = cx + R*Math.cos(t1), zb = cz - R*Math.sin(t1);
      const L = Math.hypot(xb - xa, zb - za);
      P_(caja(L + .4, 5, 1.4, 0, 0, 0).rotateY(-Math.atan2(zb - za, xb - xa)).translate((xa + xb)/2, 0, (za + zb)/2), 30);
    }
    // edificios de la entrada y administración
    P_(caja(44, 12, 14, -58, 0, 82)); P_(prisma(44, 4, 14, -58, 12, 82));
    P_(caja(16, 15, 16, -58, 0, 100)); P_(prisma(16, 4, 16, -58, 15, 100));
    P_(caja(12, 9, 10, -84, 0, 62)); P_(caja(10, 8, 12, -36, 0, 60)); P_(caja(14, 7, 9, -70, 0, 44)); P_(caja(9, 9, 9, -88, 0, 92));
    for (let x = -76; x <= -40; x += 6) R_(enZ(89.06, rect(x - 1.2, 4, x + 1.2, 8)));
    R_(enZ(108.06, arco(-58, 0, 5, 8, 8)));
    P_(caja(8, 8, 6, 60, 0, 104)); P_(caja(6, 6, 10, 92, 0, -100));
  }
  function parqueLasHeras(m){
    const l = m.lugar, poly = mzDe(l);
    if (poly) cesped(m, poly, 0xc8dfb5);
    const {S_} = kitSolido(m, 0x7b8c99, 0x60707c);
    S_(caja(36, .6, 62, 40, 0, -40));                                     // canchas
    const lc = [];
    [[22, -71, 58, -71], [22, -9, 58, -9], [22, -40, 58, -40], [40, -71, 40, -9]].forEach(([a, b, c, d]) => lc.push(a, .7, b, c, .7, d));
    m.solido.add(new THREE.LineSegments(segs(lc), new THREE.LineBasicMaterial({color:0xffffff})));
    const agua = new THREE.Mesh(new THREE.CircleGeometry(9, 20).rotateX(-Math.PI/2).translate(-70, .7, 50), new THREE.MeshLambertMaterial({color:0x7fb3d5}));
    m.solido.add(agua);
    S_(caja(14, .5, 14, -20, 0, 70), new THREE.MeshLambertMaterial({color:0xb9b6ad}));
    const sd = [];
    [[-110, 90, 110, -100], [-120, -20, 120, 10], [0, 120, 10, -130], [-90, -90, 60, 100]].forEach(([a, b, c, d]) => sd.push(a, .8, b, c, .8, d));
    m.solido.add(new THREE.LineSegments(segs(sd), new THREE.LineBasicMaterial({color:0xece6d6})));
    if (poly) arboles(m, poly, 190, [[40, 40, 22, 35], [-70, -50, 12, 12], [-20, -70, 10, 10]]);
  }

  /* ================= PALACIO UNZUÉ → BIBLIOTECA NACIONAL ================= */
  function unzue(m){
    const {P_, R_} = kitTrazo(m, .3);
    // cuerpo principal con mansarda
    P_(caja(50, 15, 26, 0, 0, 0));
    P_(caja(51, .8, 27, 0, 15, 0));
    P_(tronco(50, 7, 26, 3.2, 0, 15.8, 0));
    // pabellón central más alto
    P_(caja(18, 18, 30, 0, 0, 1));
    P_(caja(19, .8, 31, 0, 18, 1));
    P_(tronco(18, 9, 30, 2.6, 0, 18.8, 1));
    P_(caja(10, 2, 8, 0, 27.8, 1));
    R_(enZ(16.06, arco(0, 19, 3, 5, 8))); R_(enZ(16.06, circ(-5, 23, .9, 10))); R_(enZ(16.06, circ(5, 23, .9, 10)));
    // chimeneas
    [[-17, 4], [17, 4], [-17, -6], [17, -6]].forEach(([x, z]) => P_(caja(2.2, 6, 1.6, x, 20, z)));
    // ventanas: planta baja y planta alta con frontis
    for (let x = -21; x <= 21; x += 6){ if (Math.abs(x) < 8) continue;
      R_(enZ(13.06, rect(x - 1.3, 2, x + 1.3, 6.5))); R_(enZ(13.06, rect(x - 1.3, 9, x + 1.3, 13)));
      R_(enZ(13.06, [[x - 1.8, 13.5], [x + 1.8, 13.5], [x, 14.6]]));
      R_(enZ(-13.06, rect(x - 1.3, 9, x + 1.3, 13)));
    }
    [-4.5, 0, 4.5].forEach(x => { R_(enZ(16.06, arco(x, 9, 2.8, 5.4, 8))); R_(enZ(16.06, arco(x, 1.5, 2.8, 6, 8))); });
    R_(enZ(16.06, [[-6, 15], [6, 15], [0, 17]]));
    for (let y = 2; y < 15; y += 1.6) R_(enZ(16.07, [[8.6, y], [9, y + .5]]), false);
    // galería con terraza al frente
    P_(caja(54, 1.2, 12, 0, 8.2, 20));
    [-26, -16, -6, 6, 16, 26].forEach(x => P_(caja(1.8, 8.2, 1.8, x, 0, 25)));
    for (let x = -26; x <= 26; x += 2) R_([[x, 9.4, 26.06], [x, 10.6, 26.06]], false);
    R_([[-27, 10.6, 26.06], [27, 10.6, 26.06]], false);
    P_(caja(56, 1, 22, 0, 0, 22));
    [-28, -20, -12, -4, 4, 12, 20, 28].forEach(x => { P_(caja(.9, 2.6, .9, x, 1, 33)); P_(new THREE.SphereGeometry(.7, 6, 4).translate(x, 4.2, 33), 30); });
    // ala baja a la izquierda con entrada
    P_(caja(34, 9, 16, -42, 0, 4));
    P_(caja(35, .7, 17, -42, 9, 4));
    for (let x = -58; x <= -26; x += 2.4) R_([[x, 9.7, 12.56], [x, 10.9, 12.56]], false);
    R_([[-59, 10.9, 12.56], [-25, 10.9, 12.56]], false);
    P_(caja(8, 7.5, 3, -42, 0, 13.5)); P_(prisma(8, 2, 3, -42, 7.5, 13.5).rotateY(0));
    R_(enZ(15.06, arco(-42, 0, 4, 6, 8)));
    [-54, -48, -36, -30].forEach(x => { R_(enZ(12.06, rect(x - 1.3, 2, x + 1.3, 6.5))); R_(enZ(12.06, rect(x - 1, 2.4, x + 1, 6.1))); });
    P_(caja(3, 1.2, 4, -42, 0, 17));
  }
  function biblioteca(m){
    const horm = 0xbcb5a8;
    const {S_} = kitSolido(m, horm, 0x8c8578);
    const vid = new THREE.MeshLambertMaterial({color:0x3e5c94});
    const losa = new THREE.MeshLambertMaterial({color:0xd8d3c8});
    S_(caja(80, .6, 64, 0, 0, 6), losa);
    // cuatro pilares y núcleo
    [[-12, -12], [12, -12], [-12, 12], [12, 12]].forEach(([x, z]) => S_(caja(6, 26, 6, x, 0, z)));
    S_(caja(9, 26, 9, 0, 0, 0));
    S_(caja(24, 3, 20, 0, 9, 0)); S_(caja(22.5, 3.2, 18.5, 0, 12, 0), vid); S_(caja(24, 1.4, 20, 0, 15.2, 0));
    S_(caja(22, 2.6, 18, 0, 17.6, 0), vid); S_(caja(24, 1.2, 20, 0, 20.2, 0));
    // gran volumen superior en voladizo
    S_(caja(52, 3, 46, 0, 24, 0));
    S_(caja(54, 1.2, 48, 0, 27, 0));
    S_(caja(50.5, 3.4, 44.5, 0, 28.2, 0), vid);
    S_(caja(53, 2.2, 47, 0, 31.6, 0));
    S_(caja(50.5, 3.6, 44.5, 0, 33.8, 0), vid);
    S_(caja(52, 2.4, 46, 0, 37.4, 0));
    // balcones/aleros de la fachada
    [[0, 23.4, 24.6, 30, 2.4], [0, 23.4, -24.6, 30, 2.4]].forEach(([x, y, z, w, d]) => S_(caja(w, 1.4, d, x, y, z)));
    S_(caja(20, 1.6, 3, -8, 31.6, 24.8)); S_(caja(20, 1.6, 3, 8, 31.6, -24.8));
    // azotea
    S_(caja(10, 4, 8, -10, 39.8, -6)); S_(new THREE.CylinderGeometry(2.6, 2.6, 5, 12).translate(12, 42.3, 6));
    // montantes de las ventanas
    const mo = [];
    for (let x = -24; x <= 24; x += 3) [[28.2, 31.6], [33.8, 37.4]].forEach(([a, b]) => { mo.push(x, a, 22.3, x, b, 22.3, x, a, -22.3, x, b, -22.3); });
    for (let z = -21; z <= 21; z += 3) [[28.2, 31.6], [33.8, 37.4]].forEach(([a, b]) => { mo.push(25.3, a, z, 25.3, b, z, -25.3, a, z, -25.3, b, z); });
    m.solido.add(new THREE.LineSegments(segs(mo), new THREE.LineBasicMaterial({color:0x2a3a5c})));
  }

  // armado de cada lugar
  const ARMAR = {
    "iglesia-san-nicolas-de-bari": [igleSanNicolas, obelisco],
    "pabellon-argentino": [pabellon, plazaSanMartin],
    "penitenciaria-nacional": [penitenciaria, parqueLasHeras],
    "palacio-unzue": [unzue, biblioteca]
  };
  LUG.filter(l => l.modelo).forEach(l => {
    const [fa, fh] = ARMAR[l.id];
    l.antesM = nuevoModelo(l, "antes"); fa(l.antesM);
    l.hoyM = nuevoModelo(l, "hoy"); fh(l.hoyM);
    if (fh === plazaSanMartin || fh === parqueLasHeras){ l.hoyM.solido.position.y = l.hoyM.fantasma.position.y = 1.3; }
  });

  /* ---------- estado: hoy / antes ---------- */
  let epoca = "hoy";
  function rotular(){
    LUG.filter(l => l.modelo).forEach(l => {
      l.el.innerHTML = epoca === "hoy"
        ? `<b>${l.hoyN}</b><span>${l.hoyA} · antes: ${l.nombre}</span>`
        : `<b>${l.nombre}</b><span>${l.antesA} · hoy: ${l.hoyN}</span>`;
    });
  }
  const ficha = document.getElementById("mapa-ficha");
  let fichaDe = null;
  function llenarFicha(l){
    fichaDe = l; if (!ficha) return;
    if (!l){ ficha.hidden = true; return; }
    ficha.hidden = false;
    const [ih, ia] = ficha.querySelectorAll(".mf-img img"), [th, ta] = ficha.querySelectorAll(".mf-txt p");
    ih.src = l.imgHoy; ih.alt = l.hoyN + " hoy"; ih.classList.toggle("cubrir", /\.jpe?g$/.test(l.imgHoy));
    ia.src = l.imgAntes; ia.alt = "Dibujo a trazo: " + l.nombre;
    th.innerHTML = `<b>${l.hoyN}</b> · ${l.hoyA}<br>${l.txtHoy}`;
    ta.innerHTML = `<b>${l.nombre}</b> · ${l.antesA}<br>${l.txtAntes}`;
  }
  function setEpoca(e, sinAnim){
    epoca = e;
    MODELOS.forEach(m => { m.obj = m.cual === e ? 1 : 0; if (sinAnim) m.k = m.obj; });
    rotular();
    document.querySelectorAll("#mapa-epoca button").forEach(b => b.classList.toggle("on", b.dataset.e === e));
    if (ficha) ficha.dataset.e = e;
  }
  setEpoca("hoy", true);
  document.querySelectorAll("#mapa-epoca button").forEach(b => b.addEventListener("click", () => setEpoca(b.dataset.e)));
  window.addEventListener("keydown", e => {
    if (!document.body.classList.contains("r-mapa") || e.target.closest("input,textarea")) return;
    if (e.key === "a" || e.key === "A") setEpoca(epoca === "hoy" ? "antes" : "hoy");
    if (e.key === "+" || e.key === "=") zoom(0.6);
    if (e.key === "-") zoom(1.6);
  });
  if (ficha){
    ficha.querySelector(".mf-ver").addEventListener("click", () => { if (!fichaDe) return; const id = fichaDe.id; location.hash = "catalogo"; setTimeout(() => window.__selLugar && window.__selLugar(id), 50); });
    ficha.querySelector(".mf-ir").addEventListener("click", () => { if (fichaDe) volarA(fichaDe.x, fichaDe.y, fichaDe.cerca*0.6); });
  }
  // los modelos se levantan desde el piso; el que no está queda como trazo fantasma
  function animarModelos(dt){
    MODELOS.forEach(m => {
      const v = dt/900; m.k = m.obj > m.k ? Math.min(m.obj, m.k + v) : Math.max(m.obj, m.k - v*1.6);
      const e = m.k < .5 ? 4*m.k*m.k*m.k : 1 - Math.pow(-2*m.k + 2, 3)/2;
      m.solido.scale.y = Math.max(.001, e); m.solido.visible = m.k > .002;
      m.matF.opacity = 0.22*(1 - e);
      m.fantasma.visible = m.matF.opacity > .01;
    });
  }

  /* =====================================================================
     NAVEGACIÓN (tipo mapa digital): vuelos, zoom, brújula, 2D/3D, restablecer, escala
     ===================================================================== */
  const ctl = new THREE.MapControls(cam, renderer.domElement);
  ctl.enableDamping = true; ctl.dampingFactor = 0.08;
  ctl.screenSpacePanning = false;
  ctl.minDistance = 60; ctl.maxDistance = 9000;
  const MAX_TILT = Math.PI*0.47;
  ctl.maxPolarAngle = MAX_TILT;
  cam.position.copy(P(-500, -2400, 2300)); ctl.target.copy(P(-700, 900, 0)); ctl.update();

  const sph = new THREE.Spherical();
  function estado(){ sph.setFromVector3(cam.position.clone().sub(ctl.target)); return {t:ctl.target.clone(), r:sph.radius, phi:sph.phi, th:sph.theta}; }
  const INICIO = estado();
  let vuelo = null;
  function irA(b, dur, fin){
    const a = estado();
    let dth = b.th - a.th; dth = ((dth + Math.PI) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI;
    const salto = a.t.distanceTo(b.t);
    vuelo = {a, b:{t:b.t.clone(), r:b.r, phi:b.phi, th:a.th + dth}, s:performance.now(), d:dur || 1100, arco:salto > 400 ? Math.min(2500, salto*0.45) : 0, fin};
  }
  let plano = false, phi3D = 0.95;
  function volarA(x, y, dist, dur){
    dist = dist || 700;
    const l = LUG.find(q => q.x === x && q.y === y && q.modelo);
    const cerca = dist < 500;
    if (cerca) dist *= Math.max(1, Math.min(2.1, 1.05/(W()/H())));   // pantallas angostas: más lejos
    const a = estado();
    let phi = plano ? 0.0001 : (cerca ? 1.12 : Math.min(Math.max(a.phi, .5), 1.15));
    const th = cerca && !plano ? (l ? l.rot || 0 : 0) - 0.31 : a.th;    // de 3/4, como los dibujos
    irA({t:P(x, y, cerca && !plano && l ? l.alto*0.35 : 0), r:dist, phi, th}, dur);
  }
  function zoom(f){
    const a = estado();
    irA({t:a.t, r:Math.min(ctl.maxDistance, Math.max(ctl.minDistance, a.r*f)), phi:a.phi, th:a.th}, 380);
  }
  // 2D: cámara cenital y ciudad aplastada (se conservan lugar, zoom y giro)
  let aplan = 0, aplanObj = 0;
  const btnDim = document.getElementById("mc-dim");
  function setPlano(v){
    if (v === plano) return;
    plano = v; aplanObj = v ? 1 : 0;
    const a = estado();
    if (v){
      phi3D = Math.max(.35, a.phi);
      irA({t:a.t.clone().setY(0), r:a.r, phi:0.0001, th:a.th}, 900, () => { ctl.maxPolarAngle = 0.0001; });
    } else {
      ctl.maxPolarAngle = MAX_TILT;
      irA({t:a.t, r:a.r, phi:phi3D, th:a.th}, 900);
    }
    if (btnDim){ btnDim.textContent = v ? "3D" : "2D"; btnDim.title = v ? "Ver en 3D" : "Ver en 2D (plano)"; btnDim.setAttribute("aria-pressed", v); }
  }
  function brujulaNorte(){ const a = estado(); irA({t:a.t, r:a.r, phi:a.phi, th:0}, 600); }
  function restablecer(){
    if (plano){ plano = false; aplanObj = 0; ctl.maxPolarAngle = MAX_TILT; if (btnDim){ btnDim.textContent = "2D"; btnDim.title = "Ver en 2D (plano)"; btnDim.setAttribute("aria-pressed", false); } }
    irA(INICIO, 1400);
  }
  // bajar / subir los edificios de la ciudad (sigue en 3D; los modelos de los lugares quedan en pie)
  let bajar = 0, bajarObj = 0;
  const btnEdif = document.getElementById("mc-edif");
  function setBajar(v){
    bajarObj = v ? 1 : 0;
    if (btnEdif){ btnEdif.setAttribute("aria-pressed", v); btnEdif.title = v ? "Subir edificios" : "Bajar edificios"; btnEdif.setAttribute("aria-label", btnEdif.title); }
  }
  const on = (id, f) => { const b = document.getElementById(id); if (b) b.addEventListener("click", f); };
  on("mc-mas", () => zoom(0.6)); on("mc-menos", () => zoom(1.6));
  on("mc-dim", () => setPlano(!plano)); on("mc-edif", () => setBajar(!bajarObj)); on("mc-norte", brujulaNorte); on("mc-reset", restablecer);
  // cualquier gesto del usuario corta el vuelo en curso
  renderer.domElement.addEventListener("pointerdown", () => { if (vuelo && !vuelo.fin) vuelo = null; });
  renderer.domElement.addEventListener("wheel", () => { if (vuelo && !vuelo.fin) vuelo = null; }, {passive:true});

  /* =====================================================================
     RECORRIDO AUTOMÁTICO (cinematográfico, en bucle)
     viaje (zoom progresivo) → foco 4,5 s con el nombre → se aleja → siguiente.
     Cualquier interacción lo frena; vuelve solo a los 15 s, salvo pausa manual.
     ===================================================================== */
  const RECORRIDO = ["iglesia-san-nicolas-de-bari", "palacio-miro", "pabellon-argentino", "palacio-unzue", "penitenciaria-nacional"]
    .map(id => LUG.find(l => l.id === id)).filter(Boolean);
  const ESPERA = 15000, FOCO = 4500;
  const tour = {activo:false, pausaManual:false, i:0, fase:null, t0:0, vuelta:0, ultima:performance.now()};
  const cartel = document.getElementById("mapa-cartel"), secMapa = document.getElementById("mapa");
  const btnTour = document.getElementById("mc-tour"), txtTour = document.getElementById("mc-tour-txt");
  function mostrarCartel(l){
    if (!cartel) return;
    const hoy = epoca === "hoy";
    const titulo = l.modelo ? (hoy ? l.hoyN : l.nombre) : l.nombre;
    const sub = l.modelo ? (hoy ? `${l.hoyA} · antes: ${l.nombre}` : `${l.antesA} · hoy: ${l.hoyN}`) : `hoy: ${l.hoy}`;
    cartel.innerHTML = `<small>${String(tour.i + 1).padStart(2, "0")} / ${String(RECORRIDO.length).padStart(2, "0")}</small><b>${titulo}</b><span>${sub}</span>`;
    cartel.classList.add("on"); secMapa.classList.add("con-cartel");
  }
  const ocultarCartel = () => { if (cartel) cartel.classList.remove("on"); secMapa.classList.remove("con-cartel"); };
  function encuadre(l){
    const lado = (tour.i + tour.vuelta) % 2 ? 1 : -1;                // alterna el lado y la inclinación
    const r = (l.modelo ? l.cerca : 520)*Math.max(1, Math.min(2.1, 1.05/(W()/H())));
    return {t:P(l.x, l.y, !plano && l.modelo ? l.alto*0.35 : 0), r,
            phi:plano ? 0.0001 : (lado > 0 ? 0.98 : 1.16), th:(l.rot || 0) - 0.31 + lado*0.3};
  }
  function paso(){
    if (!tour.activo) return;
    const l = RECORRIDO[tour.i], b = encuadre(l), d = estado().t.distanceTo(b.t);
    tour.fase = "viaje";
    irA(b, Math.min(7500, 3000 + d*1.4), () => {
      if (!tour.activo) return;
      tour.fase = "foco"; tour.t0 = performance.now(); mostrarCartel(l);
    });
    vuelo.tour = true;
  }
  function alejarYSeguir(){
    ocultarCartel();
    const a = estado();
    tour.fase = "alejar";
    irA({t:a.t, r:a.r*1.5, phi:plano ? a.phi : Math.max(.6, a.phi - .22), th:a.th + (plano ? 0 : .12)}, 1800, () => {
      if (!tour.activo) return;
      tour.i = (tour.i + 1) % RECORRIDO.length; if (!tour.i) tour.vuelta++;
      paso();
    });
    vuelo.tour = true;
  }
  function iniciarTour(desdeInicio){
    tour.activo = true; tour.fase = null;
    if (desdeInicio){ tour.i = 0; paso(); estadoBoton(); return; }
    // sigue desde donde está la cámara: el punto más cercano (o el siguiente, si ya está encima)
    const a = estado(); let bi = 0, bd = Infinity;
    RECORRIDO.forEach((l, i) => { const d = Math.hypot(l.x - a.t.x, l.y + a.t.z); if (d < bd){ bd = d; bi = i; } });
    tour.i = bd < 250 ? (bi + 1) % RECORRIDO.length : bi;
    if (bd < 250) alejarYSeguir(); else paso();
    estadoBoton();
  }
  function detenerTour(){
    if (tour.activo){ tour.activo = false; tour.fase = null; if (vuelo && vuelo.tour) vuelo = null; ocultarCartel(); }
    tour.ultima = performance.now(); estadoBoton();
  }
  let txtPrev = "";
  function estadoBoton(t){
    if (btnTour){
      btnTour.classList.toggle("pausado", tour.pausaManual);
      btnTour.title = tour.pausaManual ? "Reanudar recorrido" : "Pausar recorrido";
      btnTour.setAttribute("aria-label", btnTour.title);
    }
    if (!txtTour) return;
    let txt = tour.pausaManual ? "recorrido en pausa" : tour.activo ? "recorrido" :
      "recorrido en " + Math.max(1, Math.ceil((ESPERA - ((t || performance.now()) - tour.ultima))/1000)) + " s";
    if (txt !== txtPrev){ txtTour.textContent = txt; txtPrev = txt; }
  }
  if (btnTour) btnTour.addEventListener("click", () => {
    if (tour.pausaManual){ tour.pausaManual = false; if (window.__sbCerrar) window.__sbCerrar(); iniciarTour(); }
    else { tour.pausaManual = true; detenerTour(); }
  });
  // interacción del usuario: frena el recorrido al instante
  function interaccion(e){
    if (e && e.target && e.target.closest && e.target.closest("#mc-tour")) return;
    detenerTour();
  }
  ["pointerdown", "wheel", "touchstart"].forEach(ev => secMapa.addEventListener(ev, interaccion, {capture:true, passive:true}));
  renderer.domElement.addEventListener("pointermove", e => { if (e.buttons) interaccion(e); });
  window.addEventListener("keydown", e => { if (document.body.classList.contains("r-mapa")) interaccion(e); }, true);
  function animarTour(t, dt){
    if (tour.activo && tour.fase === "foco" && !vuelo){
      const k = (t - tour.t0)/FOCO;
      if (k >= 1){ alejarYSeguir(); return; }
      // durante el foco: órbita lenta + zoom progresivo, con velocidad que arranca y termina en cero
      const sp = Math.sin(Math.PI*Math.min(1, k))*dt, a = estado();
      sph.set(a.r*(1 - 0.000035*sp), plano ? a.phi : Math.max(.5, a.phi - 0.000022*sp), a.th + (plano ? 0.00004 : 0.00009)*sp);
      cam.position.setFromSpherical(sph).add(ctl.target);
    }
    if (window.__sbAbierto && !tour.activo) tour.ultima = t;          // con el panel abierto no se reactiva solo
    if (!tour.activo && !tour.pausaManual && t - tour.ultima > ESPERA) iniciarTour();
    if (!tour.activo) estadoBoton(t);
  }
  setTimeout(() => { if (!tour.pausaManual && !tour.activo) iniciarTour(true); }, 600);   // al cargar: arranca el recorrido


  /* ---------- búsqueda de direcciones ---------- */
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b(avenida|av\.?|avda\.?|calle|pasaje|pje\.?)\b/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const porNombre = {};
  const DISP = {};
  CALLES.forEach(c => { if (!c.nombre) return; const k = norm(c.nombre); (porNombre[k] ||= []).push(c);
    if (!DISP[k] || c.nombre.length > DISP[k].length) DISP[k] = c.nombre; });
  const LISTA = Object.keys(porNombre);
  function buscarCalle(q){
    const n = norm(q); if (!n) return null;
    let mejor = null, pts = 0;
    LISTA.forEach(nm => {
      const m = nm; let s = 0;
      if (m === n) s = 100; else if (m.endsWith(" " + n) || m.startsWith(n + " ")) s = 80 - m.length/10;
      else if (m.includes(n)) s = 60 - m.length/10;
      else { const ws = n.split(" "); if (ws.every(w => m.includes(w))) s = 40 - m.length/10; }
      if (s > pts){ pts = s; mejor = nm; }
    });
    return mejor;
  }
  function cruce(a, b){
    const r = [];
    porNombre[a].forEach(A => porNombre[b].forEach(B => {
      for (let i = 0; i < A.pts.length - 1; i++) for (let j = 0; j < B.pts.length - 1; j++){
        const p1 = A.pts[i], p2 = A.pts[i+1], p3 = B.pts[j], p4 = B.pts[j+1];
        const d = (p2[0]-p1[0])*(p4[1]-p3[1]) - (p2[1]-p1[1])*(p4[0]-p3[0]); if (!d) continue;
        const t = ((p3[0]-p1[0])*(p4[1]-p3[1]) - (p3[1]-p1[1])*(p4[0]-p3[0]))/d;
        const u = ((p3[0]-p1[0])*(p2[1]-p1[1]) - (p3[1]-p1[1])*(p2[0]-p1[0]))/d;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) r.push([p1[0] + t*(p2[0]-p1[0]), p1[1] + t*(p2[1]-p1[1])]);
      }
    }));
    if (!r.length) return null;
    return [r.reduce((s, p) => s + p[0], 0)/r.length, r.reduce((s, p) => s + p[1], 0)/r.length];
  }
  // numeración aproximada: se calibra con cruces de referencia conocidos y se camina sobre la calle
  const REF_NS = {"Avenida Rivadavia":0, "Rivadavia":0, "Avenida Corrientes":400, "Avenida Santa Fe":1100};
  const REF_EO = {"Avenida Eduardo Madero":50, "Avenida Leandro N. Alem":150, "Avenida Paseo Colón":150,
                  "Avenida 9 de Julio":1050, "Avenida Callao":1800, "Avenida Pueyrredón":2850};
  function cerca(calle, x, y){
    let best = null, bd = Infinity;
    porNombre[calle].forEach(t => { for (let i = 0; i < t.pts.length - 1; i++){
      const [ax, ay] = t.pts[i], [bx, by] = t.pts[i+1], vx = bx-ax, vy = by-ay, l2 = vx*vx + vy*vy || 1;
      const k = Math.max(0, Math.min(1, ((x-ax)*vx + (y-ay)*vy)/l2)), px = ax + k*vx, py = ay + k*vy;
      const d = Math.hypot(px - x, py - y); if (d < bd){ bd = d; best = [px, py]; } } });
    return [best, bd];
  }
  function caminar(calle, desde, dir, dist){
    let p = desde, [dx, dy] = dir, rest = Math.abs(dist);
    if (dist < 0){ dx = -dx; dy = -dy; }
    while (rest > 0){
      const st = Math.min(25, rest), [q, d] = cerca(calle, p[0] + dx*st, p[1] + dy*st);
      const L = Math.hypot(q[0]-p[0], q[1]-p[1]);
      if (d > 20 || L < st*0.5) return rest < 60 ? p : null;      // se terminó la calle
      dx = (q[0]-p[0])/L; dy = (q[1]-p[1])/L; p = q; rest -= st;
    }
    return p;
  }
  function porAltura(calle, num){
    let refs = [];
    for (const R of [REF_NS, REF_EO]){
      refs = [];
      for (const nm0 in R){ const nm = norm(nm0); if (!porNombre[nm] || nm === calle) continue; const c = cruce(calle, nm); if (c) refs.push({h:R[nm0], p:c}); }
      if (refs.length) { refs.ns = R === REF_NS; break; }
    }
    if (!refs.length) return null;
    refs.sort((a, b) => a.h - b.h);
    // referencias dobles (calle y avenida con el mismo número) se unen
    refs = refs.filter((r, i) => !i || r.h !== refs[i-1].h);
    let a = refs[0];
    refs.forEach(r => { if (r.h <= num) a = r; });
    const b = refs.find(r => r.h > a.h) || refs.slice().reverse().find(r => r.h < a.h);
    let dir, m = 1.3;
    if (b){
      const L = Math.hypot(b.p[0]-a.p[0], b.p[1]-a.p[1]);
      dir = [(b.p[0]-a.p[0])/L*Math.sign(b.h - a.h), (b.p[1]-a.p[1])/L*Math.sign(b.h - a.h)];
      m = Math.min(1.7, Math.max(1, L/Math.abs(b.h - a.h)));
    } else {
      // sin segunda referencia: los números crecen hacia el norte (calles N-S) o lejos del río (E-O)
      const pts = [].concat(...porNombre[calle].map(t => t.pts));
      const f = refs.ns ? (p => p[1]) : (p => -Math.hypot(p[0] - 1800, p[1] - 1200));
      const lejos = pts.reduce((q, p) => f(p) > f(q) ? p : q, pts[0]);
      const L = Math.hypot(lejos[0]-a.p[0], lejos[1]-a.p[1]) || 1;
      dir = [(lejos[0]-a.p[0])/L, (lejos[1]-a.p[1])/L];
    }
    return caminar(calle, a.p, dir, (num - a.h)*m);
  }
  const form = document.getElementById("mapa-buscar"), msg = document.getElementById("mapa-msg");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const q = form.q.value.trim(); if (!q) return;
    let res = null, txt = "";
    const y = q.split(/\s+(?:y|e|esq\.?|esquina|&)\s+/i);
    if (y.length === 2){
      const a = buscarCalle(y[0]), b = buscarCalle(y[1]);
      if (a && b && a !== b){ res = cruce(a, b); txt = `${DISP[a]} y ${DISP[b]}`; }
    } else {
      const m = q.match(/^(.*?)[\s,]+(\d{1,5})$/);
      if (m){ const c = buscarCalle(m[1]); if (c){ res = porAltura(c, +m[2]); txt = `${DISP[c]} ${m[2]} <i>(aprox.)</i>`; } }
      else { const c = buscarCalle(q); if (c){ const t = porNombre[c][0].pts; res = t[Math.floor(t.length/2)]; txt = DISP[c]; } }
    }
    if (!res){ msg.innerHTML = "No encontré esa dirección en esta zona del mapa."; pin.visible = false; pinEl.hidden = true; return; }
    msg.innerHTML = txt;
    pin.position.copy(P(res[0], res[1], 0)); pin.visible = true;
    pinEl.innerHTML = `<b>${txt}</b>`; pinEl.hidden = false; pin.anc = P(res[0], res[1], 120);
    volarA(res[0], res[1], 650);
  });
  document.querySelectorAll("#mapa-lugares button").forEach(b => b.addEventListener("click", () => {
    const l = LUG.find(z => z.id === b.dataset.id); window.__mapaEnfocar(l);
  }));

  /* ---------- nombre de la calle al pasar el mouse ---------- */
  const tip = document.getElementById("mapa-tip"), ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const pisoPlano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  renderer.domElement.addEventListener("pointermove", e => {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set((e.clientX - r.left)/r.width*2 - 1, -(e.clientY - r.top)/r.height*2 + 1);
    ray.setFromCamera(mouse, cam);
    if (!ray.ray.intersectPlane(pisoPlano, hit)){ tip.hidden = true; return; }
    const x = hit.x, y = -hit.z, lim = Math.max(10, cam.position.distanceTo(hit)/90);
    let nm = "", bd = lim;
    CALLES.forEach(c => { if (!c.nombre) return; for (let i = 0; i < c.pts.length - 1; i++){
      const [ax, ay] = c.pts[i], [bx, by] = c.pts[i+1], vx = bx-ax, vy = by-ay, l2 = vx*vx + vy*vy || 1;
      const k = Math.max(0, Math.min(1, ((x-ax)*vx + (y-ay)*vy)/l2)), d = Math.hypot(ax + k*vx - x, ay + k*vy - y);
      if (d < bd){ bd = d; nm = c.nombre; } } });
    if (!nm){ tip.hidden = true; return; }
    tip.hidden = false; tip.textContent = nm;
    tip.style.left = (e.clientX - r.left + 14) + "px"; tip.style.top = (e.clientY - r.top + 14) + "px";
  });
  renderer.domElement.addEventListener("pointerleave", () => tip.hidden = true);

  /* ---------- bucle ---------- */
  const v = new THREE.Vector3();
  function etiqueta(el, anc){
    v.copy(anc).project(cam);
    const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    el.style.display = vis ? "" : "none";
    if (vis){ el.style.transform = `translate(${(v.x*0.5 + 0.5)*W()}px, ${(-v.y*0.5 + 0.5)*H()}px) translate(-50%, -100%)`; }
  }
  const aguja = document.getElementById("mc-aguja");
  const escala = document.getElementById("mapa-escala");
  let escalaTxt = "";
  function actualizarEscala(r){
    if (!escala) return;
    const mpp = 2*r*Math.tan(THREE.MathUtils.degToRad(cam.fov/2))/H();   // metros por píxel en el centro
    const max = 110*mpp, pasos = [5,10,20,50,100,200,500,1000,2000,5000];
    const m = pasos.filter(p => p <= max).pop() || 5;
    const txt = m >= 1000 ? (m/1000) + " km" : m + " m";
    escala.querySelector("i").style.width = Math.round(m/mpp) + "px";
    if (txt !== escalaTxt){ escala.querySelector("span").textContent = txt; escalaTxt = txt; }
  }
  let tPrev = 0, ultFicha;
  function frame(t){
    const dt = Math.min(64, t - (tPrev || t)); tPrev = t;
    animarModelos(dt);
    // 2D ↔ 3D: la ciudad y los modelos se aplastan/levantan
    if (aplan !== aplanObj || bajar !== bajarObj){
      const paso = (v, o) => o > v ? Math.min(1, v + dt/700) : Math.max(0, v - dt/700);
      const suave = v => v < .5 ? 2*v*v : 1 - Math.pow(-2*v + 2, 2)/2;
      aplan = paso(aplan, aplanObj); bajar = paso(bajar, bajarObj);
      const e = suave(aplan), eb = suave(bajar);
      ciudad.scale.y = 1 - 0.97*Math.max(e, eb);                 // edificios: bajan en 2D o con el botón
      MODELOS.forEach(m => m.raiz.scale.y = 1 - 0.97*e);           // los modelos hoy/antes solo se aplastan en 2D
      LUG.forEach(l => l.anc.y = l.ancY*(1 - 0.8*e));
    }
    if (vuelo){
      const k = Math.min(1, (t - vuelo.s)/vuelo.d), e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3)/2;
      const {a, b} = vuelo;
      ctl.target.lerpVectors(a.t, b.t, e);
      sph.set(a.r + (b.r - a.r)*e + Math.sin(Math.PI*e)*vuelo.arco, a.phi + (b.phi - a.phi)*e, a.th + (b.th - a.th)*e);
      cam.position.setFromSpherical(sph).add(ctl.target);
      if (k >= 1){ const f = vuelo.fin; vuelo = null; if (f) f(); }
    }
    animarTour(t, dt);
    aplicarOffset(dt);
    ctl.update();
    renderer.render(scene, cam);
    LUG.forEach(l => etiqueta(l.el, l.anc));
    if (pin.visible) etiqueta(pinEl, pin.anc);
    // brújula, escala y ficha del lugar más cercano al centro
    const st = estado();
    if (aguja) aguja.style.transform = `rotate(${st.th}rad)`;
    actualizarEscala(st.r);
    const tx = st.t.x, ty = -st.t.z;
    let cerca = null, bd = Infinity;
    LUG.forEach(l => { if (!l.modelo) return; const d = Math.hypot(l.x - tx, l.y - ty); if (d < bd){ bd = d; cerca = l; } });
    if (!(cerca && bd < Math.max(220, st.r*0.7) && st.r < 1600)) cerca = null;
    if (cerca !== ultFicha){ ultFicha = cerca; llenarFicha(cerca); }
    if (document.body.classList.contains("r-mapa")) requestAnimationFrame(frame); else { corriendo = false; tPrev = 0; }
  }
  let corriendo = false;
  window.__mapaActivar = () => {
    renderer.setSize(W(), H()); cam.aspect = W()/H(); cam.updateProjectionMatrix(); offSucio = true;
    if (tour.activo){ vuelo = null; paso(); } else tour.ultima = performance.now();
    if (!corriendo){ corriendo = true; requestAnimationFrame(frame); }
  };
  window.addEventListener("resize", () => { if (document.body.classList.contains("r-mapa")) window.__mapaActivar(); });
  // marcador o lista: zoom suave + panel lateral con la ficha de ESE lugar
  window.__mapaEnfocar = l => { detenerTour(); volarA(l.x, l.y, l.modelo ? l.cerca : 600, 1500); if (window.__sbAbrir) window.__sbAbrir(l.id); };
  // con el panel abierto, el centro de la vista se corre hacia la parte visible del mapa
  let offX = 0, offY = 0, offXo = 0, offYo = 0, offSucio = false;
  window.__mapaPanel = (abierto, w, h) => { offXo = abierto ? w/2 : 0; offYo = abierto ? h/2 : 0; offSucio = true; };
  function aplicarOffset(dt){
    if (!offSucio && offX === offXo && offY === offYo) return;
    const k = Math.min(1, dt/140);
    offX += (offXo - offX)*k; offY += (offYo - offY)*k;
    if (Math.abs(offXo - offX) < .5) offX = offXo;
    if (Math.abs(offYo - offY) < .5) offY = offYo;
    if (offX || offY) cam.setViewOffset(W(), H(), offX, offY, W(), H()); else cam.clearViewOffset();
    offSucio = false;
  }
  window.__mapaIr = id => { const l = LUG.find(z => z.id === id); window.__mapaPend = null; detenerTour(); if (l) volarA(l.x, l.y, l.modelo ? l.cerca : 600); };
  window.__mapaActivar();
  if (window.__mapaPend) window.__mapaIr(window.__mapaPend);
})();
