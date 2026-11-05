// Six wheel events on the Rail, then a wait for the spring to settle (story 7.6).
// Evaluate with chrome-devtools-mcp's evaluate_script (`sourcePath`).
async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const host = document.querySelector('.scene-host');
  for (let at = 0; at < 6; at += 1) {
    host.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true, cancelable: true }));
    await sleep(60);
  }
  await sleep(13_000);
  return history.state;
}
