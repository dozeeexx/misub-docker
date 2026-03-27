/**
 * VPS Monitor handler
 * Public report endpoint + auth-only management APIs
 */

import { StorageFactory, STORAGE_TYPES } from '../../storage-adapter.js';
import { createJsonResponse, createErrorResponse, getPublicBaseUrl } from '../utils.js';
import { sendTgNotification } from '../notifications.js';
import { KV_KEY_SETTINGS, DEFAULT_SETTINGS } from '../config.js';

const REPORTS_MAX_KEEP = 5000;
const ALERTS_MAX_KEEP = 1000;

async function getStorageAdapter(env) {
    return StorageFactory.createAdapter(env, STORAGE_TYPES.D1);
}

function ensureD1Available(env) {
    if (!env?.MISUB_DB) {
        return createErrorResponse('VPS monitor requires D1 binding (MISUB_DB)', 400);
    }
    return null;
}

function ensureD1StorageMode(settings) {
    if (settings?.storageType !== STORAGE_TYPES.D1) {
        return createErrorResponse('VPS monitor requires storageType=d1', 400);
    }
    return null;
}

function getD1(env) {
    return env.MISUB_DB;
}

function nowIso() {
    return new Date().toISOString();
}

function normalizeString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function clampNumber(value, min, max, fallback = null) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, num));
}

function getClientIp(request) {
    return request.headers.get('CF-Connecting-IP')
        || request.headers.get('X-Forwarded-For')
        || request.headers.get('X-Real-IP')
        || '';
}

function isNodeOnline(lastSeenAt, thresholdMinutes) {
    if (!lastSeenAt) return false;
    const last = new Date(lastSeenAt).getTime();
    if (!Number.isFinite(last)) return false;
    const diffMs = Date.now() - last;
    return diffMs <= thresholdMinutes * 60 * 1000;
}

function buildSnapshot(report, node) {
    const cpuPercent = clampNumber(report.cpu?.usage, 0, 100, null);
    const memPercent = clampNumber(report.mem?.usage, 0, 100, null);
    const diskPercent = clampNumber(report.disk?.usage, 0, 100, null);

    return {
        at: nowIso(),
        status: node?.status || 'unknown',
        cpuPercent,
        memPercent,
        diskPercent,
        load1: clampNumber(report.load?.load1, 0, 1000, null),
        uptimeSec: clampNumber(report.uptimeSec, 0, 10 ** 9, null),
        traffic: report.traffic || null,
        ip: normalizeString(report.publicIp || report.ip || report.meta?.publicIp)
    };
}

function summarizeNode(node, latestReport, settings) {
    const threshold = clampNumber(settings?.vpsMonitor?.offlineThresholdMinutes, 1, 1440, 10);
    const online = isNodeOnline(node.lastSeenAt, threshold);
    const overloadInfo = latestReport ? computeOverload(latestReport, settings) : null;
    return {
        id: node.id,
        name: node.name,
        tag: node.tag,
        region: node.region,
        description: node.description,
        enabled: node.enabled !== false,
        status: online ? 'online' : 'offline',
        lastSeenAt: node.lastSeenAt,
        updatedAt: node.updatedAt,
        createdAt: node.createdAt,
        latest: latestReport || null,
        overload: overloadInfo ? overloadInfo.overload : null
    };
}

function resolveSettings(config) {
    return { ...DEFAULT_SETTINGS, ...(config || {}) };
}

function shouldTriggerAlerts(settings) {
    return settings?.vpsMonitor?.alertsEnabled !== false;
}

function getAlertCooldownMs(settings) {
    const minutes = clampNumber(settings?.vpsMonitor?.alertCooldownMinutes, 1, 1440, 15);
    return minutes * 60 * 1000;
}

function shouldSkipCooldown(settings, alertType) {
    return alertType === 'recovery' && settings?.vpsMonitor?.cooldownIgnoreRecovery === true;
}

