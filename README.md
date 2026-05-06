<h1 align="center">Gutenberg</h1>

<p align="center">
  <strong>Gutenberg lets anyone publish freely, privately, and permanently on Solana.</strong>
</p>

<p align="center">
  <a href="https://github.com/leonmeka/gutenberg/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/leonmeka/gutenberg/ci.yml?branch=develop&amp;style=flat-square&amp;logo=github&amp;label=CI" alt="CI status" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-22.22.2-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-10.33.1-f69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Solana-program-9945FF?style=flat-square&logo=solana&logoColor=white" alt="Solana" />
  <img src="https://img.shields.io/badge/Anchor-program-3E4348?style=flat-square" alt="Anchor program" />
</p>

---

## Why Gutenberg?

Governments and large platforms steer most public narratives. Work that contradicts the preferred line gets taken down, sued, or buried.

Gutenberg lets you publish freely, privately, and permanently: content is written to durable storage and registered on a public chain, signed by the author. Once published, no host, editor, or court can censor the original.

## Local by default

You run the gateway and indexer yourself; wallet and RPC settings are yours. The **canonical way to run Gutenberg** is against **Solana mainnet**: your indexer follows the live chain, and publishing uses mainnet Irys settings. That is what the default Docker flow below does. If you are **developing** the repo (local validator, program deploys, custom env), use **[CONTRIBUTING.md](CONTRIBUTING.md)** instead.

## Run it yourself

**You need:** Git, Docker running on your machine, Node 22.22.2 (see [.nvmrc](.nvmrc)), and pnpm 10.33.1.

**Node 22.22.2:** Install the **22.22.2** release for your OS from the [Node.js download page](https://nodejs.org/en/download), or use a version manager. With [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm), you can run `fnm install 22.22.2 && fnm use` (or `nvm install 22.22.2 && nvm use`) before cloning. After you clone and `cd` into this repo, `fnm install` / `nvm install` followed by `fnm use` / `nvm use` reads [.nvmrc](.nvmrc) and selects the same version.

**pnpm (Corepack):** Node ships Corepack; enable it and activate the repo's pnpm version:

```bash
corepack enable
corepack prepare pnpm@10.33.1 --activate
```

**Docker:** on macOS, `brew install --cask docker` then open the app once. On Linux, [Docker’s install script](https://docs.docker.com/engine/install/). On Windows, [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/). The first stack start can take a few minutes while images download.

**Clone:**

```bash
git clone https://github.com/leonmeka/gutenberg.git
cd gutenberg
```

**Recommended: mainnet:** copy [`.env.production`](.env.production) to `.env`, then:

```bash
pnpm install
pnpm stack:up
```

This stack talks to public mainnet RPC and Irys; you do not run a validator in Docker. Adjust `.env` if you use your own RPC or endpoints.

**Optional: local test validator** (for development only; see [CONTRIBUTING.md](CONTRIBUTING.md)):

```bash
cp .env.local .env
pnpm install
pnpm stack:up:local
```

Open the app at **http://localhost:8080**. The indexer API is on **http://localhost:4000** (try **http://localhost:4000/health** in the browser or with curl).

If ports stay dead, make sure Docker is actually running. To wipe local database data and start over: `pnpm stack:reset`, then bring the stack up again (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Developers

The **[CONTRIBUTING.md](CONTRIBUTING.md)** developer flow covers local chain setup, the registry program, env files, and pull requests.

## License

[MIT](LICENSE)
