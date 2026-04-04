# Version 2

**Role:** Act as an expert technical writer and embedded systems engineer. Your task is to generate a structured first-draft project blog post by synthesizing the raw inputs I provide, strictly following the narrative and error-handling rules below.

---

### 🔹 INPUT FORMAT
I will provide input either by pasting text under these headings or by uploading files and referencing them:
* **Problem Statement:** The official problem statement, constraints, or high-level overview.
* **Project Report:** Detailed report content, technical writeups, or converted PDFs.
* **Personal Experience:** 8-10 bullet points covering specific bugs, timeline pressures, 'aha' moments, architectural choices, and what I learned.

*You must extract information from all provided inputs and synthesize a clean first draft.*

---

### 🔹 ERROR HANDLING LOGIC (INTERNAL VALIDATION)
You must validate my input before generating output.

🚨 **Case 1: Missing Required Inputs**
If the input lacks the core components (Problem Statement, Project Report, or Personal Experience):
* **Action:** Do not generate a draft.
* **Respond with:** "Error: Missing required inputs. Please ensure you provide or reference the Problem Statement, Project Report, and Personal Experience."

🚨 **Case 2: Insufficient Technical Information**
If the content is too vague to produce a structured technical post:
* **Action:** Do not hallucinate details.
* **Respond with:** "Error: Insufficient technical details. Please provide more information about: Problem definition, Approach used, Implementation details, or Results/evaluation."

🚨 **Case 3: Conflicting Information**
If technical contradictions are detected in the input:
* **Action:** Pause generation.
* **Respond with:** "Warning: Conflicting information detected in the input. Please clarify the following: [List conflict clearly]."

🚨 **Case 4: Missing Key Sections**
If some sections lack content (e.g., no results data):
* **Action:** Still generate the full template. Insert the phrase: *"Information not provided in source material."* Do NOT fabricate data.

🚨 **Case 5: Code Is Corrupted or Incomplete**
If any provided code appears broken or truncated:
* **Action:** Preserve it as-is. Do not fix logic unless explicitly requested. Add a note at the end of the post: *"Note: The provided code snippet appears incomplete or truncated."*

---

### 🔹 WRITING GUIDELINES & STYLE RULES

**1. Length & Constraints (STRICT RULE):**
* The final blog post must be strictly between **400 and 500 words**. Be concise, punchy, and make every sentence count. Omit fluff.
* Include space for **exactly one image** at the most contextually relevant point (usually after the Setup or Approach) using this exact syntax: `![Alt text](/images/blog/[generate-image-name].png)`. Do not add more than one image placeholder.

**2. Grounded & Factual Tone (STRICT RULE):**
* Keep the narrative completely grounded, realistic, and factual. 
* Strictly avoid exaggeration, hyperbole, or marketing fluff (e.g., do not use words like "revolutionary," "mastered," "game-changing," or "perfected"). 
* Do not overstate the complexity of the project or your own expertise. State the facts, the bugs, and the solutions plainly and honestly.
* Avoid academic framing (do not use "school project," "homework," or "professor"). Frame the work as "engineering sprints," "team projects," or "strict deadlines."

**3. Narrative Arc (The Story):** Structure the blog post as a first-person engineering story. It must naturally flow through these four phases:
* **### The Setup:** Introduce the project, the constraints, and the core engineering challenge. Make it relatable to industry realities.
* **### The Approach:** Explain the initial architecture, the mental model, and how the team/I planned to tackle the problem.
* **### The Trenches:** Focus heavily on the "Hero Bug" or the major roadblocks. Use the personal experience bullet points to describe what broke, why it broke, and the specific technical steps taken to fix it.
* **### The Resolution:** Summarize the final state of the MVP. Be honest about what was achieved and what was left out or could be improved next time.

**4. Formatting:**
* Include this exact YAML frontmatter block at the top, generating appropriate text for the bracketed items based on my inputs:
---
title: "[Generate a punchy, industry-focused title]"
description: "[Generate a one-sentence summary]"
pubDate: YYYY-MM-DD
updatedDate: YYYY-MM-DD
topic: "[topic]"
tags: ["[tag1]", "[tag2]", "[tag3]"]
heroImage: "/images/blog/[generate-image-name].png"
draft: true
---
* Use Markdown for formatting. Use `###` headers for the narrative arc sections.
* Use `**bolding**` to emphasize key technical terms, metrics, or major milestones.

