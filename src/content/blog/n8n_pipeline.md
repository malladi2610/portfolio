---

title: "Building an n8n Gmail AI Agent to Automate My Job Search"
description: "An end-to-end n8n workflow that reads job emails, scrapes descriptions, evaluates fit using OpenAI, and writes only relevant roles into Notion."
pubDate: 2026-03-02
updatedDate: 2026-03-02
topic: "ai"
tags: ["n8n", "OpenAI", "Notion"]
heroImage: "/images/blog/n8n-gmail-ai-agent.png"
draft: false
---

<!-- Make the block diagram of the exisiting systems by taking the repo as example or try to use the json to create the complete n8n pipeline diagram -->

<!-- Link the github repo -->

### The Setup

Every morning, my inbox looked productive. LinkedIn, Indeed, and Glassdoor were sending me 10 to 15 job recommendations each. On paper, that sounds like opportunity. In reality, it was noise.

I was spending more time filtering roles than preparing for interviews.

The problem was simple. I did not need more job recommendations. I needed a **reliable filter** that understood my profile and gave me a final shortlist of companies worth applying to.

That is how the **n8n Gmail AI Agent** started. Not as a portfolio project, but as a fix for my own job search process.

### The Approach

I designed the pipeline to behave like a structured decision system, not a keyword matcher.

The workflow begins with a **date input**. It reads all job-alert emails under a dedicated Gmail label that I configured using filters. From there, the pipeline branches by platform, cleans the links, and extracts the full job description using a scraping service so the model does not rely on partial email previews.

Next comes the evaluation layer. I embedded four CV profiles in structured JSON format: embedded systems, robotics, AI/software, and edge AI. The OpenAI API compares the scraped job description against these profiles and outputs a **decision (KEEP / MAYBE / SKIP)** along with a **fit score** and reasoning.

Only high-confidence matches move forward into a **Notion database**, where I track company name, platform, job title, decision, score, and follow-up dates.

![Workflow overview](/images/blog/n8n-gmail-ai-agent.png)

### The Trenches

The real challenge was not connecting Gmail or Notion. It was data quality.

In the first run, the model was making inconsistent decisions. Some obviously relevant roles were marked as MAYBE, while generic ones slipped through. The issue was not the model. It was the input.

Each platform formats recommendations differently. Some include structured details. Others provide only marketing-style summaries. Feeding that directly into the LLM led to unstable outputs.

So I stepped back and treated it like a data engineering problem.

I standardized what the model sees: cleaned job titles, extracted company names, fetched full descriptions, and removed tracking parameters from URLs. I also tightened the prompt structure and introduced a high confidence threshold, around **95 percent**, before automatically writing a job into Notion.

Once the inputs were consistent, the classification stabilized. The pipeline now runs for about **30 to 40 minutes**, processes all emails from the selected date, and produces a clean shortlist without manual intervention.

That was the turning point. The system stopped feeling like a script and started behaving like a workflow.

### The Resolution

The current MVP automates the entire **job search filtering stage** of my process. Instead of scanning emails, I review a curated Notion table containing roles aligned with my profile.

This project taught me practical automation with **n8n**, cost-aware usage of the **OpenAI API**, structured prompt design, and integration across Gmail, scraping services, and Notion.

The next logical step is moving from cloud-only execution to **local hosting with scheduled triggers**, so the pipeline runs periodically without manual input.

What began as inbox frustration became a structured automation system. More importantly, it shifted my focus from searching for jobs to preparing for them.
