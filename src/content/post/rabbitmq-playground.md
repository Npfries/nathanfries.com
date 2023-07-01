---
title: "RabbitMQ Exchange and Queue Playground in Docker"
publishDate: "1 July 2023"
description: "A simple playground and example code for getting up and running with RabbitMQ in Docker with amqplib and Docker Compose."
tags: ["RabbitMQ", "Docker", "docker-compose.yml", "amqplib"]
---

## Intro

If you are looking to get started with message queues, implement an event driven architecture, or are supporting services that rely on RabbitMQ for asynchronous communication, this post will provide you with an overview and sample code that will help you hit the ground running. If you are already familiar with RabbitMQ but want to understand more about how its load balancing or exchanges work, you can skip to the Playground Overview section near the bottom.

Dependencies for this project:

- Docker
- [https://github.com/Npfries/rabbitmq-playground](https://github.com/Npfries/rabbitmq-playground)

## Project setup

I minimized the setup required to a single command, and the environment should start within seconds depending on network speed when pulling the RabbitMQ image.

```
git clone https://github.com/Npfries/rabbitmq-playground
```

```
make start
```

Running `make start` will bring up the services using `docker compose up` (with some specific arguments) internally.

## RabbitMQ

RabbitMQ is a lightweight, flexible, and open source message broker that requires very little configuration. Queues and exchanges are asserted into existence by the applications publishing messages to, and consuming message from RabbitMQ.

There are a couple of components that are important to understand when working with RabbitMQ.

- Exchanges
- Queues

RabbitMQ exchanges are configurable brokers that take incoming messages, perform some filtering and routing, and publish to queues. There are several types of exchanges including direct, fanout, topic, and headers exchanges.

| Exchange Type    | Description                                           |
| ---------------- | ----------------------------------------------------- |
| Direct Exchange  | Pushes messages to a single queue. (default)          |
| Fanout Exchange  | Pushes messages to multiple queues.                   |
| Topic Exchange   | Performs routing based on message topic.              |
| Headers Exchange | Performs routing based on message header information. |

RabbitMQ queues are simple message queues which can be bound implicitly or explicitly to RabbitMQ exchanges. An implicit bind is created between the default direct exchange when the amqplib channel method `sendToQueue()` is used. An explicit bind is created using the channel method `bindQueue()`.

RabbitMQ can support multiple subscribers to the same queue, and requests will be load balanced between subscribers. If you wish to have multiple services react to the same message, a fanout exchange can be used to publish to multiple queues, and those services can subscribe to the queues individually.

In order to connect to a RabbitMQ instance using the amqplib npm package, the `amqplib.connect()` function is used.

```
const conn = await amqplib.connect(process.env.RMQ_HOST);
```

This creates a persistent connection to the RabbitMQ instance. From there _channels_ can be created, which are containers for our different queue and exchange operations.

```
const ch1 = await conn.createChannel();
```

Queues and exchanges are defined in the application code, by asserting them into existence.

```
await ch1.assertExchange('name_of_exchange', '', { ... });
await ch1.assertQueue('name_of_queue');
```

Then the queue can be bound to the exchange.

```
await ch1.bindQueue('name_of_queue', 'name_of_exchange');
```

Alternatively, instead of explicitly asserting an exchange, the default direct exchange can be used simply by asserting a queue, and using the `channel.sendToQueue()` method.

```
await ch1.assertQueue('name_of_queue');
ch1.sendToQueue('name_of_queue', message);
```

This hides the implementation of the exchange, but an exchange (the default direct exchange) is used internally as an intermediary nonetheless.

When explicitly asserting an exchange, the `channel.publish()` method should be used.

```
await ch1.assertExchange('name_of_exchange', '', { ... });
await ch1.assertQueue('name_of_queue');
ch1.publish('name_of_exchange', '' message);
```

Here is a complete implementation demonstrating a fanout exchange, and the default direct exchange, utilizing two channels, and publishing a simple message to both exchanges, totalling three queues (two for the fanout, one for the direct). The messages are published once per 100 milliseconds.

In either case, the type of `message` should be a Buffer. This is often prepared by using `Buffer.from(data)`.

```
// ./apps/sender/src/index.js

import amqplib from "amqplib";

(async () => {
  const exchange = "tasks_exchange";
  const queue1 = "tasks1";
  const queue2 = "tasks2";
  const queue3 = "tasks3";

  const conn = await amqplib.connect(
    process.env.RABBIT_MQ_HOST ?? "localhost"
  );

  const ch1 = await conn.createChannel();
  await ch1.assertExchange(exchange, "fanout", {});
  await ch1.assertQueue(queue1);
  await ch1.assertQueue(queue2);
  await ch1.bindQueue(queue1, exchange, "");
  await ch1.bindQueue(queue2, exchange, "");

  const ch2 = await conn.createChannel();
  ch2.assertQueue(queue3);

  setInterval(() => {
    const message = Buffer.from("something to do");
    ch1.publish(exchange, "", message);
    ch2.sendToQueue(queue3, message);
  }, 100);
})();
```

Since subscribers always consume from queues, not exchanges, the code for them is much more consistent across implementations.

```
// ./apps/receiver/src/index.js

import amqplib from "amqplib";

(async () => {
  /** @type {string} */
  // @ts-ignore
  const queue = process.env.QUEUE_NAME;
  const conn = await amqplib.connect(
    process.env.RABBIT_MQ_HOST ?? "localhost"
  );

  const channel = await conn.createChannel();
  await channel.assertQueue(queue);

  channel.consume(queue, (msg) => {
    if (msg !== null) {
      console.log("Received:", msg.content.toString());
      channel.ack(msg);
    } else {
      console.log("Consumer cancelled by server");
    }
  });
})();
```

## Playground overview

The Node.js services provided are configured to communicate with RabbitMQ using the [AMQP 0-9-1 protocol](https://www.rabbitmq.com/tutorials/amqp-concepts.html). There is a fantastic package, [amqplib](https://www.npmjs.com/package/amqplib) which we will be using as the client in our Node.js services. Speaking of services, here is are the services defined by the docker-compose.yml file:

```
# ./docker-compose.yml

version: "3.9"

services:
  sender:
    build:
      context: ./apps/sender/
    environment:
      - RABBIT_MQ_HOST=amqp://rabbitmq
    depends_on:
      rabbitmq:
        condition: service_healthy
    deploy:
      replicas: 1

  tasks1_receiver:
    build:
      context: ./apps/receiver/
    environment:
      - RABBIT_MQ_HOST=amqp://rabbitmq
      - QUEUE_NAME=tasks1
    depends_on:
      rabbitmq:
        condition: service_healthy
    deploy:
      replicas: 1

  tasks2_receiver:
    build:
      context: ./apps/receiver/
    environment:
      - RABBIT_MQ_HOST=amqp://rabbitmq
      - QUEUE_NAME=tasks2
    depends_on:
      rabbitmq:
        condition: service_healthy
    deploy:
      replicas: 1

  tasks3_receiver:
    build:
      context: ./apps/receiver/
    environment:
      - RABBIT_MQ_HOST=amqp://rabbitmq
      - QUEUE_NAME=tasks3
    depends_on:
      rabbitmq:
        condition: service_healthy
    deploy:
      replicas: 1

  rabbitmq:
    image: rabbitmq:management-alpine
    container_name: rabbitmq
    ports:
      - 15672:15672
    healthcheck:
      test: rabbitmq-diagnostics check_port_connectivity
      interval: 3s
      timeout: 30s
      retries: 3

```

There are two types of Node.js services included out of the box:

- sender
- receiver

The source code for the sender service is located in `./apps/sender/` and the source code for the three receiver services is shared, located in `./apps/receiver/`. The sender, by default, is a single container producing messages to two exchanges:

- tasks_exchange (fanout exchange)
- default (direct exchange)

The tasks_exchange pushes messages to two queues:

- tasks1
- tasks2

The services defined in docker-compose.yml as tasks1_receiver and tasks2_receiver subscribe to tasks1 and tasks2, respectively.

The default direct exchange is used when the sender service sends messages to the tasks3 queue, to which the tasks3_receiver subscribes.

Starting the project spawns a single instance of the sender, as well as a single instance of each receiver. The number of senders or receivers can be increased by incrementing the `replicas` in the docker-compose.yml file from 1 to the number of desired instances. Increasing the number of replicas of any of the receivers is useful for observing the round-robin load balancing that RabbitMQ queues perform when there are multiple instances of a service subscribing to the same queue.

Note that messages sent to tasks_exchange will both be sent to the task1 and task2 queues, task1_receiver and task2_receiver are not load balanced between each other because the exchange is a fanout type, and the queues are distinct. Neither task1 or task2 queues are aware of the other.

To watch in realtime how RabbitMQ handles delayed acknowledgement of messages, how it load balances, and how messages are passed between exchanges and queues, you can adjust the number of replicas, modify the source code to send more messages, or experiment with different types of exchanges. The metrics for RabbitMQ can be observed in real-time by opening the management UI running on port 15672 (if the project is running locally).

If you make changes to the docker-compose.yml file, you will need to run either

```
make start
```

or

```
make dev
```

I recommend using `make dev` as it creates a volume mount to the source code and has a file watcher, so the container should be updated immediately when changes are made.

If you want to find out more about how I created this Docker local development environment, you can [read about it here.](https://nathanfries.com/posts/advanced-docker-local-development/)
