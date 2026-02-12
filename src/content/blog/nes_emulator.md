---

title: "Epsilon NES Emulator in Rust: Architecture, Mappers, and Audio Integration"
description: "A modular NES emulator in Rust implementing 6502 CPU, PPU integration, NROM/MMC1 mappers, unofficial opcodes, and partial APU support."
pubDate: 2026-02-12
updatedDate:
topic: embedded-systems
tags: ["rust", "emulator", "6502", "nes", "systems-programming"]
heroImage: "/images/blog/nes_emulator/project_architecture/project_architecture.png"
draft: false
-----------

# Epsilon NES Emulator in Rust: Architecture, Mappers, and Audio Integration

This project implements a Nintendo Entertainment System (NES) emulator in Rust, reproducing the behavior of the 6502 CPU, PPU integration, cartridge mappers (NROM and MMC1), unofficial opcodes, interrupts, controller input, and a partial APU implementation.

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

The project was developed as part of the CESE4000 Software Fundamentals course at Delft University of Technology . The objective was to design and implement a functional NES emulator in Rust within four weeks.

The Nintendo Entertainment System architecture consists of:

* **CPU**: Modified 8-bit MOS 6502
* **PPU**: Picture Processing Unit for graphics rendering
* **Cartridge subsystem**: PRG-ROM, CHR-ROM/RAM, mapper logic
* **APU**: Audio Processing Unit
* **Memory-mapped I/O and controllers**

The emulator replicates these components using a modular software architecture that mirrors the hardware-level organization of the original console.

---

## Approach

The design goals were:

* Maintain a modular architecture
* Separate CPU, PPU, cartridge, mapper, and APU logic
* Enable runtime mapper selection
* Accurately emulate timing behavior and instruction cycles
* Support both official and unofficial 6502 opcodes

The development strategy followed these steps:

1. Implement all official 6502 instructions with addressing modes.
2. Validate using opcode test ROMs.
3. Implement cartridge parsing and mapper abstraction.
4. Add NROM (Mapper 0) support.
5. Extend architecture to support MMC1 (Mapper 1).
6. Integrate interrupts and controller input.
7. Implement unofficial opcodes.
8. Add a modular APU implementation.

Testing relied on ROM-based validation and provided test libraries from TU Delft .

---

## Implementation

### 1. CPU Emulation (MOS 6502)

The CPU implementation includes:

* All official 6502 instructions
* All addressing modes:

  * Immediate
  * Zero Page
  * Zero Page X/Y
  * Absolute
  * Absolute X/Y
  * Indirect
  * (Indirect, X)
  * (Indirect), Y
  * Branching
  * Stack operations
  * Jump/RTS/RTI/BRK

Key characteristics:

* Correct cycle counting
* Page boundary crossing cycle penalty
* Branch extra-cycle handling
* Interrupt support:

  * IRQ
  * NMI
  * Reset

During initial development, illegal opcodes were skipped by incrementing the program counter. Later, full unofficial opcode behavior was implemented and validated using test ROMs .

---

### 2. Memory Architecture

#### CPU Memory Layout

* `0x0000–0x07FF`: 2KB RAM
* `0x0800–0x1FFF`: Mirrored RAM
* `0x2000–0x3FFF`: PPU registers (mirrored)
* `0x4000–0x4019`: APU and controller
* `0x4020–0xFFFF`: Cartridge space

CPU memory includes:

* Zero Page
* Stack Page
* Main RAM

#### PPU Memory Layout

PPU memory is organized as:

* Pattern Tables (2 × 4KB)
* Name Tables (2 × 2KB)
* Attribute Tables
* Palette memory (32 bytes)

These structures enable background and sprite rendering as described in the project report .

---

### 3. Cartridge and Mapper Abstraction

A `Cartridge` structure was implemented to:

* Parse the ROM header
* Extract PRG-ROM and CHR-ROM
* Determine mapper type
* Configure mirroring mode
* Serve as interface between bus and mapper

#### Supported Mappers

##### NROM (Mapper 0)

* Fixed PRG-ROM
* Fixed CHR-ROM
* No bank switching

##### MMC1 (Mapper 1)

* PRG bank switching
* CHR bank switching
* Mirroring control
* Bank selection registers

To support MMC1, a dedicated mapper abstraction layer was introduced, allowing runtime selection based on ROM header.

An important issue was identified when running games requiring CHR RAM (e.g., Legend of Zelda). The provided PPU implementation did not support writing to CHR RAM. The PPU crate was modified locally to enable CHR RAM writes, resolving crashes .

---

### 4. Controller Integration

Controller input was implemented using the provided PPU crate utilities. Functional validation was done by running and playing games such as:

* Super Mario Bros
* Mario Bros
* Pac-Man
* Blaster Master
* The Legend of Zelda 

---

### 5. Unofficial Instructions

After stabilizing the emulator, unofficial (illegal) 6502 instructions were implemented.

Results:

* All previously failing tests passed
* No longer required program counter workaround
* NESTEST validation improved

This extension improved hardware-level accuracy and compatibility.

---

### 6. Audio Processing Unit (APU)

The APU was implemented as a separate module handling:

* Pulse 1
* Pulse 2
* Triangle
* Noise
* DMC

Memory-mapped ranges handled:

* `$4000–$4013`
* `$4015`
* `$4017`

Implementation design:

* CPU memory write/read triggers APU register update
* `tick()` invokes `step()` for audio simulation
* Channel mixing implemented in software

However, full audio output was limited due to complexity of external audio device integration. The APU simulation logic exists but audio output is not fully functional .

---

## Results

The emulator successfully:

* Passed official instruction tests
* Passed NROM tests
* Executed multiple commercial NES games
* Supported runtime mapper selection
* Implemented unofficial opcodes
* Handled interrupts correctly
* Integrated controller input
* Partially implemented APU

Limitations:

* APU audio output incomplete
* Local modification required for CHR RAM support

Overall, the emulator achieved high functional compatibility within a four-week development window .

---

## Images

![NES Architecture - NROM Mapper](/images/blog/nes-architecture-nrom.png)

![NES Architecture - MMC1 Mapper](/images/blog/nes-architecture-mmc1.png)

![CPU Memory and Register Map](/images/blog/nes-cpu-memory-map.png)

![PPU Memory and Register Map](/images/blog/nes-ppu-memory-map.png)

---

## References

1. NES Architecture overview – NESDev Wiki
2. CPU Memory and Register Map – Bugzmanov NES eBook
3. PPU Memory and Register Map – Bugzmanov NES eBook
4. NROM and MMC1 diagrams – OneLoneCoder NES Emulator
5. Official and Unofficial 6502 Instructions – NESDev Wiki
6. NES Emulator using Rust – Bugzmanov eBook
7. NES APU documentation – NESDev Wiki 

---

## Appendix

### Project Metadata

* Course: CESE4000 Software Fundamentals
* Duration: October–November 2023
* Language: Rust
* Team: Group Epsilon 

### Known Constraints

* CHR RAM support requires local PPU crate modification.
* Audio output layer requires external system integration for full functionality.

---
