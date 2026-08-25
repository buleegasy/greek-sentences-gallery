import { Client } from "./gradio.js";

let gradioClient = null;
const liveTextElem = document.getElementById('live-text-block');
const heroSplashElem = document.getElementById('hero-splash');
const readingContainer = document.querySelector('.reading-container');

// 全球同步实时状态
let currentActiveBlockId = null;
let targetText = "";
let currentTypedIndex = 0;
let isTyping = false;
let typewriterTimer = null;

// 卷首题记计时控制：保证展示至少 3 秒后丝滑切出
const splashStartTime = Date.now();
let splashDismissed = false;

function dismissSplash() {
  if (!splashDismissed && heroSplashElem) {
    heroSplashElem.classList.add('fade-out');
    splashDismissed = true;
  }
}

function ensureSplashDismissal() {
  const elapsed = Date.now() - splashStartTime;
  const waitMs = Math.max(0, 3000 - elapsed);
  setTimeout(dismissSplash, waitMs);
}

// 打字机恒定速率：65毫秒/字 (全设备严格统一)
const TYPEWRITER_INTERVAL_MS = 65;

// 1. 打字机逐字输出引擎 (带活体跳动光标)
function startTypewriter(newText) {
  if (typewriterTimer) clearInterval(typewriterTimer);
  
  targetText = newText;
  currentTypedIndex = 0;
  isTyping = true;
  
  // 切段时的柔和呼吸渐变
  if (readingContainer) {
    readingContainer.classList.add('fade-transition');
    setTimeout(() => {
      liveTextElem.innerHTML = '<span class="typing-cursor">▍</span>';
      readingContainer.classList.remove('fade-transition');
    }, 300);
  } else {
    liveTextElem.innerHTML = '<span class="typing-cursor">▍</span>';
  }

  setTimeout(() => {
    typewriterTimer = setInterval(() => {
      if (currentTypedIndex < targetText.length) {
        currentTypedIndex++;
        const visibleSlice = targetText.slice(0, currentTypedIndex);
        liveTextElem.innerHTML = `${visibleSlice}<span class="typing-cursor">▍</span>`;
      } else {
        // 打字结束，保留纯净文本，光标隐去
        liveTextElem.innerHTML = targetText;
        clearInterval(typewriterTimer);
        typewriterTimer = null;
        isTyping = false;
      }
    }, TYPEWRITER_INTERVAL_MS);
  }, 350);
}

// 2. 全球状态同步与实时广播轮询
async function syncGlobalState() {
  try {
    const result = await gradioClient.predict("/state", []);
    if (result && result.data && result.data[0]) {
      const state = JSON.parse(result.data[0]);
      
      if (state.blocks && state.blocks.length > 0) {
        // 永远只获取云端最新产生的那个实时字块
        const latestBlock = state.blocks[state.blocks.length - 1];
        
        if (latestBlock && latestBlock.id !== currentActiveBlockId) {
          currentActiveBlockId = latestBlock.id;
          const cleanChineseText = latestBlock.text.trim();
          
          if (cleanChineseText) {
            startTypewriter(cleanChineseText);
            // 拿到第一段文字后，启动 3 秒丝滑退场
            ensureSplashDismissal();
          }
        }
      }
    }
  } catch (e) {
    console.error("Global sync fetch error:", e);
  }
  
  // 1.5 秒轮询一次，保持多端毫秒级实时同步
  setTimeout(syncGlobalState, 1500);
}

// 3. 连接云端神经中枢
async function initClient() {
  // 设置保底定时器：即使网络延迟，3.5 秒后也必切入舞台
  setTimeout(ensureSplashDismissal, 3500);
  
  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    syncGlobalState();
  } catch (e) {
    console.error("Gradio connect failed, retrying...", e);
    setTimeout(initClient, 2000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initClient();
});
