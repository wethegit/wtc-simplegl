// Publishes the agent skill in ../skills/wtc-simplegl on the docs site:
//
//   public/skill/wtc-simplegl/…   the files, to read or link to
//   public/skill/wtc-simplegl.zip the folder zipped, for uploading to Claude
//
// Runs before `vitepress dev` and `vitepress build`. public/skill is ignored by git.

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

const name = "wtc-simplegl";
const source = join(import.meta.dirname, "../../skills", name);
const out = join(import.meta.dirname, "../public/skill");

const files = async (dir) =>
  (await readdir(dir, { withFileTypes: true, recursive: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();

// A minimal zip writer: deflated entries, no extra fields. Paths use "/".
function zip(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  // 1980-01-01 00:00, so the zip only changes when the files do
  const time = 0;
  const date = (0 << 9) | (1 << 5) | 1;

  for (const { path, data } of entries) {
    const name = Buffer.from(path);
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // local file header
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(8, 8); // deflate
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(date, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); // central directory header
    entry.writeUInt16LE(20, 4); // version made by
    entry.writeUInt16LE(20, 6); // version needed
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(date, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42); // where its local header starts
    central.push(entry, name);

    offset += header.length + name.length + compressed.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

const paths = await files(source);
if (!paths.some((p) => relative(source, p) === "SKILL.md")) {
  throw new Error(`skill: no SKILL.md in ${source}`);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(source, join(out, name), { recursive: true });

const entries = await Promise.all(
  paths.map(async (path) => ({
    path: [name, ...relative(source, path).split(/[\\/]/)].join("/"),
    data: await readFile(path),
  }))
);
await writeFile(join(out, `${name}.zip`), zip(entries));

console.log(`skill: ${entries.length} files → public/skill/${name}/ and ${name}.zip`);
