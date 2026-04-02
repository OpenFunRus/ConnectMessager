import type { TArtifact } from '@connectmessager/shared';
import fs from 'fs/promises';
import path from 'path';
type TReleaseMetadata = {
  version: string;
  releaseDate: string;
  artifacts: TArtifact[];
};


const buildScriptDir = import.meta.dir;
const serverCwd = path.resolve(buildScriptDir, '..');
const rootCwd = path.resolve(serverCwd, '..', '..');

const rootPckJson = path.join(rootCwd, 'package.json');
const serverPckJson = path.join(rootCwd, 'apps', 'server', 'package.json');
const clientPckJson = path.join(rootCwd, 'apps', 'client', 'package.json');
const sharedPckJson = path.join(rootCwd, 'packages', 'shared', 'package.json');
const windowsIconPath = path.join(
  rootCwd,
  'apps',
  'client',
  'public',
  'favicon.ico'
);

const unpack = async (tgzPath: string, outDir: string) => {
  const tarProc = Bun.spawn(['tar', '-xzf', tgzPath, '-C', outDir], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit'
  });
  await tarProc.exited;

  if (tarProc.exitCode !== 0) {
    throw new Error(`Failed to unpack ${tgzPath}`);
  }
};

const downloadMediasoupBinary = async (
  version: string,
  target: Bun.Build.Target
) => {
  let url = `https://github.com/versatica/mediasoup/releases/download/${version}/`;
  let fileName = '';

  switch (target) {
    case 'bun-linux-x64':
      url += `mediasoup-worker-${version}-linux-x64-kernel6.tgz`;
      fileName = 'mediasoup-worker';
      break;
    case 'bun-windows-x64':
      url += `mediasoup-worker-${version}-win32-x64.tgz`;
      fileName = 'mediasoup-worker.exe';
      break;
    default:
      throw new Error(`Unsupported target for mediasoup binary: ${target}`);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download mediasoup binary for target ${target}: ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const targetPath = path.join(
    serverCwd,
    'build',
    'temp',
    `mediasoup-worker-${target}.tgz`
  );

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);

  await unpack(targetPath, path.join(serverCwd, 'build', 'temp'));

  return fileName;
};

const getCurrentVersion = async () => {
  const pkg = JSON.parse(await fs.readFile(rootPckJson, 'utf8'));

  return pkg.version;
};

const getMediasoupVersion = async () => {
  const serverPkg = JSON.parse(await fs.readFile(serverPckJson, 'utf8'));

  return serverPkg.dependencies['mediasoup'].replace('^', '');
};

const patchPackageJsons = async (newVersion: string) => {
  const packageJsonPaths = [
    rootPckJson,
    serverPckJson,
    clientPckJson,
    sharedPckJson
  ];

  for (const pckPath of packageJsonPaths) {
    const pkg = JSON.parse(await fs.readFile(pckPath, 'utf8'));

    pkg.version = newVersion;

    await fs.writeFile(pckPath, JSON.stringify(pkg, null, 2), 'utf8');
  }
};

type TTarget = {
  out: string;
  target: Bun.Build.Target;
};

const runWindowsCompile = async (args: string[]) => {
  const buildProc = Bun.spawn(args, {
    cwd: serverCwd,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit'
  });

  const [stdoutText, stderrText] = await Promise.all([
    new Response(buildProc.stdout).text(),
    new Response(buildProc.stderr).text()
  ]);

  await buildProc.exited;

  if (stdoutText.trim()) {
    process.stdout.write(stdoutText);
  }

  if (stderrText.trim()) {
    process.stderr.write(stderrText);
  }

  return {
    exitCode: buildProc.exitCode,
    stdoutText,
    stderrText
  };
};

const compile = async ({ out, target }: TTarget) => {
  const version = await getCurrentVersion();
  const mediasoupVersion = await getMediasoupVersion();
  const mediasoupBinary = await downloadMediasoupBinary(
    mediasoupVersion,
    target
  );

  const entryPoints = [
    path.join(serverCwd, 'src', 'index.ts'),
    path.join(serverCwd, 'build', 'temp', 'drizzle.zip'),
    path.join(serverCwd, 'build', 'temp', 'interface.zip'),
    path.join(serverCwd, 'build', 'temp', mediasoupBinary)
  ];

  if (target === 'bun-windows-x64') {
    const baseArgs = [
      'bun',
      'build',
      '--compile',
      `--outfile=${out}`,
      `--target=${target}`,
      '--define',
      `process.env.CONNECTMESSAGER_ENV="production"`,
      '--define',
      `process.env.CONNECTMESSAGER_BUILD_VERSION="${version}"`,
      '--define',
      `process.env.CONNECTMESSAGER_BUILD_DATE="${new Date().toISOString()}"`,
      '--define',
      `process.env.CONNECTMESSAGER_MEDIASOUP_BIN_NAME="${mediasoupBinary}"`,
      '--define',
      `process.env.CURRENT_VERSION="${version}"`,
      ...entryPoints
    ];
    const metadataArgs = [
      `--windows-icon=${windowsIconPath}`,
      '--windows-title=Connect Messager',
      '--windows-publisher=Connect Messager',
      '--windows-description=Connect Messager Server',
      '--windows-version=0.0.1.0'
    ];

    let result = await runWindowsCompile([...baseArgs, ...metadataArgs]);

    if (
      result.exitCode !== 0 &&
      `${result.stdoutText}\n${result.stderrText}`.includes(
        'Failed to set Windows metadata'
      )
    ) {
      console.warn(
        'Windows metadata embedding failed in Bun, retrying build without metadata flags...'
      );
      result = await runWindowsCompile(baseArgs);
    }

    if (result.exitCode !== 0) {
      throw new Error(`Failed to compile Windows target: ${target}`);
    }

    return;
  }

  await Bun.build({
    entrypoints: entryPoints,
    compile: {
      outfile: out,
      target
    },
    define: {
      'process.env.CONNECTMESSAGER_ENV': '"production"',
      'process.env.CONNECTMESSAGER_BUILD_VERSION': `"${version}"`,
      'process.env.CONNECTMESSAGER_BUILD_DATE': `"${new Date().toISOString()}"`,
      'process.env.CONNECTMESSAGER_MEDIASOUP_BIN_NAME': `"${mediasoupBinary}"`,
      'process.env.CURRENT_VERSION': `"${version}"`
    }
  });
};

const getFileChecksum = async (filePath: string) => {
  const fileBuffer = await fs.readFile(filePath);
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
};

const getVersionInfo = async (
  targets: TTarget[],
  outPath: string
): Promise<TReleaseMetadata> => {
  const version = await getCurrentVersion();

  const artifacts: TArtifact[] = [];

  for (const target of targets) {
    const artifactPath = path.join(outPath, target.out);

    artifacts.push({
      name: path.basename(artifactPath),
      target: target.target.replace('bun-', ''),
      size: (await fs.stat(artifactPath)).size,
      checksum: await getFileChecksum(artifactPath)
    });
  }

  const versionInfo: TReleaseMetadata = {
    version,
    releaseDate: new Date().toISOString(),
    artifacts
  };

  return versionInfo;
};

const rmIfExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    await fs.rm(filePath);
  } catch {
    // ignore
  }
};

export {
  compile,
  downloadMediasoupBinary,
  getCurrentVersion,
  getVersionInfo,
  patchPackageJsons,
  rmIfExists
};
export type { TTarget };


