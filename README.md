<p align="center">
  <img src="assets/banner.webp" width="100%" alt="Gutenberg — panoramic archive scene with title" />
</p>

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

Most public writing still lives on platforms and under laws that can remove or bury it. Gutenberg is built so your work can live in durable storage and be registered on-chain, signed by you. The idea is simple: publishing that is harder to quietly erase.

## Your copy, your machine

You can run your own gateway and indexer and keep wallet and network choices local. The usual setup follows the live Solana network (mainnet) so you are publishing for real. If you are changing the code itself, see [CONTRIBUTING.md](CONTRIBUTING.md) for a fuller developer setup.

## Run it on your computer

You will need **Git**, **Docker** (installed and running), and **Node.js** with **pnpm**. Exact versions and troubleshooting live in [CONTRIBUTING.md](CONTRIBUTING.md); match those before you start if anything fails.

1. **Docker** — Install Docker for your system and open it once so it is running. The first launch may take a while while it downloads images.

2. **Node and pnpm** — Install Node from [nodejs.org](https://nodejs.org/), then enable Corepack and the project’s pnpm version (paste this into a terminal):

```bash
corepack enable
corepack prepare pnpm@10.33.1 --activate
```

3. **Get the project** — Clone the repository and open that folder in a terminal.

4. **Configuration** — Copy the file named `.env.production` to `.env` in the project root (your editor can do this if you prefer not to use the command line).

5. **Start** — From the project folder:

```bash
pnpm install
pnpm stack:up
```

By default this uses public mainnet services; you do not run your own validator in Docker. You can edit `.env` later if you want your own RPC or other endpoints.

**Trying things out locally** (not for real publishing) is described in [CONTRIBUTING.md](CONTRIBUTING.md) under the local stack and `.env.local` flow.

When the stack is up, open the app at **http://localhost:8080** and the indexer API at **http://localhost:4000**. If pages do not load, check that Docker is running. To clear local data and try again from scratch, use the stack reset steps in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
