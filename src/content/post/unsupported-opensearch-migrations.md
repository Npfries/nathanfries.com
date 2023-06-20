---
title: "Unsupported: Opensearch Migrations"
publishDate: "19 June 2023"
description: "Stop using Openseach Dashboards to manage your indices."
tags: ["opensearch", "devops", "tooling", "elasticsearch", "kibana"]
---

### Intro

MySQL, Postgres, and MongoDB all have something in common: numerous ORMs and open source tools that provide migrations as a first class citizen. Why? Because they are extremely powerful for ensuring:

- Changes are tracked in version control
- Reproducibility
- Ability to quickly revert changes

Opensearch (and Elasticsearch), for one reason or another, does not share this trait with other data stores. I won't be exploring the reasons behind this, but instead will be focusing on trying to convince you that migrations for Opensearch are beneficial and worth integrating into your workflow for application search.

### Background

Opensearch usage is generally classified into two distinct buckets:

- Static data
- Dynamic data

Elasticsearch, and Opensearch by extension, would classify things like application search (providing search functionality to users within your application) as "static" while things like time-series data such as logs would be considered "dynamic." The distinction is not so important when it comes to searching the data in tools like Kibana or Opensearch Dashboards, but more-so considering how that data will be searched. I will be focusing on "Static" data for this post, as this is the most likely scenario where users may realize the fragility of most Opensearch configurations.

When we integrate our applications with databases APIs, we expect some stability and guarantees around expected - _and actual_ - state. We reach into our developer toolboxes for tools such as integration tests, contract tests, migrations, etc. to provide confidence when deploying our applications. For example, using popular ORMs like Sequelize, TypeORM, or Prisma provides out-of-the-box migration functionality. Running a migration for creating a new table is as simple as defining a model and running some variant of a `migrate up` command. Regardless of the state of the database or environment, we can be assured that when the command completes successfully the database will be in the expected state.

### Problem

Opensearch and Elasticsearch have limited (or no) support from most well-known ORMs. Any support at all is uncommon, and full support for defining models and executing migrations is rarer still. Frequently configurations such as index settings, mappings, analyzers, search templates, index templates, aliases, etc. are managed by making changes via the REST API, or the Kibana or Opensearch Dashboards Dev Tools.

Imagine making schema changes in MySQL by manual operation by connecting to the database with MySQL Workbench, or needing to define models in a bash script with cURL commands. You have no guarantees that drift hasn't occurred, and often no simple way to safely test changes, or even roll back when incorrect changes are deployed. It doesn't need to be this way.

Elasitcsearch and Opensearch might seem closely related to other document databases, however its complexity often results in schemas that are just as rigid as a structured database. Defined field mappings prevent dissimilar types across documents, as do dynamic mappings. When we need to make a change to an existing mapping, we must reindex. That can be a scary operation, and not one personally I would like to do manually.

When changes are inevitably made, we would like to perform some automated testing. I tend to rely heavily on integration tests in short lived ephemeral environments in most of my processes, and a simple App -> Opensearch integration test should not be too complicated. However, IaC and quick deployment of Opensearch can be somewhat cumbersome. We can quickly get a working Docker project spun up with Opensearch to perform the tests, however it will be a blank slate. How do we get to the point where our various index configurations are applied consistently in a continuous integration pipeline?

### Migrations to the rescue

Database Migrations should be considered table stakes for serious projects, and Opensearch should be no exception. If you are familiar with Opensearch Dashboards or Kibana, the following syntax may be familiar to you.

```
PUT my_index
{
  "mappings": {
    "properties": {
      "name": "text",
      "description": "text",
      "timestamp": "date"
    }
  }
}
```

Elasticsearch and Opensearch use what they call Query DSL. It is a JSON-like syntax, with syntactic sugar for defining the REST methods and endpoints. In this example, maintainers might expect to use this within the Dev Tools of either Opensearch Dashboards or Kibana. Without migrations, where would this be tracked, versioned, or code review? Perhaps we have a DBA that that runs stored commands in our repository, perhaps we have this formatted as a cURL command in a bash script we can run against the host, or perhaps some other solution.

There is no reason we could not adopt patterns from other database tooling, and implement migrations ourselves if our current tooling does not support it. [In another post,](https://nathanfries.com/posts/opensearch-migrations) I go through the process of implementing a migration CLI for consuming migrations written in Javascript using the Opensearch client library, however this could be extended to support migrations written in Query DSL.

Once we have some rudimentary migration tooling in place, we can execute migrations with commands as simple as `migrate up` or `migrate down` in order for our environments to be configured or torn down, respectively.

Now, implementing integration tests in our continuous integration pipeline is just a matter of spinning up a small Elasticsearch or Opensearch host, executing a `migrate up` command, and running our test suite. We can tear the environment down, with the confidence that our state is managed externally, and we can recreate it any time we wish.

DBAs and developers no longer need to worry about a copy-paste mishap, and we can sleep easy at night.
