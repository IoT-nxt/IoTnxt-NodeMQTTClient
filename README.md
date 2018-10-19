# IoTnxt-NodeMQTTClient
A Nodejs Typescript MQTT client to connect any device to the IoT.nxt SaaS platform. This example was with Raspberry pi units Zero to 3B+

Talon 
=====

Talon is a nodejs/typescript implementation of an IoTnxt edge gateway device. 
This is meant to run automatically at startup, poll sensors for temperature, movement, etc.. then send the data up to the iotnxt cloud.

Instructions:
------------

Associate a new gateway on Portal. 
Enter the same GatewayId in /src/main.ts

```
npm install
```

In another terminal:

```
npm run buildwatch
```

```
npm run start
```

Features:
---------

- bandwidth optimized publish algorithm that diff's data before sending

Planned:
--------

- sqlite persistance layer
- Locally hosted web interface

Tips:
------

Use [forever-service](https://github.com/zapty/forever-service) to make Talon run on bootup.