async function pushAlert(db, settings, alert) {
    if (!alert) return;
    const cooldownMs = getAlertCooldownMs(settings);

    if (!shouldSkipCooldown(settings, alert.type)) {
        const lastSame = await db.prepare(
            'SELECT created_at FROM vps_alerts WHERE node_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1'
        ).bind(alert.nodeId, alert.type).first();

        if (lastSame?.created_at) {
            const lastTs = new Date(lastSame.created_at).getTime();
            if (Number.isFinite(lastTs) && (Date.now() - lastTs) < cooldownMs) {
                return;
            }
        }
    }

    await db.prepare(
        'INSERT INTO vps_alerts (id, node_id, type, message, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(alert.id, alert.nodeId, alert.type, alert.message, alert.createdAt).run();

    await db.prepare(
        `DELETE FROM vps_alerts
         WHERE id NOT IN (
           SELECT id FROM vps_alerts ORDER BY created_at DESC LIMIT ${ALERTS_MAX_KEEP}
         )`
    ).run();

    if (shouldTriggerAlerts(settings)) {
        const message = alert.message;
        if (message) {
            await sendTgNotification(settings, message);
        }
    }
}

function buildAlertMessage(title, bodyLines) {
    const lines = Array.isArray(bodyLines) ? bodyLines : [];
    return `${title}\n\n${lines.filter(Boolean).join('\n')}`.trim();
}

function computeOverload(report, settings) {
    const cpuThreshold = clampNumber(settings?.vpsMonitor?.cpuWarnPercent, 1, 100, 90);
    const memThreshold = clampNumber(settings?.vpsMonitor?.memWarnPercent, 1, 100, 90);
    const diskThreshold = clampNumber(settings?.vpsMonitor?.diskWarnPercent, 1, 100, 90);

    const cpu = clampNumber(report.cpu?.usage, 0, 100, null);
    const mem = clampNumber(report.mem?.usage, 0, 100, null);
    const disk = clampNumber(report.disk?.usage, 0, 100, null);

    const overload = {
        cpu: cpu !== null && cpu >= cpuThreshold,
        mem: mem !== null && mem >= memThreshold,
        disk: disk !== null && disk >= diskThreshold
    };
    overload.any = overload.cpu || overload.mem || overload.disk;
    return { overload, thresholds: { cpuThreshold, memThreshold, diskThreshold }, values: { cpu, mem, disk } };
}

async function updateNodeStatus(db, settings, node, report) {
    const threshold = clampNumber(settings?.vpsMonitor?.offlineThresholdMinutes, 1, 1440, 10);
    const wasOnline = node.status === 'online';
    node.lastSeenAt = normalizeString(report.reportedAt || report.createdAt || nowIso()) || nowIso();
    const nowOnline = isNodeOnline(node.lastSeenAt, threshold);
    node.status = nowOnline ? 'online' : 'offline';

    if (wasOnline && !nowOnline && settings?.vpsMonitor?.notifyOffline !== false) {
        await pushAlert(db, settings, {
            id: crypto.randomUUID(),
            nodeId: node.id,
            type: 'offline',
            createdAt: nowIso(),
            message: buildAlertMessage('❌ VPS 离线', [
                `*节点:* ${node.name || node.id}`,
                node.tag ? `*标签:* ${node.tag}` : '',
                node.region ? `*地区:* ${node.region}` : '',
                `*时间:* ${new Date().toLocaleString('zh-CN')}`
            ])
        });
    }

    if (!wasOnline && nowOnline && settings?.vpsMonitor?.notifyRecovery !== false) {
        await pushAlert(db, settings, {
            id: crypto.randomUUID(),
            nodeId: node.id,
            type: 'recovery',
            createdAt: nowIso(),
            message: buildAlertMessage('✅ VPS 恢复在线', [
                `*节点:* ${node.name || node.id}`,
                node.tag ? `*标签:* ${node.tag}` : '',
                node.region ? `*地区:* ${node.region}` : '',
                `*时间:* ${new Date().toLocaleString('zh-CN')}`
            ])
        });
    }

    const overloadInfo = computeOverload(report, settings);
    if (overloadInfo.overload.any && settings?.vpsMonitor?.notifyOverload !== false) {
        const flags = [];
        if (overloadInfo.overload.cpu) flags.push(`CPU ${overloadInfo.values.cpu}%`);
        if (overloadInfo.overload.mem) flags.push(`内存 ${overloadInfo.values.mem}%`);
        if (overloadInfo.overload.disk) flags.push(`磁盘 ${overloadInfo.values.disk}%`);

        await pushAlert(db, settings, {
            id: crypto.randomUUID(),
            nodeId: node.id,
            type: 'overload',
            createdAt: nowIso(),
            message: buildAlertMessage('⚠️ VPS 负载告警', [
                `*节点:* ${node.name || node.id}`,
                `*指标:* ${flags.join(' / ')}`,
                `*阈值:* CPU ${overloadInfo.thresholds.cpuThreshold}% / 内存 ${overloadInfo.thresholds.memThreshold}% / 磁盘 ${overloadInfo.thresholds.diskThreshold}%`,
                `*时间:* ${new Date().toLocaleString('zh-CN')}`
            ])
        });
    }
}

function getReportRetentionCutoff(settings) {
    const days = clampNumber(settings?.vpsMonitor?.reportRetentionDays, 1, 180, 30);
    return Date.now() - days * 24 * 60 * 60 * 1000;
}

function mapNodeRow(row) {
    return {
        id: row.id,
        name: row.name,
        tag: row.tag,
        region: row.region,
        description: row.description,
        secret: row.secret,
        status: row.status,
        enabled: row.enabled === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastSeenAt: row.last_seen_at,
        lastReport: row.last_report_json ? JSON.parse(row.last_report_json) : null
    };
}

async function fetchNodes(db) {
    const result = await db.prepare('SELECT * FROM vps_nodes ORDER BY created_at DESC').all();
    return (result.results || []).map(mapNodeRow);
}

async function fetchNode(db, nodeId) {
    const row = await db.prepare('SELECT * FROM vps_nodes WHERE id = ?').bind(nodeId).first();
    return row ? mapNodeRow(row) : null;
}

async function insertNode(db, node) {
    await db.prepare(
        `INSERT INTO vps_nodes
         (id, name, tag, region, description, secret, status, enabled, created_at, updated_at, last_seen_at, last_report_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        node.id,
        node.name,
        node.tag,
        node.region,
        node.description,
        node.secret,
        node.status,
        node.enabled ? 1 : 0,
        node.createdAt,
        node.updatedAt,
        node.lastSeenAt,
        node.lastReport ? JSON.stringify(node.lastReport) : null
    ).run();
}

async function updateNode(db, node) {
    await db.prepare(
        `UPDATE vps_nodes
         SET name = ?, tag = ?, region = ?, description = ?, secret = ?, status = ?, enabled = ?,
             updated_at = ?, last_seen_at = ?, last_report_json = ?
         WHERE id = ?`
    ).bind(
        node.name,
        node.tag,
        node.region,
        node.description,
        node.secret,
        node.status,
        node.enabled ? 1 : 0,
        node.updatedAt,
        node.lastSeenAt,
        node.lastReport ? JSON.stringify(node.lastReport) : null,
        node.id
    ).run();
}

async function deleteNode(db, nodeId) {
    await db.prepare('DELETE FROM vps_nodes WHERE id = ?').bind(nodeId).run();
    await db.prepare('DELETE FROM vps_reports WHERE node_id = ?').bind(nodeId).run();
    await db.prepare('DELETE FROM vps_alerts WHERE node_id = ?').bind(nodeId).run();
}

async function insertReport(db, report) {
    await db.prepare(
        'INSERT INTO vps_reports (id, node_id, reported_at, created_at, data) VALUES (?, ?, ?, ?, ?)'
    ).bind(report.id, report.nodeId, report.reportedAt, report.createdAt, JSON.stringify(report)).run();
}

async function pruneReports(db, settings) {
    const cutoff = new Date(getReportRetentionCutoff(settings)).toISOString();
    await db.prepare('DELETE FROM vps_reports WHERE reported_at < ?').bind(cutoff).run();
}

async function fetchReportsForNode(db, nodeId, settings) {
    const cutoff = new Date(getReportRetentionCutoff(settings)).toISOString();
    const result = await db.prepare(
        'SELECT data FROM vps_reports WHERE node_id = ? AND reported_at >= ? ORDER BY reported_at ASC LIMIT ?'
    ).bind(nodeId, cutoff, REPORTS_MAX_KEEP).all();
    return (result.results || []).map(row => JSON.parse(row.data));
}

async function fetchNetworkSamples(db, nodeId, settings) {
    const cutoff = new Date(getReportRetentionCutoff(settings)).toISOString();
    const result = await db.prepare(
        'SELECT data FROM vps_network_samples WHERE node_id = ? AND reported_at >= ? ORDER BY reported_at ASC LIMIT ?'
    ).bind(nodeId, cutoff, REPORTS_MAX_KEEP).all();
    return (result.results || []).map(row => JSON.parse(row.data));
}

async function insertNetworkSample(db, sample) {
    await db.prepare(
        'INSERT INTO vps_network_samples (id, node_id, reported_at, created_at, data) VALUES (?, ?, ?, ?, ?)'
    ).bind(sample.id, sample.nodeId, sample.reportedAt, sample.createdAt, JSON.stringify(sample)).run();
}

async function pruneNetworkSamples(db, settings) {
    const cutoff = new Date(getReportRetentionCutoff(settings)).toISOString();
    await db.prepare('DELETE FROM vps_network_samples WHERE reported_at < ?').bind(cutoff).run();
}

async function fetchNetworkTargets(db, nodeId) {
    const result = await db.prepare('SELECT * FROM vps_network_targets WHERE node_id = ? ORDER BY created_at DESC').bind(nodeId).all();
    return (result.results || []).map(row => ({
        id: row.id,
        nodeId: row.node_id,
        type: row.type,
        target: row.target,
        port: row.port,
        path: row.path,
        enabled: row.enabled === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

async function insertNetworkTarget(db, nodeId, payload) {
    const target = {
        id: crypto.randomUUID(),
        nodeId,
        type: normalizeString(payload.type).toLowerCase(),
        target: normalizeString(payload.target),
        port: payload.port ? Number(payload.port) : null,
        path: normalizeString(payload.path),
        enabled: payload.enabled !== false,
        createdAt: nowIso(),
        updatedAt: nowIso()
    };
    await db.prepare(
        `INSERT INTO vps_network_targets
         (id, node_id, type, target, port, path, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        target.id,
        target.nodeId,
        target.type,
        target.target,
        target.port,
        target.path,
        target.enabled ? 1 : 0,
        target.createdAt,
        target.updatedAt
    ).run();
    return target;
}

async function updateNetworkTarget(db, targetId, payload) {
    const existing = await db.prepare('SELECT * FROM vps_network_targets WHERE id = ?').bind(targetId).first();
    if (!existing) return null;
    const updated = {
        id: existing.id,
        nodeId: existing.node_id,
        type: payload.type !== undefined ? normalizeString(payload.type).toLowerCase() : existing.type,
        target: payload.target !== undefined ? normalizeString(payload.target) : existing.target,
        port: payload.port !== undefined ? Number(payload.port) : existing.port,
        path: payload.path !== undefined ? normalizeString(payload.path) : existing.path,
        enabled: typeof payload.enabled === 'boolean' ? payload.enabled : existing.enabled === 1,
        updatedAt: nowIso()
    };
    await db.prepare(
        `UPDATE vps_network_targets
         SET type = ?, target = ?, port = ?, path = ?, enabled = ?, updated_at = ?
         WHERE id = ?`
    ).bind(
        updated.type,
        updated.target,
        updated.port,
        updated.path,
        updated.enabled ? 1 : 0,
        updated.updatedAt,
        updated.id
    ).run();
    return updated;
}

async function deleteNetworkTarget(db, targetId) {
    await db.prepare('DELETE FROM vps_network_targets WHERE id = ?').bind(targetId).run();
}

function validateNetworkTarget(payload) {
    const type = normalizeString(payload.type).toLowerCase();
    const target = normalizeString(payload.target);
    if (!['icmp', 'tcp', 'http'].includes(type)) {
        return '类型仅支持 icmp/tcp/http';
    }
    if (!target) {
        return '目标不能为空';
    }
    if (type === 'tcp') {
        const port = Number(payload.port);
        if (!Number.isFinite(port) || port <= 0 || port > 65535) {
            return 'TCP 端口无效';
        }
    }
    if (type === 'http') {
        const path = normalizeString(payload.path || '/');
        if (!path.startsWith('/')) {
            return 'HTTP 路径必须以 / 开头';
        }
    }
    return null;
}

function buildInstallScript(reportUrl, node) {
    return [
        '#!/usr/bin/env bash',
        '',
        'set -euo pipefail',
        '',
        `REPORT_URL="${reportUrl}"`,
        `NODE_ID="${node.id}"`,
        `NODE_SECRET="${node.secret}"`,
        `CONFIG_URL="${reportUrl.replace('/api/vps/report', '/api/vps/config')}?nodeId=${node.id}&secret=${node.secret}&format=env"`,
        '',
        "cat > /usr/local/bin/misub-vps-probe.sh <<'EOF'",
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        '',
        'for cmd in curl awk free df top hostname uname ping timeout; do',
        '  if ! command -v "$cmd" >/dev/null 2>&1; then',
        '    echo "[misub-probe] missing command: $cmd" >&2',
        '    exit 1',
        '  fi',
        'done',
        '',
        `REPORT_URL="${reportUrl}"`,
        `NODE_ID="${node.id}"`,
        `NODE_SECRET="${node.secret}"`,
        `CONFIG_URL="${reportUrl.replace('/api/vps/report', '/api/vps/config')}?nodeId=${node.id}&secret=${node.secret}&format=env"`,
        '',
        'HOSTNAME="$(hostname)"',
        'OS="$(. /etc/os-release && echo "$PRETTY_NAME" || uname -s)"',
        'ARCH="$(uname -m)"',
        'KERNEL="$(uname -r)"',
        "UPTIME_SEC=\"$(awk '{print int($1)}' /proc/uptime)\"",
        '',
        'cpu_usage() {',
        '  if command -v mpstat >/dev/null 2>&1; then',
        '    mpstat 1 1 | awk "/Average/ {printf \\\"%.0f\\\", 100-$NF}"',
        '    return',
        '  fi',
        '  local idle1 total1 idle2 total2',
        '  read -r idle1 total1 <<<"$(awk "/^cpu /{idle=$5; total=0; for(i=2;i<=8;i++) total+=$i; print idle, total}" /proc/stat)"',
        '  sleep 1',
        '  read -r idle2 total2 <<<"$(awk "/^cpu /{idle=$5; total=0; for(i=2;i<=8;i++) total+=$i; print idle, total}" /proc/stat)"',
        '  local total_diff=$((total2-total1))',
        '  local idle_diff=$((idle2-idle1))',
        '  if [ "$total_diff" -le 0 ]; then',
        '    echo 0',
        '  else',
        '    awk -v t="$total_diff" -v i="$idle_diff" "BEGIN{printf \\\"%.0f\\\", (100*(t-i))/t}"',
        '  fi',
        '}',
        'CPU_USAGE="$(cpu_usage)"',
        "MEM_USAGE=\"$(free | awk '/Mem/ {printf \"%.0f\", $3/$2*100}')\"",
        "DISK_USAGE=\"$(df -P / | awk 'NR==2 {gsub(/%/,\"\"); print $5}')\"",
        "LOAD1=\"$(awk '{print $1}' /proc/loadavg)\"",
        '',
        'NETWORK_INTERVAL=300',
        'TARGETS=()',
        'if CONFIG_ENV=$(curl -fsSL "$CONFIG_URL" 2>/dev/null); then',
        '  while IFS= read -r line; do',
        '    case "$line" in',
        '      NETWORK_INTERVAL=*) NETWORK_INTERVAL=$((${line#*=} * 60)) ;;',
        '      TARGET=*) TARGETS+=("${line#*=}") ;;',
        '    esac',
        '  done <<< "$CONFIG_ENV"',
        'fi',
        '',
        'NETWORK_STATE="/var/tmp/misub-vps-network.ts"',
        'NETWORK_JSON="null"',
        'now_ts=$(date +%s)',
        'last_ts=0',
        'if [ -f "$NETWORK_STATE" ]; then last_ts=$(cat "$NETWORK_STATE" || echo 0); fi',
        'if [ $((now_ts-last_ts)) -ge "$NETWORK_INTERVAL" ]; then',
        '  checks=()',
        '  for item in "${TARGETS[@]}"; do',
        '    IFS="|" read -r ttype ttarget tport tpath tenabled <<< "$item"',
        '    if [ "${tenabled:-1}" = "0" ]; then continue; fi',
        '    checked_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)',
        '    if [ "$ttype" = "icmp" ]; then',
        '      ping_out=$(ping -c 3 -w 4 "$ttarget" 2>/dev/null || true)',
        '      loss=$(echo "$ping_out" | awk -F", " "/packet loss/ {print $3}" | awk "{gsub(/%/,\"\"); print $1}")',
        '      avg=$(echo "$ping_out" | awk -F"/" "/rtt/ {print $5}")',
        '      if [ -z "$avg" ]; then status="down"; avg=null; else status="up"; fi',
        '      checks+=("{\\\"type\\\":\\\"icmp\\\",\\\"target\\\":\\\"$ttarget\\\",\\\"status\\\":\\\"$status\\\",\\\"latencyMs\\\":${avg:-null},\\\"lossPercent\\\":${loss:-null},\\\"checkedAt\\\":\\\"$checked_at\\\"}")',
        '    elif [ "$ttype" = "tcp" ]; then',
        '      start=$(date +%s%3N)',
        '      if timeout 3 bash -c "cat < /dev/null > /dev/tcp/$ttarget/$tport" 2>/dev/null; then',
        '        end=$(date +%s%3N); latency=$((end-start)); status="up"',
        '      else',
        '        latency=null; status="down"',
        '      fi',
        '      checks+=("{\\\"type\\\":\\\"tcp\\\",\\\"target\\\":\\\"$ttarget\\\",\\\"port\\\":$tport,\\\"status\\\":\\\"$status\\\",\\\"latencyMs\\\":${latency},\\\"checkedAt\\\":\\\"$checked_at\\\"}")',
        '    elif [ "$ttype" = "http" ]; then',
        '      scheme="https"',
        '      url="$scheme://$ttarget"',
        '      if [ -n "$tport" ]; then url="$url:$tport"; fi',
        '      if [ -n "$tpath" ]; then url="$url$tpath"; fi',
        '      result=$(curl -o /dev/null -s -w "%{time_total} %{http_code}" --max-time 5 "$url" || true)',
        '      time_total=$(echo "$result" | awk "{print $1}")',
        '      http_code=$(echo "$result" | awk "{print $2}")',
        '      if [ -n "$time_total" ] && [ "$http_code" != "000" ]; then',
        '        latency=$(awk -v t="$time_total" "BEGIN{printf \\\"%.0f\\\", t*1000}")',
        '        status="up"',
        '      else',
        '        latency=null; http_code="000"; status="down"',
        '      fi',
        '      checks+=("{\\\"type\\\":\\\"http\\\",\\\"target\\\":\\\"$ttarget\\\",\\\"port\\\":${tport:-null},\\\"path\\\":\\\"${tpath:-/}\\\",\\\"status\\\":\\\"$status\\\",\\\"latencyMs\\\":${latency},\\\"httpCode\\\":$http_code,\\\"checkedAt\\\":\\\"$checked_at\\\"}")',
        '    fi',
        '  done',
        '  NETWORK_JSON="["$(IFS=,; echo "${checks[*]}")"]"',
        '  echo "$now_ts" > "$NETWORK_STATE"',
        'fi',
        '',
        'PAYLOAD=$(cat <<PAYLOAD_EOF',
        '{',
        '  "hostname": "\${HOSTNAME}",',
        '  "os": "\${OS}",',
        '  "arch": "\${ARCH}",',
        '  "kernel": "\${KERNEL}",',
        '  "uptimeSec": \${UPTIME_SEC},',
        '  "cpu": { "usage": \${CPU_USAGE} },',
        '  "mem": { "usage": \${MEM_USAGE} },',
        '  "disk": { "usage": \${DISK_USAGE} },',
        '  "load": { "load1": \${LOAD1} },',
        '  "network": ${NETWORK_JSON}',
        '}',
        'PAYLOAD_EOF',
        ')',
        '',
        `curl -sS -X POST "${reportUrl}" \\`,
        '  -H "Content-Type: application/json" \\',
        `  -H "x-node-id: ${node.id}" \\`,
        `  -H "x-node-secret: ${node.secret}" \\`,
        '  --data "${PAYLOAD}" >/dev/null',
        'EOF',
        '',
        'chmod +x /usr/local/bin/misub-vps-probe.sh',
        '',
        "cat > /etc/systemd/system/misub-vps-probe.service <<'EOF'",
        '[Unit]',
        'Description=MiSub VPS Probe',
        'After=network-online.target',
        'Wants=network-online.target',
        '',
        '[Service]',
        'Type=oneshot',
        'ExecStart=/usr/local/bin/misub-vps-probe.sh',
        'EOF',
        '',
        "cat > /etc/systemd/system/misub-vps-probe.timer <<'EOF'",
        '[Unit]',
        'Description=MiSub VPS Probe Timer',
        '',
        '[Timer]',
        'OnBootSec=2min',
        'OnUnitActiveSec=60s',
        'Unit=misub-vps-probe.service',
        'Persistent=true',
        '',
        '[Install]',
        'WantedBy=timers.target',
        'EOF',
        '',
        'systemctl daemon-reload',
        '',
        'systemctl enable --now misub-vps-probe.timer',
        '',
        'systemctl status misub-vps-probe.timer --no-pager'
    ].join('\n');
}

function buildPublicGuide(env, request, node) {
    const baseUrl = getPublicBaseUrl(env, new URL(request.url));
    const reportUrl = `${baseUrl.origin}/api/vps/report`;
    const installScript = buildInstallScript(reportUrl, node);
    const installCommand = `curl -fsSL "${baseUrl.origin}/api/vps/install?nodeId=${node.id}&secret=${node.secret}" | bash`;
    return {
        reportUrl,
        nodeId: node.id,
        nodeSecret: node.secret,
        headers: {
            'Content-Type': 'application/json',
            'x-node-id': node.id,
            'x-node-secret': node.secret
        },
        installScript,
        installCommand
    };
}

export async function handleVpsInstallScript(request, env) {
    if (request.method !== 'GET') {
        return createErrorResponse('Method Not Allowed', 405);
    }
    const d1Check = ensureD1Available(env);
    if (d1Check) return d1Check;

    const storageAdapter = await getStorageAdapter(env);
    const settings = resolveSettings(await storageAdapter.get(KV_KEY_SETTINGS));
    const storageModeCheck = ensureD1StorageMode(settings);
    if (storageModeCheck) return storageModeCheck;

    const url = new URL(request.url);
    const nodeId = normalizeString(url.searchParams.get('nodeId'));
    const nodeSecret = normalizeString(url.searchParams.get('secret'));
    if (!nodeId || !nodeSecret) {
        return createErrorResponse('Missing node credentials', 401);
    }

    const db = getD1(env);
    const node = await fetchNode(db, nodeId);
    if (!node) {
        return createErrorResponse('Node not found', 404);
    }
    if (node.secret !== nodeSecret) {
        return createErrorResponse('Unauthorized', 401);
    }

    const baseUrl = getPublicBaseUrl(env, new URL(request.url));
    const reportUrl = `${baseUrl.origin}/api/vps/report`;
    const script = buildInstallScript(reportUrl, node);
    return new Response(script, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    });
}

export async function handleVpsConfig(request, env) {
    if (request.method !== 'GET') {
        return createErrorResponse('Method Not Allowed', 405);
    }
    const d1Check = ensureD1Available(env);
    if (d1Check) return d1Check;

    const storageAdapter = await getStorageAdapter(env);
    const settings = resolveSettings(await storageAdapter.get(KV_KEY_SETTINGS));
    const storageModeCheck = ensureD1StorageMode(settings);
    if (storageModeCheck) return storageModeCheck;

    const url = new URL(request.url);
    const nodeId = normalizeString(url.searchParams.get('nodeId'));
    const nodeSecret = normalizeString(url.searchParams.get('secret'));
    const format = normalizeString(url.searchParams.get('format')) || 'json';
    if (!nodeId || !nodeSecret) {
        return createErrorResponse('Missing node credentials', 401);
    }

    const db = getD1(env);
    const node = await fetchNode(db, nodeId);
    if (!node || node.secret !== nodeSecret) {
        return createErrorResponse('Unauthorized', 401);
    }

    const targets = await fetchNetworkTargets(db, nodeId);
    const interval = clampNumber(settings?.vpsMonitor?.networkSampleIntervalMinutes, 1, 60, 5);

    if (format === 'env') {
        const lines = [`NETWORK_INTERVAL=${interval}`];
        targets.forEach(target => {
            const line = `TARGET=${target.type}|${target.target}|${target.port || ''}|${target.path || ''}|${target.enabled ? 1 : 0}`;
            lines.push(line);
        });
        return new Response(lines.join('\n'), {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            }
        });
    }

    return createJsonResponse({
        success: true,
        data: {
            intervalMinutes: interval,
            targets
        }
    });
}

