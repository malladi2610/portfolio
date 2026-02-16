---

title: "Rust Quadcopter Control System with Safety FSM, UART Protocol, and 200 Hz Raw-Mode Sensor Fusion"
description: "Implemented a PC-to-drone control stack for the TU Delft Quadrupel quadcopter, featuring a safety-first FSM, UART messaging with checksums, PID-based stabilization, and Mahony-filter raw mode at 200 Hz."
pubDate: 2026-02-15
updatedDate: 2026-02-15
topic: "electronics"
tags: ["rust", "flight-control", "pid-control", "sensor-fusion", "uart-protocol", "state-machine"]
heroImage: "/images/blog/embedded-drone-control-hero.png"
draft: false
---

# Rust Quadcopter Control System with Safety FSM, UART Protocol, and 200 Hz Raw-Mode Sensor Fusion

This project implements embedded software to stabilize and control a quad-rotor drone (“Quadrupel”) using a PC ground station (GUI + joystick) communicating over a UART PC-link. The system is built around a safety-first finite state machine (FSM), reliable command/telemetry exchange, and multiple flight modes including full control and an optional raw mode running at 200 Hz.  

## Table of Contents

* [Context](#context)
* [Approach](#approach)
* [Implementation](#implementation)
* [Results](#results)
* [Images](#images)
* [References](#references)
* [Appendix](#appendix)

## Context

The course project goal is to design embedded software that stabilizes a quadcopter so a human pilot can control attitude (roll, pitch) and yaw rate through a joystick, with strict safety and dependability requirements. The system must support at least six modes: safe, panic, manual, calibration, yaw control, and full control; raw sensors mode, height control, and wireless mode are optional for higher grades. 

Key constraints and requirements from the problem statement:

* **Safety-first operation**: safe state must always be reachable; safe state is the initial and final state; panic mode must be triggerable at all times and must ramp down safely. 
* **Battery protection**: battery voltage must be monitored and trigger panic below a threshold. 
* **Reliable communication**: PC link must be dependable; disconnection or erratic behavior must cause panic mode. 
* **No floating point on target**: Cortex-M0 class limitations imply careful fixed-point handling and overflow safety. 

Hardware and system setup:

* PC ground station + joystick, connected to the drone via a tethered (USB/serial) or wireless PC link (wireless optional). 

## Approach

The implementation followed a “safety and structure first” design:

1. **Split the system into three parts**:

   * **Controller (PC)**: reads joystick/keyboard inputs, runs a safety FSM to gate transitions, sends commands, and visualizes telemetry in a GUI. 
   * **Quadcopter (embedded)**: runs the real-time control loop (sensing → comms → safety checks → mode logic → actuation), and autonomously enters panic on communication loss. 
   * **Common**: shared protocol definitions, constants, and types to prevent drift between PC and embedded sides. 

2. **Make the FSM the “single source of truth” for mode transitions**:

   * The controller tracks allowed transitions and requests changes.
   * The quadcopter acknowledges and applies mode-specific behavior.
   * Safety constraints (like joystick neutrality) gate transitions to armed modes. 

3. **Use a robust serial protocol with checksums**:

   * Master-slave style exchange (controller initiates; drone responds).
   * Each message includes structured content plus a 16-bit checksum. 

4. **Stabilize with PID controllers and sensor fusion**:

   * Use separate, non-cascaded PID controllers for yaw/pitch/roll in controlled modes.
   * Use DMP-based orientation in full control, and implement raw-mode fusion with a Mahony filter at 200 Hz. 

## Implementation

### System architecture (PC + drone + shared code)

The architecture is explicitly documented as three modules (controller, quadcopter, common). The block diagram in the implementation report (Appendix C, page 11) shows:

* PC side threads (GUI + updater + backend)
* PC link to the drone controller
* Sensor block selecting DMP vs RAW signals
* PID “switching” into the actuation block that generates four motor signals (ae1..ae4). 

### Controller (PC side)

**Input and UI**

* Joystick events are polled using the GilRs crate.
* Egui is used for an immediate-mode UI that prioritizes critical status while still exposing telemetry and tuning controls. 
* The controller is split into **three threads**:

  * Main UI thread (immediate mode)
  * UI updater thread (requests refresh ~every 20 ms)
  * Backend thread (communication + FSM + input handling) 

**Timing**

* Joystick values are transmitted periodically (every ~100 ms), reducing UART load while keeping control responsive. 

### Quadcopter (embedded side)

**Control loop structure**
The embedded loop performs the same high-level sequence each iteration:

1. Read sensors
2. Check UART for commands
3. Check vitals (battery, connection status)
4. Update sample time (Δt)
5. Run mode logic
6. Optional logging to flash 

**Autonomous safety**

* If no message is received for ~0.25 s, the drone enters panic mode autonomously (chosen because joystick updates arrive every 100 ms). 
* Battery voltage is checked periodically and can trigger panic mode only after repeated consecutive threshold hits to avoid false positives caused by transient drops. 

### Finite State Machine (modes and behavior)

Supported modes and key behavior:

* **Safe**: motors disabled; only responds to safe transition commands. 
* **Panic**: ignores commands; ramps motors down over ~1 second then returns to safe. 
* **Manual**: joystick values map directly to actuation (no feedback control). 
* **Calibration**: averages DMP and direct sensor readings over ~1 second to compute offsets; returns to safe after calibration; provides LED feedback. 
* **Yaw control**: uses measured yaw angle (from DMP) and derives yaw rate; compares to desired yaw rate from joystick; applies a yaw controller. 
* **Full control**: three controllers for yaw, pitch, roll using DMP orientation for feedback. 
* **Raw mode (extra)**: replaces DMP orientation with onboard sensor fusion (Mahony), enabling higher-rate operation. 
* **Height control (extra)**: described as barometer + accelerometer fusion via a Kalman filter for altitude estimation; PID for height hold (reported as derived from logs/theory rather than direct flight test). 

### Serial transfer protocol (UART)

Protocol design highlights:

* Message = `content` (enum `Protocol`) + `u16 checksum`.
* On the drone: `receive()` reads a message within a timeout and verifies checksum, relying on UART byte primitives.
* On the controller: a combined `send_receive()` sends a request then loops until timeout to collect bytes, validate, and return the parsed content. 

### Motor actuation model (ae1..ae4)

The control system uses a component-based mixing model:

* lift contributes equally to all motors
* roll creates differential between ae2 and ae4
* pitch creates differential between ae1 and ae3
* yaw creates differential between motor pairs (ae1, ae3) and (ae2, ae4)

Motor equations:

* ae1 = lift + pitch − yaw
* ae2 = lift − roll + yaw
* ae3 = lift − pitch − yaw
* ae4 = lift + roll + yaw 

The implementation also supports trim values (via GUI) to offset component signals for balancing hardware asymmetries. 

### PID control strategy

The report uses standard PID definitions with discrete-time integration and differentiation:

* P[n] = error[n]
* I[n] = I[n−1] + error[n]·Δt
* D[n] = (error[n] − error[n−1]) / Δt
* y[n] = Kp·P + Ki·I + Kd·D 

Controller choices in this implementation:

* **Yaw control**: P-controller
* **Pitch/Roll control**: PD controllers
* Controller outputs are constrained to match the same ranges used in manual mode component signals (so the PID behaves like a “virtual joystick”). 

### Sensor fusion: DMP vs Raw + Mahony

* In **full control**, pitch/roll come from DMP-provided orientation values.
* In **raw mode**, the system uses direct accelerometer + gyro data (MPU6050), which is noisy and needs filtering/fusion.
* A Kalman filter was considered but deemed too expensive (single iteration reported to exceed 10 ms).
* The project implemented a **Mahony filter**, using PI-style correction to reduce gyro drift and update orientation as quaternions, then deriving roll/pitch from the quaternion. Raw mode used Kp=30, Ki=0 (as reported). 

### Data logging to flash

To avoid saturating UART with high-rate debug output:

* The drone logs sensor/DMP values to onboard flash each iteration when enabled.
* Log download is restricted to safe mode and chunked due to message size limits:

  * Protocol max message size noted as 256 bytes; download packet size set to 128 bytes
  * Iterative transfer continues until end-of-log. 

## Results

Demonstrated outcomes (from the implementation report):

* All safety features behaved responsively.
* All mandatory modes met requirements.
* Free flight achieved in full control mode.
* Raw mode ran at **200 Hz** with a steady Δt of **4 ms**.
* GUI presented telemetry clearly. 

Limitations explicitly noted in the report:

* Height control mode behavior was described as not tested directly in flight; conclusions were derived from logs and theoretical formulas. 

## Images

If you already have screenshots/figures from the report, these are the highest-value visuals to include:

1. System overview (PC ↔ drone)
   ![System setup overview](/images/blog/embedded-drone-system-setup.png)
   (From the problem statement “System Setup” diagram showing joystick + PC link to the drone. )

2. High-level architecture block diagram
   ![High-level architecture block diagram](/images/blog/embedded-drone-architecture-block-diagram.png)
   (From Appendix C.1 in the implementation report, page 11, showing PC threads, PC link, sensor block (DMP/RAW), PID switch blocks, and actuation into ae1..ae4. )

3. Control stack diagram (PID → actuation)
   ![PID controllers connected to actuation block](/images/blog/embedded-drone-pid-actuation.png)
   (From Figure 3.2 in the implementation report illustrating pitch/roll/yaw controllers feeding the actuation block. )

4. Raw vs DMP attitude comparison plots
   ![Raw vs DMP comparison plots](/images/blog/embedded-drone-raw-vs-dmp-plots.png)
   (From the sensor fusion section showing roll, pitch, and yaw rate comparisons. )

## References

* Embedded Systems Lab problem statement (requirements, modes, safety checklist). 
* Embedded Systems Lab final implementation report (architecture, protocol, PID, sensor fusion, results). 

## Appendix

### Notes on what was and wasn’t provided

* Source code snippets were not included in the provided material, so this post describes implementation based on the two reports only.  
