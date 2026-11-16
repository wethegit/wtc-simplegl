# Changesets

This folder holds [changesets](https://changesets.dev): small Markdown files that describe a change and how it should be released.

Add one in any PR that changes what gets published (anything in `lib/` or `package.json`):

```bash
npx changeset
```

Pick `patch`, `minor` or `major`, write a one-line summary, and commit the generated file. Changes that don't affect the published package (demos, CI, docs) don't need one.

When changesets land on `main`, the Release workflow opens a "Version Packages" PR. Merging that PR publishes to npm through trusted publishing.
