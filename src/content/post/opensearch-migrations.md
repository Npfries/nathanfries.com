---
title: "Opensearch Migrations"
publishDate: "17 June 2023"
description: "Leveraging existing libraries to bring migration tooling to Opensearch with Javascript."
tags: ["opensearch", "devops", "tooling"]
---

### Intro

Opensearch provides no functionality for managing the state of a cluster with respect to index templates, index mappings, analyzers, and search templates. In a typical database, we would expect to find some tooling for migrations, usually provided by an ORM. The Opensearch client library does not provide anything of the sort, and ORMs either do not support Opensearch , or do not have migration tooling that supports it.

### Outline

- Planning
  - Umzug migrations framework for Javascript projects
- Implementation
  - Abstract `CustomStorage` class
  - Opensearch REST API vs Typescript client
  - Providing executed migrations
  - Logging migrations
  - Unlogging migrations
  - Creating migrations
- Summary

### Planning

Implementing good migration tooling from scratch is not trivial enough for many teams to consider. Fortunately, we do not have to start completely from scratch. Taking a look at Sequelize , a popular open source ORM for Javascript created by engineers at Microsoft, we can see that they also published the Open source Umzug migration framework, which powers the migration tooling provided by Sequelize.
We can leverage this existing tooling and extend it to suit our needs. This will save a considerable amount of work, with the added benefit of behaving similarly to Sequelize.

### Implementation

Umzug supports multiple databases out of the box, each implementing the abstract `UmzugStorage` class. This class is exposed by the framework, and can be provided to the Umzug constructor as the `customStorage` property on the configuration.
We can create our own `OpensearchStorage` that implements `UmzugStorage`. Implementations of `UmzugStorage` must implement three methods: - `executed()` - this should return a list of executed migrations. - `logMigration()` - this should log the migration. - `unlogMigration()` - this should unlog the migration.

```javascript
// OpensearchStorage.js
import { UmzugStorage } from "umzug";

class OpensearchStorage implements UmzugStorage {
	async executed() {}
	async logMigration(params) {}
	async unlogMigration(params) {}
}

export { OpensearchStorage };
```

Another thing to consider when using Opensearch with Typescript codebases, is whether or not you prefer to use the Opensearch Javascript client library, or to use the exposed REST API. It is typical to use the Opensearch client, as it provides a pleasant and \*mostly typed abstraction for working with the Opensearch REST API.

- On one hand, the REST API is relatively stable, and the request format will be nearly identical to the QDSL syntax provided by Opensearch. We need to check for breaking changes to the REST API before upgrading Opensearch, as we will not receive deprecation warnings in our IDE.

- On the other hand, the Opensearch client library is easy to use, and we will receive deprecation warnings in our IDE when upgrading the client, but we may need to consider frequency of package updates to keep the library up to date with our Opensearch cluster.

We will be choosing the Opensearch client library for convenience. Keep in mind that the choice need to be the same for our implementation of `UmzugStorage` and the actual migrations themselves, which we will get to eventually. The team maintaining this implementation may differ from the team or teams maintaining the actual migrations, and they may have differing needs or preferences.

Before we can implement the `OpensearchStorage` class, we will need to prepare the Opensearch client. We will be importing it from `@opensearch-project/opensearch`.

```javascript
// OpensearchClient.js
import { Client } from "@opensearch-project/opensearch";

class OpensearchClient extends Client {
	constructor() {
		super({
			node: process.env.OPENSEARCH_HOST,
		});
	}
}

export { OpensearchClient };
```

We can then consume the client in `OpensearchStorage`.

```javascript
// OpensearchStorage.js
import { UmzugStorage } from "umzug";
import { OpensearchClient } from "./OpensearchClient.js";

class OpensearchStorage implements UmzugStorage {
	client: OpensearchClient;

	constructor() {
		this.client = new OpensearchClient();
	}

	async executed() {}
	async logMigration(params) {}
	async unlogMigration(params) {}
}

export { OpensearchStorage };
```

Now we are ready to implement the methods on `OpensearchStorage`. Starting with `executed`, this method does not take any arguments, and should return all previously executed migrations as an array of strings representing the names of each applied migration.

```javascript
async executed() {
  const migrationsIndexExists = (
    await this.client.indices.exists({ index: 'migrations' })
  ).body

  if (!migrationsIndexExists) {
    await this.client.indices.create({ index: 'migrations' })
    return []
  }

  const respose = await this.client.search({
    index: 'migrations',
    body: {
      query: {
        match_all: {}
      },
      size: 100
    }
  })

  const result = response?.body?.hits?.hits?.map(m => m['_source']['name']) ?? []

  return result
}
```

Let's break down what is happening here.

- First, we are checking to see if the migrations index exists. If not, we go ahead and create it, and we can assume at this point that no migrations have yet been applied, so we do an early return with an empty array. This method will be called before the others, so this might be good place to do the migration index creation.

