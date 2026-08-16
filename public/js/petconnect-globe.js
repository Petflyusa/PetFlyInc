(function () {
  var container = document.getElementById('petconnect-globe');
  if (!container || !window.THREE) return;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 3.1);
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  var globe = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), new THREE.MeshPhongMaterial({ color: 0x173a50, emissive: 0x07131d, shininess: 15, transparent: true, opacity: 0.96 }));
  scene.add(globe);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.012, 48, 48), new THREE.MeshBasicMaterial({ color: 0xbd9b5a, wireframe: true, transparent: true, opacity: 0.12 })));
  function point(lat, lng, color) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
    var phi = (90 - Number(lat)) * Math.PI / 180, theta = (Number(lng) + 180) * Math.PI / 180;
    var r = 1.04, x = -r * Math.sin(phi) * Math.cos(theta), y = r * Math.cos(phi), z = r * Math.sin(phi) * Math.sin(theta);
    var marker = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 10), new THREE.MeshBasicMaterial({ color: color }));
    marker.position.set(x, y, z); scene.add(marker);
  }
  fetch('/api/globe/data?scope=' + encodeURIComponent(container.dataset.scope || 'all')).then(function (r) { return r.ok ? r.json() : { alerts: [], members: [], partners: [] }; }).then(function (data) {
    (data.alerts || []).forEach(function (item) { point(item.lat, item.lng, item.type === 'lost' ? 0xdf5d45 : 0x51a178); });
    (data.members || []).forEach(function (item) { point(item.lat, item.lng, 0xbd9b5a); });
    (data.partners || []).forEach(function (item) { point(item.lat, item.lng, 0x79b8d5); });
  }).catch(function () {});
  function resize() { var w = container.clientWidth, h = Math.max(300, Math.min(460, w * 0.55)); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }
  window.addEventListener('resize', resize); resize();
  var dragging = false, previous = 0;
  container.addEventListener('pointerdown', function (e) { dragging = true; previous = e.clientX; });
  window.addEventListener('pointerup', function () { dragging = false; });
  window.addEventListener('pointermove', function (e) { if (dragging) { globe.rotation.y += (e.clientX - previous) * 0.008; previous = e.clientX; } });
  (function animate() { requestAnimationFrame(animate); if (!dragging) globe.rotation.y += 0.0015; renderer.render(scene, camera); }());
}());
