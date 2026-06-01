---
title: "Learning ROS 1 by Wiring It to Hardware"
description: "A short look back at my early ROS Melodic learning track, from ROS graph basics to Arduino, sensors, custom messages, services, and actions."
pubDate: 2026-06-02
updatedDate: 2026-06-02
topic: "robotics"
tags: ["ROS", "ROS 1", "Arduino", "Robotics", "Hardware Integration"]
heroImage: "/images/blog/ros1_hardware_learning/joystick-hardware-setup.jpg"
showHeroOnPost: false
draft: false
---

In 2021 and 2022, when I was getting started with ROS and looking for robotics opportunities, I created two small public repositories around ROS basics and hardware integration.

They are based on **ROS Melodic**, so the exact setup belongs to the ROS 1 era. What still makes them useful is the engineering pattern behind the work: learning how robot software is decomposed into nodes, topics, messages, services, actions, hardware bridges, and debugging tools.

## What I Built

The first repository was my setup and starter workspace for ROS Melodic. It covered installation, catkin workspace setup, and ROS actions/services exercises.

The second repository became a practical learning track. It starts with publishers and subscribers, moves through `turtlesim`, and then connects ROS to Arduino hardware using `rosserial`. The later tasks include joystick control, ultrasonic sensor data, custom messages, services, and actions.

![Joystick connected to Arduino for controlling turtlesim](/images/blog/ros1_hardware_learning/joystick-hardware-setup.jpg)

The joystick task was simple but important: an Arduino read analog joystick values and published `geometry_msgs/Twist` data to `/turtle1/cmd_vel`, letting hardware input control the simulator.

![ROS graph for joystick control of turtlesim](/images/blog/ros1_hardware_learning/joystick-rqt-graph.png)

## The Hardware Bridge

The most relevant part for robotics is the hardware integration. I used Arduino boards as ROS-connected devices, first for basic publishing and LED control, then for sensor data.

For the ultrasonic sensor task, the Arduino published range data into ROS, and a Python subscriber received it on the PC side.

![Ultrasonic sensor circuit connected to Arduino](/images/blog/ros1_hardware_learning/ultrasonic-circuit.jpeg)

![ROS graph for ultrasonic sensor data](/images/blog/ros1_hardware_learning/ultrasonic-rqt-graph.png)

This is a small example, but it shows the core idea behind many robot systems: sensor data enters the software graph through a hardware interface, then downstream nodes consume it.

## Messages, Services, and Actions

I also worked through custom ROS interfaces:

- `.msg` files for custom messages
- `.srv` files for request/response services
- `.action` files for goal, feedback, and result workflows

![ROS graph for a custom message publisher and subscriber](/images/blog/ros1_hardware_learning/custom-message-rqt-graph.png)

For services, I implemented a small calculator service. The example itself is basic, but the concept matters: a client requests an operation, and a server returns a result. The same pattern can be used for short robot commands, status queries, or configuration requests.

![Terminal output from ROS service calls](/images/blog/ros1_hardware_learning/services-result.png)

## Why This Still Matters

Robotics projects are easier to explain when there is visible evidence of how the software talks to hardware. These repositories are small, but they capture that base layer clearly: ROS communication, Linux terminal workflow, Python nodes, Arduino IO, sensor publishing, and graph-level debugging.

For me, this was the point where ROS became more than a set of commands. It became a way to think about a robot as connected software components: some reading sensors, some publishing state, some handling requests, and some sending commands. That foundation still carries into larger robotics systems.

## Project Links

- ROS setup and starter tasks: [malladi2610/Getting_started_with_ROS](https://github.com/malladi2610/Getting_started_with_ROS)
- ROS hardware learning track: [malladi2610/100_days_of_ROS](https://github.com/malladi2610/100_days_of_ROS)
