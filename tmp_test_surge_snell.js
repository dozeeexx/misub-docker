import { generateBuiltinSurgeConfig } from './functions/modules/subscription/builtin-surge-generator.js';
import { urlToClashProxy } from './functions/utils/url-to-clash.js';

const snellUrl = 'snell://1.1.1.1:1234?psk=testpsk&version=4&obfs=tls&obfs-host=bing.com#snell-test';

const clashProxy = urlToClashProxy(snellUrl);
console.log("urlToClashProxy:", clashProxy);

const result = generateBuiltinSurgeConfig(snellUrl);
console.log("Output Length:", result.length);
