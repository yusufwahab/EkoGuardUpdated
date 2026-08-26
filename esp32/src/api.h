#pragma once

#include <ESPAsyncWebServer.h>

// Shared web server + WebSocket instance. network.cpp adds its captive
// portal routes to the same `server` before main.cpp calls server.begin().
extern AsyncWebServer server;
extern AsyncWebSocket ws;

// Registers all /api/* REST routes and the /ws WebSocket handler.
// Call once from setup(), before server.begin().
void apiSetup();

// Serializes current deviceState and pushes it to every connected
// WebSocket client. Call periodically from loop().
void apiBroadcastState();
