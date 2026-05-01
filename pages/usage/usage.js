Page({
  onLoad() {
    this.applyFontSize()
  },

  onShow() {
    this.applyFontSize()
  },

  applyFontSize() {
    const fontSize = wx.getStorageSync('fontSize') || 1
    wx.setPageStyle({
      style: `font-size: ${Math.round(28 * fontSize)}rpx;`
    })
  },

  onShareAppMessage() {
    return {
      title: '青少年护眼助手使用说明',
      path: '/pages/usage/usage'
    }
  }
})