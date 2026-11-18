import { compileShader } from "./compileShader.js";
import { createBuffer } from "./createBuffer.js";
import { createProgram, linkProgram } from "./createProgram.js";
import { getActiveUniforms } from "./getActiveUniforms.js";
import { createRenderer } from "./createRenderer.js";
import { createVertexArray } from "./createVertexArray.js";
import { createFrameBuffer } from "./createFrameBuffer.js";
import { loadTexture } from "./loadTexture.js";
import { updateTexture } from "./updateTexture.js";
import { createTexture } from "./createTexture.js";
import { createContext } from "./createContext.js";
import { loop } from "./loop.js";

// Types, for the API reference and editors. Comments only; nothing at runtime.
/** @typedef {import("./createContext.js").ContextOptions} ContextOptions */
/** @typedef {import("./loop.js").LoopOptions} LoopOptions */
/** @typedef {import("./loop.js").Loop} Loop */
/** @typedef {import("./createRenderer.js").RendererOptions} RendererOptions */
/** @typedef {import("./createRenderer.js").Attribute} Attribute */
/** @typedef {import("./createRenderer.js").RenderOptions} RenderOptions */
/** @typedef {import("./createRenderer.js").Renderer} Renderer */
/** @typedef {import("./getActiveUniforms.js").ActiveUniform} ActiveUniform */
/** @typedef {import("./createVertexArray.js").VertexArrayBindings} VertexArrayBindings */
/** @typedef {import("./createVertexArray.js").FeedbackBuffer} FeedbackBuffer */
/** @typedef {import("./createFrameBuffer.js").FrameBufferOptions} FrameBufferOptions */
/** @typedef {import("./createFrameBuffer.js").FrameBuffer} FrameBuffer */
/** @typedef {import("./createFrameBuffer.js").RenderTarget} RenderTarget */
/** @typedef {import("./createTexture.js").TextureOptions} TextureOptions */
/** @typedef {import("./updateTexture.js").UpdateTextureOptions} UpdateTextureOptions */
/** @typedef {import("./loadTexture.js").LoadTextureOptions} LoadTextureOptions */
/** @typedef {import("./loadTexture.js").LoadSignal} LoadSignal */

export {
  compileShader,
  createBuffer,
  createProgram,
  linkProgram,
  getActiveUniforms,
  createRenderer,
  createVertexArray,
  createFrameBuffer,
  loadTexture,
  updateTexture,
  createTexture,
  createContext,
  loop,
};