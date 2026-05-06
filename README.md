<p align="center">
  <img src="assets/banner.webp" width="100%" alt="Gutenberg, panoramic archive scene with title" />
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

The state's censorship apparatus is a sophisticated machine of control: courts issue suppression orders, police execute warrantless seizures, legislatures mandate backdoors, and tech giants comply with silent requests. They've built walls around information, and they hold the only keys.

---

## Why Gutenberg?

Gutenberg is a decentralized publishing protocol that is designed to dismantle centralized control.

Gutenberg strikes at three heads of control: Solana's immutable ledger makes deletion impossible; separating storage from identity eliminates centralized enforcement; each instance you deploy multiplies the redundancy, making suppression a hydra-headed problem. This is a technical solution to a political problem.

## Local by default

You control the entire stack: your keys, your nodes, your rules. Running your own infrastructure eliminates centralized points of control.

## Run it on your computer

You will need **Git**, **Docker** (installed and running), and **Node.js** with **pnpm**. [CONTRIBUTING.md](CONTRIBUTING.md) lists exact versions, troubleshooting, a local stack for experiments (not mainnet publishing), and how to reset local Docker data.

1. **Docker:** Install Docker for your system and open it once so it is running. The first launch may take a while while it downloads images.

2. **Node and pnpm:** Install Node from [nodejs.org](https://nodejs.org/), then enable Corepack and the project’s pnpm version:

```bash
corepack enable
corepack prepare pnpm@10.33.1 --activate
```

3. **Get the project:** Clone the repository and open that folder in a terminal.

```bash
git clone https://github.com/leonmeka/gutenberg.git
cd gutenberg
```

4. **Configuration:** Copy the file named `.env.production` to `.env` in the project root.

```bash
cp .env.production .env
```

5. **Start:** From the project folder:

```bash
pnpm install
pnpm stack:up
```

When the stack is up, open the app at **http://localhost:8080** and the indexer API at **http://localhost:4000**.

## License

[MIT](LICENSE)
