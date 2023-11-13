import { 
    Renderer,
    Program,
    Mesh,
    Plane,
    Uniform,
  } from 'https://cdn.skypack.dev/wtc-gl@1.0.0-beta.43';
  import { Vec2, Vec3, Vec4, Mat2, Mat3, Mat4, Quat } from 'https://cdn.skypack.dev/wtc-math';
  
  const vertex = document.getElementById('vertShader').innerText.replace('%%rn%%', `${.1+Math.random()*.3}+${Math.random()*Math.PI}`);
  const fragment = document.getElementById('fragShader').innerText;
  
  console.clear()
  
  class StripeHeader {
    uniforms
    dimensions
    autoResize = true
    onBeforeRender
    onAfterRender
  
    u_time
    u_resolution
  
    gl
    renderer
    program
    mesh
  
    lastTime = 0
  
    constructor({
      vertex,
      fragment,
      dimensions = new Vec2(window.innerWidth, window.innerHeight),
      container = document.body,
      autoResize = true,
      uniforms = {},
      onInit = (renderer) => {},
      onBeforeRender = (t) => {},
      onAfterRender = (t) => {},
      rendererProps = { antialias: true }
    } = {}) {
      this.onBeforeRender = onBeforeRender.bind(this)
      this.onAfterRender = onAfterRender.bind(this)
      this.render = this.render.bind(this)
      this.resize = this.resize.bind(this)
      this.autoResize = autoResize
  
      this.dimensions = dimensions
  
      this.u_time = new Uniform({ name: 'time', value: 0, kind: 'float' })
      this.u_resolution = new Uniform({
        name: 'resolution',
        value: this.dimensions.array,
        kind: 'float_vec2'
      })
      this.u_seed = new Uniform({
        name: 'seed',
        value: Math.random()*10000+1000,
        kind: 'float'
      })
  
      this.uniforms = Object.assign({}, uniforms, {
        u_time: this.u_time,
        u_resolution: this.u_resolution,
        u_seed: this.u_seed
      })
  
      this.renderer = new Renderer(rendererProps)
      onInit(this.renderer)
      this.gl = this.renderer.gl
      container.appendChild(this.gl.canvas)
      this.gl.clearColor(1, 1, 1, 1)
  
      if (this.autoResize) {
        window.addEventListener('resize', this.resize, false)
        this.resize()
      } else {
        this.renderer.dimensions = dimensions
        this.u_resolution.value = this.dimensions.scaleNew(
          this.renderer.dpr
        ).array
      }
  
      const geometry = new Plane(this.gl, {
        width: 4,
        height: 4,
        widthSegments: Math.floor(window.innerWidth / 20),
        heightSegments: Math.floor(window.innerHeight / 5),
      });
  
      this.program = new Program(this.gl, {
        vertex,
        fragment,
        uniforms: this.uniforms
      })
  
      this.mesh = new Mesh(this.gl, { geometry, program: this.program })
  
      this.playing = true
    }
  
    resize() {
      this.dimensions = new Vec2(window.innerWidth, window.innerHeight)
      this.u_resolution.value = this.dimensions.scaleNew(this.renderer.dpr).array
      this.renderer.dimensions = this.dimensions
      
      const geometry = new Plane(this.gl, {
        width: 3,
        height: 3,
        widthSegments: Math.floor(window.innerWidth / 20),
        heightSegments: Math.floor(window.innerHeight / 5),
      });
      this.mesh = new Mesh(this.gl, { geometry, program: this.program })
    }
  
    resetTime() {
      this.lastTime = 0;
    }
  
    render(t) {
      const diff = t - this.lastTime
      this.lastTime = t
  
      if (this.playing) {
        requestAnimationFrame(this.render)
      }
  
      const v = this.u_time.value
      this.u_time.value = v + diff * 0.00005
      
      // console.log(this.u_time)
  
      this.onBeforeRender(t)
  
      if (this.post) this.post.render(this.renderer, { scene: this.mesh })
      else this.renderer.render({ scene: this.mesh })
  
      this.onAfterRender(t)
    }
  
    #post
    set post(p) {
      if (p.render) {
        this.#post = p
      }
    }
    get post() {
      return this.#post || null
    }
  
    _playing = false;
    set playing(v) {
      if (this._playing !== true && v === true) {
        requestAnimationFrame(this.render)
        this._playing = true
      } else {
        this.lastTime = 0
        this._playing = false
      }
    }
    get playing() {
      return this._playing === true
    }
  }
  
  // Create the fragment shader wrapper
  const FSWrapper = new StripeHeader({
    fragment,
    vertex
  });
  const { gl, uniforms } = FSWrapper;
  
  
  let angle = 0.;
  uniforms.u_position = new Uniform({
    name: "position",
    value: [0,2],
    kind: "vec2"
  });
  uniforms.u_zoom = new Uniform({
    name: "zoom",
    value: 1.,
    kind: "float"
  });
  uniforms.u_rotation = new Uniform({
    name: "rotation",
    value: angle,
    kind: "float"
  });
  
  
  
  let zoom = uniforms.u_zoom.value;
  let tzoom = 1.;
  let velocity = new Vec2(0,0);
  let lastmouse = new Vec2(0,0);
  let startmouse = new Vec2(0,0);
  let startrotation = angle;
  let rotation = angle;
  let rotationVelocity;
  let pointerdown = false;
  let keys = {
    rotation: false
  }
  let rotating = false;
  let zooming = false;
  window.addEventListener('keydown', (e) => {
    // console.log(e.key)
    if(e.key === 'Control') {
      keys.rotation = true;
    }
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if(e.key === 'Control') {
      keys.rotation = false;
    }
    e.preventDefault();
  });
  // window.addEventListener('wheel', (e) => {
  //   tzoom += e.deltaY * 0.001 * (uniforms.u_zoom.value);
  //   tzoom = Math.min(5., Math.max(tzoom, .01));
  // });
  window.addEventListener('pointerdown', (e)=> {
    if(!keys.rotation) {
      pointerdown = true;
      lastmouse = new Vec2(e.x,e.y);
    } else {
      rotating = true;
      const thismouse = new Vec2(e.x,e.y);
      startrotation = rotation + new Vec2(window.innerWidth*.5, window.innerHeight*.5).subtract(thismouse).angle;
    }
    startmouse = lastmouse.clone();
  });
  window.addEventListener('pointerup', (e)=> {
    pointerdown = false;
    rotating = false;
  });
  window.addEventListener('pointermove', (e)=> {
    if(zooming) return;
    if(rotating) {
      const thismouse = new Vec2(e.x,e.y);
      rotation = startrotation - new Vec2(window.innerWidth*.5, window.innerHeight*.5).subtract(thismouse).angle;
      // rotation = (thismouse.subtractNew(new Vec2(window.innerWidth, window.innerHeight))).angle;
    } else if(pointerdown) {
        const thismouse = new Vec2(e.x,e.y);
        let dd = 1./Math.min(window.innerWidth, window.innerHeight);
        dd *= uniforms.u_zoom.value;
        const diff = lastmouse.subtract(thismouse);
  
        const c = Math.cos(uniforms.u_rotation.value);
        const s = Math.sin(uniforms.u_rotation.value);
        const mat = new Mat2(c, s, -s, c);
        // velocity.transformByMat2(mat);
  
        velocity = diff.clone();
        uniforms.u_position.value = new Vec2(...uniforms.u_position.value).add(diff.transformByMat2New(mat).multiply(new Vec2(dd, -dd))).array;
        lastmouse = thismouse;
      }
  });
  const runmouse = function(d) {
    const scalar = pointerdown ? .1 : .98;
    if(velocity.length > 0.01) {
      velocity.scale(scalar);
      
      const c = Math.cos(uniforms.u_rotation.value);
      const s = Math.sin(uniforms.u_rotation.value);
      const mat = new Mat2(c, s, -s, c);
      // velocity.transformByMat2(mat);
      
      let dd = 1./Math.min(window.innerWidth, window.innerHeight);
      dd *= uniforms.u_zoom.value;
      uniforms.u_position.value = new Vec2(...uniforms.u_position.value).add(velocity.transformByMat2New(mat).multiplyNew(new Vec2(dd, -dd))).array;
    }
    zoom += (tzoom - zoom) * .1;
    uniforms.u_zoom.value = zoom;
    // uniforms.u_rotation.value += (velocity.angle-Math.PI) * .0001 * Math.min(velocity.length, 1.);
    uniforms.u_rotation.value = rotation;
    requestAnimationFrame(runmouse);
  }
  requestAnimationFrame(runmouse);