const protocols = [
    'ss://', 'ssr://', 'vmess://', 'vless://', 'trojan://',
    'hysteria://', 'hysteria2://', 'hy2://', 'tuic://', 'snell://',
    'anytls://', 'wireguard://', 'socks5://', 'socks5-tls://'
];

function extractNodeUrls(text) {
    const urls = [];
    const lines = text.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        const lowerTrimmed = trimmed.toLowerCase();
        for (const protocol of protocols) {
            if (lowerTrimmed.startsWith(protocol)) {
                urls.push(trimmed);
                break;
            }
        }
    }
    return urls;
}

const testCases = [
    'VLESS://test1',
    'wireguard://test2',
    'Trojan://test3',
    'SOCKS5://test4',
    'invalid://test5',
    'hy2://test6'
];
console.log("Extracted:", extractNodeUrls(testCases.join('\n')));
