---
title: "The Reality of Embedded Engineering: Building a NES Emulator from Scratch"
description: "A deep dive into a 4-week sprint to build a NES emulator in Rust, navigating CPU simulation, memory mapping, and debugging external library failures."
pubDate: 2026-02-12
updatedDate: 2026-02-12
topic: "electronics"
tags: ["rust", "emulator", "6502", "nes", "systems-programming", "debugging"]
heroImage: "/images/blog/nes_emulator/project_architecture/project_architecture.png"
draft: false
---

# The Reality of Embedded Engineering: Building a NES Emulator from Scratch

When people ask me what "embedded systems engineering" actually looks like, I point them to this project. [cite_start]In late 2023, I worked with a team of four engineers to architect a Nintendo Entertainment System (NES) emulator in Rust[cite: 9]. [cite_start]We operated under a strict four-week deadline[cite: 19]. [cite_start]The goal wasn't just to make a game run; it was to replicate the architecture of a 1985 console—the CPU, the PPU (graphics), and the mappers—while adhering to strict Rust standards like Enums and Traits[cite: 12].

Looking back, the project didn't just happen all at once. It naturally evolved through three distinct phases: Simulation, Prototype, and a final Implementation where we hit—and solved—our biggest engineering roadblocks.

### Phase 1: Simulation (The Headless CPU)
Before we could see Mario jump, we had to build the brain. In this first phase, "success" didn't mean graphics; it meant passing unit tests and validating logic.

We started with the MOS 6502 CPU. [cite_start]The NES version of this chip is slightly special because the decimal mode is disabled[cite: 73], but otherwise, it requires implementing specific addressing modes and opcodes. We spent the first sprint ensuring that our CPU could handle the stack, zero-page addressing, and the program counter correctly.

At this stage, we weren't running games. [cite_start]We were running the `tudelft-nes-test` suite to check our instruction accuracy[cite: 200]. We treated the CPU as a pure logic puzzle. [cite_start]We also encountered "unofficial" opcodes—undocumented instructions that can cause the CPU to jam or crash[cite: 124, 127]. [cite_start]Initially, we simply skipped these to keep the simulation running, incrementing the program counter to avoid crashes[cite: 612]. We knew this was a temporary fix, but it allowed us to move forward.

**The Milestone:** The CPU passed the unit tests. It was logically sound, but it was blind.

### Phase 2: Prototype (First Light with NROM)
The Prototype phase is where you integrate your logic with the "real world"—or in this case, the PPU (Picture Processing Unit) and a game cartridge.

[cite_start]The NES is unique because the CPU and PPU run in parallel; for every CPU cycle, the PPU runs three cycles to draw pixels[cite: 276]. [cite_start]We started with the simplest setup: the NROM mapper (Mapper 0)[cite: 306]. [cite_start]This mapper is straightforward because it has no bank switching logic, making it the perfect candidate for a prototype[cite: 112].

[cite_start]When we finally hooked up the CPU to the PPU and loaded *Super Mario Bros*, it worked[cite: 634]. Seeing the title screen was the defining moment of this phase. It proved the system *could* work. But a prototype is fragile. We tried to run other games, and the limitations of our simple architecture became obvious immediately.

[cite_start]**The Milestone:** We could play *Super Mario Bros* and *Pac-Man* using the NROM mapper[cite: 634].

### Phase 3: Implementation (The "Zelda" Crash)
This is where the project shifted from a standard implementation to a real engineering challenge. To reach a stable MVP, we needed to support complex games.

The hurdle was the **MMC1 Mapper**. [cite_start]Unlike NROM, MMC1 allows games to swap memory banks (Bank Switching) because games like *The Legend of Zelda* are larger than the NES's limited address space[cite: 107, 108]. [cite_start]We implemented the bank switching logic, but when we loaded *The Legend of Zelda*, the emulator panicked and crashed[cite: 636].

This is the kind of bug that defines an engineer. The easy path is to say, "Zelda is broken, let's just play Mario." The engineering path is to find the root cause.

We dug into the source code and found the issue wasn't in our CPU. It was in the PPU library we were using. [cite_start]*The Legend of Zelda* requires writing to CHR-RAM (Character RAM) to update graphics dynamically, but the library didn't support that feature[cite: 637].

To fix it, we had to:
1.  [cite_start]Fork the external PPU crate locally[cite: 638].
2.  [cite_start]Modify the library internals to allow writes to the CHR-RAM address space[cite: 638].
3.  Re-integrate it into our emulator.

[cite_start]Once we patched the tool, *Zelda* ran smoothly[cite: 639]. [cite_start]We also circled back and properly implemented the illegal opcodes we skipped in the simulation phase, ensuring high compatibility[cite: 648].

**The Milestone:** We weren't just running simple demos. We were running complex, bank-switching games that required modifying the underlying system tools to work.

### Reflection: What Was Left Out?
We claimed this as an MVP, but we knew it wasn't a "Product." The most glaring omission was full audio. [cite_start]We built the APU (Audio Processing Unit) architecture, implementing the five channels: Pulse 1, Pulse 2, Triangle, Noise, and DMC[cite: 654]. [cite_start]The logic was there—reading and writing to the registers at `$4000-$4017`[cite: 683]. [cite_start]However, syncing that generated audio data to the host machine's speakers proved too complex to finalize within the strict timeline[cite: 685].

[cite_start]If we were to do this again, we would have spent less time diving headfirst into coding and more time planning the Git strategy and architecture upfront[cite: 386, 388]. But that, too, is part of the engineering learning curve.

You can view the full architecture of our memory mapping below:

![MMC1 Mapper Architecture](/images/blog/nes-architecture-mmc1.png)
[cite_start]*Figure: The complex memory mapping required for the MMC1 implementation[cite: 587].*