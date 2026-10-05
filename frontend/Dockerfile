# TASCK web image (Azure Container Apps: tasck-web).
#
# The runtime stage is recovered from the production image
# tasck-web:migration-closeout-20260909-ba0009c
# (sha256:7bec55ac1345edb182cb7df4254bbe3bbc02e339db164e5d138a5b4100ccd98b).
# Build context: frontend/

# ---- build: compile the React app -------------------------------------------
FROM node:24-bookworm-slim AS build
WORKDIR /src

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY . ./

# The browser calls the same-origin /api, which nginx proxies to tasck-api.
# An empty value is intentional (production bundle is built this way).
ENV REACT_APP_BACKEND_URL="" \
    GENERATE_SOURCEMAP=false \
    NODE_ENV=production
RUN yarn build

# ---- runtime: unprivileged nginx serving the build and proxying /api -------
FROM nginxinc/nginx-unprivileged:1.27.5-alpine

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /src/build /usr/share/nginx/html

# Overridden per environment by the Container App (the tasck-api internal URL).
ENV API_UPSTREAM=http://localhost:8000
EXPOSE 8080
