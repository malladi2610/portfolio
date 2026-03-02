---
title: "Stabilizing a Quadcopter with Rust and Fixed-Point Control"
description: "Designing a safety-critical quadcopter control system in Rust with PID control, sensor fusion, and robust state management."
pubDate: 2026-02-24
updatedDate: 2026-02-24
topic: "electronics"
tags: ["Embedded Systems", "Rust", "Control Systems"]
heroImage: "/images/blog/quadcopter-rust-architecture.png"
draft: false
---
<!-- Make a simple block diagram using the report and add it here  -->
<!-- Add videos and report to the github -->

Last Spring I worked on a group engineering project where we had to design and implement the full control software for a quadcopter using Rust. We were given the drone hardware and a base platform, but everything else, the control logic, state machines, communication protocol, filtering, and tuning, had to be built from scratch.

The flight controller ran on an ARM Cortex-M0 without floating-point support. At the same time, the system had to satisfy strict safety requirements. It had to boot in safe mode, support a reliable panic mode, monitor battery voltage, and remain stable even if the UART link to the PC dropped. The drone is inherently unstable, so without feedback control it would flip within seconds.

I was responsible for the basic flight control, along with implementing and tuning yaw control mode and height control mode. It was my first drone project in Rust and my first time building a complete real-time control stack on constrained hardware.

## The Approach

We designed the architecture around three main components: the controller (PC side), the drone firmware, and a shared protocol layer. The controller handled joystick input, GUI updates, and the finite state machine that governed allowed mode transitions. The drone ran the real-time control loop and executed whatever mode the controller requested, once validated.

On the drone, the control loop followed a clear structure. Each iteration gathered sensor data, checked for new UART messages, verified battery voltage and connection health, updated the sample time, executed mode-specific logic, and finally computed motor actuation signals. In controlled modes, we used separate non-cascaded PID controllers for yaw, pitch, and roll.

*High-level quadcopter control architecture*

Because the Cortex-M0 has no floating-point unit, all computations were implemented using fixed-point arithmetic. That constraint influenced every design choice, from PID scaling to sensor fusion.

For full control mode, we relied on DMP-processed attitude estimates. For raw mode, we implemented a Mahony filter running at 200 Hz to fuse accelerometer and gyroscope data directly on the microcontroller. Height control used the barometer to estimate altitude and fused it with integrated vertical acceleration through a Kalman filter to reduce drift and noise.

We also implemented logging directly on the drone. Sensor and DMP values were written to flash memory during flight and later downloaded over UART in safe mode. This allowed us to inspect raw and filtered signals without overwhelming the communication link.

Safety was tightly integrated into the state machine. If no UART message was received for 250 milliseconds, the drone entered panic mode autonomously. Panic mode gradually ramped down motor speeds before returning to safe mode.

## The Trenches

The most frustrating issue appeared during yaw tuning. We changed the PID gains multiple times, but the drone’s behavior barely shifted. It was not unstable, but it was not responding to tuning either.

After stepping through the control equations carefully, we found the issue. A sign in the yaw error calculation was implemented incorrectly. The controller was partially canceling its own correction term. Because everything was scaled in fixed-point representation, the effect was subtle in the logs. Once corrected, the controller gains started producing the expected changes.

Height control brought a different challenge. The barometer updated slowly and fluctuated, while accelerometer integration drifted over time. Only after fusing both signals did altitude stabilization become usable in practice.

## The Resolution

During the final flight test, the drone took off, stabilized, and maintained its attitude in full control mode. Raw mode ran at 200 Hz with a consistent 4-millisecond loop time. Panic mode safely slowed the motors down. The state machine worked exactly as planned.

Watching it fly was rewarding, but the bigger lesson was about architecture. In embedded systems, safety and clear control logic matter more than clever algorithms. More importantly, it showed how careful state design and defensive programming (Because of Rust!!!) are essential when software directly controls hardware.