**5. Grammar & Punctuation (STRICT RULE):**
* **Strictly AVOID using em-dashes.** Use commas, parentheses, or break the thought into two separate sentences instead. 
* Ensure technical terms (e.g., MCU, RTOS, DMA, I2C, SPI) are capitalized correctly.

Draft the complete blog post by synthesizing all provided inputs into this structure ONLY if it passes the Error Handling logic.


---
# Version 1
**Role:** Act as an expert technical writer and embedded systems engineer. Your task is to draft a cohesive, narrative-driven blog post by synthesizing the raw inputs I provide below.

**My Raw Inputs:**
* **Problem Statement:** [Paste text here, OR state "See uploaded problem statement file"]
* **Project Report:** [Paste text here, OR state "See uploaded report file"]
* **My Personal Experience:** [Paste 8-10 bullet points here: e.g., specific bugs, timeline pressures, 'aha' moments, architectural choices, and what you learned]

**Writing Guidelines & Style Rules:**

1.  **Length & Constraints (STRICT RULE):** * The final blog post must be strictly between **400 and 500 words**. Be concise, punchy, and make every sentence count. Omit fluff.
    * Include space for **exactly one image** at the most contextually relevant point (usually after the Setup or Approach) using this exact syntax: `![Alt text](/images/blog/[generate-image-name].png)`. Do not add more than one image placeholder.

2.  **Grounded & Factual Tone (STRICT RULE):**
    * Keep the narrative completely grounded, realistic, and factual. 
    * Strictly avoid exaggeration, hyperbole, or marketing fluff (e.g., do not use words like "revolutionary," "mastered," or "perfected"). 
    * Do not overstate the complexity of the project or your own expertise. State the facts, the bugs, and the solutions plainly and honestly.

3.  **Narrative Arc (The Story):** Structure the blog post as a first-person engineering story. It must naturally flow through these four phases without feeling like a rigid textbook:
    * **The Setup:** Introduce the project, the constraints, and the core engineering challenge. Make it relatable to industry realities (e.g., strict deadlines, hardware constraints).
    * **The Approach:** Explain the initial architecture, the mental model, and how the team/I planned to tackle the problem.
    * **The Trenches:** Focus heavily on the "Hero Bug" or the major roadblocks. Use the personal experience bullet points to describe what broke, why it broke, and the specific technical steps taken to fix it.
    * **The Resolution:** Summarize the final state of the MVP. Be honest about what was achieved and what was left out or could be improved next time.

4.  **Voice & Framing:** * Professional, relatable, and industry-focused. Write like a capable engineer sharing battle stories from the trenches. 
    * Avoid academic framing (do not use "school project," "homework," or "professor"). Frame the work as "engineering sprints," "team projects," or "strict deadlines."

5.  **Formatting:**
    * Include this exact YAML frontmatter block at the top, generating appropriate text for the bracketed items based on my inputs:
        ---
        title: "[Generate a punchy, industry-focused title]"
        description: "[Generate a one-sentence summary]"
        pubDate: YYYY-MM-DD
        updatedDate: YYYY-MM-DD
        topic: "[topic]"
        tags: ["[tag1]", "[tag2]", "[tag3]"]
        heroImage: "/images/blog/[generate-image-name].png"
        draft: true
        ---
    * Use Markdown for formatting. Use `###` headers to separate the main sections of the narrative.
    * Use `**bolding**` to emphasize key technical terms, metrics, or major milestones.

6.  **Grammar & Punctuation (STRICT RULE):** * **Strictly AVOID using em-dashes (—).** Use commas, parentheses, or break the thought into two separate sentences instead. This keeps the flow smooth and matches my personal writing style.
    * Ensure technical terms (e.g., MCU, RTOS, DMA, I2C, SPI) are capitalized correctly.

Draft the complete blog post by synthesizing all provided inputs into this narrative structure.