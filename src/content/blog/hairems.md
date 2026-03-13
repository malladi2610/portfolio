---

title: "Building HAIREMS: An Edge AI Monitoring System for ICU Automation"
description: "Designing a multi-microcontroller Edge AI system to monitor saline, oxygen, and emergency sounds in ICUs during COVID."
pubDate: 2026-02-28
updatedDate: 2026-02-28
topics: ["electronics", "ai"]
tags: ["Edge AI", "IoT", "Embedded Systems"]
heroImage: "/images/blog/hairems/hairems-system-architecture-pro.svg"
showHeroOnPost: false
draft: false
---

During the second wave of COVID, news about oxygen shortages and overwhelmed ICUs was everywhere. In many hospitals, nurses had to manually monitor saline bottles, oxygen cylinders, and machine alarms while managing multiple patients. Because the workload was exceptionally high, any delays in response could quickly become serious.

That situation shaped the idea behind the **Health AI-based Risk and Emergency Monitoring System (HAIREMS)**. Our goal was simple: we wanted to continuously monitor critical ICU parameters and notify staff only when intervention was required.

We focused on three specific problems: saline bottles running empty without timely replacement, oxygen cylinders dropping below safe pressure levels, and emergency machine sounds that might go unnoticed if staff are occupied. The objective was not to replace professional diagnosis, but rather to reduce repetitive supervision through smart automation.

### System Architecture

The system was built as a distributed embedded setup using **two NodeMCUs** and Arduino-based sensing, alongside cloud integration via **Blynk, IFTTT, and webhooks**.

For saline monitoring, an **IR sensor** tracked the liquid level, while the oxygen level was estimated using a **flow-based sensing mechanism** attached to the cylinder output. Both subsystems transmitted data over Wi-Fi to the cloud, where threshold logic determined exactly when alerts should be triggered.

Emergency sound detection was handled entirely differently. Using an **Arduino Nano 33 BLE Sense**, we collected audio samples from simulated ICU machine sounds and trained a model on **Edge Impulse** to classify them into low-risk, mid-risk, and high-risk categories. 



By running inference directly on the device, we enabled real-time classification without relying on constant cloud processing.

![HAIREMS System Architecture](/images/blog/hairems/hairems-system-architecture-pro.svg)

### The Integration Challenges

The main difficulty was not building the individual modules, but rather integrating them reliably. 

For instance, the ESP8266 modules occasionally dropped connections under continuous transmission. Additionally, the oxygen monitoring logic initially kept subtracting flow from a fixed total capacity, meaning the displayed volume remained completely incorrect until we reworked the interrupt logic and recalibrated the pulse-to-volume conversion.

Audio classification also required multiple iterations. Since access to real ICU environments during COVID was strictly limited, we simulated machine sounds and built controlled datasets. Although this improved model stability, it heavily highlighted the inherent challenge of validating Edge AI systems without real-world deployment data.

Because testing with actual oxygen cylinders and hospital infrastructure was not possible, we relied entirely on controlled prototypes. This naturally limited our validation scope, yet it still allowed us to successfully demonstrate the core system functionality.

### What This Project Taught Me

HAIREMS quickly became one of the most highly integrated systems I had built at that stage in my journey. Multiple microcontrollers, sensor inputs, Edge AI inference models, cloud dashboards, and notification pipelines all had to function together consistently.

The key lesson was that embedded systems design goes far beyond just writing firmware; it involves defining safe thresholds, handling unreliable networks, validating sensor assumptions, and designing around physical constraints you cannot fully control.

Even today, the core problem remains highly relevant because healthcare monitoring still fundamentally requires automation support. Ultimately, this project strengthened my understanding of how hardware, AI, and cloud services intersect to form practical, constraint-driven systems.

### Project Links

- GitHub repository: [malladi2610/hairems](https://github.com/malladi2610/hairems)