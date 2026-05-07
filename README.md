<p align="center">
  <img src="assets/banner.png" width="100%" alt="Gutenberg banner: miasma fog and wraith silhouette in sickly green tones" />
</p>

<h1 align="center">Gutenberg</h1>

<p align="center">
  <strong>Gutenberg is a decentralized protocol for censorship-resistant, private, permanent publishing.</strong>
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

Modern censorship is coordinated and systematic: courts issue takedowns, infrastructure providers remove access, platforms enforce quiet requests, and centralized systems enforce strict narratives. When publishing depends on a few gatekeepers, access to information can disappear overnight.

---

## Local sovereignty

Gutenberg starts from one premise: publishing should not require institutional permission. Control stays with the operator who runs the instance, so publishing decisions are not delegated to a platform, a hosting intermediary, or a central authority.

This baseline gives publishers operational sovereignty over keys, policy, and availability, creating the conditions required for independent publication.

## Protocol design

Gutenberg is built to turn that sovereignty into durable distribution. It anchors publication state on Solana to provide immutable history, separates identity from storage so no single account controls existence, and allows independent deployments to compound network resilience over time.

The result is a publishing system where suppressing information requires coordinated pressure across many operators instead of a single takedown target.

## Getting Started

This quick start launches your own Gutenberg instance on your computer. Think of it as starting your own independent publishing environment, where you can create and manage content without relying on a centralized platform.

You do not need to configure blockchain infrastructure yourself for this step. The goal is simply to get Gutenberg running locally so you can explore the interface and understand how local publishing works in practice.

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
