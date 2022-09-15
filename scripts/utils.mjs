import unified from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { toString as mdastToString } from 'mdast-util-to-string';

export function createExec(exec) {
  return async (command, args, options = {}) => {
    let stdout = '';
    let stderr = '';

    return Object.freeze({
      call: await exec.exec(command, args, {
        listeners: {
          stdout: (data) => {
            stdout += data.toString();
          }, stderr: (data) => {
            stderr += data.toString();
          },
        }, ...options,
      }), stdout, stderr,
    });
  }
}

const BumpLevels = {
  dep: 0,
  patch: 1,
  minor: 2,
  major: 3,
};

export function getChangelogEntry(changelog, version) {
  const ast = unified().use(remarkParse).parse(changelog);
  const nodes = ast.children;

  let highestLevel = BumpLevels.dep;
  let headingStartInfo;
  let endIndex;

  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.type === "heading") {
      const stringified = mdastToString(node);
      const match = stringified.toLowerCase().match(/(major|minor|patch)/);

      if (match !== null) {
        const level = BumpLevels[match[0]];
        highestLevel = Math.max(level, highestLevel);
      }

      if (headingStartInfo === undefined && stringified === version) {
        headingStartInfo = {
          index: i, depth: node.depth,
        };
        continue;
      }

      if (endIndex === undefined && headingStartInfo !== undefined && headingStartInfo.depth === node.depth) {
        endIndex = i;
        break;
      }
    }
  }

  if (headingStartInfo) {
    ast.children = (ast.children).slice(headingStartInfo.index + 1, endIndex);
  }

  return {
    content: unified().use(remarkStringify).stringify(ast),
    highestLevel: highestLevel,
  };
}
