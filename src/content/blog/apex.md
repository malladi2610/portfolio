---
title: "APEX: From a Classroom Detour to a Working Hydroponics IoT System"
description: "How an alternative to a routine assignment became a funded IoT-enabled hydroponics monitoring prototype."
pubDate: 2026-02-27
updatedDate: 2026-02-27
topic: "electronics"
tags: ["IoT", "Hydroponics", "Embedded Systems"]
heroImage: "/images/blog/apex/apex-final-system-architecture.svg"
showHeroOnPost: false
draft: false
---
This was the first serious project I built during my bachelor’s, though it started as something simple. While everyone else in class chose the standard assignment, my friend and I decided to build something instead.

We were fascinated by one idea: what if plants could “express” how they felt?

That question became APEX (Artificial Plant Emotion Xpresser). What began as a playful concept slowly turned into a structured attempt to solve a real problem. Because water scarcity, irregular weather, and inefficient irrigation practices make conventional farming difficult, hydroponics offers control—but only if parameters like **pH, temperature, moisture, and nutrient levels** are monitored continuously.

Our goal was straightforward: build an embedded system that could monitor these variables, push the data to the cloud, and reduce manual intervention.

<img src="/images/blog/apex/apex-v1-flowchart.svg" alt="APEX first-version workflow" width="360" height="570" loading="lazy" style="margin: 20px auto;" />

### Designing the System

We divided the architecture into two blocks: a **field unit** and a **mobile interface**.

The field system used:

- **Arduino Mega 2560** for processing  
- **ESP8266/ESP32** for Wi-Fi communication  
- Moisture, temperature (DS18B20), pH (SEN0161), and ultrasonic (HC-SR04) sensors  

After processing the sensor data locally, the system transmitted it to the cloud via MQTT. Simultaneously, a Flutter-based mobile application displayed the real-time readings, allowing us to monitor the setup from anywhere.

<img src="/images/blog/apex/apex-final-system-architecture.svg" alt="APEX final system architecture" width="760" height="456" loading="lazy" style="margin: 20px auto;" />

We executed the work in phases, moving from plant growth experiments to cloud and app integration, and finally to automated monitoring with minimal human intervention.

### What Broke and What We Learned

The first prototype only mapped moisture levels to facial expressions on an LED matrix, which looked simple but forced us to understand calibration and threshold logic. However, scaling to a hydroponics setup exposed real issues.

We quickly learned that moisture sensors degrade over time and pH probes require careful handling. Furthermore, nutrient accumulation in closed-loop systems directly affected plant health, forcing us to log readings consistently and recalibrate regularly.

Integration proved to be another challenge entirely. SPI communication between the Arduino and ESP modules occasionally failed, and incorrect MQTT payload formatting broke app-side parsing. Debugging meant validating each layer separately—from raw analog readings to cloud storage to UI rendering. 

We also faced physical constraints, as limited space during large-scale planting attempts forced us to rethink our deployment density.

### Where It Landed

In the final phase, the system successfully monitored pH, water level, temperature, and moisture continuously while streaming data to the cloud. Under controlled conditions, we maintained the pH around 6.5 and the water temperature near 25°C.

Ultimately, what started as a replacement for a standard assignment became the first-prize-winning project of my bachelor’s, securing €1000 in funding. 

More importantly, it taught me how to structure a problem statement, conduct a literature review, prototype using off-the-shelf components, integrate multiple sensors, and build a full embedded IoT pipeline that actually worked. It was the first time I built something end-to-end with friends, solved real constraints, and saw a system operate reliably outside a lab environment.

### Project Links

- GitHub repository: [malladi2610/APEX](https://github.com/malladi2610/APEX)
