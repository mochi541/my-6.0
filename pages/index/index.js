const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    isStudying: false,
    seconds: 0,
    timer: null,
    remindCount: 0,
    time: '00:00:00',

    cameraAuth: false,
    poseTip: "✅ 坐姿良好",
    warning: false,

    lockStudy: false,
    lockText: ''
  },

  onLoad() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        this.setData({ cameraAuth: true })
      }
    })
  },

  onUnload() {
    clearInterval(this.data.timer)
  },

  startStudy() {
    if (this.data.lockStudy || this.data.isStudying) return
    this.setData({ 
      isStudying: true,
      seconds: 0
    })

    // 开局第一秒：文字变红 + 强制震动
    this.setData({
      poseTip: "⚠️ 请注意端正坐姿",
      warning: true
    })
    // 强制震动
    wx.vibrateLong()
    setTimeout(() => {
      this.setData({
        poseTip: "✅ 坐姿良好",
        warning: false
      })
    }, 3000)

    const timer = setInterval(() => {
      let s = this.data.seconds + 1
      this.setData({ seconds: s })
      this.formatTime(s)

      // 每10分钟提醒+震动
      if (s % 600 === 0) {
        this.setData({
          poseTip: "⚠️ 请注意端正坐姿",
          warning: true
        })
        wx.vibrateLong()
        setTimeout(() => {
          this.setData({
            poseTip: "✅ 坐姿良好",
            warning: false
          })
        }, 3000)
      }

      // 20分钟护眼弹窗
      if (s % 1200 === 0) {
        wx.showModal({
          title: '👀 护眼提醒',
          content: '休息一下，看远处20秒',
          showCancel: false
        })
        this.setData({ remindCount: this.data.remindCount + 1 })
      }

      // 45分钟强制休息
      if (s >= 2700) {
        this.forceRest()
      }
    }, 1000)

    this.setData({ timer })
  },

  stopStudy() {
    clearInterval(this.data.timer)
    this.setData({
      isStudying: false,
      timer: null,
      poseTip: "✅ 坐姿良好",
      warning: false
    })

    const sec = this.data.seconds
    if (sec < 60) return

    // 获取openid
    const openid = app.globalData.openid || wx.getStorageSync('openid')
    
    // 保存到云数据库
    db.collection('study_records').add({
      data: {
        openid: openid,
        duration: Math.floor(sec / 60), // 学习时长（分钟）
        remindCount: this.data.remindCount, // 提醒次数
        date: this.getTodayDate(), // 日期字符串，方便查询
        createTime: new Date(),
        userInfo: app.globalData.user_info || {}
      },
      success: (res) => {
        console.log('学习记录保存成功', res)
      },
      fail: (err) => {
        console.error('学习记录保存失败', err)
        wx.showToast({ title: '记录保存失败', icon: 'none' })
      }
    })
  },

  forceRest() {
    this.stopStudy()
    this.setData({ lockStudy: true, lockText: '休息10分钟' })
    let t = 600
    let timer = setInterval(() => {
      t--
      this.setData({ lockText: `休息中 ${Math.ceil(t / 60)} 分钟` })
      if (t <= 0) {
        clearInterval(timer)
        this.setData({ lockStudy: false, lockText: '' })
      }
    }, 1000)
  },

  formatTime(sec) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    this.setData({
      time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    })
  },

  // 获取今天日期字符串 YYYY-MM-DD
  getTodayDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})