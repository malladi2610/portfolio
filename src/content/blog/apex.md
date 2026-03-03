---
title: "APEX: From a Classroom Detour to a Working Hydroponics IoT System"
description: "How an alternative to a routine assignment became a funded IoT-enabled hydroponics monitoring prototype."
pubDate: 2026-02-27
updatedDate: 2026-02-27
topic: "electronics"
tags: ["IoT", "Hydroponics", "Embedded Systems"]
heroImage: "/images/blog/apex-final-system-architecture.svg"
draft: false
---
### Where It All Began

This was the first serious project I built during my bachelor’s. It started as something simple. Everyone in class chose the standard assignment. My friend and I decided to build something instead.

We were fascinated by one idea: what if plants could “express” how they felt?

That question became APEX, Artificial Plant Emotion Xpresser. What began as a playful concept slowly turned into a structured attempt to solve a real problem. Water scarcity, irregular weather, and inefficient irrigation practices make conventional farming difficult. Hydroponics offers control, but only if parameters like **pH, temperature, moisture, and nutrient levels** are monitored continuously.

Our goal was straightforward. Build an embedded system that could monitor these variables, push the data to the cloud, and reduce manual intervention.

![APEX first-version workflow](/images/blog/apex-v1-flowchart.svg)
*Figure: Initial APEX workflow from the early prototype phase.*

### Designing the System

We divided the architecture into two blocks: a **field unit** and a **mobile interface**.

The field system used:

- **Arduino Mega 2560** for processing  
- **ESP8266/ESP32** for Wi-Fi communication  
- Moisture, temperature (DS18B20), pH (SEN0161), and ultrasonic (HC-SR04) sensors  

Sensor data was processed locally and transmitted to the cloud via MQTT. A Flutter-based mobile application displayed real-time readings and allowed monitoring from anywhere.

![APEX final system architecture](/images/blog/apex-final-system-architecture.svg)
*Figure: Final APEX architecture with hydroponics hardware, control layer, and cloud monitoring.*

We executed the work in phases: plant growth experiments, cloud and app integration, and finally automated monitoring with reduced human intervention.

### What Broke and What We Learned

The first prototype only mapped moisture levels to facial expressions on an LED matrix. It looked simple, but it forced us to understand calibration and threshold logic.

Scaling to a hydroponics setup exposed real issues.

Moisture sensors degraded over time. pH probes required careful handling. Nutrient accumulation in closed-loop systems affected plant health. We learned to log readings consistently and recalibrate regularly.

Integration was another challenge. SPI communication between Arduino and ESP modules occasionally failed. Incorrect MQTT payload formatting broke app-side parsing. Debugging meant validating each layer separately, from raw analog readings to cloud storage to UI rendering.

We also faced physical constraints. During large-scale planting attempts, limited space forced us to rethink deployment density.

### Where It Landed

In the final phase, the system continuously monitored pH, water level, temperature, and moisture, and streamed data to the cloud. Under controlled conditions, we maintained pH around 6.5 and water temperature near 25°C.

What started as a replacement for an assignment became the first prize-winning project of my bachelor’s, along with €1000 in funding.

More importantly, it taught me how to structure a problem statement, conduct a literature review, prototype using off-the-shelf components, integrate multiple sensors, and build a full embedded IoT pipeline that actually worked.

It was the first time I built something end-to-end with friends, solved real constraints, and saw a system operate reliably outside a lab environment.

### Project Links

- GitHub repository: `https://github.com/malladi2610/APEX.git`

