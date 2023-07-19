---
title: "Using npm workspaces with Docker"
publishDate: "19 July 2023"
description: "Demonstrating a solution for using npm workspaces with Docker."
tags: ["docker", "npm workspaces", "monorepo", "node.js"]
---

## Intro

Whether starting from an existing containerized application that is being brought into an npm workspaces environment, or containerizing an existing node monorepo using npm workspaces, you might encounter some idiosyncrasies relating to how `node_modules` and `package-lock.json` are handled by npm when using workspaces. This post will demonstrate the principles needed to ensure best practices are followed.

Incorrect configuration can result in dependencies not being shared where possible, unnecessarily large bundle sizes, or inconsistent package versions.

Dependencies for this project

- Docker
- npm >= 7.0
- https://github.com/Npfries/docker-npm-workspaces

## Example Code

The [example repo](https://github.com/Npfries/docker-npm-workspaces) discussed in this post contains two applications in the `apps` directory. Other applications would also be included in the `apps` directory if there were any more. Both applications have their own Dockerfile, as each application should be independently deployable. The two applications are simple http servers. The only notable difference between them is that one uses Express, and one uses Fastify. The Dockerfiles for both of them are identical in this case.

```
FROM node:18 AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

FROM base AS start

ENTRYPOINT [ "npm", "run", "start" ]
```

Nothing about this Dockerfile suggests anything out of the ordinary. Everything here would be applicable to most Node.js applications regardless of whether or not it was in an npm workspaces monorepo. The first step is copying both package.json and package-lock.json, installing dependencies with `npm ci`, copying the rest of the code into the image, and specifying an entrypoint for the container.

Using `npm ci` is a best practice here, as it uses the package-lock.json to verify that the packages are installed with consistent versions using checksums. Unfortunately, this doesn't work out of the box.

```
# This will fail.
docker build ./apps/project-a/ -t project-a
```

Building the image from the Dockerfile as normal will fail in this situation with an error:

```
 => ERROR [base 4/5] RUN npm ci
 0.3s
------
 > [base 4/5] RUN npm ci:
#0 0.284 npm ERR! code EUSAGE
#0 0.286 npm ERR!
#0 0.286 npm ERR! The `npm ci` command can only install with an existing package-lock.json or
#0 0.286 npm ERR! npm-shrinkwrap.json with lockfileVersion >= 1. Run an install with npm@5 or
#0 0.286 npm ERR! later to generate a package-lock.json file, then try again.
...
```

To understand why, and how to prevent this, lets take a look at how npm workspaces work at a high level.

## Workspaces

npm workspaces is a built-in tool set for creating monorepos. Applications within the monorepo each have their own package.json, with their own dependencies, scripts, and other configurations specified per-project. The root of the monorepo also has a `package.json` file, and it gets a special property: `workspaces`. This is an array containing the paths to each application within this monorepo.

An application or library that is specified as a workspace is treated a little differently than a normal npm project. The biggest difference is that running `npm install` (and some other related commands) does not create a `node_modules` folder within the application directory, and it does not generate a `package-lock.json` file at that location either. Instead, both `node_modules` and `package-lock.json` are placed at the root of the monorepo. This way, shared dependencies between applications in the monorepo are installed once and shared to the projects.

Knowing this, the above error makes sense. There is no package.json in th application directories where the Dockerfile is.

## Solution

We need to provide a `package-lock.json` file to the applications in order to run `npm ci` when building the image. The only one available to us is the one in the root of the monorepo, so we will temporarily copy it from the root to each application before building the image.

```
cp ./package-lock.json ./apps/project-a/

docker build ./apps/project-a/ -t project-a

rm ./apps/project-a/package-lock.json
```

You might wonder if that means that all dependencies of all projects are going to end up in each bundled application. The short answer is no, not if things are configured properly. Fortunately, npm is smart enough to handle this.

npm will not install all dependencies in the package-lock.json, instead, it will install only the dependencies in package.json, but use use package-lock.json to verify checksums of the specified versions.

We can verify this in the example codebase by checking the /app/node_modules/ directory in the containers and seeing that project-a has Fastify packages installed, and not Express, and project-b has Express dependencies, and not Fastify.

A Makefile is provided in the root of the repo for building and starting both services in Docker.

```
make start
```

In summary, this demonstrates a simple way to fix the `npm ERR! code EUSAGE` error when using Docker with npm workspaces. There may be alternative approaches, but this is the solution I've been using. This solution does not rely on any special code or configuration within the applications, and they could be safely be removed from npm workspaces without requiring changes to the Dockerfile or the package.json in each application.
