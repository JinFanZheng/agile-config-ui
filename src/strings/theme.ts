export const themeStr = {
  switcher: {
    label: '主题',
    title: '切换界面主题',
  },
  /** 分组标签（切换器与设置页共用；分组下具体主题清单由注册表驱动） */
  groups: {
    light: '浅色',
    dark: '深色',
  },
  /** 跟随系统档（'system' 哨兵值的展示名） */
  system: '跟随系统',
  systemDesc: '随系统深浅色自动切换，深浅各自使用的主题可在下方指定',
  themes: {
    graphite: '石墨',
    'clear-blue': '晨雾蓝',
    'warm-paper': '暖纸',
    'navy-console': '深蓝中控',
    'fresh-mint': '薄荷',
    obsidian: '曜石',
    'violet-night': '紫夜',
    sakura: '樱粉',
    mocha: '摩卡',
    forest: '森夜',
  },
} as const