export { buildPublicGuide };

export async function handleVpsReport(request, env) {
    const d1Check = ensureD1Available(env);
    if (d1Check) return d1Check;
    if (request.method !== 'POST') {
        return createErrorResponse('Method Not Allowed', 405);
    }

    let payload;
    try {
        payload = await request.json();
    } catch (error) {
        return createErrorResponse('Invalid JSON', 400);
    }

    const nodeId = normalizeString(request.headers.get('x-node-id') || payload?.nodeId);
    const nodeSecret = normalizeString(request.headers.get('x-node-secret') || payload?.secret);

    if (!nodeId) {
        return createErrorResponse('Missing node id', 401);
    }

    const storageAdapter = await getStorageAdapter(env);
    const settings = resolveSettings(await storageAdapter.get(KV_KEY_SETTINGS));
    const storageModeCheck = ensureD1StorageMode(settings);
    if (storageModeCheck) return storageModeCheck;

    const db = getD1(env);

    if (settings?.vpsMonitor?.enabled === false) {
        return createErrorResponse('VPS monitor disabled', 403);
    }

    const node = await fetchNode(db, nodeId);
    if (!node) {
        return createErrorResponse('Node not found', 404);
    }
    if (node.enabled === false) {
        return createErrorResponse('Node disabled', 403);
    }
    if (settings?.vpsMonitor?.requireSecret !== false) {
        if (!nodeSecret) {
            return createErrorResponse('Missing node secret', 401);
        }
        if (node.secret !== nodeSecret) {
            return createErrorResponse('Unauthorized', 401);
        }
    }

    const report = payload?.report || payload;
    const reportedAt = normalizeString(report.reportedAt || report.at || '') || nowIso();

    const normalizedReport = {
        id: crypto.randomUUID(),
        nodeId: node.id,
        reportedAt,
        createdAt: nowIso(),
        meta: {
            hostname: normalizeString(report.hostname || report.host),
            os: normalizeString(report.os || report.platform),
            arch: normalizeString(report.arch),
            kernel: normalizeString(report.kernel),
            version: normalizeString(report.version),
            publicIp: normalizeString(report.publicIp || report.ip || getClientIp(request))
        },
        cpu: report.cpu || {},
        mem: report.mem || {},
        disk: report.disk || {},
        load: report.load || {},
        uptimeSec: clampNumber(report.uptimeSec || report.uptime || 0, 0, 10 ** 9, 0),
        traffic: report.traffic || null
    };

    const networkPayload = report.network || report.checks || null;
    if (Array.isArray(networkPayload) && networkPayload.length) {
        const networkSample = {
            id: crypto.randomUUID(),
            nodeId: node.id,
            reportedAt,
            createdAt: nowIso(),
            checks: networkPayload
        };
        await insertNetworkSample(db, networkSample);
        await pruneNetworkSamples(db, settings);
    }

    await insertReport(db, normalizedReport);
    await pruneReports(db, settings);

    node.lastSeenAt = normalizedReport.reportedAt;
    await updateNodeStatus(db, settings, node, normalizedReport);
    node.lastReport = buildSnapshot(normalizedReport, node);
    node.updatedAt = nowIso();
    await updateNode(db, node);

    return createJsonResponse({ success: true });
}

