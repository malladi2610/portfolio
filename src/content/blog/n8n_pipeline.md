---

title: "Building an n8n Gmail AI Agent to Automate My Job Search"
description: "An end-to-end n8n workflow that reads job emails, scrapes descriptions, evaluates fit using OpenAI, and writes only relevant roles into Notion."
pubDate: 2026-03-02
updatedDate: 2026-03-02
topics: ["ai"]
tags: ["n8n", "OpenAI", "Notion"]
heroImage: "/images/blog/n8n-gmail-ai-agent-workflow.svg"
showHeroOnPost: false
draft: false
---

Every morning, my inbox looked productive. LinkedIn, Indeed, and Glassdoor were sending me 10 to 15 job recommendations each. On paper, that sounds like opportunity; in reality, it was noise.

I was spending more time filtering roles than preparing for interviews.

The problem was simple: I did not need more job recommendations, but rather a **reliable filter** that understood my profile and gave me a final shortlist of companies worth applying to.

That is how the **n8n Gmail AI Agent** started, not as a portfolio project, but as a fix for my own job search process.

### The Approach

I designed the pipeline to behave like a structured decision system instead of a simple keyword matcher.



The workflow begins with a **date input** and reads all job-alert emails under a dedicated Gmail label that I configured using filters. From there, the pipeline branches by platform, cleans the links, and extracts the full job description using a scraping service so the model does not rely on partial email previews.

Next comes the evaluation layer, where I embedded four CV profiles in a structured JSON format: embedded systems, robotics, AI/software, and edge AI. The OpenAI API compares the scraped job description against these profiles and outputs a **decision (KEEP / MAYBE / SKIP)** along with a **fit score** and reasoning.



Only high-confidence matches move forward into a **Notion database**, where I track the company name, platform, job title, decision, score, and follow-up dates.

![Workflow overview](/images/blog/n8n-gmail-ai-agent-workflow.svg)

### The Trenches

The real challenge was not connecting Gmail or Notion; it was data quality.

In the first run, the model was making inconsistent decisions where some obviously relevant roles were marked as MAYBE and generic ones slipped through, proving the issue was not the model itself but rather the input. Because each platform formats recommendations differently, with some including structured details and others providing only marketing-style summaries, feeding that raw text directly into the LLM led to unstable outputs.

So I stepped back and treated it like a data engineering problem.

I standardized what the model sees by cleaning job titles, extracting company names, fetching full descriptions, and removing tracking parameters from URLs. I also tightened the prompt structure and introduced a high confidence threshold of around **95 percent** before automatically writing a job into Notion.

Once the inputs were consistent, the classification stabilized, and the pipeline now runs for about **30 to 40 minutes** to process all emails from the selected date and produce a clean shortlist without manual intervention. That was the turning point where the system stopped feeling like a simple script and started behaving like a robust workflow.

### The Resolution

The current MVP automates the entire **job search filtering stage** of my process, meaning instead of scanning emails, I simply review a curated Notion table containing roles perfectly aligned with my profile.

This project taught me practical automation with **n8n**, cost-aware usage of the **OpenAI API**, structured prompt design, and integration across Gmail, scraping services, and Notion.

The next logical step is moving from cloud-only execution to **local hosting with scheduled triggers** so the pipeline runs periodically without manual input.

What began as inbox frustration became a structured automation system, and more importantly, it shifted my focus from searching for jobs to preparing for them.

Project repository: [Weekendprojects - n8n_gmail_AI_agent](https://github.com/malladi2610/Weekendprojects/tree/main/n8n_gmail_AI_agent)