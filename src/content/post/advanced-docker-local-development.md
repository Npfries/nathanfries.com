---
title: "Advanced Docker Patterns for Local Development"
publishDate: "22 June 2023"
description: "How multi-stage builds, yaml merges, and some creativity can overcome the complexity that Docker brings to local environments for larger organizations."
tags: ["docker", "development", "tooling"]
---

## Intro

Often, Docker is suggested for local development to simplify dependency management, provide isolation and reproducibility, and simplify architecture differences between environments. Most examples do not go into detail about how Docker can be introduced without significantly impacting workflow. Various blogs and YouTube channels make it seem as though simply adding a 5-6 line long Dockerfile and running `docker run ...` will satisfy most requirements. That is far from the case, and Docker, if introduced improperly, will cause more headaches than problems it solves.

Dependencies for this project:
- Docker
- Node
- [https://github.com/Npfries/advanced-docker-local-development.git](https://github.com/Npfries/advanced-docker-local-development.git)

For this post, I will frequently referring to [the repository](https://github.com/Npfries/advanced-docker-local-development) containing a "basic" configuration that does actually solve some of the problems that I have encountered trying to implement Docker into my local development workflow for existing projects. 

The project largely consists of two Docker services
```
version: "3.9"

services:
  my_service:
    image: my_service
    container_name: my_service
    build:
      context: .
      target: ${DOCKER_STAGE}
    environment:
      - PORT=3000
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_URL=${DB_URL}
    ports:
      - 3000:3000
    depends_on:
      - mariadb
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      start_period: 5s
      interval: 5s
      timeout: 5s
      retries: 55

  mariadb:
    image: mariadb:jammy
    container_name: mariadb
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: db
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: mysqladmin ping -h 127.0.0.1 -u $$DB_USER --password=$$DB_PASSWORD
      start_period: 5s
      interval: 5s
      timeout: 5s
      retries: 55

```
It also contains a Dockerfile at the root of the project from which my_service will be built, with the source code contained in src/. It is a Node based project, and the package.json file contains helper scripts for executing some of the longer docker commands needed. 

## Overview

The main application, my_service, is a simple Express server, with only two endpoints: a health check, and an endpoint at `/` that checks that we can connect to the database for no reason in particular other than to prove it works. 

```
import express from "express";
const app = express();
import { PrismaClient } from "@prisma/client";

const PORT = process.env.PORT ?? 3000;

app.get("/", async (req, res) => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  await prisma.$disconnect();
  res.send("Hello, World!");
});

app.get("/healthcheck", (req, res) => {
  res.send({ health: "healthy" });
});

app.listen(PORT);
console.log(`App listening on port: ${PORT}`);
```

There are two docker compose files, docker-compose.yml and docker-compose.dev.yml, a single multi-stage Dockerfile, and three entrypoint shell scripts that will be used by the three usable stages in the Dockerfile.

I have also provided a .env file that Docker will use when using `docker compose` commands.

```
DOCKER_STAGE=start
DB_USER=user
DB_PASSWORD=password
DB_ROOT_PASSWORD=password
DB_URL=mysql://root:password@mariadb:3306/db
```

## Start:

There are two "modes" in which the project can be "started". Many developers might be familiar with the "start" vs. "dev" pattern for local development. What I mean by "start" is a simple lightweight process just executing the code. A "dev" command usually implies some additional developer tooling, like a file watcher and automatic restart, maybe some hot module reloading, etc. Our first complication is that when you introduce containers you have a new decision tree. What are we starting? A node process on our host machine? A prebuilt container image that is pulled from some image repository? A container image that should be built from our local repository? Great question, and one that is only likely asked _after_ Docker has been approved and chosen for use.

The package.json file provides three start scripts:

- `npm run start`
- `npm run start:docker:latest`
- `npm run start:docker:local`

The first, `npm run start`, is the most straightforward.

```
node ./src/index.js
```

This is the sort of script you would typically find in most package.json files created from any boilerplate or framework that isn't using Typescript. Since we're using Docker, we won't be calling this script ourselves. No, it will be reserved for our containerized application.

The second, `npm run start:docker:latest`, is much more involved, and is one of the scripts we should expect to use directly, or ideally in larger systems, have some outside manager call.

```
docker compose up --no-build --pull always -d
```

We're doing some creative things here. We are explicitly telling Docker to _not_ build this image from source, and _forcing_ it to pull the image from a remote repository, even if one is locally available. The purpose of this script is for developers who need to have this service locally, but do not need to modify it at present. Ideally this image is available on a remote repository, pushed by some pipeline automatically on commits or merges to the main branch.

The last, `npm run start:docker:local` is a little simpler.

```
docker compose up --build -d
```

This tells docker to indeed build the image from source. This should be used when a developer again does not need to develop this service, but perhaps would like to make a simple change, or check out a specific branch, or a remote image is not available for any reason.

We prefer to use start scripts over dev scripts in general when a service is not being developed. It might not be critical for a single or a handful of services, but when we start to talk about ten, twenty, _or more_ microservices and microfrontends, plus databases, reverse proxies, message queues, etc. those volume mounts and file watchers really weigh down a system. Docker is powerful but its performance is almost entirely dependent on the workload being performed.

## Dev

Moving on to the `dev` scripts, we have two.

- `npm run dev`
- `npm run dev:docker`

The first, `npm run dev`, like the first start script, is going to now be reserved for the containerized application. Keep in mind, there is nothing stopping a user from calling this script, and it will indeed work, but what about all those other services you wanted Docker for in the first place?

```
nodemon ./src/index.js
```

Just a simple file watcher and node execution.

The last script we need to talk about is `npm run dev:docker`. This is where the real magic happens.

```
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

Note that we are again using `--build` in order to force docker to build the image from source. I can't really imagine wanting to use a dev server on an image from a remote repository. If there is a use-case I've overlooked please reach out and let me know.

Additionally, we are passing in two .yml files for the configuration. Passing in multiple files like this will perform a merge on the files. It is a "deep" merge, where top level keys will not be overwritten, but merged at the deepest level possible. This is important because we would not like to completely duplicate a service, but would like to define new values or overwrite specific keys in the former config.

```
services:
  my_service:
    build:
      target: dev
    volumes:
      - "./src/:/app/src/"
```

The docker-compose.dev.yml specifies a specific target for the build. This is targeting the `dev` stage of our multi-stage Dockerfile. This stage specifies the `entrypoint-dev.sh` which includes our first dev script, `npm run dev`. This additional docker compose file also includes a new volume, so that any changes made to the /src directory are reflected in the container, and the file watcher from nodemon will pick up the changes and restart the server.

This is what the merged file would look like if it was exposed to the user:

```
version: "3.9"

services:
  my_service:
    image: my_service
    container_name: my_service
    build:
      context: .
      target: dev
    volumes:
      - "./src/:/app/src/"
    environment:
      - PORT=3000
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_URL=${DB_URL}
    ports:
      - 3000:3000
    depends_on:
      - mariadb
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      start_period: 5s
      interval: 5s
      timeout: 5s
      retries: 55

// rest of docker-compose.yml
```

Speaking of multi-stage builds, let's take a look at the Dockerfile.

```
FROM node:20-alpine as base

WORKDIR /app/
COPY package*.json /app/

FROM base as start

RUN npm ci
COPY . .
CMD ["sh", "./scripts/entrypoint-start.sh"]

FROM base AS dev

RUN npm i
COPY . .
CMD ["sh", "./scripts/entrypoint-dev.sh"]

FROM base AS prod

RUN npm ci
COPY . .
CMD ["sh", "./scripts/entrypoint-prod.sh"]
```

Note that each stage inherits from `base`. That step is common between all of them, but I made a small change to the `dev` stage to justify some other difference beyond the entrypoint because I thought somehow it might be more clear.

The various entrypoints are generally the application start scripts, along with anything that would normally need to happen. If you were deploying this node app outside of a container, you might run some migrations on a database based on a schema in your ORM, tied to your application deployment. I tried to demonstrate that here, despite the application not actually utilizing any imaginary data in the database, but wanted to show how it might work.

entrypoint-dev.sh:
```
#!/bin/sh

npx prisma migrate reset --force

npm run dev
```

entrypoint-start.sh:
```
#!/bin/sh

npx prisma migrate reset --force

npm run start
```

entrypoint-prod.sh:
```
#!/bin/sh

npx prisma migrate deploy

npm run start
```

## Conclusion

I actually quite like this setup. It might be a little enterprise-y, but I feel that it is quite clear what is happening once you have a decent understanding of Docker, and how different use-cases can be approached without too much duplication of configuration or scripts.

I plan to expand on this in order to demonstrate how tooling for larger organizations could utilize these patterns in internal tooling, in order to orchestrate a a large and complex environment in a future post. 

If you hated this and want to let me know, or if you have any questions, please email me at me@nathanfries.com.