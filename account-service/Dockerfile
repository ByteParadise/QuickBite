# syntax=docker/dockerfile:1

# ? node:22-alpine
# 22 matches what CI already pins (node-version: '22')
# This prevents "works in CI, breaks in the real container".
# alpine: minimal Linux base node image

# ? why two separate FROM node:22-alpine stages
# the deps stage's layers (lock file, nom ci output, any leftover
# install cache) never make it into the final image. This is
# what keeps the shipped image smaller.

# starts this stage from the Node base image,
# names it deps so later stages can reference it
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# installs exact dependency versions from the lock file
# (npm ci is stricter/faster than npm install), skipping any devDependencies
RUN npm ci --omit=dev

# starts a fresh stage from the same base image
FROM node:22-alpine AS runtime
WORKDIR /app
# a convention many Node libraries check to disable dev-only behavior
# and enable production optimizations
ENV NODE_ENV=production

# Run as a non-root user rather than the image's default root
RUN addgroup -S app && adduser -S app -G app

# pulls only the installed dependencies from the deps stage
# none of npm's cache or install-time files come along
COPY --from=deps /app/node_modules ./node_modules
# needed at runtime since the app's ESM lives here, and it's
# generally expected alongside node_modules
COPY package.json ./
# source code
COPY src ./src

# switch user
USER app
EXPOSE 4003
# command that runs when a container starts from this image
CMD ["node", "src/index.js"]
