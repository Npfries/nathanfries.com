---
title: "Neural Search Quickstart for OpenSearch"
publishDate: "3 August 2023"
description: "Going from zero to Neural Search in under 5 minutes."
tags: ["neural search", "ML", "k-NN", "opensearch"]
---

## Intro

Neural Search is now generally available as of OpenSearch version 2.9.0. The Neural Search plugin allows the use of pre-trained models for indexing text segments to existing k-NN enabled indices, as well as transforming queries into the same vector space. You don't need to train any models yourself, and you don't need any specialized hardware. All you need is Docker (well, at least in order to get up and running in five minutes following this guide).

Dependencies for this project

- Docker
- https://github.com/Npfries/opensearch-neural-search

## Neural Search

Neural Search is OpenSearch's end to end vector embedding and search solution, leveraging existing k-NN search features and off-the-shelf NLP models for vector encoding. This example is using the `huggingface/sentence-transformers/all-MiniLM-L12-v2` model, which transforms sentences and paragraphs into 384 dimensional vector space.

Suppose we have a list of movie titles, and would like to provide some basic semantic search capability. Historically, this would be achieved by having high quality metadata available for searching based on relevance. Descriptions, lists of actors, genres, etc. would be needed to ensure high quality search results. In this example, we are working with a _lot_ less data, yet the semantic search capability is still quite usable for many applications.

For example, the following list of movies are inserted into the `movies` index. Note that the only information we have available is the move title.

```
POST /movies/_bulk
{ "index": {} }
{ "title": "Star Wars" }
{ "index": {} }
{ "title": "Lord of the Rings" }
{ "index": {} }
{ "title": "Spiderman" }
{ "index": {} }
{ "title": "Indiana Jones" }
```

Here is an example search performed using the "neural_search_template" search template.

```
GET /movies/_search/template
{
  "id": "neural_search_template",
  "params": {
    "query": "lightsaber",
    "from": 0,
    "size": 1
  }
}
```

In the result, we can see that "Star Wars" is the top hit. If you are familiar with Elasticsearch or OpenSearch, but haven't used Neural Search or another means of NLP and k-NN search, this might be surprising.

```
{
  "took": 40,
  "timed_out": false,
  "_shards": {
    "total": 1,
    "successful": 1,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": {
      "value": 7,
      "relation": "eq"
    },
    "max_score": 0.5106329,
    "hits": [
      {
        "_index": "movies",
        "_id": "ZluZuIkBNHby32LgCK2-",
        "_score": 0.5106329,
        "fields": {
          "title": [
            "Star Wars"
          ]
        }
      }
    ]
  }
}
```

## Starting OpenSearch

