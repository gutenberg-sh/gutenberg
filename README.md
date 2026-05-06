<h1 align="center">Gutenberg</h1>

<p align="center">
  <strong>Gutenberg lets anyone publish freely, privately, and permanently on Solana.</strong>
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D22.12.0-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-%3E%3D10.28.2-f69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Solana-registry-9945FF?style=flat-square&logo=solana&logoColor=white" alt="Solana" />
  <img src="https://img.shields.io/badge/Anchor-registry%20program-3E4348?style=flat-square" alt="Anchor registry program" />
</p>

---

## Why Gutenberg?

Whether you like it or not, governments and major outlets enforce a certain narrative. Work that contradicts it gets taken down, sued, or buried.

Gutenberg lets you publish freely, privately, and permanently: content is written to durable storage and registered on a public chain, signed by the author. Once published, no host, editor, or court can censor the original.

## Local by default

Publishing and reading should not depend on a company’s servers staying up, on their terms of service, or on their idea of who gets a login. Gutenberg is local first. You run the **gateway** and **indexer** yourself; wallet, RPC, and chain targets are yours. 

Nothing here assumes a hosted infrastructure. Clone the repo, copy [`.env.production`](.env.production) or [`.env.local`](.env.local), and Docker runs the stack next to you—commands in the next section.

## Run it yourself

**Prerequisites**

1. **Git** and **this repository**:
   ```bash
   git clone https://github.com/leonmeka/gutenberg.git
   cd gutenberg
   ```

2. **Docker**:

   - **macOS** ([Homebrew](https://brew.sh/)):

     ```bash
     brew install --cask docker
     ```

     Open **Docker** from Applications once and wait until it reports that the engine is running.

   - **Linux**:

     ```bash
     curl -fsSL https://get.docker.com | sudo sh
     ```

   - **Windows**: install [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/) (includes Compose) and start it before running the commands below.

**Start the stack**:

```bash
cp .env.production .env
docker compose --profile app up -d --build --wait
```

Open **http://localhost:8080**. Done!

## Developers

See **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## License

[MIT](LICENSE)