export async function handleVpsNodesRequest(request, env) {
    const d1Check = ensureD1Available(env);
    if (d1Check) return d1Check;
    const storageAdapter = await getStorageAdapter(env);
    const settings = resolveSettings(await storageAdapter.get(KV_KEY_SETTINGS));
    const storageModeCheck = ensureD1StorageMode(settings);
    if (storageModeCheck) return storageModeCheck;
    const db = getD1(env);
    const nodes = await fetchNodes(db);

    if (request.method === 'GET') {
        const data = nodes.map(node => summarizeNode(node, node.lastReport || null, settings));
        return createJsonResponse({ success: true, data });
    }

    if (request.method === 'POST') {
        const body = await request.json();
        const name = normalizeString(body.name);
        if (!name) {
            return createErrorResponse('Name is required', 400);
        }

        const node = {
            id: crypto.randomUUID(),
            name,
            tag: normalizeString(body.tag),
            region: normalizeString(body.region),
            description: normalizeString(body.description),
            secret: normalizeString(body.secret) || crypto.randomUUID(),
            status: 'offline',
            enabled: body.enabled !== false,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            lastSeenAt: null,
            lastReport: null
        };
        await insertNode(db, node);

        return createJsonResponse({ success: true, data: node, guide: buildPublicGuide(env, request, node) });
    }

    return createErrorResponse('Method Not Allowed', 405);
}