Here is an example Docker Compose file that configures one master node as a data node, and one dedicated ML node. This configuration should be used for development purposes only, it is not a production ready configuration. This file is provided in the [example repo](https://github.com/Npfries/opensearch-neural-search) if you prefer to pull it instead of creating your own docker-compose.yml file.

```
version: '3.9'
services:
  opensearch-node1:
    image: opensearchproject/opensearch:2.9.0
    container_name: opensearch-data-node
    environment:
      - cluster.name=opensearch-cluster
      - node.name=opensearch-node1
      - discovery.seed_hosts=opensearch-node1,opensearch-node2
      - cluster.initial_cluster_manager_nodes=opensearch-node1
      - bootstrap.memory_lock=true
      - "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m"
      - "DISABLE_INSTALL_DEMO_CONFIG=true"
      - "DISABLE_SECURITY_PLUGIN=true"
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - opensearch-data1:/usr/share/opensearch/data
    ports:
      - 9200:9200
      - 9600:9600
    networks:
      - opensearch-net

  opensearch-node2:
    image: opensearchproject/opensearch:2.9.0
    container_name: opensearch-ml-node
    environment:
      - cluster.name=opensearch-cluster
      - node.name=opensearch-node2
      - node.roles=ml
      - discovery.seed_hosts=opensearch-node1,opensearch-node2
      - cluster.initial_cluster_manager_nodes=opensearch-node1
      - bootstrap.memory_lock=true
      - "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m"
      - "DISABLE_INSTALL_DEMO_CONFIG=true"
      - "DISABLE_SECURITY_PLUGIN=true"
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - opensearch-data2:/usr/share/opensearch/data
    networks:
      - opensearch-net
  opensearch-dashboards:
    image: opensearchproject/opensearch-dashboards:latest
    container_name: opensearch-dashboards
    ports:
      - 5601:5601
    expose:
      - "5601"
    environment:
      - 'OPENSEARCH_HOSTS=["http://opensearch-node1:9200","http://opensearch-node2:9200"]'
      - "DISABLE_SECURITY_DASHBOARDS_PLUGIN=true"
    networks:
      - opensearch-net

volumes:
  opensearch-data1:
  opensearch-data2:

networks:
  opensearch-net:
```

Assuming Docker is installed on your system, it should start with the following command.

```
docker compose up -d
```

This should start three containers:

- opensearch-dashboards
- opensearch-data-node
- opensearch-ml-node

## Uploading an ML Model

For this example, we will be using an off-the-shelf model provided on Hugging Face: `huggingface/sentence-transformers/all-MiniLM-L12-v2`. We need to upload the model to OpenSearch. Open OpenSearch Dashboards at `http://localhost:5601` and navigate to Dev Tools. All queries are also listed in `queries.txt` in the [example repo](https://github.com/Npfries/opensearch-neural-search) for convenience.

We can use the following request to upload the model to our OpenSearch host.

```
POST /_plugins/_ml/models/_upload
{
  "name": "huggingface/sentence-transformers/all-MiniLM-L12-v2",
  "version": "1.0.1",
  "model_format": "TORCH_SCRIPT"
}
```

The response should look something like this:

```
{
  "task_id": "-97CuIkBWLo6ADqAT1Tn",
  "status": "CREATED"
}
```

Note your task ID! We're going to use it to check on the status, as it is an asynchronous operation. We need to wait for this to complete before proceeding. Your task ID will be different, you should replace `<task_id>` with yours. Run the following command to check the status of the upload.

```
GET /_plugins/_ml/tasks/<task_id>
```

When the `state` of the task status says `COMPLETED` you should be able to copy the `model_id`. The `model_id` is going to be used several times.

```
{
  "model_id": "JHrCuIkBkyiJw75fUf-n",
  "task_type": "REGISTER_MODEL",
  "function_name": "TEXT_EMBEDDING",
  "state": "COMPLETED",
  "worker_node": [
    "VF5J2Z00QNGLfL4l6c5e1w"
  ],
  "create_time": 1691021889469,
  "last_update_time": 1691021945252,
  "is_async": true
}
```

The model now needs to be loaded. Run the following command, replacing `<model_id>` with the `model_id` from the resulting task.

```
POST /_plugins/_ml/models/<model_id>/_load
```

This is another asynchronous operation, with another `task_id`. Repeat the task command with the new `task_id`.

```
GET /_plugins/_ml/tasks/<task_id>
```

When that task is completed, we can proceed with creating an ingest pipeline that will use this model. The `model_id` will not change after uploading.

## Creating the Ingest Pipeline

The following command will create an ingest pipeline names `title-embedding` that uses the model uploaded above.

```
PUT _ingest/pipeline/title-embedding
{
  "description": "Title embedding pipeline",
  "processors" : [
    {
      "text_embedding": {
        "model_id": "<model_id>",
        "field_map": {
           "title": "title_embedding"
        }
      }
    }
  ]
}
```

The `field_map` property describes the relationship between the text field that is provided, in this case is it movie titles, so I am using the `title` field. The `title_embedding` field is where the ingest pipeline will place the output of the model. The `field_map` can contain as many mappings as needed. Multiple models can be used by including more than one entry for `processors`.

This ingest pipeline can be used for more than one index, given that the `field_map` is applicable to both. It is currently not used, we need to tell OpenSearch to use this pipeline when indexing to one or more indices. This must be defined on the index settings.

## Creating an Index

Use the following command to create an index that uses the `title-embedding` ingest pipeline.

```
PUT /movies
{
    "settings": {
        "index.knn": true,
        "default_pipeline": "title-embedding"
    },
    "mappings": {
        "properties": {
            "title_embedding": {
                "type": "knn_vector",
                "dimension": 384,
                "method": {
                    "name": "hnsw",
                    "engine": "lucene"
                }
            },
            "title": {
                "type": "text"
            }
        }
    }
}
```

We have to supply some information in the index settings and field mapping for OpenSearch to understand how to process and index documents.

- `index.knn: true` enables k-NN search for this index.
- `default_pipeline: title-embedding` specifies the ingest pipeline which should be used.
- `type: knn_vector` is the field mapping type for `title_embedding`
- `dimension: 384` refers to the _dimensionality_ of the model chosen. In this case, it is 384.
- `method` in the future, other methods may be used, but these are currently supported by OpenSearch

Technically, we could stop here, index some movies, and search by specifying the model using a `neural` query, but that would require providing the `model_id` in each search request. This is less than ideal, as in most cases, we will want to ensure we are using the same model that was used for indexing. We will create a search template to make this easier.

## Creating a Search Template

The following command will create a search template named `neural_search_template`. Make sure to replace the `<model_id>` with the `model_id` from earlier.

```
POST _scripts/neural_search_template
{
  "script": {
    "lang": "mustache",
    "source": {
      "from": "{{from}}{{^from}}0{{/from}}",
      "size": "{{size}}{{^size}}10{{/size}}",
      "query": {
        "neural": {
          "title_embedding": {
            "query_text": "{{query}}",
            "model_id": "<model_id>",
            "k": 200
          }
        }
      },
      "fields": [
        "title"
      ],
      "_source": false
    }
  }
}
```

Note the `neural` query. This is a new type of query which allows inline use of an ML model for encoding the `query_text` to be used when searching using k-NN on the `title_embedding` field.

\*Note: If you'd like to learn about managing index mappings and search templates in production, you can read more about how I [do it using migrations](https://nathanfries.com/posts/opensearch-migrations/).

## Adding Documents

As promised above, populate the movies index with some data. Note that documents contain only the title field.

```
POST /movies/_bulk
{ "index": {} }
{ "title": "Star Wars" }
{ "index": {} }
{ "title": "Lord of the Rings" }
{ "index": {} }
{ "title": "Spiderman" }
{ "index": {} }
{ "title": "Indiana Jones" }
```

If everything worked as expected, querying this index using a `neural` query or utilizing the search template above should return results based on the semantic similarity of the search term and the title.

## Querying

Here is an example query using the search template created above.

```
GET movies/_search/template
{
  "id": "neural_search_template",
  "params": {
    "query": "lightsaber",
    "from": 0,
    "size": 1
  }
}
```

The expected result is that a single result is returned, and it should be the one that most closely relates to the search term.

```
{
  "took": 46,
  "timed_out": false,
  "_shards": {
    "total": 1,
    "successful": 1,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": {
      "value": 4,
      "relation": "eq"
    },
    "max_score": 0.5106329,
    "hits": [
      {
        "_index": "movies",
        "_id": "_d5tuYkBWLo6ADqA4lQb",
        "_score": 0.5106329,
        "fields": {
          "title": [
            "Star Wars"
          ]
        }
      }
    ]
  }
}
```

The result makes sense. "Lightsaber" is most closely related to "Star Wars" in the list of movies. We can continue querying to confirm it is working. Searching "web" returns "Spiderman", "dragon" returns "Lord of the Rings" and so on.

Hopefully, this is enough information to understand the basics of the Neural Search feature, and whether or not it would be useful for your applications. This is not intended to be an in-depth guide to k-NN search. If you are looking for more information on that topic, I highly recommend [An Introduction to Statistical Learning](https://www.statlearning.com) published by Springer.
