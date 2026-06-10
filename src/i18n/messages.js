export const messages = {
  'zh-CN': {
    app: {
      name: 'MiSub',
      home: '首页',
      language: '语言'
    },
    nav: {
      dashboard: '仪表盘',
      groups: '机场订阅',
      nodes: '手动节点',
      subscriptions: '我的订阅',
      settings: '设置',
      explore: '公开页',
      feedback: '反馈建议',
      githubRepo: '访问 GitHub 仓库',
      main: '主导航',
      top: '顶部导航栏',
      bottom: '底部主导航'
    },
    actions: {
      login: '登录',
      logout: '退出登录',
      toggleLayout: '切换布局',
      openSettings: '打开设置',
      viewReleaseNotes: '查看发布说明',
      gotIt: '知道了',
      save: '保存',
      discard: '放弃',
      add: '新增',
      edit: '编辑',
      delete: '删除',
      refresh: '刷新',
      copy: '复制',
      cancel: '取消',
      confirm: '确认',
      import: '导入',
      export: '导出',
      bulkImport: '批量导入',
      viewLog: '订阅日志',
      backToHome: '返回首页'
    },
    notices: {
      defaultPasswordWarning: '安全警告：检测到您正在使用默认密码 "admin"。为了您的系统安全，请立即前往设置修改密码。',
      discardedChanges: '已放弃所有未保存的更改',
      updateAvailable: '检测到上游新版本 {version}',
      currentVersion: '当前版本为 {version}。建议在确认变更内容后安排升级。'
    },
    dashboard: {
      title: '仪表盘',
      subtitle: '概览订阅健康、节点容量与生成链接',
      lastUpdate: '上次更新',
      never: '从未',
      readiness: {
        waitingForSubscriptions: '等待导入订阅源',
        waitingForProfiles: '等待创建组合订阅',
        needsRefresh: '需要刷新节点',
        hasPendingItems: '有待处理事项',
        ready: '配置可用'
      },
      actions: {
        viewLog: '订阅日志',
        bulkImport: '批量导入',
        addProfile: '新增我的订阅'
      },
      health: {
        title: '待处理事项',
        subtitle: '优先显示会影响订阅可用性的配置问题。',
        itemsCount: '{count} 项',
        allGood: '关键配置正常',
        allGoodDesc: '已具备生成和复制订阅链接的基本条件。'
      },
      guide: {
        title: '新手使用指南',
        step1Title: '1. 添加机场订阅',
        step1Desc: '前往 机场订阅 页面，点击"新增订阅"或"批量导入"，填入您的机场订阅链接。',
        step2Title: '2. 创建组合订阅',
        step2Desc: '在 我的订阅 页面创建新的组合（Profile），选择刚才添加的机场订阅或节点作为来源。',
        step3Title: '3. 获取订阅链接',
        step3Desc: '在右侧面板的"生成的订阅"中，复制对应的 Clash 或其他客户端链接。',
        step4Title: '4. 导入客户端',
        step4Desc: '将生成的链接粘贴到 Clash、Shadowrocket 或 v2rayN 客户端中即可使用。'
      },
      stats: {
        traffic: '剩余流量',
        subscriptions: '订阅源',
        activeSubscriptions: '活跃订阅',
        nodes: '节点总数',
        profiles: '组合订阅',
        trafficUsage: '流量使用'
      }
    },
    notFound: {
      title: '页面迷失在星际中',
      description: '抱歉，您访问的页面似乎已漂流至已知宇宙之外。',
      loginHint: '如需登录，请访问已配置的自定义登录路径。'
    },
    common: {
      loading: '加载中...',
      noData: '暂无数据',
      search: '搜索',
      filter: '筛选',
      sort: '排序',
      all: '全部',
      enabled: '已启用',
      disabled: '已禁用',
      status: '状态',
      name: '名称',
      type: '类型',
      actions: '操作',
      description: '描述',
      created: '创建时间',
      updated: '更新时间'
    }
  },
  'en-US': {
    app: {
      name: 'MiSub',
      home: 'Home',
      language: 'Language'
    },
    nav: {
      dashboard: 'Dashboard',
      groups: 'Sources',
      nodes: 'Manual Nodes',
      subscriptions: 'Subscriptions',
      settings: 'Settings',
      explore: 'Public Page',
      feedback: 'Feedback',
      githubRepo: 'Visit GitHub repository',
      main: 'Main navigation',
      top: 'Top navigation',
      bottom: 'Bottom navigation'
    },
    actions: {
      login: 'Log in',
      logout: 'Log out',
      toggleLayout: 'Switch layout',
      openSettings: 'Open settings',
      viewReleaseNotes: 'View release notes',
      gotIt: 'Got it',
      save: 'Save',
      discard: 'Discard',
      add: 'Add',
      edit: 'Edit',
      delete: 'Delete',
      refresh: 'Refresh',
      copy: 'Copy',
      cancel: 'Cancel',
      confirm: 'Confirm',
      import: 'Import',
      export: 'Export',
      bulkImport: 'Bulk Import',
      viewLog: 'Subscription Log',
      backToHome: 'Back to Home'
    },
    notices: {
      defaultPasswordWarning: 'Security warning: you are using the default password "admin". For your system safety, change it in Settings immediately.',
      discardedChanges: 'Discarded all unsaved changes',
      updateAvailable: 'New upstream version detected: {version}',
      currentVersion: 'Current version: {version}. Review the changelog before upgrading.'
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview of subscriptions, node capacity and generated links',
      lastUpdate: 'Last update',
      never: 'Never',
      readiness: {
        waitingForSubscriptions: 'Waiting for subscription sources',
        waitingForProfiles: 'Waiting for profiles',
        needsRefresh: 'Nodes need refresh',
        hasPendingItems: 'Pending items',
        ready: 'Ready'
      },
      actions: {
        viewLog: 'Subscription Log',
        bulkImport: 'Bulk Import',
        addProfile: 'Add Subscription'
      },
      health: {
        title: 'Pending Items',
        subtitle: 'Shows issues that affect subscription availability.',
        itemsCount: '{count} items',
        allGood: 'All systems normal',
        allGoodDesc: 'Ready to generate and copy subscription links.'
      },
      guide: {
        title: 'Getting Started',
        step1Title: '1. Add subscription sources',
        step1Desc: 'Go to Sources page, click "Add" or "Bulk Import", paste your subscription URL.',
        step2Title: '2. Create profile',
        step2Desc: 'Go to Subscriptions page, create a new profile, select sources or nodes.',
        step3Title: '3. Get subscription link',
        step3Desc: 'Copy the Clash or client link from the right panel under "Generated Subscriptions".',
        step4Title: '4. Import to client',
        step4Desc: 'Paste the link into Clash, Shadowrocket or v2rayN.'
      },
      stats: {
        traffic: 'Remaining Traffic',
        subscriptions: 'Sources',
        activeSubscriptions: 'Active',
        nodes: 'Total Nodes',
        profiles: 'Profiles',
        trafficUsage: 'Traffic Usage'
      }
    },
    notFound: {
      title: 'Page Lost in Space',
      description: 'Sorry, the page you are looking for has drifted beyond the known universe.',
      loginHint: 'To log in, please visit your configured custom login path.'
    },
    common: {
      loading: 'Loading...',
      noData: 'No data',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      all: 'All',
      enabled: 'Enabled',
      disabled: 'Disabled',
      status: 'Status',
      name: 'Name',
      type: 'Type',
      actions: 'Actions',
      description: 'Description',
      created: 'Created',
      updated: 'Updated'
    }
  }
};
