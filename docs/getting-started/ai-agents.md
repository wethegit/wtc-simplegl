<script setup>
import { withBase } from 'vitepress'

// Files in public/ don't get the site's base added, so add it here
const skill = (path = '') => withBase(`/skill/wtc-simplegl${path}`)
</script>

# Using with AI agents

Give Claude or another coding agent the wtc-simplegl skill, so it writes code against the real API instead of guessing. {.lead}

wtc-simplegl is small and fairly new, so agents haven't seen much of it. Without help they tend to invent options, forget that samplers take textures directly, or leave out the cleanup. The skill is a short guide for agents:

- the API and its options;
- the order to call things in;
- the gotchas that cause most bugs;
- when to suggest [wtc-gl](https://wethegit.github.io/wtc-gl/docs/) or [three.js](https://threejs.org) instead, including wtc-gl's React bindings for WebGL spread across a page's components, as a suggestion rather than a switch;
- reference files for textures and framebuffers, transform feedback, and the lower-level functions;
- a complete example page.

The agent reads it when a task involves wtc-simplegl or a copied `simplegl.js`.

## Download

- <a :href="withBase('/skill/wtc-simplegl.zip')" download>wtc-simplegl.zip</a>: the whole skill, as a folder.
- <a :href="skill('/SKILL.md')" target="_blank">SKILL.md</a>, the main file, and its references:
  - <a :href="skill('/references/textures-and-framebuffers.md')" target="_blank">textures and framebuffers</a>
  - <a :href="skill('/references/transform-feedback.md')" target="_blank">transform feedback</a>
  - <a :href="skill('/references/lower-level.md')" target="_blank">lower level</a>
- The source is in the repo, in [`skills/wtc-simplegl`](https://github.com/wethegit/wtc-simplegl/tree/main/skills/wtc-simplegl). It's updated along with the library.

## Installing it

### Claude Code

Unzip it into your skills folder: `~/.claude/skills/` for all your projects, or `.claude/skills/` in one project to share it with everyone working on it.

```sh
curl -LO https://wethegit.github.io/wtc-simplegl/skill/wtc-simplegl.zip
unzip wtc-simplegl.zip -d ~/.claude/skills
```

Claude Code finds it in the next session. Ask for something like "a full-screen shader with wtc-simplegl" and it loads the skill on its own. You can also run it by name, with `/wtc-simplegl`.

### Claude apps

Open **Settings → Capabilities** and upload `wtc-simplegl.zip` under Skills. It's then available in your chats.

### Other agents

Most agents can read a URL or a file in the project. Point them at the raw <a :href="skill('/SKILL.md')" target="_blank">SKILL.md</a>, or copy the folder into the project and mention it in your `AGENTS.md`:

```md
For WebGL work with wtc-simplegl, read skills/wtc-simplegl/SKILL.md first.
```

## What's in it

The skill is plain Markdown, so you can read it too. It's also a compact summary of the library.

::: details SKILL.md

<<< ../../skills/wtc-simplegl/SKILL.md{md}

:::

## See also

- [Installation](/getting-started/installation)
- [Cleaning up](/core/cleaning-up), which the skill stresses for React
