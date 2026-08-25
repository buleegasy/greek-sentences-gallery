// 24/7 Continuous Vertical Teleprompter Rolling Engine
// 电影字幕级平稳纵向滚动 · 零驻留停顿 · 永不间断流淌 · 全球多端时空同步

import { Client } from "./gradio.js";

let gradioClient = null;
const trackElem = document.getElementById('teleprompter-track');
const streamStatusElem = document.getElementById('stream-status');

// 全球同步引擎状态
let renderedBlockIds = new Set();
let currentScrollY = window.innerHeight * 0.5; 
let isGeneratingFlag = false;

// 绝对恒定匀速滚动参数
const CONSTANT_SCROLL_SPEED = 0.25; // 极缓流淌，约 15px/秒 // 每帧像素，约 30px/秒

async function initClient() {
  if (streamStatusElem) streamStatusElem.innerText = "CONNECTING TO NEURAL CLUSTER...";
  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    if (streamStatusElem) streamStatusElem.innerText = "24/7 CONTINUOUS VERTICAL TELEPROMPTER ACTIVE";
    
    // 初始化启动时，先拉取状态
    syncState();
  } catch (e) {
    console.error("Connection error:", e);
    if (streamStatusElem) streamStatusElem.innerText = "RECONNECTING...";
    await new Promise(r => setTimeout(r, 2000));
    return initClient();
  }
}

function appendBlockToDOM(block) {
  const cleanText = block.text.trim();
  const div = document.createElement('div');
  div.className = 'rolling-block';
  div.id = `block-${block.id}`;

  div.innerHTML = `
    <p class="block-text">${cleanText}</p>
  `;

  trackElem.appendChild(div);
}

// 核心同步轮询
async function syncState() {
  try {
    const result = await gradioClient.predict("/state", []);
    if (result && result.data && result.data[0]) {
      const state = JSON.parse(result.data[0]);
      isGeneratingFlag = state.is_generating;
      
      let addedNew = false;
      for (const block of state.blocks) {
        if (!renderedBlockIds.has(block.id)) {
          renderedBlockIds.add(block.id);
          appendBlockToDOM(block);
          addedNew = true;
        }
      }
      
      // 清理远期离开视口的旧 DOM (当滚出屏幕上方极远处)
      const allBlocks = trackElem.querySelectorAll('.rolling-block');
      if (allBlocks.length > 15) {
        const firstBlock = allBlocks[0];
        const rect = firstBlock.getBoundingClientRect();
        if (rect.bottom < -1000) {
          const offset = firstBlock.offsetHeight + parseFloat(window.getComputedStyle(firstBlock).marginBottom);
          currentScrollY += offset; // 无缝补偿滚动偏移
          firstBlock.remove();
        }
      }

      // 永远提前准备文本，避免滚入空白区域导致不得不"停顿"
      // 获取 track 的总高度与当前滚动位置的关系
      const bottomLimit = -trackElem.scrollHeight + (window.innerHeight * 0.8);
      
      if (!isGeneratingFlag) {
        // 如果服务器空闲，且当前屏幕内的文字快滚动到尽头了（提前一个屏幕的量请求）
        const needsMore = state.blocks.length === 0 || 
                         (state.server_time - state.blocks[state.blocks.length - 1].timestamp) > 2.0;
        
        const isNearBottom = currentScrollY < bottomLimit + 800; // 留出800px的提前量

        if (needsMore || isNearBottom) {
          if (streamStatusElem && state.blocks.length === 0) {
            streamStatusElem.innerText = "GENERATING INITIAL KINETIC BLOCKS...";
          }
          gradioClient.predict("/trigger", []).catch(e => console.error("Trigger fail", e));
        }
      }
    }
  } catch (e) {
    console.error("Sync fetch error:", e);
  }
  
  // 1.5 秒轮询一次全球状态
  setTimeout(syncState, 1500);
}

// 60FPS 极度平稳的匀速物理向上推动
function startContinuousScrollLoop() {
  function tick() {
    // 绝对恒定匀速，绝不停顿！
    currentScrollY -= CONSTANT_SCROLL_SPEED;
    trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", () => {
  startContinuousScrollLoop();
  initClient();
});
