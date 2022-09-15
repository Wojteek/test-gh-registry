const { getPackages } = await import('@manypkg/get-packages')
const { createExec } = await import('${{ github.workspace }}/scripts/gh-exec.mjs');
const cwd = process.cwd();
const { packages } = await getPackages(cwd);
const newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
const releasedPackages = [];
const packagesByName = new Map(packages.map((pkg) => [pkg.packageJson.name, pkg]));
const execAsync = createExec(exec);
const { stdout } = await execAsync('yarn', ['changeset', 'tag'], {
    cwd,
});

for (const line of stdout.split('\n')) {
    const match = line.match(newTagRegex);
    if (match === null) {
        return;
    }

    const pkgName = match[1];
    const pkg = packagesByName.get(pkgName);
    if (!pkg) {
        return;
    }

    releasedPackages.push(pkg);
}

core.setOutput('releasedPackages', JSON.stringify(releasedPackages));
