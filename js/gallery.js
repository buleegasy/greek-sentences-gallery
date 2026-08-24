// 24/7 Pure Single-Seed Non-Scrollable Single-Page Gallery Streamer
import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

let exhibitIndex = 1;
let gradioClient = null;
let lastContext = "";

const frameElem = document.getElementById('editorial-frame');
const watermarkElem = document.getElementById('watermark-num');
const exhibitLabelElem = document.getElementById('exhibit-label');
const greekLemmaElem = document.getElementById('greek-lemma');
const greekMetaElem = document.getElementById('greek-meta');
const dropCapElem = document.getElementById('drop-cap-char');
const textStreamElem = document.getElementById('text-stream');
const cursorElem = document.getElementById('type-cursor');
const timerDisplayElem = document.getElementById('timer-display');
const streamStatusElem = document.getElementById('stream-status');

async function initClient() {
  if (streamStatusElem) streamStatusElem.innerText = "CONNECTING TO NEURAL CLUSTER...";
  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    if (streamStatusElem) streamStatusElem.innerText = "SINGLE-FRAME STREAM ACTIVE";
  } catch (e) {
    console.error("Connection error:", e);
    if (streamStatusElem) streamStatusElem.innerText = "RECONNECTING...";
    await new Promise(r => setTimeout(r, 2000));
    return initClient();
  }
}

async function streamSingleExhibit(content, seed) {
  const exhibitNoStr = String(exhibitIndex).padStart(2, '0');
  
  // 更新单屏元数据与水印
  if (watermarkElem) watermarkElem.innerText = exhibitNoStr;
  if (exhibitLabelElem) exhibitLabelElem.innerText = `Exhibit No. ${exhibitNoStr}`;
  if (greekLemmaElem) greekLemmaElem.innerText = seed || "λόγος";
  if (greekMetaElem) greekMetaElem.innerText = `${seed || "λόγος"} · Single Seed Autoregression`;

  const cleanText = content.trim();
  const firstChar = cleanText.charAt(0);
  const restText = cleanText.slice(1);

  if (dropCapElem) dropCapElem.innerText = firstChar;
  if (textStreamElem) textStreamElem.innerText = "";
  if (cursorElem) cursorElem.style.display = "inline-block";
  if (timerDisplayElem) timerDisplayElem.innerText = "· LIVE STREAMING...";

  // 逐字流式打字
  for (let i = 0; i < restText.length; i++) {
    if (textStreamElem) textStreamElem.innerText += restText[i];
    await new Promise(r => setTimeout(r, 38));
  }

  if (cursorElem) cursorElem.style.display = "none";

  // 单屏驻留沉浸式阅读倒计时
  for (let t = 6; t > 0; t--) {
    if (timerDisplayElem) timerDisplayElem.innerText = `· NEXT IN ${t}S`;
    await new Promise(r => setTimeout(r, 1000));
  }

  if (timerDisplayElem) timerDisplayElem.innerText = "· TRANSITIONING...";

  // 优雅淡出整屏
  if (frameElem) {
    frameElem.classList.remove('fade-in');
    frameElem.classList.add('fade-out');
    await new Promise(r => setTimeout(r, 700));
  }
}

async function runSinglePageLoop() {
  await initClient();

  while (true) {
    let nextSegment = "";
    let seed = "";

    try {
      if (streamStatusElem) streamStatusElem.innerText = "⚡ NEURAL INFERENCE COMPUTING...";
      const result = await gradioClient.predict("/generate", [lastContext]);
      if (streamStatusElem) streamStatusElem.innerText = "SINGLE-FRAME STREAM ACTIVE";

      if (result && result.data && result.data[0]) {
        const rawJson = result.data[0];
        try {
          const parsed = JSON.parse(rawJson);
          nextSegment = parsed.segment || "";
          seed = parsed.seed || "";
        } catch (pe) {
          nextSegment = rawJson;
        }
      }
    } catch (err) {
      console.error("Inference fetch error:", err);
      if (streamStatusElem) streamStatusElem.innerText = "RECONNECTING...";
      await new Promise(r => setTimeout(r, 2000));
      await initClient();
      continue;
    }

    if (nextSegment && nextSegment.trim().length > 5) {
      lastContext = nextSegment.trim().slice(-100);

      // 淡入新一屏并启动打字
      if (frameElem) {
        frameElem.classList.remove('fade-out');
        frameElem.classList.add('fade-in');
      }

      await streamSingleExhibit(nextSegment, seed);
      exhibitIndex++;
    } else {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  runSinglePageLoop();
});
