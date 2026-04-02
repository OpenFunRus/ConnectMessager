import fs from 'fs/promises';
import path from 'path';
import { parseArgs } from 'util';
import { zipDirectory } from '../src/helpers/zip.js';
import { compile, getVersionInfo, rmIfExists, type TTarget } from './helpers.js';

const clientCwd = path.resolve(process.cwd(), '..', 'client');
const serverCwd = process.cwd();
const viteDistPath = path.join(clientCwd, 'dist');
const buildPath = path.join(serverCwd, 'build');
const buildTempPath = path.join(buildPath, 'temp');
const drizzleMigrationsPath = path.join(serverCwd, 'src', 'db', 'migrations');
const outPath = path.join(buildPath, 'out');
const releasePath = path.join(outPath, 'release.json');
const interfaceZipPath = path.join(buildTempPath, 'interface.zip');
const drizzleZipPath = path.join(buildTempPath, 'drizzle.zip');
const defaultOutputFile = 'connectmessager-server.exe';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    out: {
      type: 'string',
      default: defaultOutputFile
    }
  },
  strict: true,
  allowPositionals: true
});

const killRunningWindowsProcess = async (fileName: string) => {
  const processName = path.basename(fileName);

  if (!processName) return;

  console.log(`Stopping running ${processName} process if present...`);

  const killProc = Bun.spawn(['taskkill', '/F', '/T', '/IM', processName], {
    stdout: 'pipe',
    stderr: 'pipe'
  });

  await killProc.exited;

  // taskkill returns non-zero when the process does not exist, which is fine for our use case
  if (killProc.exitCode !== 0 && killProc.exitCode !== 128) {
    throw new Error(`Failed to stop running process: ${processName}`);
  }

  const verifyProc = Bun.spawn(['tasklist', '/FI', `IMAGENAME eq ${processName}`], {
    stdout: 'pipe',
    stderr: 'pipe'
  });

  const verifyOutput = await new Response(verifyProc.stdout).text();

  await verifyProc.exited;

  if (
    verifyProc.exitCode === 0 &&
    verifyOutput.toLowerCase().includes(processName.toLowerCase())
  ) {
    throw new Error(`Process is still running after taskkill: ${processName}`);
  }
};

await rmIfExists(buildTempPath);
await fs.mkdir(buildTempPath, { recursive: true });
await fs.mkdir(outPath, { recursive: true });

const outputFilePath = path.join(outPath, values.out);

await killRunningWindowsProcess(values.out);
await rmIfExists(outputFilePath);

console.log('Building client with Vite...');

const viteProc = Bun.spawn(['bun', 'run', 'build'], {
  cwd: clientCwd,
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit'
});
await viteProc.exited;

if (viteProc.exitCode !== 0) {
  console.error('Client build failed');
  process.exit(viteProc.exitCode);
}

console.log('Client build finished, output at:', viteDistPath);
console.log('Creating interface.zip...');

await zipDirectory(viteDistPath, interfaceZipPath);

console.log('Creating drizzle.zip...');

await zipDirectory(drizzleMigrationsPath, drizzleZipPath);

console.log('Compiling Windows server with Bun...');

const targets: TTarget[] = [
  { out: values.out, target: 'bun-windows-x64' }
];

for (const target of targets) {
  console.log(`Building for target: ${target.target}...`);

  await compile({
    out: path.join(outPath, target.out),
    target: target.target
  });
}

const releaseInfo = await getVersionInfo(targets, outPath);

await fs.writeFile(releasePath, JSON.stringify(releaseInfo, null, 2), 'utf8');
await fs.rm(buildTempPath, { recursive: true, force: true });

console.log('Connect Messager Windows build complete.');

