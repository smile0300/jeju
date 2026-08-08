async function checkApi() {
  const url = 'https://jeju-live.pages.dev/api/public-data?endpoint=https%3A%2F%2Fapis.data.go.kr%2F1360000%2FWthrWrnInfoService%2FgetWthrWrnMsg&numOfRows=10&pageNo=1&dataType=JSON&stnId=184';
  
  // Since jeju-live.pages.dev DNS is not resolving locally in the environment,
  // I need to use the actual KMA endpoint directly using a dummy service key if possible,
  // or just run it via the local jeju-live server if one is running?
  // Wait, in previous step jeju-live.pages.dev failed with ENOTFOUND.
  // Is there a local server running?
}
