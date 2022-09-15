import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getChangelogEntry } from './utils.mjs';

export async function createRelease({ octokit, pkg, context }) {
  try {
    const changelogFileName = join(pkg.dir, 'CHANGELOG.md');
    const changelog = await readFile(changelogFileName, { encoding: 'utf8' });
    const changelogEntry = getChangelogEntry(changelog, pkg.packageJson.version);

    if (!changelogEntry) {
      throw new Error(`Could not find changelog entry for ${pkg.packageJson.name}@${pkg.packageJson.version}`);
    }

    const tagName = `${pkg.packageJson.name}@${pkg.packageJson.version}`;

    console.log('tagName', tagName);
    console.log(changelogEntry);

    await octokit.repos.createRelease({
      name: tagName,
      tag_name: tagName,
      body: changelogEntry.content,
      prerelease: pkg.packageJson.version.includes('-'),
      ...context.repo,
    });
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}
