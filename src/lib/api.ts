/// <reference types="vite/client" />

const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwgP4jhdt0rom8RB3r3yvc42Xg-kgB4FgJ2DQTVOFHTir1g6mVFjCAMW5BB0dpbFbSARg/exec';

export const getWebAppUrl = () => WEB_APP_URL;

// Local storage keys for fallback
const LS_TARGETS = 'mri_targets_fallback';
const LS_SUMMARY = 'mri_summary_fallback';
const LS_SCRAPS = 'mri_scraps_fallback';

const handleErrorAsMock = async (error: any, operation: string, fallbackData: any) => {
  console.warn(`[API] ${operation} failed, falling back to local storage. Error:`, error);
  return fallbackData;
};

export const fetchSummaryAndScraps = async (date: string) => {
  try {
    const response = await fetch(`${WEB_APP_URL}?action=getData&date=${date}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network response was not ok: ${response.status} ${errorText.substring(0, 50)}...`);
    }
    return await response.json();
  } catch (error) {
    return handleErrorAsMock(error, 'fetchSummaryAndScraps', { summaries: [], scraps: [] });
  }
};

export const fetchRangeData = async (startDate: string, endDate: string) => {
  try {
    const response = await fetch(`${WEB_APP_URL}?action=getRangeData&startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network response was not ok: ${response.status} ${errorText.substring(0, 50)}...`);
    }
    return await response.json();
  } catch (error) {
    const summaries = JSON.parse(localStorage.getItem(LS_SUMMARY) || '[]');
    const scraps = JSON.parse(localStorage.getItem(LS_SCRAPS) || '[]');
    // Filter local data explicitly for range
    const filterByRange = (item: any) => item.date >= startDate && item.date <= endDate;
    return handleErrorAsMock(error, 'fetchRangeData', {
      summaries: summaries.filter(filterByRange),
      scraps: scraps.filter(filterByRange)
    });
  }
};

export const fetchTargets = async () => {
  try {
    const response = await fetch(`${WEB_APP_URL}?action=getTargets`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network response was not ok: ${response.status} ${errorText.substring(0, 50)}...`);
    }
    return await response.json();
  } catch (error) {
    const localTargets = JSON.parse(localStorage.getItem(LS_TARGETS) || '[]');
    return handleErrorAsMock(error, 'fetchTargets', { targets: localTargets });
  }
};

export const saveProductionSummary = async (data: any) => {
  try {
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
    if (!response.ok) throw new Error('Failed to save summary.');
    return await response.json();
  } catch (err) {
    const summaries = JSON.parse(localStorage.getItem(LS_SUMMARY) || '[]');
    summaries.push({ ...data, timestamp: new Date().toISOString() });
    localStorage.setItem(LS_SUMMARY, JSON.stringify(summaries));
    return handleErrorAsMock(err, 'saveProductionSummary', { success: true });
  }
};

export const saveScrapDetails = async (data: any) => {
  try {
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
    if (!response.ok) throw new Error('Failed to save scrap details.');
    return await response.json();
  } catch (err) {
    const scraps = JSON.parse(localStorage.getItem(LS_SCRAPS) || '[]');
    scraps.push({ ...data, timestamp: new Date().toISOString() });
    localStorage.setItem(LS_SCRAPS, JSON.stringify(scraps));
    return handleErrorAsMock(err, 'saveScrapDetails', { success: true });
  }
};

export const saveTargets = async (targets: any) => {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'saveTargets',
        targets: targets
      })
    });
    if (!response.ok) throw new Error('Failed to save targets.');
    return await response.json();
  } catch (err) {
    const targetsArray = Object.keys(targets).map((key) => ({
      category: key,
      value: targets[key].value,
      period: targets[key].period
    }));
    localStorage.setItem(LS_TARGETS, JSON.stringify(targetsArray));
    return handleErrorAsMock(err, 'saveTargets', { success: true });
  }
};

export const updateScrapReason = async (timestamp: string, newReason: string) => {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'updateScrapReason',
        timestamp,
        reason: newReason
      })
    });
    if (!response.ok) throw new Error('Failed to update scrap reason.');
    return await response.json();
  } catch (err) {
    const scraps = JSON.parse(localStorage.getItem(LS_SCRAPS) || '[]');
    const updatedScraps = scraps.map((s: any) => 
      s.timestamp === timestamp ? { ...s, reason: newReason } : s
    );
    localStorage.setItem(LS_SCRAPS, JSON.stringify(updatedScraps));
    return handleErrorAsMock(err, 'updateScrapReason', { success: true });
  }
};

export const updateScrapFull = async (data: any) => {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'updateScrapFull',
        ...data
      })
    });
    if (!response.ok) throw new Error('Failed to update scrap data.');
    return await response.json();
  } catch (err) {
    const scraps = JSON.parse(localStorage.getItem(LS_SCRAPS) || '[]');
    const updatedScraps = scraps.map((s: any) => 
      s.timestamp === data.timestamp ? { ...s, ...data } : s
    );
    localStorage.setItem(LS_SCRAPS, JSON.stringify(updatedScraps));
    return handleErrorAsMock(err, 'updateScrapFull', { success: true });
  }
};

export const deleteScrap = async (timestamp: string) => {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'deleteScrap',
        timestamp
      })
    });
    if (!response.ok) throw new Error('Failed to delete scrap.');
    return await response.json();
  } catch (err) {
    const scraps = JSON.parse(localStorage.getItem(LS_SCRAPS) || '[]').filter((s: any) => s.timestamp !== timestamp);
    localStorage.setItem(LS_SCRAPS, JSON.stringify(scraps));
    return handleErrorAsMock(err, 'deleteScrap', { success: true });
  }
};

export const fetchUsers = async () => {
  try {
    const response = await fetch(`${WEB_APP_URL}?action=getUsers`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data;
  } catch (err) {
    return handleErrorAsMock(err, 'fetchUsers', { users: [] });
  }
};

export const saveUser = async (user: any) => {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action: 'saveUser', ...user }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (err) {
    return handleErrorAsMock(err, 'saveUser', { success: true });
  }
};

export const fetchScrapSettings = async () => {
  try {
    const response = await fetch(`${WEB_APP_URL}?action=getScrapSettings`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (err) {
    const scrapPicRequirements = JSON.parse(localStorage.getItem('mri_scrap_pic_requirements_fallback') || '{}');
    const materialReasons = JSON.parse(localStorage.getItem('mri_material_reasons_fallback') || '{}');
    return handleErrorAsMock(err, 'fetchScrapSettings', { scrapPicRequirements, materialReasons });
  }
};

export const saveScrapSettings = async (settings: any) => {
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action: 'saveScrapSettings', settings }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (err) {
    if (settings.scrapPicRequirements) {
      localStorage.setItem('mri_scrap_pic_requirements_fallback', JSON.stringify(settings.scrapPicRequirements));
    }
    if (settings.materialReasons) {
      localStorage.setItem('mri_material_reasons_fallback', JSON.stringify(settings.materialReasons));
    }
    return handleErrorAsMock(err, 'saveScrapSettings', { success: true });
  }
};

