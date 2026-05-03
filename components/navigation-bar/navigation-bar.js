Component({
  options: {
    multipleSlots: true
  },
  properties: {
    extClass: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: ''
    },
    back: {
      type: Boolean,
      value: true
    },
    loading: {
      type: Boolean,
      value: false
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      type: Boolean,
      value: true
    },
    show: {
      type: Boolean,
      value: true,
      observer: '_showChange'
    },
    delta: {
      type: Number,
      value: 1
    },
  },
  data: {
    displayStyle: ''
  },
  lifetimes: {
    attached() {
      // 兼容多端模式
      try {
        const systemInfo = wx.getSystemInfoSync()
        const platform = systemInfo.platform
        const isAndroid = platform === 'android'
        const isDevtools = platform === 'devtools'
        
        // 尝试获取菜单按钮位置(多端模式可能不支持)
        let rect = { left: 0 }
        try {
          rect = wx.getMenuButtonBoundingClientRect()
        } catch (e) {
          console.log('无法获取菜单按钮位置,使用默认值')
        }
        
        const { windowWidth, safeArea } = systemInfo
        const top = safeArea ? safeArea.top : 0
        
        this.setData({
          ios: !isAndroid,
          innerPaddingRight: `padding-right: ${windowWidth - rect.left}px`,
          leftWidth: `width: ${windowWidth - rect.left}px`,
          safeAreaTop: isDevtools || isAndroid ? `height: calc(var(--height) + ${top}px); padding-top: ${top}px` : ``
        })
      } catch (e) {
        console.log('导航栏初始化失败,使用默认设置')
      }
    },
  },
  methods: {
    _showChange(show) {
      const animated = this.data.animated
      let displayStyle = ''
      if (animated) {
        displayStyle = `opacity: ${show ? '1' : '0'};transition:opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }
      this.setData({
        displayStyle
      })
    },
    back() {
      const data = this.data
      if (data.delta) {
        wx.navigateBack({
          delta: data.delta
        })
      }
      this.triggerEvent('back', { delta: data.delta }, {})
    }
  },
})