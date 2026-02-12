---

title: "Bare-Metal Rust on ARM: UART Driver and Fault-Tolerant Protocol on LM3S6965"
description: "A no_std Rust application running on an emulated Stellaris LM3S6965 (ARM Cortex-M3) implementing a safe UART driver, custom protocol with checksums, and a graphical step counter."
pubDate: 2026-02-12
updatedDate: 2026-02-12
topic: "electronics"
tags: ["rust", "arm-cortex-m3", "uart", "bare-metal", "qemu"]
heroImage: "/images/blog/lm3s6965-uart-architecture-hero.png"
draft: true
-----------

# Bare-Metal Rust on ARM: UART Driver and Fault-Tolerant Protocol on LM3S6965

This project implements a bare-metal Rust application running on an emulated Stellaris LM3S6965 microcontroller (ARM Cortex-M3). The system includes a safe UART driver, a custom fault-tolerant message protocol with checksums, fixed-size buffering, and a graphical interface that tracks steps and movement on a simulated map.

---

## Table of Contents

* [Context](#context)
* [Approach](#approach)
* [Implementation](#implementation)
* [Results](#results)
* [Images](#images)
* [References](#references)
* [Appendix](#appendix)

---

## Context

The assignment required building a small program running inside QEMU, emulating a **Stellaris LM3S6965 microcontroller with an ARM Cortex-M3 core** .

The system requirements included:

* Programming without an operating system (bare-metal Rust)
* Implementing a UART driver from scratch
* Designing a higher-level communication protocol
* Creating safe abstractions over unsafe code
* Implementing buffering with fixed-size memory
* Adding checksums for message integrity
* Building a graphical interface with two views:

  * A walking map (1 pixel = 1 meter)
  * A step counter view 

The application runs inside an ARM emulator (QEMU) and communicates with a host-side runner over simulated UART.

---

## Approach

The system was divided into two major parts:

1. **UART driver implementation**
2. **Custom communication protocol and application logic**

Key design principles:

* `no_std` environment
* Strict control over global mutable state
* Safe abstractions over hardware register access
* Explicit reasoning for each `unsafe` block
* Fixed-size buffers
* Resynchronization after corrupted messages
* Shared serialization layer between runner and embedded target

The project uses:

* QEMU ARM emulator
* Rust cross-compilation (`thumbv7m-none-eabi`)
* Peripheral Access Crate (PAC)
* `serde` for serialization 

---

## Implementation

### 1. Bare-Metal Environment

The program runs without an operating system:

* `#![no_std]`
* Custom entry point
* Direct hardware register interaction
* Cross-compiled for `thumbv7m-none-eabi`

All hardware interaction is performed through memory-mapped registers of the LM3S6965.

---

### 2. UART Driver

The UART driver was implemented without using external UART libraries (explicitly disallowed) .

#### Responsibilities:

* Initialize UART peripheral
* Configure baud rate
* Enable TX/RX
* Poll transmit and receive registers
* Provide safe send/receive API

#### Safety Strategy

Unsafe blocks were required for:

* Accessing memory-mapped registers
* Modifying peripheral configuration registers

For each unsafe block:

* Preconditions were documented
* Invariants were enforced
* Register access was encapsulated in safe public APIs

Example abstraction structure:

```rust
pub struct Uart {
    // encapsulated PAC register access
}

impl Uart {
    pub fn write_byte(&mut self, byte: u8) {
        // safe wrapper
    }

    pub fn read_byte(&mut self) -> Option<u8> {
        // safe wrapper
    }
}
```

No undefined behavior is exposed to user code.

---

### 3. Safe Global State Abstraction

The assignment required a safe abstraction over global mutable state (similar to a Mutex) .

Since no OS threads exist, concurrency risks still arise from:

* Interrupt handlers
* Shared state across execution contexts

A custom synchronization primitive was implemented:

* Critical section protection
* Interior mutability pattern
* Unsafe only internally
* Soundness formally reasoned

The abstraction ensures:

* No simultaneous mutation
* No data races
* No undefined behavior

---

### 4. Buffering System

Requirements:

* Fixed-size buffers
* No crash on overflow
* Support long messages 

Implementation:

* Circular buffer (ring buffer)
* Fixed capacity
* Graceful handling when full
* Partial message handling

Buffer ensures:

* Stable system even under heavy message load
* No heap usage
* Deterministic memory footprint

---

### 5. Communication Protocol

After UART byte-level communication, a higher-level protocol was designed.

#### Protocol Requirements

* Structured messages
* Serialization with `serde`
* Checksums for integrity
* Recovery from corrupted or dropped bytes 

#### Protocol Structure

Typical message format:

```
[START][LENGTH][PAYLOAD][CHECKSUM]
```

Features:

* Checksum validation
* Drop corrupted frames
* Resynchronize on next valid START byte
* Continue operation after corruption

Although emulator communication is reliable, fault tolerance was implemented to simulate real-world UART unreliability.

---

### 6. Shared Serialization Library

A shared Rust library was created for:

* Message types
* Serialization logic
* Shared protocol structures

Pattern used:

```rust
#![cfg_attr(not(test), no_std)]
#[cfg(test)]
extern crate std;
```

This allowed:

* Testing on host with `std`
* Running on embedded target with `no_std`

---

### 7. Application Logic

The system maintains:

* Current position `(x, y)`
* Step counter
* View mode

Supported commands:

* Record a step with dx/dy movement
* Change display view
* Request total step count
* Reset board state 

---

### 8. Graphical Interface

Two views were implemented:

1. **Map View**

   * 1 pixel = 1 meter
   * Tracks walking path
   * Assumes user remains within screen bounds

2. **Step Counter View**

   * Displays total steps
   * Simple numerical display

Rendering is done via framebuffer drawing library (explicitly allowed).

---

### 9. Debugging with GDB

The emulator supports debugging via:

```
arm-none-eabi-gdb
target remote localhost:1234
symbol-file target/thumbv7m-none-eabi/debug/...
```

This enabled:

* Breakpoints
* Source-level debugging
* Step execution on ARM target 

---

## Results

The final system successfully:

* Ran inside QEMU ARM emulator
* Implemented a safe UART driver
* Encapsulated unsafe code correctly
* Provided fixed-size buffering
* Implemented checksum-based fault-tolerant protocol
* Recovered from corrupted messages
* Rendered graphical walking map
* Maintained accurate step counter
* Supported interactive runner commands

The system met all functional requirements of the assignment .

---

## Images

![System Architecture: Runner ↔ UART ↔ LM3S6965](/images/blog/lm3s6965-system-architecture.png)

![UART Driver Register Mapping](/images/blog/uart-register-map.png)

![Protocol Frame Structure with Checksum](/images/blog/protocol-frame-structure.png)

![Map View Rendering Example](/images/blog/map-view-rendering.png)

![Step Counter View](/images/blog/step-counter-view.png)

---

## References

1. Embedded Systems Assignment Specification – TU Delft 

---

## Appendix

### Hardware Target

* Microcontroller: Stellaris LM3S6965
* Core: ARM Cortex-M3
* Emulator: QEMU ARM

### Toolchain

* Rust (cross-compiled)
* `thumbv7m-none-eabi`
* cargo-binutils
* LLVM tools
* arm-none-eabi-gdb

### Key Learning Outcomes

* Bare-metal Rust development
* Safe abstraction over unsafe hardware access
* UART peripheral programming
* Fault-tolerant serial protocol design
* Deterministic memory management
* Embedded debugging on emulated ARM target

---
