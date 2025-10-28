---
sidebar_position: 6
summary: Overview of Model Context Protocol (MCP) integration in Python Teams AI for dynamic function and tool loading.
---

# MCP

Teams SDK has optional packages which support the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) as a service or client. This allows you to use MCP to call functions and tools in your application. 

MCP servers and MCP clients dynamically load function definitions and tools.

When building Servers, this could mean that you can introduce new tools as part of your application, and the MCP clients that are connected to it will automatically start consuming those tools.

When building Clients, this could mean that you can connect to other MCP servers and your application has the flexibility to improve as the MCP servers its connected to evolve over time.

:::tip
The guides here can be used to build a server and a client that can leverage each other. That means you can build a server that has the ability to do complex things for the client agent.
:::