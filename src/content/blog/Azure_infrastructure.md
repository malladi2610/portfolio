---
title: "Building a Cloud-Portable Classification Template on Azure"
description: "A reusable classification workflow that connects a frontend API, n8n orchestration, PostgreSQL persistence, and Terraform deployment."
pubDate: 2026-04-04
updatedDate: 2026-04-09
topics: ["ai"]
tags: ["Azure", "Terraform", "n8n", "PostgreSQL"]
heroImage: "/images/blog/azure-classification-infra-diagram.svg"
showHeroOnPost: false
draft: false
---

This project started as a freelance requirement with a clear goal: classify data from a **source URL** using context pulled from a **reference website**. For this version, I designed it as a **cloud-portable architecture** and deployed it on **Azure**. I did not want a one-off script. I wanted a reusable template that could trigger runs from a frontend, orchestrate the logic in **n8n**, store structured results in **PostgreSQL**, and be deployed repeatably with **Terraform**.

The main challenge was not the classification logic alone. It was making the full path work end to end under a real delivery timeline. The template needed an API layer to trigger jobs, workflow steps that could validate and transform inputs, a database model that could store both prepared jobs and final results, and a cloud setup that would not turn deployment into a separate project.

I also wanted the template to stay portable at the architecture level. Even though this release runs on Azure, the structure itself is not tied to one cloud. The model provider can be switched between **OpenAI** and **Azure OpenAI**, and the core flow stays the same.

One thing that helped a lot was mapping the workflow before writing code. I broke the system into clear stages: accept a classification request, validate the payload, fetch the source data, fetch the reference taxonomy, prepare a structured payload, store a prepared record, call the model, normalize the response, and save the final result. That gave me a stable contract across the frontend, the workflow, and the database.

From there, I implemented the template locally first. The app exposed endpoints such as `POST /api/classifications/run`, n8n handled the request orchestration, and PostgreSQL was split logically between the **classifier** data and the **n8ndb** runtime metadata. Only after the local path worked cleanly did I move to Terraform and Azure resources like **Container Apps**, **Container Registry**, **Key Vault**, managed identity, and **PostgreSQL Flexible Server**.

The hardest part was integration discipline. Small mismatches in `profileId`, payload structure, or stored JSON fields were enough to break the flow. This project was a step ahead of my earlier **n8n_pipeline** work, where the workflow existed in isolation. Here, the workflow had to behave as part of a complete product template.

The fix was not a clever workaround. It was tighter contracts and better sequencing. I standardized what moved between the app, n8n, and the database, then tested the full path locally before touching cloud infrastructure. That approach saved time later because deployment bugs were reduced to infrastructure issues instead of mixed application and workflow problems.

This was also my first serious use of **infrastructure as code** for a complete stack. Seeing Terraform bring up the Azure footprint cleanly was one of the biggest takeaways from the project, along with practical experience in **Docker**, **n8n**, **PostgreSQL**, and Azure deployment patterns.

The final MVP delivered a working classification template with a frontend trigger layer, workflow orchestration, persistent job history, and a repeatable Azure deployment. The diagram below is the actual infrastructure view generated after the Azure deployment was completed.

<img src="/images/blog/azure-classification-infra-diagram.svg" alt="Azure infrastructure block diagram for the deployed classification template" width="820" height="656" loading="lazy" style="width: min(100%, 820px); height: auto; display: block; margin: 28px auto;" />

What I value most about this project is the process it forced me to learn: map the workflow first, build locally, verify the contracts, then deploy.
