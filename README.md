<p align="center">
  <img src="assets/banner.webp" width="100%" alt="Gutenberg, panoramic archive scene with title" />
</p>

<h1 align="center">Gutenberg</h1>

<p align="center">
  <strong>Gutenberg lets anyone publish freely, privately, and permanently on Solana.</strong>
</p>

<p align="center">
  <a href="https://github.com/leonmeka/gutenberg/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/leonmeka/gutenberg/ci.yml?branch=develop&amp;style=flat-square&amp;logo=github&amp;label=CI" alt="CI status" /></a>
  <a href="https://github.com/leonmeka/gutenberg/actions/workflows/docker-publish.yml"><img src="https://img.shields.io/github/actions/workflow/status/leonmeka/gutenberg/docker-publish.yml?branch=develop&amp;style=flat-square&amp;logo=github&amp;label=Docker%20images" alt="Docker images status" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-22.22.2-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-10.33.1-f69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Solana-program-9945FF?style=flat-square&logo=solana&logoColor=white" alt="Solana program" />
  <img src="https://img.shields.io/badge/Anchor-program-3E4348?style=flat-square" alt="Anchor program" />
</p>

The state's censorship apparatus is a sophisticated machine of control: courts issue suppression orders, police execute warrantless seizures, legislatures mandate backdoors, and tech giants comply with silent requests. They've built walls around information, and they hold the only keys.

---

## Why Gutenberg?

Gutenberg is a decentralized publishing protocol that is designed to dismantle centralized control.

Gutenberg strikes at three heads of control: Solana's immutable ledger makes deletion impossible; separating storage from identity eliminates centralized enforcement; each instance you deploy multiplies the redundancy, making suppression a hydra-headed problem. This is a technical solution to a political problem.

## Local by default

You control the entire stack: your keys, your nodes, your rules. Running your own infrastructure eliminates centralized points of control.

## Run the mainnet stack

1. Install **Docker**: [Docker Desktop for Mac or Windows](https://www.docker.com/products/docker-desktop/). Install it, open it once, and leave it running.

2. Open **Terminal** (Mac) or **PowerShell** / **Command Prompt** (Windows), run:

```bash
docker pull ghcr.io/leonmeka/gutenberg:latest
docker run -d --name gutenberg \
  -p 8080:80 -p 4000:4000 \
  -v gutenberg-pg:/var/lib/postgresql/data \
  ghcr.io/leonmeka/gutenberg:latest
u=http://localhost:8080
open "$u" 2>/dev/null||xdg-open "$u" 2>/dev/null||cmd.exe /c start "$u"
```

3. Open **http://localhost:8080** in your browser. Done!

To stop and remove the container:

```bash
docker stop gutenberg && docker rm gutenberg
```

## Contributing

To contribute or change the code, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