export async function handleVpsNodeDetailRequest(request, env) {
    const d1Check = ensureD1Available(env);
    if (d1Check) return d1Check;
    const storageAdapter = await getStorageAdapter(env);
    const settings = resolveSettings(await storageAdapter.get(KV_KEY_SETTINGS));
    const storageModeCheck = ensureD1StorageMode(settings);
    if (storageModeCheck) return storageModeCheck;
    const db = getD1(env);

    const url = new URL(request.url);
    let nodeId = normalizeString(url.pathname.split('/').pop());
    if (nodeId === 'nodes') {
        nodeId = normalizeString(url.searchParams.get('id'));
    }
    if (!nodeId) {
        return createErrorResponse('Node id required', 400);
    }

    const node = await fetchNode(db, nodeId);
    if (!node) {
        return createErrorResponse('Node not found', 404);
    }

    if (request.method === 'GET') {
        const latestReport = node.lastReport || null;
        const reports = await fetchReportsForNode(db, nodeId, settings);
        const targets = await fetchNetworkTargets(db, nodeId);
        const networkSamples = await fetchNetworkSamples(db, nodeId, settings);
        return createJsonResponse({
            success: true,
            data: summarizeNode(node, latestReport, settings),
            reports,
            targets,
            networkSamples,
            guide: buildPublicGuide(env, request, node)
        });
    }

    if (request.method === 'PATCH') {
        const body = await request.json();
        const fields = ['name', 'tag', 'region', 'description'];
        fields.forEach(field => {
            if (body[field] !== undefined) {
                node[field] = normalizeString(body[field]);
            }
        });
        if (typeof body.enabled === 'boolean') {
            node.enabled = body.enabled;
        }
        if (body.resetSecret) {
            node.secret = crypto.randomUUID();
        }
        node.updatedAt = nowIso();
        await updateNode(db, node);
        return createJsonResponse({ success: true, data: node, guide: buildPublicGuide(env, request, node) });
    }

    if (request.method === 'DELETE') {
        await deleteNode(db, nodeId);
        return createJsonResponse({ success: true, data: node });
    }

    return createErrorResponse('Method Not Allowed', 405);
}

