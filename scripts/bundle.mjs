import { getPackages } from '@manypkg/get-packages';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { toString } from 'mdast-util-to-string';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function tagCommand({ cwd, exec }) {
  const { packages } = await getPackages(cwd);
  const newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@(\S+)/;
  const packagesByName = new Map(packages.map((pkg) => [pkg.packageJson.name, pkg]));
  const tagCommandOutput = await exec.getExecOutput("yarn", ["changeset", "tag"], { cwd });
  const releasedPackages = [];
  for (const line of tagCommandOutput.stdout.split("\n")) {
    const match = line.match(newTagRegex);
    if (!match) {
      continue;
    }
    const pkgName = match[1];
    const pkg = packagesByName.get(pkgName);
    if (!pkg) {
      continue;
    }
    releasedPackages.push(pkg);
  }
  return releasedPackages;
}

const BumpLevels = {
  dep: 0,
  patch: 1,
  minor: 2,
  major: 3
};
function getChangelogEntry(changelog, version) {
  const ast = unified().use(remarkParse).parse(changelog);
  const nodes = ast.children;
  let highestLevel = BumpLevels.dep;
  let headingStartInfo;
  let endIndex;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === "heading") {
      const stringified = toString(node);
      const match = stringified.toLowerCase().match(/(major|minor|patch)/);
      if (match !== null) {
        const level = BumpLevels[match[0]];
        highestLevel = Math.max(level, highestLevel);
      }
      if (headingStartInfo === void 0 && stringified === version) {
        headingStartInfo = {
          index: i,
          depth: node.depth
        };
        continue;
      }
      if (endIndex === void 0 && headingStartInfo !== void 0 && headingStartInfo.depth === node.depth) {
        endIndex = i;
        break;
      }
    }
  }
  if (headingStartInfo) {
    ast.children = ast.children.slice(
      headingStartInfo.index + 1,
      endIndex
    );
  }
  return {
    content: unified().use(remarkStringify).stringify(ast),
    highestLevel
  };
}

async function createRelease({ octokit, pkg, context }) {
  try {
    const changelogFileName = join(pkg.dir, "CHANGELOG.md");
    const changelog = await readFile(changelogFileName, { encoding: "utf8" });
    const changelogEntry = getChangelogEntry(changelog, pkg.packageJson.version);
    if (!changelogEntry) {
      throw new Error(`Could not find changelog entry for ${pkg.packageJson.name}@${pkg.packageJson.version}`);
    }
    const tagName = `${pkg.packageJson.name}@${pkg.packageJson.version}`;
    await octokit.rest.repos.createRelease({
      name: tagName,
      tag_name: tagName,
      body: changelogEntry.content,
      prerelease: pkg.packageJson.version.includes("-"),
      ...context.repo
    });
  } catch (error) {
    const err = error;
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}

export { BumpLevels, createRelease, getChangelogEntry, tagCommand };
