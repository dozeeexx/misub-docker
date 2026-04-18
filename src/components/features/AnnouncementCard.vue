<script setup>
import { ref, computed, watch } from 'vue';
import DOMPurify from 'dompurify';

const props = defineProps({
    announcement: {
        type: Object,
        required: true
    }
});

const isVisible = ref(true);

const allowedContentTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'code', 'pre'];
const allowedContentAttrs = ['href', 'target', 'rel', 'class'];

const sanitizedContent = computed(() => {
    const rawContent = props.announcement?.content?.trim()
        ? props.announcement.content
        : '暂无详细内容';
    return DOMPurify.sanitize(rawContent, {
        ALLOWED_TAGS: allowedContentTags,
        ALLOWED_ATTR: allowedContentAttrs
    });
});

const dismiss = (e) => {
    e.stopPropagation(); 
    isVisible.value = false;
    try {
        if (props.announcement.updatedAt) {
            localStorage.setItem(`announcement_dismissed_${props.announcement.updatedAt}`, 'true');
        }
    } catch (e) {
        console.warn('LocalStorage access failed', e);
    }
};

const checkVisibility = () => {
    if (props.announcement?.dismissible && props.announcement?.updatedAt) {
        const dismissed = localStorage.getItem(`announcement_dismissed_${props.announcement.updatedAt}`);
        if (dismissed) {
            isVisible.value = false;
        } else {
            isVisible.value = true;
        }
    } else {
        isVisible.value = true;
    }
};

checkVisibility();

watch(() => props.announcement, () => {
    checkVisibility();
}, { deep: true });

const typeConfig = computed(() => {
    const types = {
        info: {
            theme: 'blue',
            glow: 'rgba(59, 130, 246, 0.5)',
            gradient: 'from-blue-500/20 via-transparent to-indigo-500/10',
            border: 'border-blue-500/20',
            pill: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            iconColor: 'text-blue-500'
        },
        success: {
            theme: 'emerald',
            glow: 'rgba(16, 185, 129, 0.5)',
            gradient: 'from-emerald-500/20 via-transparent to-teal-500/10',
            border: 'border-emerald-500/20',
            pill: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            iconColor: 'text-emerald-500'
        },
        warning: {
            theme: 'amber',
            glow: 'rgba(245, 158, 11, 0.5)',
            gradient: 'from-amber-500/20 via-transparent to-orange-500/10',
            border: 'border-amber-500/20',
            pill: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            iconColor: 'text-amber-500'
        },
        error: {
            theme: 'rose',
            glow: 'rgba(244, 63, 94, 0.5)',
            gradient: 'from-rose-500/20 via-transparent to-red-500/10',
            border: 'border-rose-500/20',
            pill: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
            iconColor: 'text-rose-500'
        }
    };
    return types[props.announcement.type] || types.info;
});

</script>

<template>
    <Transition name="aurora-fade">
        <div v-if="isVisible" 
             class="aurora-card group relative overflow-hidden transition-all duration-700 misub-radius-lg border backdrop-blur-[32px] shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
             :class="[
                 typeConfig.border,
                 'bg-black/40 dark:bg-black/60'
             ]">
            
            <!-- Animated Aurora Background -->
            <div class="absolute inset-0 opacity-30 pointer-events-none group-hover:opacity-50 transition-opacity duration-1000">
                <div class="absolute -inset-[100%] animate-aurora-spin"
                     :class="['bg-gradient-to-tr', typeConfig.gradient]"></div>
            </div>

            <!-- Dynamic Border Glow -->
            <div class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 border border-white/10 rounded-[inherit]"></div>

            <div class="relative p-6 sm:p-8 z-10">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div class="flex items-center gap-4">
                        <!-- Status Pill -->
                        <div class="flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-500 group-hover:px-4"
                             :class="typeConfig.pill">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" :class="'bg-' + typeConfig.theme + '-400'"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2" :class="'bg-' + typeConfig.theme + '-500'"></span>
                            </span>
                            {{ announcement.type }}
                        </div>
                        
                        <div v-if="announcement.updatedAt" class="text-[10px] font-bold text-white/20 uppercase tracking-tighter">
                            Updated {{ new Date(announcement.updatedAt).toLocaleDateString() }}
                        </div>
                    </div>

                    <button v-if="announcement.dismissible" 
                            @click="dismiss"
                            class="absolute top-6 right-6 p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all duration-300 backdrop-blur-md border border-white/5"
                            title="Dismiss">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="space-y-4">
                    <h3 class="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight group-hover:translate-x-1 transition-transform duration-500">
                        {{ announcement.title || 'System Notification' }}
                    </h3>
                    
                    <div class="prose prose-invert prose-sm max-w-none text-white/70 leading-relaxed font-medium"
                        v-html="sanitizedContent">
                    </div>
                </div>

                <!-- Footer Accent -->
                <div class="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                    <div class="flex -space-x-2">
                        <div class="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-[10px] font-bold text-white shadow-xl">M</div>
                        <div class="w-8 h-8 rounded-full border-2 border-black bg-primary-600 flex items-center justify-center shadow-xl">
                            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <span class="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">MiSub Identity Node</span>
                </div>
            </div>

            <!-- Decorative Glow Circle -->
            <div class="absolute -left-20 -top-20 w-64 h-64 blur-[100px] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-1000 pointer-events-none"
                 :style="{ background: typeConfig.glow }"></div>
        </div>
    </Transition>
</template>

<style scoped>
.aurora-card {
    background-image: 
        radial-gradient(circle at 0% 0%, rgba(255,255,255,0.03) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(255,255,255,0.02) 0%, transparent 50%);
}

.aurora-fade-enter-active,
.aurora-fade-leave-active {
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.aurora-fade-enter-from,
.aurora-fade-leave-to {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
    filter: blur(20px);
}

@keyframes aurora-spin {
    from { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.5); }
    to { transform: rotate(360deg) scale(1); }
}

.animate-aurora-spin {
    animation: aurora-spin 20s linear infinite;
}

:deep(.prose) {
    --tw-prose-invert-body: rgba(255, 255, 255, 0.7);
    --tw-prose-invert-headings: white;
}

:deep(.prose a) {
    color: white;
    text-decoration: none;
    font-weight: 800;
    position: relative;
    padding: 0 2px;
}

:deep(.prose a::after) {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: currentColor;
    opacity: 0.3;
    transition: height 0.2s;
}

:deep(.prose a:hover::after) {
    height: 100%;
    z-index: -1;
    opacity: 0.1;
}

:deep(.prose code) {
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9em;
}

/* 移动端微调 */
@media (max-width: 640px) {
    .aurora-card {
        margin: 0 -1rem;
        border-radius: 0;
        border-left: none;
        border-right: none;
    }
}
</style>
