import fs from 'fs';
import { parseNodeList } from './functions/modules/utils/node-parser.js';

const qxText = fs.readFileSync('/tmp/url-1.txt', 'utf8').split('\n\n')[1]; // skip headers

console.log("\n=== Testing QX Text ===");
let qxNodes = parseNodeList(qxText);
console.log("Parsed QX nodes count:", qxNodes.length);
qxNodes.forEach(node => console.log(node.name, node.protocol));
