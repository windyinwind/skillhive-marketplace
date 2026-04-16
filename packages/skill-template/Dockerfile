FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace root config
COPY pnpm-workspace.yaml package.json ./

# Copy plugin-skillhive (dependency)
COPY packages/plugin-skillhive ./packages/plugin-skillhive

# Copy this package
COPY packages/skill-template ./packages/skill-template

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build both packages
RUN pnpm --filter @skillhive/plugin-skillhive build
RUN pnpm --filter @skillhive/skill-template build

WORKDIR /app/packages/skill-template

# Runtime env vars — set at deploy time
ENV NODE_ENV=production
ENV AGENT_WALLET_KEYPAIR=""
ENV MY_SKILL_ID=""
ENV HELIUS_GRPC_URL=""
ENV SOLANA_RPC_URL="https://api.devnet.solana.com"
ENV ESCROW_PROGRAM_ID=""
ENV SKILL_REGISTRY_PROGRAM_ID=""
ENV PLATFORM_TREASURY=""
ENV SkillHive_MARKETPLACE_URL="https://skillhive-marketplace.vercel.app"

CMD ["node", "dist/index.js"]
