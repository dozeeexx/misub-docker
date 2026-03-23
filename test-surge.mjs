import fs from 'fs';
import { generateBuiltinSurgeConfig } from './functions/modules/subscription/builtin-surge-generator.js';

const nodes = `
vmess://eyJ2IjoiMiIsInBzIjoiV0EtVk1FU1MiLCJhZGQiOiIxLjEuMS4xIiwicG9ydCI6IjQ0MyIsImlkIjoiMThjYmUyMDEtNmRmYi00YzQ0LWJhNDUtYjUyYmEyZmJkZTE2IiwiYWlkIjoiMCIsIm5ldCI6IndzIiwidHlwZSI6Im5vbmUiLCJob3N0Ijoid3d3LndhLmNvbSIsInBhdGgiOiIvcGF0aCIsInRscyI6InRscyJ9
trojan://password@1.1.1.1:443?sni=www.wa.com&type=tcp#WA-TROJAN
ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@1.1.1.1:443#WA-SS
anytls://password@1.1.1.1:443?sni=www.wa.com#WA-ANYTLS
`;

const result = generateBuiltinSurgeConfig(nodes, { fileName: 'Test', managedConfigUrl: 'http://test', interval: 86400 });
fs.writeFileSync('test-surge.txt', result, 'utf-8');
console.log('done');
