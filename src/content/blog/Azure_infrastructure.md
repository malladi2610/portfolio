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

The freelance brief that I received was as follows:

- classify data from a **source URL** using context from a **reference website**
- build the solution as a usable end-to-end template, not just an isolated workflow
- connect a frontend trigger layer, **n8n** orchestration, and **PostgreSQL** persistence
- keep the architecture cloud-portable, while deploying this version on **Azure**
- provision the infrastructure in a repeatable way using **Terraform**

Before writing code, I mapped the workflow from input to output so I could decide where each requirement would live in the system. The frontend and API would accept the classification request, n8n would orchestrate the processing steps, PostgreSQL would store job records and results, and Terraform would handle the cloud infrastructure.

Once the workflow was clear, I built the template locally first. That gave me room to test the request shape, the data flow between services, and the way results were written into the database before adding cloud complexity. The app exposed endpoints such as `POST /api/classifications/run`, the workflow handled the orchestration around fetching and preparing the data, and the database was split logically between the **classifier** records and the **n8ndb** runtime metadata. By the time I moved to Azure, I was testing infrastructure, not still guessing about application behavior.

That local-first approach also helped with the hardest part of the project, which was integration discipline. Small mismatches in `profileId`, payload structure, or stored JSON fields could break the full run, even when each individual component looked correct on its own. This project was a step ahead of my earlier [**n8n_pipeline**](https://itsmns.dev/blog/n8n_pipeline/) work because the workflow was no longer the whole product, it had to operate inside a complete template with a frontend, database, containers, and deployment flow.

What helped me most here was standardizing what moved between the app, n8n, and PostgreSQL. Once the payloads and stored fields were consistent, the system became much easier to reason about. It also reinforced a development pattern that I now trust a lot more: map the workflow first, implement locally, validate the contracts thoroughly, then move to cloud deployment.

This project was also my first serious exposure to **infrastructure as code** for a full stack application. I had worked with workflows before, but this was the first time I connected **Docker**, **n8n**, **PostgreSQL**, **Terraform**, and Azure into one working template. Watching Terraform bring up the Azure resources cleanly, then seeing the deployed system behave the same way as the local version, was probably the biggest learning point in the whole sprint.

The final MVP delivered what the brief actually needed: a reusable classification template with a frontend trigger layer, workflow orchestration, persistent job history, and a repeatable Azure deployment.

<img src="/images/blog/azure-classification-infra-diagram.svg" alt="Azure infrastructure block diagram for the deployed classification template" width="820" height="656" loading="lazy" style="width: min(100%, 820px); height: auto; display: block; margin: 28px auto;" />

<p style="text-align: center; margin-top: -8px;"><em>Figure 1. Infrastructure view generated after the Azure deployment was completed.</em></p>

What I value most about this project is not just the final deployment, but the process behind it, because it showed me how much smoother an end-to-end build becomes when the workflow is planned early, the local version is validated properly, and the cloud deployment comes last instead of first.

Project repository: [malladi2610/Cloud_infra_project](https://github.com/malladi2610/Cloud_infra_project.git)
