---
title: "How Much Embedded Systems Knowledge Is Enough for the Job?"
description: "A stage-based way to judge embedded skills using simulation, prototype, and MVP implementation expectations."
pubDate: 2026-02-15
updatedDate: 2026-02-15
topic: "electronics"
tags: ["embedded-systems", "firmware", "mcu", "debugging", "rtos", "career"]
heroImage: "/images/blog/knowing-how-much-embedded-is-enough-hero.png"
draft: false
---
<!-- Make sure the exisiting block diagram works and clear -->

From my first electronics project back in 2018 during my bachelor’s studies (an obstacle avoidance robot that used an ultrasonic sensor) to building larger systems like an autonomous drone, I’ve realized that “knowing embedded systems” is not one single milestone. It is a progression, and this progression is currently shaping my latest idea of a “digital Embedded CV” after graduation. 

In interviews, confusion usually comes from not knowing where your project sits in that progression and what “good” means at that level. The simplest way I’ve found to describe it is a three-stage ladder: Simulation, Prototype, and Implementation (MVP). If you can say which stage your work is in and justify it, you’re no longer guessing your level.

![Embedded System Development Process Diagram](/images/blog/knowing_embedded_systems/Embedded_system_stages.png)

Each stage has a different definition of progress and comes with a specific set of tools you should know if you claim to be strong at that level.

### Simulation (validate before hardware)

This stage is about checking whether the idea makes sense under constraints before wiring anything up. Being good here means you can reason about basic timing, power, sensor limits, and interface assumptions while clearly explaining your rationale. 



Tools that commonly show up include LTspice (or similar circuit simulators), quick sanity-check tools like Falstad, and sometimes MATLAB/Simulink if control or signal processing is central. Furthermore, for communication and system planning, simple diagrams using draw.io or PlantUML are incredibly helpful because they make your architecture and state flow clear.

### Prototype (make it work on real hardware)

This is where you use dev boards and off-the-shelf modules to achieve a stable demo that actually runs on an MCU. Being good at prototyping usually means you can bring up a mainstream platform (like STM32, ESP32, RP2040, or ARM Cortex-M), configure pins and clocks, and integrate common buses like UART, SPI, and I²C reliably. 



The tools matter significantly more at this stage because debugging is the real work. You need GDB with OpenOCD, a vendor setup like STM32CubeIDE or ESP-IDF, and basic lab equipment such as a logic analyzer, an oscilloscope, and a serial monitor.

### Implementation (MVP) (make it reliable)

This stage is where "it runs" becomes "it keeps running." Being good here means you handle failure cases on purpose, which includes implementing state machines, safe states, watchdog resets, timeouts, and basic timing guarantees like loop frequency and latency. 



Your toolkit usually expands to include an RTOS like FreeRTOS when the system needs scheduling, tracing and profiling tools such as Segger SystemView, and code-quality checks like clang-tidy, cppcheck, and a clean Git history. Finally, if custom hardware is part of your scope, a basic PCB flow using KiCad or Altium is a strong signal of competence even if it is a simple board.

This three-stage ladder is exactly how I want to approach my “digital embedded CV” project. I intend to treat it as an embedded system that moves through these stages sequentially rather than jumping straight to a final build. For me, "how much embedded is enough" comes down to one practical question: which stage can I claim today, and what proof (in terms of tools used, constraints handled, and debugging done) supports that claim?