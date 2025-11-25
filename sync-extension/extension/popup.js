// popup.js — non-blocking, debug-friendly version
console.log('[popup] loaded')

// Storage helper (using chrome.storage.sync)
const storage = (function () {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    return {
      get: keys => new Promise(res => chrome.storage.sync.get(keys, res)),
      set: obj => new Promise(res => chrome.storage.sync.set(obj, res))
    }
  } else {
    return {
      get: keys =>
        new Promise(res => {
          const out = {}
          for (const k of Object.keys(keys || {}))
            out[k] = localStorage.getItem(k)
          res(out)
        }),
      set: obj =>
        new Promise(res => {
          for (const k in obj) localStorage.setItem(k, obj[k])
          res()
        })
    }
  }
})()

// DOM refs
const toggle = document.getElementById('toggle')
const dot = document.getElementById('dot')
const statusText = document.getElementById('statusText')
const statusSub = document.getElementById('statusSub')
const roomInput = document.getElementById('roomId')
const connectBtn = document.getElementById('connectBtn')
const activeBanner = document.getElementById('activeBanner')
const currentRoom = document.getElementById('currentRoom')
const copyBtn = document.getElementById('copyBtn')
const settingsBtn = document.getElementById('settings')

let state = { enabled: false, roomId: '' }

function render() {
  if (state.enabled) {
    toggle.classList.add('on')
    toggle.setAttribute('aria-checked', 'true')
    dot.classList.add('on')
    statusText.textContent = 'Extension is ON'
  } else {
    toggle.classList.remove('on')
    toggle.setAttribute('aria-checked', 'false')
    dot.classList.remove('on')
    statusText.textContent = 'Extension is OFF'
  }

  if (state.roomId && state.enabled) {
    statusSub.textContent = 'Connected to room'
    activeBanner.style.display = 'flex'
    activeBanner.setAttribute('aria-hidden', 'false')
    currentRoom.textContent = state.roomId
    roomInput.value = state.roomId
    connectBtn.textContent = 'Disconnect'
    connectBtn.setAttribute('aria-pressed', 'true')
    copyBtn.style.visibility = 'visible'
  } else if (state.roomId) {
    statusSub.textContent = 'Room saved (not connected)'
    activeBanner.style.display = 'none'
    connectBtn.textContent = 'Connect'
    connectBtn.setAttribute('aria-pressed', 'false')
    copyBtn.style.visibility = 'visible'
    currentRoom.textContent = '—'
  } else {
    statusSub.textContent = 'No active room'
    activeBanner.style.display = 'none'
    connectBtn.textContent = 'Connect'
    connectBtn.setAttribute('aria-pressed', 'false')
    copyBtn.style.visibility = 'hidden'
    currentRoom.textContent = '—'
  }
}

async function loadState() {
  try {
    const data = await storage.get({ enabled: 'false', roomId: '' })
    state.enabled = data.enabled === true || data.enabled === 'true'
    state.roomId = data.roomId || ''
    render()
  } catch (err) {
    console.error('[popup] loadState error', err)
  }
}

async function saveState() {
  try {
    await storage.set({ enabled: state.enabled, roomId: state.roomId })
  } catch (err) {
    console.error('[popup] saveState error', err)
  }
}

// send to content script (no alerts)
function sendToContent(message) {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs && tabs[0]
      if (!tab) return resolve({ ok: false, reason: 'no-active-tab' })
      chrome.tabs.sendMessage(tab.id, message, response => {
        if (chrome.runtime.lastError) {
          console.warn(
            '[popup] sendMessage error:',
            chrome.runtime.lastError.message
          )
          return resolve({ ok: false, error: chrome.runtime.lastError.message })
        }
        resolve(response || { ok: true })
      })
    })
  })
}

// interactions
toggle.addEventListener('click', async () => {
  state.enabled = !state.enabled
  await saveState()
  render()

  // notify content script (non-blocking)
  const resp = await sendToContent({ type: 'toggle', enabled: state.enabled })
  console.log('[popup] toggle resp', resp)
})

toggle.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle.click()
  }
})

roomInput.addEventListener('input', async e => {
  state.roomId = e.target.value.trim()
  await saveState()
  render()
})

connectBtn.addEventListener('click', async () => {
  if (!state.roomId) {
    // friendly focus instead of alert
    roomInput.focus()
    roomInput.setSelectionRange(0, roomInput.value.length)
    return
  }

  if (state.enabled && activeBanner.style.display === 'flex') {
    // disconnect flow
    state.enabled = false
    await saveState()
    render()
    await sendToContent({ type: 'leaveRoom', roomId: state.roomId })
    console.log('[popup] left room', state.roomId)
    return
  }

  // connect flow
  state.enabled = true
  await saveState()
  render()

  // Show connecting status
  statusSub.textContent = 'Connecting...'

  // Send to all video site tabs via background script
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'setRoomId',
      roomId: state.roomId
    })

    console.log('[popup] joinRoom response:', response)

    // Wait a bit for connection to establish
    setTimeout(async () => {
      // Double check by sending to current tab
      const resp = await sendToContent({
        type: 'joinRoom',
        roomId: state.roomId,
        serverUrl: 'http://localhost:3000'
      })

      if (!resp || resp.ok === false) {
        statusSub.textContent = 'Connection failed - Check if server is running'
        console.warn('[popup] join failed', resp)
      } else {
        statusSub.textContent = 'Connected to room'
      }
    }, 500)
  } catch (err) {
    statusSub.textContent = 'Connection error'
    console.error('[popup] error:', err)
  }
})

copyBtn.addEventListener('click', async () => {
  if (!state.roomId) return
  try {
    await navigator.clipboard.writeText(state.roomId)
    copyBtn.textContent = 'Copied'
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1200)
  } catch (e) {
    copyBtn.textContent = 'Copy failed'
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1200)
  }
})

settingsBtn.addEventListener('click', () => {
  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    chrome.runtime.openOptionsPage
  ) {
    chrome.runtime.openOptionsPage()
  } else {
    // non-blocking fallback
    console.log('[popup] settings not available')
  }
})

// initialize
loadState()

// storage change sync
if (
  typeof chrome !== 'undefined' &&
  chrome.storage &&
  chrome.storage.onChanged
) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (changes.enabled)
      state.enabled =
        changes.enabled.newValue === true || changes.enabled.newValue === 'true'
    if (changes.roomId) state.roomId = changes.roomId.newValue || ''
    render()
  })
}
