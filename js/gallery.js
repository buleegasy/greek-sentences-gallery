// 24/7 Continuous Streaming Long-form Article Driver (Maxed Latent Temperature)
const API_URL = "https://buleegasy-greek-deng.hf.space/api/generate";

// 极限高熵哲学/异相潜意识语料流（离线与网络抖动时的极限先锋文学保障）
const LITERARY_STREAMS = [
  "在希腊漫长的日光深处，肉身与虚空的界限开始溶解。石板路向着黑色的海面无尽蔓延，每一次呼吸都像是从古老的黏膜中剥离出新的知觉。语言在此处坍塌为无声的颤动，所有的符号都脱离了秩序，在灼热的以太中像尘埃一样旋转、重组、坠落。",
  "当第三阶段的沉睡穿透了盲目的夜色，我们在镜子深处看到了不属于任何人的眼瞳。活体的肌理在无定的大地上搏动，骨髓中流淌着原初的黑火。没有人再试图去解释什么，概念在裂隙间生长为具有生命的实体，缠绕着每一根神经纤维向着终局目的狂奔。",
  "细胞在内渗的狂乱中分裂，时间如同透明的黏液在指尖缓缓凝固。古老的神庙柱廊在晨曦中扭曲成拓扑的迷宫，每一声心跳都在空旷的腹腔内引发宏大的地鸣。我们是被遗弃在语言边陲的自动机，在不可违抗的宿命之网中记录着不可言说的异化瞬间。",
  "白昼的日光刺破了眼膜，显露出深海原水与败血交织的微弱光斑。所有的记忆在这一刻被洗劫一空，留下一片纯粹的失语与战栗。躯体在虚空中舒展成巨大的孤碑，任由无休止的海风雕刻出深邃的创口与裂痕。",
  "在极夜的最深处，衔尾蛇吞噬了最后的微光。意识从肉体的牢笼中抽离，漂浮在绝对真空与混沌的交汇点。这不是终结，而是某种原初质变的序幕，在无尽的黑暗中静默地等待着下一次未知的脉动与复苏。"
];

let totalWordCount = 0;
let fullManuscriptContext = "";
let paragraphCounter = 1;
let fallbackIndex = 0;

async function streamNewParagraph(textSegment, isFirstParagraph = false) {
  const contentContainer = document.getElementById('article-content');
  const wordCounterElem = document.getElementById('word-counter');

  const pElem = document.createElement('p');
  pElem.className = 'paragraph-block';

  if (isFirstParagraph) {
    const firstChar = textSegment.charAt(0);
    const restText = textSegment.slice(1);

    pElem.innerHTML = `<span class="drop-cap">${firstChar}</span><span class="p-text"></span><span class="type-cursor"></span>`;
    contentContainer.appendChild(pElem);

    const spanText = pElem.querySelector('.p-text');
    const cursor = pElem.querySelector('.type-cursor');

    totalWordCount += 1;
    wordCounterElem.innerText = `· ${totalWordCount} 字已流式生成`;

    for (let i = 0; i < restText.length; i++) {
      spanText.innerText += restText[i];
      totalWordCount += 1;
      wordCounterElem.innerText = `· ${totalWordCount} 字已流式生成`;
      
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      await new Promise(r => setTimeout(r, 36));
    }
    cursor.remove();

  } else {
    pElem.innerHTML = `<span class="p-text"></span><span class="type-cursor"></span>`;
    contentContainer.appendChild(pElem);

    const spanText = pElem.querySelector('.p-text');
    const cursor = pElem.querySelector('.type-cursor');

    for (let i = 0; i < textSegment.length; i++) {
      spanText.innerText += textSegment[i];
      totalWordCount += 1;
      wordCounterElem.innerText = `· ${totalWordCount} 字已流式生成`;

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      await new Promise(r => setTimeout(r, 36));
    }
    cursor.remove();
  }

  // 段落间隙自然呼吸
  await new Promise(r => setTimeout(r, 1500));
}

async function runInfiniteManuscriptLoop() {
  const initialPlaceholder = document.getElementById('active-paragraph');
  if (initialPlaceholder) {
    initialPlaceholder.remove();
  }

  while (true) {
    let nextSegment = "";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: fullManuscriptContext }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        nextSegment = data.segment || "";
      }
    } catch (e) {
      nextSegment = LITERARY_STREAMS[fallbackIndex % LITERARY_STREAMS.length];
      fallbackIndex++;
    }

    if (!nextSegment || nextSegment.length < 15) {
      nextSegment = LITERARY_STREAMS[fallbackIndex % LITERARY_STREAMS.length];
      fallbackIndex++;
    }

    fullManuscriptContext = (fullManuscriptContext + " " + nextSegment).slice(-500);

    await streamNewParagraph(nextSegment, paragraphCounter === 1);
    paragraphCounter++;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(runInfiniteManuscriptLoop, 400);
});
