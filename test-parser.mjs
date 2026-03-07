import fs from 'fs';
import { extractValidNodes } from './functions/modules/utils/node-parser.js';

const text = fs.readFileSync('/tmp/url-2.txt', 'utf8').split('\n\n')[1]; // skip headers

console.log("Input length:", text.length);
try {
  const nodes = extractValidNodes(text);
  console.log("Parsed modes count:", nodes.length);
  if (nodes.length > 0) {
    console.log("First node:", nodes[0]);
  } else {
    console.log("Failed to parse any nodes. Is there an error?");
  }
} catch (e) {
  console.error("Error calling extractValidNodes:", e);
}
