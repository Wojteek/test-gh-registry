const { createRequire } = __original_require__('module');
const cwd = process.cwd();
const _require = createRequire(cwd);
const { getPackages } = _require('@manypkg/get-packages');

let myError = '';
console.log(getPackages);
const { packages, tool } = await getPackages(cwd);

console.log(packages);

const newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
const skipRegex = /Skipping tag \(already exists\):\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
const releasedPackages = [];
const options = {
  cwd,
  listeners: {
    stdout: (data) => {
      const match = data.toString().match(newTagRegex);
      const matchSkip = data.toString().match(skipRegex);

      console.log(matchSkip);

      if (match === null) {
        return;
      }

      console.log('match', match);

      releasedPackages.push(match[1]);
    },
    stderr: (data) => {
      myError += data.toString();
    },
  },
};

await exec.exec('yarn', ['changeset', 'tag'], options);

console.log('releasedPackages', releasedPackages);
