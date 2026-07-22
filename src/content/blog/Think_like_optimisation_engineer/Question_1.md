---
title: "From Model Call to Controlled System: The Worker-Observer Baseline"
description: "Think-series journal 01: designing a Worker-Observer architecture that places explicit control boundaries around a probabilistic model."
pubDate: 2026-07-20
updatedDate: 2026-07-21
topics: [ai, electronics]
tags: ["optimisation", "ai-agents", "systems-engineering", "edge-ai", "worker-observer-agent"]
showHeroOnPost: false
draft: false
---

A system cannot be optimised meaningfully until its workload, boundaries, and execution path are understood.

This is the perspective behind *Think like an Optimisation Engineer*. The series asks a larger question:

> What does it mean to think like an optimisation engineer in the current AI landscape: not just using LLMs, but designing, measuring, and optimising the agentic systems that can move from a single local runtime towards decentralised inference across edge devices?

For Question 1, I am beginning with the architecture. Before I measure or optimise an agentic system, I first need to define what the system contains, how its components communicate, and where decision authority belongs.

## Optimisation begins with the system

Optimisation is often described through individual techniques: reduce memory, quantise a model, improve a kernel, increase throughput, or remove latency. These may become useful interventions, but they are not the starting point.

At the system level, a workload passes through several layers of software and hardware. A change that improves one component may move the bottleneck somewhere else, increase resource usage, or weaken another requirement. Without understanding those relationships, a local improvement can be mistaken for a system improvement.

My process begins by defining the workload and the outcome expected from it. I then trace how that workload should move through the system, identify the known constraints and likely sources of variation, and use that understanding to assign clear responsibilities and decision authority. This creates the architecture required for an observable and repeatable baseline; implementing and measuring that baseline is the next step.

## Why use an agentic system?

Agentic AI is one application of this systems view. It is interesting because an agentic run involves more than inference. A model call exists alongside task definitions, runtime control, tools, observations, state changes, retries, and records of what happened.

This creates several interacting boundaries within one local workload. The Worker-Observer Agent, or WOA, is my way of making those boundaries explicit. It begins locally, where the complete system can be understood, and provides an architecture that can later be questioned, measured, and extended.

## A prompt becomes a hardware workload

A prompt begins as text, but the model does not receive it in that form. A chat template adds role structure and special tokens. Tokenisation converts the text into model-specific tokens and token IDs. Those IDs form an ordered input sequence and are mapped to embedding vectors before entering the transformer stack.

From there, the abstraction becomes computation. Prefill processes the input context through the model layers. The KV cache retains attention history. Decode repeatedly produces the next token while extending that history.

This path is important to my way of thinking about the system. A software-level request eventually becomes work performed by hardware. However, this is still only the model path. An autonomous run needs a structure around it.

## Why the model needs a harness

An LLM predicts tokens from context. It does not independently define whether a task is valid, which tools are permitted, whether progress is sufficient, how long execution may continue, or which state transition is legal.

If these responsibilities remain implicit, the resulting agent loop becomes difficult to reason about. Model behaviour, tool behaviour, orchestration, and state can blur into a single execution path. When variation occurs, it becomes unclear which component observed it, which component responded, and whether that response was authorised.

The harness does not replace the model or make its decisions intelligent. Its purpose is to organise the system around the model: define the task, bound execution, isolate external capabilities, observe behaviour, control state changes, and preserve a trace of the run.

## Designing the WOA baseline

The WOA architecture separates components according to responsibility and authority.

A typed `TaskSpec` defines the task before execution. It provides a contract for the objective, success conditions, permitted capabilities, and operating limits. The task therefore enters the system as structured data rather than only as an open-ended prompt.

The `Worker` performs the task. It interacts with models and tools through defined interfaces and emits structured events about its progress. Its role is execution, not deciding which global state changes are legal.

The `Observer` receives those events and evaluates the direction of the run. It can recognise progress, repetition, deviation, or failure and recommend an appropriate response. It does not directly mutate the worker or runtime.

This separation is deliberate. The `Observer` monitors the `Worker’s` behaviour and converts the available evidence into a structured recommendation. It cannot change the execution state directly. The `StateMachine` owns transition authority and accepts a recommendation only when it is legal for the current state.

<!-- This limitation is deliberate. An observer may use a model to interpret behaviour, but that model remains probabilistic. Giving it direct control would only relocate the uncertainty. Instead, the `StateMachine` owns transition authority and checks whether a recommendation is legal for the current state. -->

The `Runtime` coordinates the complete control loop. It validates the task, manages queues and timeouts, assigns work, and applies only authorised transitions. `ModelClient` interfaces isolate model providers, while the `ToolRegistry` and tool adapters define which external actions are available and how they are validated. Structured logs preserve the communication and state history so that later questions can examine the run.

The control principle can be stated compactly:

> Worker executes. Observer recommends. State machine authorises. Runtime applies.

![Worker-Observer baseline architecture showing the task contract, runtime, worker, observer, state machine, model and tool boundaries.](/images/blog/think_like_optimisation_engineer/question_1/woa_block_diagram_v1.png)

<!-- *The WOA baseline separates execution, observation, transition authority, and orchestration.* -->

## Deterministic boundaries around probabilistic components

The objective is not to make the LLM deterministic. Its outputs can still vary with context, sampling, model choice, and runtime conditions.

What can be deterministic is the surrounding control structure: accepted schemas, permitted capabilities, component responsibilities, and legal state transitions. The observer can recommend, but it cannot silently take authority. The worker can execute, but only within the task and capability boundaries provided to it. Variation is not removed; it is forced through an explicit path that the system can observe and reason about.

That is the architectural answer to Question 1. WOA now has a defined system boundary and a clear division between execution, observation, authorisation, and orchestration.

The next question is practical: run this architecture end to end, establish the first working baseline, and decide which measurements can reveal where optimisation is actually needed.
