---
title: Introduction
---

# Introduction

wtc-simplegl is a small WebGL2 helper library. It takes care of the boilerplate around your shaders and otherwise stays out of the way. {.lead}

You write the GLSL and make plain `gl` calls where you want to. wtc-simplegl compiles and links programs, sets up vertex arrays, sets uniforms by their type, binds textures, sizes the canvas and frees everything when you're done. The whole library is one file, so it works where you can't install packages: copy `simplegl.js` into the project and import from it.

Start with [your first shader](/getting-started/first-shader).
