const dns = require('dns');

console.log("setDefaultResultOrder exists:", typeof dns.setDefaultResultOrder === 'function');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
  console.log("Set default result order to ipv4first successfully.");
}
