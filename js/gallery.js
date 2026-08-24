// 24/7 Pure Neural Generative Long-form Article Streamer
import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

let totalWordCount = 0;
let fullManuscriptContext = "";
let paragraphCounter = 1;
let gradioClient = null;

const statusElem = document.getElementById('stream-status');
const wordCounterElem = document.getElementById('word-counter');
const contentContainer = document.getElementById('article-content');

async function initClient() {
  if (statusElem) statusElem.innerText = "CONNECTING TO NEURAL CLUSTER...";
  try {
    gradioClient = await Client.connect("Buleegasy/GREEK_DENG");
    if (statusElem) statusElem.innerText = "24/7 NEURAL PIPELINE ACTIVE · STREAMING GREEK DENG";
  } catch (e) {
    console.error("Connection error:", e);
    if (statusElem) statusElem.innerText = "RECONNECTING TO CLUSTER...";
    await new Promise(r => setTimeout(r, 2000));
    return initClient();
  }
}

async function streamNewParagraph(textSegment, isFirstParagraph = false) {
  if (!textSegment || textSegment.trim().length === 0) return;

  const cleanText = textSegment.trim();
  const pElem = document.createElement('p');
  pElem.className = 'paragraph-block';

  if (isFirstParagraph) {
    const firstChar = cleanText.charAt(0);
    const restText = cleanText.slice(1);

    pElem.innerHTML = `<span class="drop-cap">${firstChar}</span><span class="p-text"></span><span class="type-cursor"></span>`;
    contentContainer.appendChild(pElem);

    const spanText = pElem.querySelector('.p-text');
    const cursor = pElem.querySelector('.type-cursor');

    totalWordCount += 1;
    if (wordCounterElem) wordCounterElem.innerText = `· ${totalWordCount} 字真实模型自回归生成`;

    for (let i = 0; i < restText.length; i++) {
      spanText.innerText += restText[i];
      totalWordCount += 1;
      if (wordCounterElem) wordCounterElem.innerText = `· ${totalWordCount} 字真实模型自回归生成`;

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      await new Promise(r => setTimeout(r, 45));
    }
    if (cursor) cursor.remove();

  } else {
    pElem.innerHTML = `<span class="p-text"></span><span class="type-cursor"></span>`;
    contentContainer.appendChild(pElem);

    const spanText = pElem.querySelector('.p-text');
    const cursor = pElem.querySelector('.type-cursor');

    for (let i = 0; i < cleanText.length; i++) {
      spanText.innerText += cleanText[i];
      totalWordCount += 1;
      if (wordCounterElem) wordCounterElem.innerText = `· ${totalWordCount} 字真实模型自回归生成`;

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      await new Promise(r => setTimeout(r, 45));
    }
    if (cursor) cursor.remove();
  }

  await new Promise(r => setTimeout(r, 1600));
}

async function runInfiniteManuscriptLoop() {
  const initialPlaceholder = document.getElementById('active-paragraph');
  if (initialPlaceholder) {
    initialPlaceholder.remove();
  }

  await initClient();

  while (true) {
    let nextSegment = "";

    try {
      if (statusElem) statusElem.innerText = "⚡ NEURAL INFERENCE COMPUTING...";
      
      const result = await gradioClient.predict("/generate", [
        fullManuscriptContext
      ]);

      if (statusElem) statusElem.innerText = "24/7 NEURAL PIPELINE ACTIVE · STREAMING GREEK DENG";

      if (result && result.data && result.data[0]) {
        const rawJson = result.data[0];
        try {
          const parsed = JSON.parse(rawJson);
          nextSegment = parsed.segment || "";
        } catch (pe) {
          nextSegment = rawJson;
        }
      }
    } catch (err) {
      console.error("Inference fetch error:", err);
      if (statusElem) statusElem.innerText = "RECONNECTING PIPELINE...";
      await new Promise(r => setTimeout(r, 2000));
      await initClient();
      continue;
    }

    if (nextSegment && nextSegment.trim().length > 5) {
      fullManuscriptContext = (fullManuscriptContext + " " + nextSegment).slice(-500);
      await streamNewParagraph(nextSegment, paragraphCounter === 1);
      paragraphCounter++;
    } else {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  runInfiniteManuscriptLoop();
});
