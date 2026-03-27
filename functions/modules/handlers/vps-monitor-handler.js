/**
 * VPS Monitor handler
 * Public report endpoint + auth-only management APIs
 */

import { StorageFactory, STORAGE_TYPES } from '../../storage-adapter.js';
import { createJsonResponse, createErrorResponse, getPublicBaseUrl } from '../utils.js';
import { sendTgNotification } from '../notifications.js';
import {
    KV_KEY_SETTINGS,
    DEFAULT_SETTINGS
} from '../config.js';

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

function buildPublicGuide(env, request, node) {
    const baseUrl = getPublicBaseUrl(env, new URL(request.url));
    const reportUrl = `${baseUrl.origin}/api/vps/report`;
    return {
        reportUrl,
        nodeId: node.id,
        nodeSecret: node.secret,
        headers: {
            'Content-Type': 'application/json',
            'x-node-id': node.id,
            'x-node-secret': node.secret
        }
    };
}

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
        return createJsonResponse({
            success: true,
            data: summarizeNode(node, latestReport, settings),
            reports
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
