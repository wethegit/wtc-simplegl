import { createRenderer } from "../lib/index.js";
import { Vec3, Mat4, Quat } from "https://esm.sh/wtc-math";

console.clear();

const dpr = 2;
const mapSize = 256;
const properties = {
  dpr,
  width: window.innerWidth * dpr,
  height: window.innerHeight * dpr,
  mapSize,
  particles: 50000,
  mapScale: (1e6 / Math.pow(mapSize, 2)) * (mapSize / 256) * 8
};

function randomUniform(a, b) {
    return Math.random() * (b - a) + a;
  }






const createCamera = (gl, {aspect, fov=45, near=.1, far=1000}) => {
  const projectionMatrix = Mat4.perspective(fov*Math.PI/180, aspect, near, far);

  const rotation = new Vec3();
  const quaternion = new Quat();
  const position = new Vec3(0,0,5);
  const scale = new Vec3(1,1,1);
  const lookAtTarget = new Vec3(0,0,0);

  const identity = new Mat4();
  const matrix = new Mat4();
  const viewMatrix = new Mat4();
  const viewProjectionMatrix = projectionMatrix.clone();
  const upVector = new Vec3(0,1,0);
  const worldPosition = new Vec3();

  let UviewProjectionMatrix = [];
  let UmodelViewMatrix = [];
  let UviewMatrix = [];
  let UiViewMatrix = [];

  let i = 0;
    
  let needsUpdate = true;
  const f = {
    reset: () => {
      return this;
    },
    resize: () => {
      projectionMatrix.resetToMat4(Mat4.perspective(fov*Math.PI/180, gl.canvas.width/gl.canvas.height, near, far));
    },
    translate: (v) => {
      needsUpdate = true;
      position.resetToVector(v);
      return this;
    },
    lookAt: (v, invert = false) => {
      needsUpdate = true;
      lookAtTarget.resetToVector(v);
      matrix.resetToMat4(Mat4.targetTo(position, lookAtTarget, upVector));
      quaternion.resetToQuat(matrix.rotation);
      return this;
    },
    assemble: () => {
      if(needsUpdate) {
        
        matrix.resetToMat4(Mat4.fromRotationTranslationScale(
          quaternion,
          position,
          scale
        ));

        viewMatrix.resetToMat4(matrix.invertNew());

        viewProjectionMatrix.resetToMat4(projectionMatrix.multiplyNew(viewMatrix));
        UiViewMatrix = [...viewMatrix.invertNew()];
        UviewMatrix = [...viewMatrix];
        UviewProjectionMatrix = [...viewProjectionMatrix];
        UmodelViewMatrix = [...viewMatrix.multiplyNew(identity)];
        needsUpdate = false;
      }
      return this;
    },
    viewProjectionMatrix: () => UviewProjectionMatrix,
    modelViewMatrix: () => UmodelViewMatrix,
    viewMatrix: () => UviewMatrix,
    iViewMatrix: () => UiViewMatrix,
  };

  return f;
}

const components = {};

const init = (gl) => {
  const numParticles = properties.particles;
  const size = 3;
  const position = new Float32Array(numParticles * size);
  const id = new Float32Array(numParticles);
  const something = new Float32Array(numParticles*2);

  const amplitude = 3, frequency = .5, shift = 1, s = 2, wavelength = 40;

  for (let i = 0; i < numParticles; i++) {
    const l = Math.random();

    const u = Math.random();

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() -1);
    const r = s * Math.cbrt(u);

    const z = wavelength*-.5 + l * wavelength;
    const p = new Vec3(
      Math.cos(z*frequency+shift)*amplitude +
      Math.sin(z*frequency*.5+shift+200)*amplitude*2., 
      Math.sin(z*frequency+shift)*amplitude*.5, 
      z);
    
    {
      const j = i*size;
      position[j]   = p.x + r * Math.sin(phi) * Math.cos(theta);
      position[j+1] = p.y + r * Math.sin(phi) * Math.sin(theta);
      position[j+2] = p.z + r * Math.cos(phi);
    }
    id[i] = r/s;
  }
  for (let i = 0; i < numParticles*2; i+=2) {
    something.set([Math.random(), Math.random()], i);
  }

  components.camera = createCamera(gl, {fov: 50, aspect: gl.canvas.width/gl.canvas.height});
  components.camera.translate(new Vec3(0,10,15));
  components.camera.lookAt(new Vec3(0,0,0));

  components.renderer = createRenderer(gl, {
    vert:vert.innerText,
    frag:frag.innerText,
    attributes: {
        a_id: {
          data: id,
          size: 1,
          varying: "v_id",
          index: 0
        },
        a_something: {
          data: something,
          size: 2,
          varying: "v_something",
          index: 1
        },
        a_position: {
          data: position,
          size,
          usage: gl.STREAM_COPY,
          varying: "v_position",
          index: 5
        },
    },
    count: numParticles,
    mode: gl.POINTS,
  });
}

let frame = 0;
const render = (gl, delta) => {
  // Bind the scene
  components.renderer.bindVAOs();

  const t = delta*.0002;

  components.camera.translate(new Vec3(Math.cos(t*1.5)*10,Math.sin(t)*10, 10 + Math.cos(2+t)*12));
  components.camera.lookAt(new Vec3(0,0,0));

  // Bind the uniforms
  components.renderer.bindUniform("u_time", delta / 1000);
  components.renderer.bindUniform("u_frame", frame++);
  components.camera.assemble();
  components.renderer.bindUniform("u_viewProjectionMatrix", new Float32Array(components.camera.viewProjectionMatrix()));
  components.renderer.bindUniform("u_viewMatrix", new Float32Array(components.camera.viewMatrix()));
  components.renderer.bindUniform("u_iViewMatrix", new Float32Array(components.camera.iViewMatrix()));
  components.renderer.bindUniform("u_modelViewMatrix", new Float32Array(components.camera.modelViewMatrix()));
  components.renderer.bindUniform("u_resolution", [
    gl.canvas.width,
    gl.canvas.height
  ]);

  // Clear
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  
  // gl.enable(gl.BLEND);
  // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // Render the scene
  components.renderer.render({
    width: gl.canvas.width,
    height: gl.canvas.height,
  });

  gl.disable(gl.BLEND);
}








const initApplication = () => {
  const c = document.createElement('canvas');
  c.height = 1500;
  c.width = 1500;
  document.body.appendChild(c);
  const gl = c.getContext("webgl2", { depth: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
  
  const resize = () => {
    c.width = properties.width = window.innerWidth * properties.dpr;
    c.height = properties.height = window.innerHeight * properties.dpr;
    if(components.camera) components.camera.resize()
  }
  window.addEventListener('resize', resize);
  resize();

  init(gl);
  components.renderer.bindVAOs();
  
  const animate = (delta) => {
    requestAnimationFrame(animate);
    render(gl, delta)
  }
  requestAnimationFrame(animate);
}

initApplication();