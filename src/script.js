let currentTab = null;
let count = 0;
let isRunning = false;
let timeoutFunc = null;
let shuffledLinks = [];
let wakeLock = null;

const timerInput = document.getElementById('timer');
const valDisplay = document.getElementById('val');
const limitInput = document.getElementById('limit');
const statusText = document.getElementById('status');

timerInput.oninput = () => valDisplay.innerText = timerInput.value;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock is active');
    }
  } catch (err) {
    console.error(`${err.name}, ${err.message}`);
  }
}

function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().then(() => {
      wakeLock = null;
      console.log('Wake Lock released');
    });
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function loadAndShuffle() {
  try {
    const response = await fetch('src/links.txt');
    if (!response.ok) throw new Error('links.txt not found');
    const text = await response.text();

    let links = text.split('\n')
      .map(link => link.replace(/[^\x20-\x7E]/g, '').trim())
      .filter(link => link.startsWith('http'));

    if (links.length === 0) throw new Error('links.txt empty or invalid');

    shuffledLinks = shuffleArray(links);
    return true;
  } catch (err) {
    statusText.innerText = "Error: " + err.message;
    return false;
  }
}

function runAutomation() {
  if (!isRunning) return;
  if (currentTab) currentTab.close();
  window.focus();

  const max = Math.min(parseInt(limitInput.value), 20);

  if (count >= max || count >= shuffledLinks.length) {
    statusText.innerText = `${count} links have been opened`;
    isRunning = false;
    releaseWakeLock();
    return;
  }

  statusText.innerText = "Returning home... preparation for next link";
  
  setTimeout(() => {
    if (!isRunning) return;

    const nextLink = shuffledLinks[count];
    statusText.innerText = `Opening (${count + 1}/${Math.min(max, shuffledLinks.length)}):\n${nextLink.substring(0, 40)}...`;

    currentTab = window.open(nextLink, '_blank');
    count++;
    
    timeoutFunc = setTimeout(runAutomation, timerInput.value * 1000);
  }, 1000);
}

document.getElementById('start').onclick = async () => {
  if (isRunning) return;

  statusText.innerText = "Loading...";
  const success = await loadAndShuffle();

  if (success) {
    await requestWakeLock();
    count = 0;
    isRunning = true;
    runAutomation();
  }
};

document.getElementById('stop').onclick = () => {
  isRunning = false;
  clearTimeout(timeoutFunc);
  releaseWakeLock();
  if (currentTab) currentTab.close();
  statusText.innerText = "Stopped";
};
