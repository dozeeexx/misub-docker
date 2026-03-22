function extractNodeUrls(text) {
    const protocols = [
        'ss://', 'ssr://', 'vmess://', 'vless://', 'trojan://',
        'hysteria://', 'hysteria2://', 'hy2://', 'tuic://', 'snell://',
        'anytls://', 'wireguard://', 'socks5://', 'socks5-tls://'
    ];
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
module.exports = extractNodeUrls;