const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwgP4jhdt0rom8RB3r3yvc42Xg-kgB4FgJ2DQTVOFHTir1g6mVFjCAMW5BB0dpbFbSARg/exec';

export const getWebAppUrl = () => WEB_APP_URL;

export const fetchSummaryAndScraps = async (date: string) => {
  const response = await fetch(`${WEB_APP_URL}?action=getData&date=${date}`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const fetchRangeData = async (startDate: string, endDate: string) => {
  const response = await fetch(`${WEB_APP_URL}?action=getRangeData&startDate=${startDate}&endDate=${endDate}`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const saveProductionSummary = async (data: any) => {
  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'saveSummary',
      ...data
    })
  });
  
  return response.json();
};

export const saveScrapDetails = async (data: any) => {
  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'saveScrap',
      ...data
    })
  });
  
  return response.json();
};
