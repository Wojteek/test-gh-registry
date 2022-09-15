import { getPackages } from '@manypkg/get-packages';
import { createExec } from './gh-exec.mjs';

export async function getChangesetCreatedTags({ exec, cwd }) {
    const { packages } = await getPackages(cwd);
    const execAsync = createExec(exec);
    const releasedPackages = [];
    const newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
    const packagesByName = new Map(packages.map((pkg) => [pkg.packageJson.name, pkg]));
    const changesetTagCommandOutput = await execAsync('yarn', ['changeset', 'tag'], { cwd });

    for (const line of changesetTagCommandOutput.stdout.split('\n')) {
        const match = line.match(newTagRegex);
        if (match === null) {
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
