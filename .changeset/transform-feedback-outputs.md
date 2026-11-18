---
"wtc-simplegl": minor
---

Draw transform feedback results with another program:

- `renderer.outputs` gives the buffers holding a transform feedback renderer's latest output, by attribute name.
- An attribute declared as `{ from: simulation }` reads the simulation's output of the same name (or `output: "a_name"`), following it each frame as the buffers swap.