export async function handleVpsAlertsRequest(request, env) {
    const d1Check = ensureD1Available(env);
    if (d1Check) return d1Check;
    const storageAdapter = await getStorageAdapter(env);
    const settings = resolveSettings(await storageAdapter.get(KV_KEY_SETTINGS));
    const storageModeCheck = ensureD1StorageMode(settings);
    if (storageModeCheck) return storageModeCheck;
    const db = getD1(env);

    if (request.method === 'GET') {
        const result = await db.prepare('SELECT * FROM vps_alerts ORDER BY created_at DESC').all();
        const alerts = (result.results || []).map(row => ({
            id: row.id,
            nodeId: row.node_id,
            type: row.type,
            message: row.message,
            createdAt: row.created_at
        }));
        return createJsonResponse({ success: true, data: alerts });
    }

    if (request.method === 'DELETE') {
        await db.prepare('DELETE FROM vps_alerts').run();
        return createJsonResponse({ success: true });
    }

    return createErrorResponse('Method Not Allowed', 405);
}

export async function handleVpsNetworkTargetsRequest(request, env) {
    const d1Check = ensureD1Available(env);
    if (d1Check) return d1Check;
    const storageAdapter = await getStorageAdapter(env);
    const settings = resolveSettings(await storageAdapter.get(KV_KEY_SETTINGS));
    const storageModeCheck = ensureD1StorageMode(settings);
    if (storageModeCheck) return storageModeCheck;
    const db = getD1(env);

    const url = new URL(request.url);
    const nodeId = normalizeString(url.searchParams.get('nodeId'));
    if (!nodeId) {
        return createErrorResponse('Node id required', 400);
    }

    if (request.method === 'GET') {
        const targets = await fetchNetworkTargets(db, nodeId);
        return createJsonResponse({ success: true, data: targets });
    }

    if (request.method === 'POST') {
        const payload = await request.json();
        const error = validateNetworkTarget(payload);
        if (error) {
            return createErrorResponse(error, 400);
        }
        const current = await fetchNetworkTargets(db, nodeId);
        const limit = clampNumber(settings?.vpsMonitor?.networkTargetsLimit, 1, 10, 3);
        if (current.length >= limit) {
            return createErrorResponse(`目标数量超过上限（${limit}）`, 400);
        }
        const target = await insertNetworkTarget(db, nodeId, payload);
        return createJsonResponse({ success: true, data: target });
    }

    if (request.method === 'PATCH') {
        const payload = await request.json();
        const targetId = normalizeString(payload.id);
        if (!targetId) {
            return createErrorResponse('Target id required', 400);
        }
        const error = payload.type || payload.target || payload.port || payload.path
            ? validateNetworkTarget({
                type: payload.type || 'icmp',
                target: payload.target || '1.1.1.1',
                port: payload.port,
                path: payload.path
            })
            : null;
        if (error) {
            return createErrorResponse(error, 400);
        }
        const updated = await updateNetworkTarget(db, targetId, payload);
        if (!updated) {
            return createErrorResponse('Target not found', 404);
        }
        return createJsonResponse({ success: true, data: updated });
    }

    if (request.method === 'DELETE') {
        const payload = await request.json();
        const targetId = normalizeString(payload.id);
        if (!targetId) {
            return createErrorResponse('Target id required', 400);
        }
        await deleteNetworkTarget(db, targetId);
        return createJsonResponse({ success: true });
    }

    return createErrorResponse('Method Not Allowed', 405);
}

