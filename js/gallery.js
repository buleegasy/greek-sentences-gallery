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
let isFirstSync = true;
const typewriterQueue = []; // 打字机队列

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

function appendBlockToDOM(block, instantRender = false) {
  const cleanText = block.text.trim();
  const div = document.createElement('div');
  div.className = 'rolling-block';
  div.id = `block-${block.id}`;

  const pElem = document.createElement('p');
  pElem.className = 'block-text';

  if (instantRender) {
    pElem.innerText = cleanText;
  } else {
    pElem.innerText = "";
    typewriterQueue.push({
      id: block.id,
      text: cleanText,
      currentIndex: 0,
      pElem: pElem
    });
  }

  div.appendChild(pElem);
  trackElem.appendChild(div);
}

// 核心同步轮询
async function syncState() {
  try {
    const result = await gradioClient.predict("/state", []);
    if (result && result.data && result.data[0]) {
      const state = JSON.parse(result.data[0]);
      isGeneratingFlag = state.is_generating;
      
      const newBlocks = [];
      for (const block of state.blocks) {
        if (!renderedBlockIds.has(block.id)) {
          renderedBlockIds.add(block.id);
          newBlocks.push(block);
        }
      }
      
      if (isFirstSync && newBlocks.length > 0) {
        // 第一次加载，跳转到直播最前沿 (Live Edge)
        for (let i = 0; i < newBlocks.length; i++) {
          const block = newBlocks[i];
          const isLast = (i === newBlocks.length - 1);
          // 除了最后一段用来展示打字机效果，前面的历史数据瞬间渲染
          appendBlockToDOM(block, !isLast);
        }
        
        // 确保 DOM 更新后计算高度
        setTimeout(() => {
          // 让视口底部对齐最新生成的文字，呈现从下往上涌出的观感
          currentScrollY = (window.innerHeight * 0.7) - trackElem.scrollHeight;
        }, 50);
        
        isFirstSync = false;
      } else {
        // 后续更新，全部进入打字机流式输出
        for (const block of newBlocks) {
          appendBlockToDOM(block, false);
        }
        if (isFirstSync) isFirstSync = false; // 如果一开始服务器是空的
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
    }
  } catch (e) {
    console.error("Sync fetch error:", e);
  }
  
  // 1.5 秒轮询一次全球状态
  setTimeout(syncState, 1500);
}

// 极度平稳的匀速物理向上推动 (基于真实时间，不受高刷显示器影响)
function startContinuousScrollLoop() {
  let lastTime = 0;
  let typewriterLastTime = 0;
  
  function tick(time) {
    if (!lastTime) lastTime = time;
    const delta = time - lastTime;
    lastTime = time;
    
    // 绝对恒定匀速：15px 每秒
    currentScrollY -= (15 * (delta / 1000));
    trackElem.style.transform = `translateX(-50%) translateY(${currentScrollY}px)`;
    
    // 独立打字机流式渲染逻辑
    if (!typewriterLastTime) typewriterLastTime = time;
    // 动态速度：如果积压了多段文字，打字变快；否则保持自然打字速度
    const speedMs = typewriterQueue.length > 1 ? 25 : 65; 
    
    if (time - typewriterLastTime > speedMs) {
      typewriterLastTime = time;
      if (typewriterQueue.length > 0) {
        const currentJob = typewriterQueue[0];
        if (currentJob.currentIndex < currentJob.text.length) {
          currentJob.pElem.innerText += currentJob.text.charAt(currentJob.currentIndex);
          currentJob.currentIndex++;
        } else {
          // 当前字块打字完成
          typewriterQueue.shift();
        }
      }
    }
    
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", () => {
  startContinuousScrollLoop();
  initClient();
});
