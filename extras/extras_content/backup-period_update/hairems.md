---

title: "Building HAIREMS: An Edge AI Monitoring System for ICU Automation"
description: "Designing a multi-microcontroller Edge AI system to monitor saline, oxygen, and emergency sounds in ICUs during COVID."
pubDate: 2026-02-28
updatedDate: 2026-02-28
topics: ["electronics", "ai"]
tags: ["Edge AI", "IoT", "Embedded Systems"]
heroImage: "/images/blog/hairems-system-architecture-pro.svg"
showHeroOnPost: false
draft: false
---

During the second wave of COVID, news about oxygen shortages and overwhelmed ICUs was everywhere. In many hospitals, nurses had to manually monitor saline bottles, oxygen cylinders, and machine alarms while managing multiple patients. The workload was high, and delays in response could become serious.

That situation shaped the idea behind **Health AI-based Risk and Emergency Monitoring System (HAIREMS)**. The goal was simple: continuously monitor critical ICU parameters and notify staff only when intervention was required .

We focused on three problems. First, saline bottles running empty without timely replacement. Second, oxygen cylinders dropping below safe pressure levels. Third, emergency machine sounds that indicate patient risk but may go unnoticed if staff are occupied. The objective was not to replace diagnosis, but to reduce repetitive supervision through automation .

### System Architecture

The system was built as a distributed embedded setup using **two NodeMCUs**, Arduino-based sensing, and cloud integration via **Blynk, IFTTT, and webhooks** .

For saline monitoring, an **IR sensor** tracked the liquid level. Oxygen level was estimated using a **flow-based sensing mechanism** attached to the cylinder output. Both subsystems transmitted data over Wi-Fi to the cloud, where threshold logic determined when alerts should be triggered.

Emergency sound detection was handled differently. Using an **Arduino Nano 33 BLE Sense**, we collected audio samples from ICU-like machine sounds. A model was trained on **Edge Impulse** to classify sounds into low-risk, mid-risk, and high-risk categories. Inference ran directly on the device, enabling real-time classification without constant cloud processing.

![HAIREMS System Architecture](/images/blog/hairems-system-architecture-pro.svg)

### The Integration Challenges

The main difficulty was not building individual modules, but integrating them reliably.

The ESP8266 modules occasionally dropped connections under continuous transmission. The oxygen monitoring logic initially kept subtracting flow from a fixed total capacity, which meant the displayed volume remained incorrect. Fixing this required reworking the interrupt logic and recalibrating the pulse-to-volume conversion.

Audio classification required multiple iterations. Access to real ICU environments during COVID was limited, so we simulated machine sounds and built controlled datasets. This improved model stability, but highlighted the challenge of validating Edge AI systems without real-world deployment data.

Testing with actual oxygen cylinders and hospital infrastructure was not possible. We relied on controlled prototypes, which limited validation but allowed us to demonstrate system functionality.

### What This Project Taught Me

HAIREMS became one of the most integrated systems I had built at that stage. Multiple microcontrollers, sensor inputs, Edge AI inference, cloud dashboards, and notification pipelines had to function together consistently.

The key lesson was that embedded systems design goes beyond firmware. It involves defining safe thresholds, handling unreliable networks, validating sensor assumptions, and designing for constraints you cannot fully control.

Even today, the core problem remains relevant. Healthcare monitoring still requires automation support. This project strengthened my understanding of how hardware, AI, and cloud services intersect in practical, constraint-driven systems.

### Project Links

- GitHub repository: [malladi2610/hairems](https://github.com/malladi2610/hairems)
