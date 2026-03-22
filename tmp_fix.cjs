const fs = require('fs');
let code = fs.readFileSync('functions/utils/url-to-clash.js', 'utf8');

const newFn = `function parseSnellUrl(url) {
    try {
        const body = url.substring('snell://'.length);
        let psk = '';
        let serverPart = '';
        const atIndex = body.indexOf('@');
        if (atIndex !== -1) {
            psk = body.substring(0, atIndex);
            try { psk = decodeURIComponent(psk); } catch { }
            serverPart = body.substring(atIndex + 1);
        } else {
            serverPart = body;
        }

        const queryIndex = serverPart.indexOf('?');
        const hashIndex = serverPart.indexOf('#');
        let hostPortStr = serverPart;
        if (queryIndex !== -1) {
            hostPortStr = serverPart.substring(0, queryIndex);
        } else if (hashIndex !== -1) {
            hostPortStr = serverPart.substring(0, hashIndex);
        }

        const { server, port } = parseHostPort(hostPortStr);
        const params = parseQueryParams(url);
        const name = extractName(url);

        if (!psk) psk = params.get('psk') || params.get('password') || '';

        const proxy = { name: name || \`Snell-\${server}\`, type: 'snell', server, port, psk };
        const version = params.get('version');
        if (version) proxy.version = parseInt(version);
        const reuse = params.get('reuse');
        if (reuse !== null) proxy.reuse = reuse === 'true';
        const tfo = params.get('tfo');
        if (tfo !== null) proxy.tfo = tfo === 'true';
        const obfs = params.get('obfs');
        const obfsHost = params.get('obfs-host');
        if (obfs || obfsHost) {
            proxy['obfs-opts'] = {};
            if (obfs) proxy['obfs-opts'].mode = obfs;
            if (obfsHost) proxy['obfs-opts'].host = obfsHost;
        }
        if (params.get('udp-relay') === 'true') proxy.udp = true;
        return proxy;
    } catch (e) {
        console.error('解析 Snell URL 失败:', e);
        return null;
    }
}`;

const replaced = code.replace(/function parseSnellUrl\(url\) \{[\s\S]*?return null;\n\}\n\}/, newFn);
fs.writeFileSync('functions/utils/url-to-clash.js', replaced);
console.log('Replaced successfully');
