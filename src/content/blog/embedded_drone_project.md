---
title: "Stabilizing a Quadcopter with Rust and Fixed-Point Control"
description: "Designing a safety-critical quadcopter control system in Rust with PID control, sensor fusion, and robust state management."
pubDate: 2026-02-24
updatedDate: 2026-02-24
topic: "electronics"
tags: ["Embedded Systems", "Rust", "Control Systems"]
heroImage: ""
draft: false
---
<!-- Make a simple block diagram using the report and add it here  -->
<!-- Add videos and report to the github -->

Last Spring I worked on a group engineering project where we had to design and implement the full control software for a quadcopter using Rust. We were given the drone hardware and a base platform, but everything else: the control logic, state machines, communication protocol, filtering, and tuning, had to be built from scratch.

The flight controller ran on an ARM Cortex-M0 without floating-point support, yet the system had to satisfy strict safety requirements. Not only did it need to boot in safe mode, support a reliable panic mode, and monitor battery voltage, but it also had to remain stable even if the UART link to the PC dropped. This was a crucial feature, as a drone is inherently unstable and would flip within seconds without feedback control.

As my first drone project in Rust and my first time building a complete real-time control stack on constrained hardware, I was responsible for the basic flight control, along with implementing and tuning both the yaw and height control modes.

## The Approach

We designed the architecture around three main components: the controller (PC side), the drone firmware, and a shared protocol layer. While the controller handled joystick input, GUI updates, and the finite state machine governing allowed mode transitions, the drone ran the real-time control loop to execute whatever mode the controller requested once validated.

On the drone, the control loop followed a clear structure. Each iteration gathered sensor data, checked for new UART messages, verified battery voltage and connection health, updated the sample time, executed mode-specific logic, and finally computed motor actuation signals. In controlled modes, we used separate non-cascaded PID controllers for yaw, pitch, and roll.



Because the Cortex-M0 has no floating-point unit, all computations were implemented using fixed-point arithmetic. That constraint influenced every design choice, from PID scaling to sensor fusion.

For full control mode, we relied on DMP-processed attitude estimates; however, for raw mode, we implemented a Mahony filter running at 200 Hz to fuse accelerometer and gyroscope data directly on the microcontroller. Similarly, height control used the barometer to estimate altitude, fusing it with integrated vertical acceleration through a Kalman filter to reduce drift and noise.



We also implemented logging directly on the drone, writing sensor and DMP values to flash memory during flight to be downloaded later over UART in safe mode. This allowed us to inspect raw and filtered signals without overwhelming the active communication link.

Safety was tightly integrated into the state machine: if no UART message was received for 250 milliseconds, the drone autonomously entered a panic mode that gradually ramped down motor speeds before returning to safe mode.

## The Trenches

The most frustrating issue appeared during yaw tuning. Although we changed the PID gains multiple times, the drone’s behavior barely shifted, it wasn't unstable, but it wasn't responding to our tuning either.

After carefully stepping through the control equations, we found the culprit: a sign in the yaw error calculation was implemented incorrectly, causing the controller to partially cancel its own correction term. Because everything was scaled in fixed-point representation, the effect was incredibly subtle in the logs, but once corrected, the controller gains immediately started producing the expected changes.

Height control brought a different challenge since the barometer updated slowly and fluctuated, while the accelerometer integration drifted over time. It was only after fusing both signals that the altitude stabilization became practically usable.

## The Resolution

During the final flight test, the drone successfully took off, stabilized, and maintained its attitude in full control mode. Raw mode ran flawlessly at 200 Hz with a consistent 4-millisecond loop time, panic mode safely slowed the motors down, and the state machine worked exactly as planned.

Watching it fly was rewarding, but the bigger lesson was about architecture: in embedded systems, safety and clear control logic matter far more than clever algorithms. More importantly, it reinforced how careful state design and defensive programming (thanks to Rust!) are essential when software directly controls hardware.

## Project Links

- GitHub repository: [malladi2610/Autonomous-drone](https://github.com/malladi2610/Autonomous-drone)