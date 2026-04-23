const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const outputDir = path.join(rootDir, 'dist');
const excludedEntries = new Set([
    'build.js',
    'dist',
    'env.js',
    'node_modules',
    'package.json',
]);
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';

function copyRecursive(sourcePath, destinationPath) {
    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
        fs.mkdirSync(destinationPath, { recursive: true });
        for (const entry of fs.readdirSync(sourcePath)) {
            if (excludedEntries.has(entry)) {
                continue;
            }

            copyRecursive(
                path.join(sourcePath, entry),
                path.join(destinationPath, entry),
            );
        }
        return;
    }

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
}

fs.rmSync(outputDir, { recursive: true, force: true });
copyRecursive(rootDir, outputDir);

const envFilePath = path.join(outputDir, 'env.js');
const envFileContents = [
    'window.MINDTECH_CONFIG = window.MINDTECH_CONFIG || {',
    `    API_BASE_URL: ${JSON.stringify(apiBaseUrl)},`,
    '};',
    '',
].join('\n');

fs.writeFileSync(envFilePath, envFileContents, 'utf8');
