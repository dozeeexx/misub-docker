import fs from 'fs';
import { parseNodeList } from './functions/modules/utils/node-parser.js';

const text = fs.readFileSync('/tmp/url-2.txt', 'utf8').split('\n\n')[1]; // skip headers

console.log("Input length:", text.length);
try {
  const nodes = parseNodeList(text);
  console.log("Parsed modes count:", nodes.length);
  if (nodes.length > 0) {
    console.log("First node object:", JSON.stringify(nodes[0], null, 2));
  } else {
    console.log("Failed to parse any nodes. They were filtered out!");
  }
} catch (e) {
  console.error("Error calling parseNodeList:", e);
}