export async function handleVpsNetworkCheck(request, env) {
    if (request.method !== 'POST') {
        return createErrorResponse('Method Not Allowed', 405);
    }
    const d1Check = ensureD1Available(env);
    if (d1Check) return d1Check;
    const storageAdapter = await getStorageAdapter(env);
    const settings = resolveSettings(await storageAdapter.get(KV_KEY_SETTINGS));
    const storageModeCheck = ensureD1StorageMode(settings);
    if (storageModeCheck) return storageModeCheck;
    const db = getD1(env);

    let payload;
    try {
        payload = await request.json();
    } catch (error) {
        return createErrorResponse('Invalid JSON', 400);
    }

    const nodeId = normalizeString(payload.nodeId);
    if (!nodeId) {
        return createErrorResponse('Node id required', 400);
    }

    const targetId = normalizeString(payload.targetId);
    if (!targetId) {
        return createErrorResponse('Target id required', 400);
    }

    const targetRow = await db.prepare('SELECT * FROM vps_network_targets WHERE id = ? AND node_id = ?').bind(targetId, nodeId).first();
    if (!targetRow) {
        return createErrorResponse('Target not found', 404);
    }

    const target = {
        id: targetRow.id,
        type: targetRow.type,
        target: targetRow.target,
        port: targetRow.port,
        path: targetRow.path
    };

    return createJsonResponse({ success: true, data: target, message: 'Probe should run check on next report' });
}
