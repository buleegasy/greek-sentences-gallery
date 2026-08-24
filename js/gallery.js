// Local & Remote Dynamic 24/7 Generative Art Gallery Driver

const GREEK_WORDS = [
  { lemma: "λόγος", translit: "logos", definition: "word, thought & reason", content: "在静谧的时刻，微风穿过古老的柱廊，所有的语言在此凝固为永恒的思考。文字超越了原本的载体，在晨光与落日的交替间，记录下不可言说的痕迹与漫长的追寻。" },
  { lemma: "ἀγάπη", translit: "agape", definition: "universal benevolence & affection", content: "当光线透过斑驳的橄榄树叶洒在地面上，温柔的情感便如同无声的细雨渗入泥土。每一个生命都在默默回应着这片土地最初的呼唤，不求回报地流淌。" },
  { lemma: "σοφία", translit: "sophia", definition: "deep wisdom & insight", content: "古老的石碑在时间的冲刷下逐渐模糊，但那些沉静的思想依然在岁月中回荡。我们探寻未知的脚步从未停歇，在漫长的旅途中寻找内心的安宁与真理。" },
  { lemma: "ἄνεμος", translit: "anemos", definition: "breath of wind & spirit", content: "海浪一次又一次拍打着荒凉的岸礁，带走白昼的喧嚣，留下夜空的辽阔与深邃。风从远方的海面吹来，诉说着未曾被凡人书写过的古老篇章。" },
  { lemma: "φῶς", translit: "phos", definition: "radiance & clear daylight", content: "清晨的第一缕阳光穿破云层的阴翳，照亮了沉睡已久的村落与山脊。万物在苏醒的呼吸中舒展，所有的阴影都在澄澈的光芒中消退散尽。" },
  { lemma: "αἷμα", translit: "haima", definition: "blood & circulation of life", content: "脉管在深处微弱地跳动，将温度输送到冰冷的指尖。生命的循环从未停止，在寂静的黑夜中维持着微弱而坚韧的呼吸，等待破晓的到来。" },
  { lemma: "ψυχή", translit: "psyche", definition: "breath of soul & ethereal spirit", content: "若灵魂有翅膀，它必将在无垠的夜色中掠过海面。肉身的牢笼终会消解，唯有纯粹的知觉在星辰之间漂浮，与无尽的宇宙融为一体。" },
  { lemma: "ἔρεβος", translit: "erebos", definition: "primordial darkness & shadow", content: "在一切光明诞生之前，原初的幽冥曾笼罩着大地。黑暗并非终结，而是万物孕育的子宫，在绝对的静默中等待第一声心跳。" }
];

let exhibitIndex = 1;
let currentWordIndex = 0;

async function streamTypewriter(fullText, metaData) {
  const dropCapElem = document.getElementById('drop-cap-char');
  const streamElem = document.getElementById('text-stream');
  const watermarkElem = document.getElementById('watermark-num');
  const exhibitLabelElem = document.getElementById('exhibit-label');
  const titleElem = document.getElementById('chapter-title');
  const subtitleElem = document.getElementById('chapter-subtitle');
  const cursorElem = document.getElementById('type-cursor');
  const timerDisplay = document.getElementById('timer-display');

  // 更新左侧元数据
  const exhibitStr = String(exhibitIndex).padStart(2, '0');
  watermarkElem.innerText = exhibitStr;
  exhibitLabelElem.innerText = `Exhibit No. ${exhibitStr}`;
  titleElem.innerText = metaData.lemma;
  subtitleElem.innerText = `${metaData.translit} · ${metaData.definition}`;

  // 提取首字用于 Drop Cap
  const firstChar = fullText.charAt(0);
  const remainingText = fullText.slice(1);
  
  dropCapElem.innerText = firstChar;
  streamElem.innerText = "";
  if (cursorElem) cursorElem.style.display = "inline-block";

  // 逐字优雅流式打字输出
  for (let i = 0; i < remainingText.length; i++) {
    streamElem.innerText += remainingText[i];
    await new Promise(r => setTimeout(r, 40));
  }
  if (cursorElem) cursorElem.style.display = "none";

  // 展厅驻留阅读 6 秒倒计时
  for (let t = 6; t > 0; t--) {
    if (timerDisplay) timerDisplay.innerText = `NEXT EXHIBIT IN ${t}S`;
    await new Promise(r => setTimeout(r, 1000));
  }

  if (timerDisplay) timerDisplay.innerText = "REFLECTING...";
}

async function runGenerativeLoop() {
  while (true) {
    let data;
    
    // 尝试拉取线上云端 API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch("https://buleegasy-greek-deng.hf.space/api/generate", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        data = await response.json();
      } else {
        throw new Error("fallback");
      }
    } catch (e) {
      // 本地高熵动态流转
      data = GREEK_WORDS[currentWordIndex % GREEK_WORDS.length];
      currentWordIndex++;
    }

    // 优雅淡出
    const frame = document.getElementById('editorial-frame');
    if (frame) {
      frame.classList.add('fade-out');
      await new Promise(r => setTimeout(r, 600));
      frame.classList.remove('fade-out');
      frame.classList.add('fade-in');
    }

    // 启动流式渲染
    await streamTypewriter(data.content, data);
    exhibitIndex++;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 立即启动自激活动态循环
  setTimeout(runGenerativeLoop, 300);
});
