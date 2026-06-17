import { handleCronTrigger } from '../functions/modules/notifications.js';
import { maybeRunScheduledTasks } from '../functions/modules/scheduled-task-runner.js';

const DEFAULT_INTERVAL_SECONDS = 24 * 60 * 60;

function parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseIntervalSeconds(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_INTERVAL_SECONDS;
    return Math.max(60, Math.floor(parsed));
}

export function startScheduler(env) {
    if (parseBoolean(env.CRON_ENABLED, true) === false) {
        console.info('[Scheduler] Disabled by CRON_ENABLED=false');
        return { stop() {} };
    }

    const intervalSeconds = parseIntervalSeconds(env.CRON_INTERVAL_SECONDS);
    let running = false;
    let stopped = false;
    let timer = null;
    let startupTimer = null;
    let activeRun = null;

    const runOnce = async (source = 'docker-cron') => {
        if (stopped) {
            return { skipped: true, reason: 'stopped' };
        }

        if (running) {
            console.info('[Scheduler] Previous run still active, skipping this tick');
            return { skipped: true, reason: 'already-running' };
        }

        running = true;
        const startedAt = Date.now();

        activeRun = (async () => {
            console.info(`[Scheduler] Starting ${source}`);
            const cronResponse = await handleCronTrigger(env);
            let cronResult = null;
            try {
                cronResult = await cronResponse.clone().json();
            } catch {
                cronResult = { status: cronResponse.status };
            }

            const scheduledTasks = await maybeRunScheduledTasks({ env }, {
                source,
                awaitRun: true,
                forceCheck: true
            });

            console.info('[Scheduler] Completed', {
                durationMs: Date.now() - startedAt,
                cron: cronResult,
                scheduledTasks
            });
            return { completed: true, cron: cronResult, scheduledTasks };
        })();

        try {
            return await activeRun;
        } catch (error) {
            console.error('[Scheduler] Run failed:', error);
            return { failed: true, error: error?.message || String(error) };
        } finally {
            running = false;
            activeRun = null;
        }
    };

    const scheduleNext = () => {
        if (stopped) return;
        timer = setTimeout(async () => {
            await runOnce();
            scheduleNext();
        }, intervalSeconds * 1000);
        timer.unref?.();
    };

    if (parseBoolean(env.CRON_RUN_ON_START, false)) {
        startupTimer = setTimeout(() => runOnce('docker-startup'), 1000);
        startupTimer.unref?.();
    }
    scheduleNext();

    console.info(`[Scheduler] Enabled, interval=${intervalSeconds}s`);

    return {
        runOnce,
        async stop() {
            stopped = true;
            if (timer) clearTimeout(timer);
            if (startupTimer) clearTimeout(startupTimer);
            if (activeRun) {
                await activeRun.catch(error => {
                    console.error('[Scheduler] Active run failed during shutdown:', error);
                });
            }
        }
    };
}
