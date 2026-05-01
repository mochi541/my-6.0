Page({
  data: {
    isPlaying: false,
    progress: 0,
    currentTime: '00:00',
    duration: '00:00'
  },

  innerAudioContext: null,
  timer: null,

  onLoad() {
    this.innerAudioContext = wx.createInnerAudioContext()
    let audio = this.innerAudioContext

    audio.src = "/audio/eye-protect1.mp3"

    audio.onCanplay(() => {
      this.setData({
        duration: this.formatTime(audio.duration)
      })
    })

    audio.onPlay(() => {
      this.setData({ isPlaying: true })
      this.startProgress()
    })

    audio.onPause(() => {
      this.setData({ isPlaying: false })
      this.stopProgress()
    })

    audio.onEnded(() => {
      this.setData({
        isPlaying: false,
        progress: 0,
        currentTime: "00:00"
      })
      this.stopProgress()
      audio.seek(0)
    })

    audio.onError((res) => {
      console.log("音频错误：", res)
      wx.showToast({ title: "音频加载失败", icon: "none" })
    })
    
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

  togglePlay() {
    let audio = this.innerAudioContext
    if (!audio) return
    if (audio.paused) {
      audio.play()
    } else {
      audio.pause()
    }
  },

  startProgress() {
    this.stopProgress()
    this.timer = setInterval(() => {
      let cur = this.innerAudioContext.currentTime
      let dur = this.innerAudioContext.duration
      if (!dur) return
      let p = (cur / dur) * 100
      this.setData({
        progress: p,
        currentTime: this.formatTime(cur)
      })
    }, 1000)
  },

  stopProgress() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  changeProgressByClick(e) {
    let dur = this.innerAudioContext.duration
    if (!dur) return
    let w = wx.getSystemInfoSync().windowWidth - 40
    let per = (e.detail.x / w) * 100
    let time = dur * per / 100
    this.innerAudioContext.seek(time)
    this.setData({
      progress: per,
      currentTime: this.formatTime(time)
    })
  },

  dragProgress(e) {
    let dur = this.innerAudioContext.duration
    if (!dur) return
    let w = wx.getSystemInfoSync().windowWidth - 40
    let per = (e.touches[0].clientX / w) * 100
    per = Math.max(0, Math.min(100, per))
    let time = dur * per / 100
    this.innerAudioContext.seek(time)
    this.setData({
      progress: per,
      currentTime: this.formatTime(time)
    })
  },

  formatTime(s) {
    if (!s) return "00:00"
    let m = Math.floor(s / 60).toString().padStart(2, "0")
    let ss = Math.floor(s % 60).toString().padStart(2, "0")
    return m + ":" + ss
  },

  onUnload() {
    this.stopProgress()
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
  }
})