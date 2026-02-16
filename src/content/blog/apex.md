---

title: "APEX: IoT-Based Hydroponics Monitoring and Plant “Emotion” Feedback System"
description: "An embedded + mobile system that monitors hydroponics parameters (moisture, temperature, pH, water level), streams them via MQTT to the cloud, and visualizes plant status through a mobile app and “emotion” feedback."
pubDate: 2026-02-15
updatedDate: 2026-02-15
topic: "electronics"
tags: ["iot", "hydroponics", "arduino", "mqtt", "flutter", "sensors"]
heroImage: "/images/blog/apex-hero.png"
draft: false
---

# APEX: IoT-Based Hydroponics Monitoring and Plant “Emotion” Feedback System

APEX (Artificial Plant Emotion Xpressor / Expresser) is a sensor-driven embedded system designed to monitor plant growth conditions and reduce manual effort in farming workflows. The project started with a simple soil-moisture “emotion display” prototype (happy/sad face), and evolved into a hydroponics monitoring + management stack with cloud connectivity, a real-time monitoring app, and a basic e-commerce app for selling produce.   

## Table of Contents

* [Context](#context)
* [Approach](#approach)
* [Implementation](#implementation)
* [Results](#results)
* [Images](#images)
* [References](#references)
* [Appendix](#appendix)

## Context

### Motivation

The project was motivated by two related problems:

1. **Conventional irrigation is often unplanned and inefficient**, leading to water wastage and potential fertilizer runoff. APEX was positioned as a way to automate irrigation decisions based on sensed moisture levels. 
2. **Hydroponics requires consistent monitoring of multiple parameters** (pH, nutrient quality, temperature, water level, etc.). The project aimed to reduce manual intervention by continuously sensing the environment and making the system easier to operate.  

### What “plant emotion” means in this project

“Emotion” is used as a **human-readable status encoding** of the plant’s current condition. In the first prototype, the system mapped moisture level to a simple happy/sad face on an LED matrix:

* Moisture < 50% → **sad face**
* Moisture ≥ 50% → **happy face** 

As the system evolved, the same idea expanded into a broader monitoring stack where sensor readings are shown in a mobile app and cloud dashboard, and can be used for troubleshooting and automation.  

## Approach

### High-level system architecture

Across the documents, APEX can be summarized as three connected layers:

1. **Field/Device layer (hardware near plants)**

   * Sensors measure key parameters (moisture, temperature, pH, water level).
   * A microcontroller reads sensors, processes raw signals, and prepares telemetry.  

2. **Connectivity + cloud layer**

   * Data is pushed to the cloud (described as Adafruit IO / Adafruit cloud).
   * Communication is described using MQTT, with the device publishing telemetry and the app subscribing to it.  

3. **Application layer**

   * **APEX-Statistics app**: real-time monitoring dashboard for the owner.
   * **E-commerce app**: a consumer-facing flow to purchase produce, including authentication and payment flow. 

### Design evolution

The project explicitly went through iterative prototyping:

* **Prototype 1 (emotion display + soil moisture + phone update)**
  A compact build focused on representing moisture status locally (LED faces) and sending moisture values to a phone using NodeMCU. 

* **Prototype 2 (hydroponics monitoring + actuation direction)**
  The later design introduces a larger hydroponics monitoring system with multiple sensors, cloud integration, and notes about adding a motor and controller near the tank side for controlled water delivery.  

## Implementation

### Prototype 1: Soil moisture “emotion” device

**Core components (as listed):**

* Arduino UNO
* NodeMCU
* Moisture sensor
* Capacitive touch sensor (used as a power/control input instead of a switch)
* 8×8 LED matrix (emotion face output)
* Battery and wiring 

**Behavior**

* Arduino samples the moisture sensor every few seconds.
* The reading is converted into a binary emotion (happy/sad) and displayed on the LED matrix.
* NodeMCU sends moisture data to a phone app for remote viewing. 

**Engineering notes / future improvements mentioned**

* Replace resistive moisture sensor with a capacitive moisture sensor for better accuracy and corrosion resistance.
* Reduce size by integrating components into a custom PCB. 

### Hydroponics system: Multi-sensor monitoring + cloud telemetry

The final report and paper describe a hydroponics monitoring “field system” with these sensors and processing elements:  

**Sensors**

* **Moisture sensor**: monitors moisture in the growing media (example media: coco peat). It is described using a voltage-divider style principle, where resistance changes based on water content.  
* **Temperature sensor (DS18B20 mentioned)**: monitors ambient/room temperature for crops sensitive to temperature variation.  
* **pH sensor (SEN0161 mentioned)**: monitors nutrient solution pH; the system targets a typical hydroponics-friendly range (noted as 6–7).  
* **Ultrasonic sensor (HC-SR04)**: monitors nutrient solution level in the reservoir by distance measurement.  

**Processing + connectivity**

* The hydroponics field system is described with **Arduino Mega 2560** as the main processor reading sensors and preparing data.  
* Connectivity is described through an ESP Wi-Fi module (documents mention ESP32 and also ESP8266/ESP8366 wording), used to publish data to the cloud.  
* Data transport is described as **MQTT** to the cloud platform (Adafruit), then the app subscribes to the MQTT feed to display data.  

**Automation intent**
The project narrative repeatedly describes automation and troubleshooting:

* parameters are monitored continuously,
* the system aims to maintain “ideal conditions,”
* and later scope includes adding ML models for prediction/control.   

### Mobile applications

Two Flutter applications are described: 

1. **APEX-Statistics app**

   * Fetches real-time sensor telemetry from Adafruit cloud.
   * Used by the owner/operator to monitor plant growth parameters.

2. **E-commerce app**

   * User login (including Google Sign-In is explicitly mentioned).
   * Catalog list view, cart, address form.
   * Payment via Google Pay flow (the report attributes implementation to the Flutter `pay` plugin). 

**Flutter packages explicitly listed**

* `cupertino_icons`, `google_fonts`, `velocity_x`
* `google_sign_in`
* `firebase_core`, `firebase_auth`
* `shared_preferences`
* `pay` 

### Project workflow (timeline model from the research paper)

The research paper describes a phased workflow and a production planning model: 

* **Phase I (Aug 2019 – Feb 2020)**: grow multiple crops and observe life cycles, nutrients, and natural vs artificial light; compare NFT vs growbag system; collect data and document mistakes to automate later.
* **Phase II (Feb 2020 – Jun 2020)**: focus on cloud/app/product design and business plan; large-scale planting limited by space.
* **Phase III (Jul 2020 – Dec 2020)**: focus on plantation testing, soil vs coco peat comparisons, artificial lighting experiments, and pushing toward full automation with minimal human intervention.

The paper also gives a crop-cycle planning approach (example using spinach) to aim for weekly harvest by staggering sowing and transfer to the NFT system. 

## Results

### Telemetry readings demonstrated

The research paper reports example readings under specific conditions: 

* Water level: **30**
* Water temperature: **25°C**
* Moisture level: **90**
* pH: **6.5**

These are presented as app-side and cloud-side dashboard values (figures referenced in the paper).

### What was validated (from the project docs)

Based on the reports, the project validates:

* End-to-end data flow from sensors → microcontroller → Wi-Fi module → cloud (Adafruit) → mobile app visualization.  
* A practical mapping from raw sensor readings into understandable plant status (initially as a facial emotion indicator). 
* A working mobile UX for monitoring (Statistics app) and a separate consumer UX for ordering produce (E-commerce app). 

### Limitations explicitly noted

* Scaling plantation/testing was constrained by available space during Phase II. 
* Full closed-loop control with learned models is discussed as future scope, not as a fully completed feature set in the provided material.  

## Images

The provided documents mention and imply several diagrams and screenshots (flow diagram, app screenshots, prototype photos, dashboards). To keep the blog publishable without inventing assets, here are clean placeholders you can replace with exports from your docs:

* ![APEX system overview architecture diagram](/images/blog/apex-system-overview.png)
* ![APEX workflow flowchart](/images/blog/apex-workflow-flowchart.png)
* ![Prototype 1: LED matrix emotion display](/images/blog/apex-prototype1-led-matrix.png)
* ![Prototype 1: moisture readings on phone app](/images/blog/apex-prototype1-phone-readings.png)
* ![Hydroponics field system sensor + controller setup](/images/blog/apex-hydroponics-field-system.png)
* ![Adafruit IO / MQTT dashboard showing telemetry](/images/blog/apex-adafruit-mqtt-dashboard.png)
* ![APEX-Statistics Flutter app screens](/images/blog/apex-statistics-app.png)
* ![E-commerce Flutter app: catalog, cart, checkout](/images/blog/apex-ecommerce-app.png)
* ![Experimental setup photo](/images/blog/apex-experimental-setup.png)

## References

* APEX PowerPoint (project narrative, use cases, prototype images, impact/novelty claims). 
* APEX Flowchart document (workflow reference). 
* APEX REPORT (prototype 1 description: Arduino UNO + NodeMCU + LED matrix emotion display). 
* Final Project Report – APEX: “Hydroponics farming Monitoring and Management System” (hardware, sensors, MQTT/cloud, Flutter apps, packages, app flows, future scope). 
* Research paper: *Artificial intelligence enabled plant emotion xpresser in the development hydroponics system* (architecture summary, phased workflow, example telemetry readings, direction toward intelligent agents/ML). 

## Appendix

### Notes on “control” vs “monitoring” in the provided material

* The system is clearly implemented as a **monitoring + telemetry + visualization** pipeline (sensors → cloud → apps).  
* Some documents discuss automation actions (e.g., motor near the tank side, automatic handling of parameter deviations, later ML-based optimization), but the provided text does not include concrete control logic details, actuator wiring diagrams, or control algorithms. Where those details were not explicitly provided, they were not fabricated in this draft.  
