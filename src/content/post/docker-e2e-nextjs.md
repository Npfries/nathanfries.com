---
title: "Docker for Next.js and Beyond with Hot-Swappable Containers"
publishDate: "25 June 2023"
description: "Demonstrating the stages of development, testing, deployment, and long term support with Docker multi-stage builds, Docker Compose, and GitHub Actions."
tags: ["docker", "next.js", "github"]
---

## Intro

Hot-swappable containers are one of my favorite features of Docker, and one that is often not implemented for local development. This post should hopefully equip you with enough information for you to implement this, or something to similar effect in your own codebase (if you find it to be useful). If you read my previous post, [Advanced Docker Patterns for Local Development](https://nathanfries.com/posts/advanced-docker-local-development/), and feel like you don't need to revisit any of that information, you can skip to "Common Pitfalls."

I should probably define "hot-swappable containers." What I mean is the ability, through a single command, to swap out a running container with another.

Dependencies for this project

- Docker
- https://github.com/Npfries/docker-e2e-nextjs

This project was initially scaffolded with:

```
npx create-next-app@latest
```

To clone the repo:

```
git clone https://github.com/Npfries/docker-e2e-nextjs.git
```

## Scenario

Scenario: I am a developer working on the User Service. I am happy with User Service, because it provides me with a "development mode" that reflects changes instantly thanks to a Docker volume binding the source code on the host to the container, and a file watcher that restarts the service when changes are made. I usually need the Search Service _running_ in my local environment to facilitate testing the behavior of the two services working together. I don't usually need to make changes to the Search Service, so I have been happy to just pull the latest prebuilt image from the image repository. Something happens, and now I need to make a change to Search Service. How can I quickly swap this Search Service container with a "development mode" container, like I have been using for User Service.

In this scenario, wouldn't it be great if there was a single command I could run like:

```
# Search Service
> make dev              # Removes the lightweight container
                        # Starts a dev mode container

```

This would replace my existing Search Service container with a development mode container, built from source, and with the same file watcher and dev server setup as User Service? And hopefully the inverse can be extended to User Service (use a lightweight container without symlinks and file watchers) since I am not going to be make changes to it for the time being.

```
# User Service
> make start_local      # Removes the dev mode container
                        # Starts a lightweight container
```

By the end of this, hopefully you will feel equipped to bring these features to your Next.js (or any) codebase.

## Common pitfalls

Often, engineering teams already utilizing Docker for local development fall into one of two camps:

- Many containers running development servers and file watchers (`next dev`)
- Many containers serving built version of the app that must be rebuilt when changes are made (`next build && next start`)

In the case of many development servers, you generally also have a volume for passing the source code from the host to the running container. The development server is watching the mounted source code files within the container, and will restart when changes are detected. This is good for us developers, as our changes are immediately reflected within our containerized application.

Unfortunately, this approach does not come without its tradeoffs:

- Resource contention: When you have multiple Docker bind mounts, file watchers, and development servers running concurrently, you can quickly reach resource limits of both Docker and your file system.
- Managing version control: Mounting the source code on the host can mean ensuring you are always pulling latest changes down in individual repositories unless you are working in a monorepo.

In the case of built services (`next start`), they usually come in two flavors: prebuilt images pulled from the project's image repository, or images built from source on the host machine. Images pulled from an image repository have the advantage of not needing to be rebuilt on each host, speeding up the time required to start the service, and alleviating the concern of working on old version of the image. When you need a specific branch, or have local changes that should be reflected in the container, the image can be rebuilt from source whenever necessary.

This also carries some downside:

- Changes to the source code require the image to be rebuilt, or a development server to run on the host (this is not always possible in complex projects, such as when the container expects to be within the Docker network or served by a reverse proxy).

There is no good reason that each method can be supported, and even selectively utilized on a per-container basis. This is a best-of-both-worlds scenario where containers can be toggled from three different "modes" in this project: "dev", "start_local", and "start_latest". Defining each "mode":

- "start_latest": The latest image is pulled from the image repository, with an entrypoint of "next start"
- "start_local": The image for the app is built from source, with an entrypoint of "next start"
- "dev": The image for the Next.js app is built from source, with an entrypoint of "next dev" and the project source code is mounted from the host to the container.

Ideally, this should be implemented in a way that doesn't require the user to have a large amount of knowledge or context within the project. On the other hand, this should not be implemented in a way that reduces flexibility. Escape hatches should be provided. Things to avoid:

- Hiding the Dockerfile, docker-compose.yml or other required files away in the hopes that the user never needs to leave you abstraction.
- Creating a merely implicit contract between repositories.

[In my prior post](https://nathanfries.com/posts/advanced-docker-local-development/) I outlined how this can be achieved with with a simple project. I wanted to follow up on that and implement a more comprehensive end-to-end demo using a common framework, Next.js, and also demonstrate how this would be implemented into a more complex deployment process. Unlike the last project, this one also utilizes GitHub Actions to push our latest image to my [GitHub image repository](https://github.com/Npfries/docker-e2e-nextjs/pkgs/container/docker-e2e-nextjs).

## Building the image in CI

I am using GitHub actions to build the image for the Next.js application and push it to the image repository. This was achieved by utilizing one of the prebuilt "Docker" GitHub Actions suggested when I opened the GitHub Actions tab in GitHub.

```
name: Create and publish a Docker image

on:
  push:
    branches: ['main']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push-image:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Log in to the Container registry
        uses: docker/login-action@65b78e6e13532edd9afa3aa52ac7964289d1a9c1
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@9ec57ed1fcdbf14dcef7dfbe97b2010124a938b7
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}

      - name: Build and push image
        uses: docker/build-push-action@f2a1d5e99d037542a71f64918e516c093c6f3fc4
        with:
          context: .
          target: start
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

```

I am targeting a specific stage in the multi-stage Dockerfile for the project, "start". This is the image that will be pulled when running the "start_latest" script in the provided Makefile. This stage is also targeted when running the "start_local" script, however the stage is target instead in the docker-compose.start.yml file.

After this image was built and pushed to the image repository, I updated the docker-compose.yml file to use this image. Now, when a plain `docker compose up -d` is executed, the image is pulled and the container is started without needing to have any knowledge about the project. If someone simply wants to start the service in order to test it or run it alongside other services being developed, they can use standard Docker commands. This is a useful escape hatch. It also allows the image to be pulled when running the `make start_latest` script, without providing a different image in the docker-compose.start.yml file.

## Helper scripts

I provided several helper scripts that run Docker commands achieving the different modes in which we can run the service. Each of the scripts starts with the base docker-compose.yml file.

```
# docker-compose.yml
version: "3.9"

services:
  next_app:
    image: ghcr.io/npfries/docker-e2e-nextjs:main
    build:
      context: ../
      # target:     # this is specified in the other compose files
    ports:
      - 3000:80
```

This is a pretty bare-bones docker-compose.yml file! Something a bit out of the ordinary is the port mapping. You might be accustomed to the service in a development container being some non-80 port, but in this case it is 80. It is simpler to be consistent with port mapping, so that the mapping can be defined on the base docker-compose.yml. Because the httpd image is used for prod_static, and is served from port 80, the mapping needs to be consistent. Remember, you cannot override configs by passing multiple docker-compose.yml files to Docker commands, they are additive only.

```
# Makefile
start_latest:
	docker compose -f ./docker/docker-compose.yml -f ./docker/docker-compose.start.yml -p my_project up -d --no-build --pull always

# docker-compose.start.yml
services:
  next_app:
    container_name: "next_app-start"
    build:
      target: start
```

I am passing in, in addition to the docker-compose.yml file, a docker-compose.start.yml. This file overrides the container name, appending "-start". This is useful for knowing in which mode the currently running service is, without impacting the hot-swappability of the container.

As for the additional arguments, `--no-build --pull always`, these prevents the file from being built locally, ensuring that the script isn't lying to the user, and is always using the latest image in the repository. By default, if there was an image available in the remote repository, it would pull from that, but fall back to building.

```
# Makefile
start_local:
	docker compose -f ./docker/docker-compose.yml -f ./docker/docker-compose.start.yml -p my_project up -d --build

# same docker-compose.start.yml above
```

This uses the same docker-compose.yml files as above, but uses the `--build` argument in order to force Docker to build the image from source. As mentioned above, the default behavior would be for Docker to first attempt to pull the image from the remote image repository, which in this case, I don't want.

```
# Makefile
dev:
	docker compose -f ./docker/docker-compose.yml -f ./docker/docker-compose.dev.yml -p my_project up -d --build

# docker-compose.dev.yml
services:
  next_app:
    container_name: "next_app-dev"
    build:
      target: dev
    volumes:
      - ../:/app/
```

Instead of the docker-compose.start.yml, this one uses docker.compose.dev.yml. This file overrides the target stage to the `dev` stage of the Dockerfile, and also creates a volume providing the source code from the host to the container. When changes are made to the source code on the host, the symlink that the volume creates reflects the changes to the container, and the file watcher from `next dev` updates the running application. This way, live reloading works just as it does by running `npm run dev` in a Next.js project running outside of Docker.

```
prod:
	docker compose -f ./docker/docker-compose.yml -f ./docker/docker-compose.prod.yml -p my_project up -d --build

prod_static:
	docker compose -f ./docker/docker-compose.yml -f ./docker/docker-compose.prod_static.yml -p my_project up -d --build

# the additional docker-compose.yml files target the "prod" and "prod_static" stages, respectively.

```

These two scripts are largely interchangeable for local development, but there is a significant difference when it comes to deployment. This will be detailed later when examining the Dockerfile.

There are some downsides to all this container hot-swapping. Between our multi-stage builds, and resulting images being pulled and built frequently, we end up with _a lot_ of "dangling" images. This will quickly fill up a hard drive, and should be cleaned up frequently. I have a small confession to make. All of the scripts above have a second line: `docker rmi $$(docker images -f "dangling=true" -q)`. This cleans up those dangling images. However you choose to implement this feature, you should plan to deal with this somehow.

## Dockerfile

```
FROM node:18 AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

FROM base AS builder

RUN npm run build

CMD []

FROM base AS builder_static

COPY next.static.config.js /app/next.config.js

RUN npm run build

CMD []

FROM builder AS start

ENTRYPOINT [ "npm", "run", "start:docker" ]

FROM base AS dev

ENTRYPOINT ["npm", "run", "dev:docker"]

FROM node:18-alpine AS prod

WORKDIR /app

COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules/ ./node_modules/
COPY --from=base /app/public/ ./public/
COPY --from=builder /app/.next/ ./.next/

ENTRYPOINT ["npm", "run", "start:docker"]

FROM httpd:2.4 AS prod_static

COPY --from=builder_static /app/out/ /usr/local/apache2/htdocs/
```

This is not a comprehensive guide to multi-stage builds, but essentially what is happening here is defining multiple stages that can be targeted with the `--target` argument of `docker build`, or within a docker-compose.yml file. Docker will build that stage, and any stage that it inherits from (the FROM statement). It will not necessarily execute from top to bottom, but instead can skip any stages that are not dependencies of the target stage.

I have tried to minimize duplicate work, and adhere to some best practices for production stages. For example the prod_static stage does not inherit from `base` or `builder`, but instead only copies the produced artifacts from the `builder_static` stage. This reduces the surface area of potential attack vectors, by not including unnecessary code or tools in the final image.

Here is a chart to illustrate the stages that will be utilized by each Makefile script.

|                | start_latest | start_local | dev | prod | prod_static |
| -------------- | ------------ | ----------- | --- | ---- | ----------- |
| base           | ✅           | ✅          | ✅  | ✅   | ✅          |
| builder        | ✅           | ✅          |     | ✅   |             |
| builder_static |              |             |     |      | ✅          |
| start          | ✅           | ✅          |     |      |             |
| dev            |              |             | ✅  |      |             |
| prod           |              |             |     | ✅   |             |
| prod_static    |              |             |     |      | ✅          |

## Try it out

If you would like to try out the commands, clone or fork the repo and run:

```
> make start_local
```

After the build completes, checking the running containers should yield a container next_app-start.

```
> docker ps

CONTAINER ID   IMAGE                 NAMES
afd2e26dd86a   ghcr.io/npfries/...   next_app-start
```

Switching to development mode:

```
> make dev
```

You should see some output about the build, and lastly some output about the prior dangling image being cleaned up. If you want to see what happens without the cleanup scripts, you can remove them and watch the dangling images pile up for fun.

```
> docker ps

CONTAINER ID   IMAGE                 NAMES
7406f5af332a   ghcr.io/npfries/...   next_app-dev
```

Notice that the container name was changed to next_app-dev. However, we never explicitly told Docker to remove the old next_app-start. Docker did this automatically because as far as Docker is concerned, they are the same service. They share the same top-level service definition in the docker-compose.yml files, so it automatically shuts down the old container when the new one is built and ready to be started. This avoids any port mapping conflicts or other potential issues.

My motivation for writing these posts about Docker is a perceived gap in knowledge and utilization of Docker. Either the Dockerfile in a repo tends to be owned by a DevOps team, focused on CI and deployment, or by the dev team alone, focused on local development workflows. I hope that this example provides some ideas around how a great local development experience can be maintained alongside complex deployment requirements.

Feel free to use the ideas or code in your own projects. If you have any questions or feedback, feel free to email me at me@nathanfries.com.
