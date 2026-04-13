---
title: "Wearing a Systems Engineer Hat to Solve Barcelona's Water Problem"
description: "A step-by-step account of how systems engineering tools narrowed Barcelona's water-stress problem into a practical greywater reuse concept."
pubDate: 2026-04-13
updatedDate: 2026-04-13
topic: "electronics"
tags: ["systems-engineering", "water-management", "urban-resilience"]
heroImage: "/images/blog/system_engineering_project/System%20engineering%20blogpost%20-%20visual%20selection%20clean.svg"
showHeroOnPost: false
draft: false
---

Barcelona's drought problem was clear. In a short team sprint, we had to propose a viable response to water stress in Barcelona and justify it with systems-engineering methods. The report framed the challenge as: **how could we improve preparedness for water-stress events in Barcelona?**

### Framing the system

We started with a **System Definition Matrix (SDM)**. That forced us to translate a broad resilience issue into needs, objectives, criteria, variables, and constraints. Success became lower consumption, higher reuse, and fewer restrictions, while still respecting legal, environmental, and infrastructure limits. The SDM stopped solution-first thinking and gave the rest of the project a defensible frame.

![Systems engineering workflow](/images/blog/system_engineering_project/System%20engineering%20blogpost%20-%20visual%20selection%20clean.svg)

<p style="text-align:center;"><em>Figure 1. Systems engineering process funnel used to move from the problem definition to the final concept selection.</em></p>

### Screening the concept space

Next came concept generation. Using **law-breaker** and **semantic intuition**, we explored five directions: household greywater reuse, evaporation reduction in reservoirs, green roofs, expanded storage, and awareness campaigns. To narrow them down, we built a weighted **trade-off table** around **desirability, feasibility, and viability**. Household greywater reuse ranked first with **29.2**, ahead of reservoir evaporation reduction at **28.8** and green roofs at **27.6**. What mattered was not the decimal precision, but the fact that every preference had to be defended against cost, environmental footprint, deployability, and water savings. That step made the final choice easier to justify because it was backed by a visible comparison rather than instinct.

### Converting a concept into a system

Once greywater reuse emerged as the lead concept, we wrote requirements across **design, functionality, performance, and qualitative use**. The most important ones were practical: plumber-level installation, stable water pressure, maintenance no more than every six months, compatibility with different plumbing layouts, and smart-home monitoring. From there, **functional decomposition** broke the concept into six high-level functions, and the **morphological chart** mapped possible means for each one. That is where weaker options were removed. **Ozonation** was too complex, **reverse osmosis** wasted too much water, and **calcium hydroxide** risked scaling and unstable pH control.

### Making the concept operational

The final concept, **GreyCycle Nexus**, used centralized greywater collection with apartment-level reuse because that fit Barcelona's small residential spaces better than a fully distributed layout. The last major tool was **Bow-Tie risk analysis**, applied to filter clogging. It linked causes such as abrasive particles, poor maintenance, and bad flow conditions to consequences such as low flow, higher pump load, contamination buildup, and downtime. That directly shaped the mitigations: pre-filtering, pressure-based clog detection, and clearer maintenance guidance. The project closed with **test and simulation plans** so the concept could be checked against water quality, pressure, odor, storage, flushing, and disposal behavior.

<img src="/images/blog/system_engineering_project/final_image.png" alt="Final GreyCycle Nexus concept" style="display:block; width:100%; max-width:760px; margin:24px auto;" />

<p style="text-align:center;"><em>Figure 2. Final GreyCycle Nexus concept showing centralized greywater collection, treatment, and non-potable reuse in a residential building.</em></p>

This was the main lesson for me: even when a solution feels obvious, a structured systems-engineering process gives you a better one and a defensible reason for choosing it.

### Project files

The full project files are available on GitHub: [System-Engineering-Project](https://github.com/malladi2610/System-Engineering-Project).
