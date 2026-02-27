import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Cleanup canvas precedente
const oldCanvas = document.querySelector("canvas");
if (oldCanvas) oldCanvas.remove();

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Scene e camera
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 3, 8);

// ===== SFONDO GRADIENTE VERTICALE #cefe54 (alto) → #ececec (basso) =====
const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition + cameraPosition).y;
    gl_FragColor = vec4(mix(bottomColor, topColor, max(h * 0.5 + 0.5, 0.0)), 1.0);
  }
`;

const uniforms = {
  topColor: { value: new THREE.Color(0xcefe54) },
  bottomColor: { value: new THREE.Color(0xececec) }
};

scene.fog = new THREE.Fog(0xececec, 100, 200);

const skyGeo = new THREE.SphereGeometry(80, 32, 15);
const skyMat = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  side: THREE.BackSide
});

const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Luci
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 8, 4);
scene.add(dirLight);

// OrbitControls per camera
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.target.set(0, 1.2, 0);

// Loader
const loader = new GLTFLoader();

// ===== EARTH =====
let earthRoot = null;
let earthMixer = null;

loader.load(
  "./datapasta_earth.glb",
  (gltf) => {
    earthRoot = gltf.scene;
    earthRoot.position.set(0, 0, 0);
    earthRoot.scale.setScalar(1.0);
    scene.add(earthRoot);

    // Animazioni (nuvole ecc.)
    if (gltf.animations && gltf.animations.length) {
      earthMixer = new THREE.AnimationMixer(earthRoot);
      gltf.animations.forEach((clip) => earthMixer.clipAction(clip).play());
    }
  },
  undefined,
  (err) => console.error("Errore Earth:", err)
);

// ===== Resize =====
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ===== Loop =====
const clock = new THREE.Clock();
let animationId;

function animate() {
  animationId = requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (earthMixer) earthMixer.update(dt);

  orbitControls.update();
  renderer.render(scene, camera);
}

animate();
