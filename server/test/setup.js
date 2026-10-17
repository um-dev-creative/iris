'use strict';

// Ninguna prueba debe salir a la red real: solo se permite el loopback (los dobles de Mercury/Backbone y el propio BFF).
// Se parchea net.Socket.connect, por donde pasan http, https y axios, y dns.lookup.
const net = require('node:net');
const dns = require('node:dns');

const isLoopback = (host) => !host || ['127.0.0.1', '::1', 'localhost', '0.0.0.0'].includes(String(host));

const forbid = (host) => {
  throw new Error(`Test attempted a real network connection to "${host}". Use the Mercury/Backbone doubles from server/test/harness.js.`);
};

const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function connect(...args) {
  const [first] = args;
  const options = Array.isArray(first) ? first[0] : first;
  if (options && typeof options === 'object' && 'host' in options && !isLoopback(options.host)) forbid(options.host);
  if (typeof first === 'number' && typeof args[1] === 'string' && !isLoopback(args[1])) forbid(args[1]);
  return originalConnect.apply(this, args);
};

const originalLookup = dns.lookup;
dns.lookup = function lookup(hostname, ...rest) {
  if (!isLoopback(hostname)) forbid(hostname);
  return originalLookup.call(this, hostname, ...rest);
};
