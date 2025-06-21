// functions/fallback.js

// Clash 格式的 fallback 配置（纯字符串）
export const FALLBACK_CLASH = `
export const FALLBACK_CLASH = `
# Fallback Clash Config
proxies:
  - name: "Fallback-Proxy"
    type: vmess
    server: example.com
    port: 443
    uuid: 00000000-0000-0000-0000-000000000000
    alterId: 0
    cipher: auto
    tls: true
    hostname: example.com
    network: ws
    ws-path: /ws
    ws-headers:
      Host: example.com

proxy-groups:
  - name: "Proxy"
    type: select
    proxies:
      - Fallback-Proxy
      - DIRECT

rules:
  - MATCH,Proxy
`.trim();

// Sing-Box 格式的 fallback 配置（Base64 编码字符串）
export const FALLBACK_SINGBOX = btoa(
  unescape(encodeURIComponent(`{
  "outbounds": [
    {
      "type": "direct",
      "tag": "direct"
    },
    {
      "type": "block",
      "tag": "block"
    }
  ],
  "route": {
    "rules": [
      {
        "geosite": "category-ads",
        "outbound": "block"
      }
    ]
  }
}`.trim()))
);

// Base64 格式的 fallback 节点（订阅格式）
export const FALLBACK_BASE64 = btoa(
  unescape(encodeURIComponent(`
vmess://ewogICJuYW1lIjogIkZhbGxiYWNrIFZNUyBQcm94eSIsCiAgInNlcnZlciI6ICJleGFtcGxlLmNvbSIsCiAgInBvcnQiOiA0NDMsCiAgInV1aWQiOiAiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwKICAiYWlkIjogMCwKICAiYWx0ZXJJZCI6IDAsCiAgInNjaGVtYSI6ICIwIiwKICAidGxzIjogdHJ1ZSwKICAidGxzX2hvc3RzIjogImV4YW1wbGUuY29tIiwKICAic25pIjogImV4YW1wbGUuY29tIiwKICAid3MiOiB0cnVlLAogICJ3c19wYXRoIjogIi93cyIsCiAgIndzX2hlYWRlcnMiOiB7fSwKICAibmV0IjogIndzIiwKICAidHlwZSI6ICJub25lIiwKICAic2Vjdml0eSI6ICJhdXRvIgogfQ==

ss://cmM0LW1kNTpwYXNzd2Q@1.1.1.1:8443#Fallback_SS_Node
trojan://test@example.com:443?security=tls&sni=example.com&fp=random&type=tcp&headerType=none#Fallback_Trojan_Node
`.trim())));