---
title: "Internal Developer Platform Misses the Mark"
publishDate: "2 July 2023"
description: "The local development environment should be considered as a component of the Internal Developer Platform."
tags: ["idp", "platform", "devops"]
---

2023 seems to be the year of the Platform Team™️ and the Internal Developer Platform™️. DevOps is once again a process instead of a role, and PagerDuty is raking in the cash because everyone is a service owner and needs to be added to the on-call rotation.

Tools like Backstage and Port are enabling product teams to ship new microservices and microfrontends at _blazingly fast_ speeds, armed with confidence that the platform team has blessed the Golden Path, deeming it secure, performant, and maintainable.

Since our developers are building mircroservices, _which are inherently developed in isolation without exception_, services owners are free to determine the development experience. External teams are never impacted by these decisions, and platform teams need not concern themselves.

Oops, dropped my /s.

If the project has reached any level of maturity, there are inevitably going to be some skeletons in the closet, some "temporary" coupling due to business needs, a shared database, _something_ that prevents completely isolated development in all cases.

We have the Internal Developer Platform, encompassing the difference resources, internal tools, service and package skeletons, which may or may not be exposed by an Internal Developer Portal - but what about those legacy systems, or those tightly coupled services, those things we simply haven't had time to onboard to our portal or adopt into our platform? Who owns the developer experience there?

Perhaps our golden application skeleton, which can be provisioned and deployed in minutes is configured to work in isolation, encourages development in isolation. It is configured with integration testing, contract testing, and properly versioned. But those legacy portions, the parts configured by the last regime (which may or may not be the same regime having gone through a Platform Engineering rebrand) are not included in our IDP.

The local development experience is seemingly forgotten along the way. I think there is room for it in the Internal Developer Platform.
