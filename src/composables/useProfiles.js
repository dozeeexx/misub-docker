import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../stores/useDataStore';
import { useToastStore } from '../stores/toast';

export function useProfiles(markDirty) {
  const { showToast } = useToastStore();
  const dataStore = useDataStore();
  const { profiles, settings } = storeToRefs(dataStore);

  const isNewProfile = ref(false);
  const editingProfile = ref(null);
  const showProfileModal = ref(false);
  const showDeleteProfilesModal = ref(false);

  // 初始化不再需要，数据由 Store 管理

  const handleProfileToggle = (updatedProfile) => {
    const index = profiles.value.findIndex(p => p.id === updatedProfile.id);
    if (index !== -1) {
      profiles.value[index].enabled = updatedProfile.enabled;
      markDirty();
    }
  };

  const handleAddProfile = () => {
    isNewProfile.value = true;
    editingProfile.value = { name: '', enabled: true, subscriptions: [], manualNodes: [], customId: '', subConverter: '', subConfig: '', expiresAt: '' };
    showProfileModal.value = true;
  };

  const handleEditProfile = (profileId) => {
    const profile = profiles.value.find(p => p.id === profileId || p.customId === profileId);
    if (profile) {
      isNewProfile.value = false;
      editingProfile.value = JSON.parse(JSON.stringify(profile));
      editingProfile.value.expiresAt = profile.expiresAt || '';
      showProfileModal.value = true;
    }
  };

  const handleSaveProfile = (profileData) => {
    if (!profileData || !profileData.name) {
      showToast('订阅组名称不能为空', 'error');
      return;
    }
    if (profileData.customId) {
      profileData.customId = profileData.customId.replace(/[^a-zA-Z0-9-_]/g, '');
      if (profileData.customId && profiles.value.some(p => p.id !== profileData.id && p.customId === profileData.customId)) {
        showToast(`自定义 ID "${profileData.customId}" 已存在`, 'error');
        return;
      }
    }
    if (isNewProfile.value) {
      dataStore.addProfile({ ...profileData, id: crypto.randomUUID() });
    } else {
      const index = profiles.value.findIndex(p => p.id === profileData.id);
      if (index !== -1) {
        profiles.value[index] = profileData;
      }
    }
    markDirty();
    showProfileModal.value = false;
  };

  const handleDeleteProfile = (profileId) => {
    dataStore.removeProfile(profileId);
    markDirty();
  };

  const handleDeleteAllProfiles = () => {
    profiles.value = [];
    markDirty();
    showDeleteProfilesModal.value = false;
  };

  const copyProfileLink = (profileId) => {
    const token = settings.value?.profileToken;
    if (!token || token === 'auto' || !token.trim()) {
      showToast('请在设置中配置一个固定的“订阅组分享Token”', 'error');
      return;
    }
    const profile = profiles.value.find(p => p.id === profileId || p.customId === profileId);
    if (!profile) return;
    const identifier = profile.customId || profile.id;
    const link = `${window.location.origin}/${token}/${identifier}`;
    navigator.clipboard.writeText(link);
    showToast('订阅组分享链接已复制！', 'success');
  };

  const cleanupSubscriptions = (subId) => {
    profiles.value.forEach(p => {
      p.subscriptions = p.subscriptions.filter(id => id !== subId);
    });
  };

  const cleanupNodes = (nodeId) => {
    profiles.value.forEach(p => {
      p.manualNodes = p.manualNodes.filter(id => id !== nodeId);
    });
  };

  const cleanupAllSubscriptions = () => {
    profiles.value.forEach(p => {
      p.subscriptions = [];
    });
  };

  const cleanupAllNodes = () => {
    profiles.value.forEach(p => {
      p.manualNodes = [];
    });
  };

  return {
    profiles,
    editingProfile,
    isNewProfile,
    showProfileModal,
    showDeleteProfilesModal,
    initializeProfiles: () => { }, // No-op now
    handleProfileToggle,
    handleAddProfile,
    handleEditProfile,
    handleSaveProfile,
    handleDeleteProfile,
    handleDeleteAllProfiles,
    copyProfileLink,
    cleanupSubscriptions,
    cleanupNodes,
    cleanupAllSubscriptions,
    cleanupAllNodes,
  };
}
