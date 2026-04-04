---
title: "Building the NES from Scratch: When 'Good Enough' Means Fixing the Tools"
description: "Applying the 3-stage embedded framework to a Rust-based NES emulator, moving from headless CPU simulation to modifying external libraries for a robust MVP."
pubDate: 2026-02-12
updatedDate: 2026-02-12
topic: "electronics"
tags: ["rust", "emulator", "6502", "nes", "systems-programming", "debugging"]
heroImage: "/images/blog/nes_emulator/project_architecture/project_architecture.png"
draft: false
---

# Building the NES from Scratch: When 'Good Enough' Means Fixing the Tools

In my previous post, I talked about the three stages of embedded proficiency: Simulation, Prototype, and Implementation. It’s easy to talk about theory, but what does that progression actually look like in code?

[cite_start]In late 2023, I worked with a team of four engineers to architect a Nintendo Entertainment System (NES) emulator in Rust. [cite_start]We operated under a strict four-week deadline. [cite_start]The goal wasn't just to make a game run; it was to replicate the architecture of a 1985 console—the CPU, the PPU (graphics), and the mappers—while adhering to strict Rust standards like Enums and Traits[cite: 12].

Here is how we moved through the stages, where we failed, and how we defined "done."

### Stage 1: Simulation (The Headless CPU)
Before we could see Mario jump, we had to build the brain. In the simulation stage, "success" didn't mean graphics; it meant passing unit tests.

We started with the MOS 6502 CPU. [cite_start]The NES 6502 is slightly special because the decimal mode is disabled [cite: 73][cite_start], but otherwise, it requires implementing specific addressing modes and opcodes[cite: 200]. [cite_start]We spent the first sprint ensuring that our CPU could handle the stack, zero-page addressing, and the program counter correctly[cite: 410, 411, 420].

At this stage, we weren't running games. [cite_start]We were running the `tudelft-nes-test` suite[cite: 200]. We treated the CPU as a pure logic puzzle: if the opcode is `0xA9` (LDA Immediate), does the Accumulator register actually change?
We also had to handle "unofficial" opcodes. [cite_start]These are instructions that weren't documented by Nintendo but were used by clever developers to save space[cite: 120]. [cite_start]If we didn't handle them, the CPU would crash or jam[cite: 127]. [cite_start]Initially, we just skipped them to keep the simulation running, but we knew that wasn't "MVP" quality yet[cite: 612].

**The "Simulation" Milestone:** The CPU passed the unit tests. It was logically sound, but it was blind.

### Stage 2: Prototype (First Light with NROM)
[cite_start]The Prototype stage is where you integrate your logic with the "real world"—or in this case, the PPU (Picture Processing Unit) and a game cartridge[cite: 79].

The NES is unique because the CPU and PPU run in parallel. [cite_start]The CPU runs instructions, and for every CPU cycle, the PPU runs three cycles to draw pixels[cite: 276].
[cite_start]We started with the simplest setup: the NROM mapper (Mapper 0)[cite: 112]. This mapper has no bank switching; the memory you see is the memory you get. [cite_start]It is the "Hello World" of NES emulation[cite: 113].

[cite_start]When we finally hooked up the CPU to the PPU and loaded *Super Mario Bros*, it worked[cite: 634]. Seeing the title screen was the "Prototype" moment. It proved the system *could* work. But a prototype is fragile. We tried to run other games, and the limitations became obvious immediately.

[cite_start]**The "Prototype" Milestone:** We could play *Super Mario Bros* and *Pac-Man* using the NROM mapper[cite: 634].

### Stage 3: Implementation (The "Zelda" Crash)
This is where the project shifted from a standard implementation to a real engineering challenge. To reach the "Implementation/MVP" stage, we needed stability and compatibility.

The hurdle was the **MMC1 Mapper**.
[cite_start]Unlike NROM, MMC1 allows games to swap memory banks (Bank Switching) because games like *The Legend of Zelda* are larger than the NES's 64KB address space[cite: 104, 107]. [cite_start]We implemented the bank switching logic, but when we loaded *The Legend of Zelda*, the emulator panicked and crashed[cite: 636].

This is the kind of bug that defines an engineer. The easy path is to say, "Zelda is broken, let's just play Mario." The MVP path is to find the root cause.

We dug into the source code and found the issue wasn't in our CPU. It was in the PPU library we were using. [cite_start]*The Legend of Zelda* requires writing to CHR-RAM (Character RAM) to update graphics dynamically[cite: 637]. The library didn't support that feature.

To fix it, we had to:
1.  [cite_start]Fork the external PPU crate locally[cite: 638].
2.  [cite_start]Modify the library internals to allow writes to the CHR-RAM address space[cite: 638].
3.  Re-integrate it into our emulator.

[cite_start]Once we patched the tool, *Zelda* ran smoothly[cite: 639]. [cite_start]We also circled back and properly implemented the illegal opcodes we skipped in the simulation phase, ensuring high compatibility[cite: 648].

**The "Implementation" Milestone:** We weren't just running simple demos. We were running complex, bank-switching games that required modifying the underlying system tools to work.

### Reflection: What Was Left Out?
We claimed this as an MVP, but we knew it wasn't a "Product." The most glaring omission was full audio.
[cite_start]We built the APU (Audio Processing Unit) architecture, implementing the five channels (Pulse 1, Pulse 2, Triangle, Noise, and DMC)[cite: 654]. [cite_start]The logic was there—reading and writing to the registers at `$4000-$4017`[cite: 683]. [cite_start]However, syncing that generated audio data to the host machine's speakers proved too complex for the timeframe[cite: 685].

[cite_start]If we were to do this again, we would have spent less time diving headfirst into coding and more time planning the Git strategy and architecture upfront[cite: 388]. But that, too, is part of the learning curve.

You can view the full architecture of our memory mapping below:

![MMC1 Mapper Architecture](/images/blog/nes-architecture-mmc1.png)
*Figure: The complex memory mapping required for the MMC1 implementation.*