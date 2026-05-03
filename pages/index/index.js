const app = getApp()
const db = wx.cloud ? wx.cloud.database() : null

Page({
  data: {
    isStudying: false,
    seconds: 0,
    timer: null,
    remindCount: 0,
    time: '00:00:00',

    cameraAuth: false,
    poseTip: "",
    warning: false,

    lockStudy: false,
    lockText: '',
    
    fontSize: 1
  },

  onLoad() {
    this.checkCameraAuth()
    const fontSize = parseFloat(wx.getStorageSync('fontSize') || 1)
    this.setData({ fontSize: fontSize })
  },

  onShow() {
    const fontSize = parseFloat(wx.getStorageSync('fontSize') || 1)
    this.setData({ fontSize: fontSize })
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
  },

  checkCameraAuth() {
    if (typeof wx.authorize === 'function') {
      wx.authorize({
        scope: 'scope.camera',
        success: () => {
          this.setData({ cameraAuth: true })
        },
        fail: () => {
          console.log('摄像头授权失败,可能不支持此功能')
          this.setData({ cameraAuth: false })
        }
      })
    } else {
      console.log('当前环境不支持摄像头授权')
      this.setData({ cameraAuth: false })
    }
  },

  startStudy() {
    if (this.data.lockStudy || this.data.isStudying) return
    this.setData({ 
      isStudying: true,
      seconds: 0
    })

    this.setData({
      poseTip: "⚠️ 请注意端正坐姿",
      warning: true
    })
    
    this.safeVibrate()
    
    setTimeout(() => {
      this.setData({
        poseTip: "",
        warning: false
      })
    }, 3000)

    const timer = setInterval(() => {
      let s = this.data.seconds + 1
      this.setData({ seconds: s })
      this.formatTime(s)

      if (s % 1200 === 0) {
        this.setData({
          poseTip: "️休息一下,看远处20秒",
          warning: true
        })
        this.safeVibrate()
        setTimeout(() => {
          this.setData({
            poseTip: "",
            warning: false
          })
        }, 3000)
      }

      if (s % 1200 === 0) {
        wx.showModal({
          title: ' 护眼提醒',
          content: '休息一下,看远处20秒',
          showCancel: false
        })
        this.setData({ remindCount: this.data.remindCount + 1 })
      }

      if (s >= 2700) {
        this.forceRest()
      }
    }, 1000)

    this.setData({ timer })
  },

  stopStudy() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    this.setData({
      isStudying: false,
      timer: null,
      poseTip: "",
      warning: false
    })

    const sec = this.data.seconds
    if (sec < 60) return

    const openid = app.globalData.openid || wx.getStorageSync('openid')
    
    if (db) {
      db.collection('study_records').add({
        data: {
          openid: openid,
          duration: Math.floor(sec / 60),
          remindCount: this.data.remindCount,
          date: this.getTodayDate(),
          createTime: new Date(),
          userInfo: app.globalData.user_info || {}
        },
        success: (res) => {
          console.log('学习记录保存成功', res)
        },
        fail: (err) => {
          console.error('学习记录保存失败', err)
        }
      })
    } else {
      const records = wx.getStorageSync('study_records') || []
      records.push({
        openid: openid,
        duration: Math.floor(sec / 60),
        remindCount: this.data.remindCount,
        date: this.getTodayDate(),
        createTime: new Date().toISOString()
      })
      wx.setStorageSync('study_records', records)
      console.log('学习记录已保存到本地')
    }
  },

  safeVibrate() {
    if (typeof wx.vibrateLong === 'function') {
      wx.vibrateLong({
        success: () => {},
        fail: () => {
          console.log('震动功能不可用')
        }
      })
    }
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

  getTodayDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})