- Next, we perform a search with a `match_all` query, in order to return all results, and we set the size to some arbitrarily high number, something higher than will be the foreseeable number of migrations. This can always be adjusted to suit needs, but should be considered, since accidentally truncating results here would result in migrations being run more than once.

- Finally, we map the results to an array containing only the names of the migrations, which is our desired return value for this method.

Moving on to `logMigration`, this method should do what its name suggests, and log the migration to the migrations index we created in `executed`.

```javascript
async logMigration(params) {
  await this.client.index({
  	index: 'migrations',
  	body: {
  	  name: params.name,
	  timestamp: new Date().toISOString()
    },
    refresh: true
  })
}
```

This method is much simpler, as all it needs to do is log the migration to the migrations index. We include a timestamp field for tracking when a particular migration was completed. We add `refresh: true` in order to wait for the record to be queryable before returning, otherwise it is possible to get into situations where calling `executed` shortly after running a migration will result in duplicate migration executions. This is most likely to happen during integration tests rather than normal migration execution, but we include it to be safe.
Lastly, we can implement `unlogMigration`.

```javascript
async unlogMigration(params) {
  await this.client.deleteByQuery({
    index: 'migrations',
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                name: params.name
              }
            }
          ]
        }
      }
    }
  })
}
```

This is almost as simple as `logMigration`, however we must perform a filter query in order to delete the correct migration.
We can put it all together and have a complete implementation of the `UmzugStorage` class.

```javascript
// OpensearchStorage.js
import { UmzugStorage } from "umzug";
import { OpensearchClient } from "./OpensearchClient.js";

class OpensearchStorage implements UmzugStorage {
	client: OpensearchClient;

	constructor() {
		this.client = new OpensearchClient();
	}

	async executed() {
		const migrationsIndexExists = (await this.client.indices.exists({ index: "migrations" })).body;

		if (!migrationsIndexExists) {
			await this.client.indices.create({ index: "migrations" });
			return [];
		}

		const respose = await this.client.search({
			index: "migrations",
			body: {
				query: {
					match_all: {},
				},
				size: 100,
			},
		});

		const result = response?.body?.hits?.hits?.map((m) => m["_source"]["name"]) ?? [];

		return result;
	}

	async logMigration(params) {
		await this.client.index({
			index: "migrations",
			body: {
				name: params.name,
				timestamp: new Date().toISOString(),
			},
			refresh: true,
		});
	}

	async unlogMigration(params) {
		await this.client.deleteByQuery({
			index: "migrations",
			body: {
				query: {
					bool: {
						filter: [
							{
								term: {
									name: params.name,
								},
							},
						],
					},
				},
			},
		});
	}
}

export { OpensearchStorage };
```

In order to use `OpensearchStorage` when we are executing migrations, we should pass it to an instance of `Umzug`. This is is usually going to be used in a CI environment, or run by a user in a local environment. As such, we will set up `Umzug` to be run as a script, instead of our application code directly.

```javascript
// migrate.js
#!/user/bin/env node
import { OpensearchStorage } from './OpensearchStorage.js'
import { OpensearchClient } from './OpensearchClient.js'
import { Umzug } from `umzug`

const client = new OpensearchClient()

const umzug = new Umzug({
  migrations: {
    glob: 'migrations/**/*.js'
  },
  logger: console,
  context: client,
  storage: new OpensearchStorage()
})

umzug.runAsCLI()
```

Let's name this file `migrate.js`. Umzug provides a helpful `runAsCLI()` helper that will parse arguments for us, saving a bit of effort. By default, Umzug is able to execute javascript migrations without any additional work. This could alternatively be modified by generating the migrations and passing in an array of migrations generated from any arbitrary source.
Let's go ahead and create our first migration. Umzug expects two exports for each migration: an up step, and a down step. As was mentioned above, we will be using the Opensearch client for both the migration tooling, as well as for the migrations themselves.

```javascript
// [date]_[name].js
module.exports = {
	async up({ context: client }) {
		await client.indices.create({
			index: "test_index",
		});
	},
	async down({ context: client }) {
		await client.indices.delete({
			index: "test_index",
		});
	},
};
```

Running `node ./migrate.js up` should result in executing any migrations in the migrations directory.

### Summary

In summary, we configured a custom storage implementation for Opensearch to provide to Umzug, our migration tool of choice. We opted to use the Opensearch client library over the REST API for simplicity. We then configured Umzug to run as a CLI after extending it with our custom storage. This is a great location to further extend the tooling to support multiple environments and hosts, such as in the case of mirrored environments. Finally, we created our first Opensearch migration. In the future, I may explore implementing an adapter to support QDSL migrations, in order to provide interoperability between Opensearch Dashboards Dev Tools and our migrations tooling.
