import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { ApiConfig, ApiGroup, InspectionResult, AlertRecord, InspectionReport, ApiStatus } from '@/types';
import {
  mockApiConfigs,
  mockApiGroups,
  mockInspectionResults,
  mockAlertRecords,
  mockDailyReport
} from '@/data/mock';

const STORAGE_KEYS = {
  API_CONFIGS: 'api_inspection_configs',
  INSPECTION_RESULTS: 'api_inspection_results',
  ALERT_RECORDS: 'api_inspection_alerts',
  DAILY_REPORT: 'api_inspection_report'
};

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const data = Taro.getStorageSync(key);
    if (data) {
      return JSON.parse(data) as T;
    }
  } catch (e) {
    console.error('[Storage] Failed to load', key, e);
  }
  return defaultValue;
};

const saveToStorage = <T,>(key: string, data: T): void => {
  try {
    Taro.setStorageSync(key, JSON.stringify(data));
  } catch (e) {
    console.error('[Storage] Failed to save', key, e);
  }
};

interface InspectionContextValue {
  apiGroups: ApiGroup[];
  apiConfigs: ApiConfig[];
  inspectionResults: InspectionResult[];
  alertRecords: AlertRecord[];
  dailyReport: InspectionReport;
  inspecting: boolean;
  runInspection: (apiId?: string) => Promise<InspectionResult[]>;
  retryAlert: (alertId: string) => Promise<void>;
  updateAlertRemark: (alertId: string, remark: string) => void;
  updateApiConfig: (config: ApiConfig) => void;
  addApiConfig: (config: Omit<ApiConfig, 'id' | 'createdAt' | 'consecutiveFailures'>) => void;
  deleteApiConfig: (apiId: string) => void;
  getApiById: (id: string) => ApiConfig | undefined;
}

const InspectionContext = createContext<InspectionContextValue | null>(null);

export const InspectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiGroups] = useState<ApiGroup[]>(mockApiGroups);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>(() =>
    loadFromStorage(STORAGE_KEYS.API_CONFIGS, mockApiConfigs)
  );
  const [inspectionResults, setInspectionResults] = useState<InspectionResult[]>(() =>
    loadFromStorage(STORAGE_KEYS.INSPECTION_RESULTS, mockInspectionResults)
  );
  const [alertRecords, setAlertRecords] = useState<AlertRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.ALERT_RECORDS, mockAlertRecords)
  );
  const [dailyReport, setDailyReport] = useState<InspectionReport>(() =>
    loadFromStorage(STORAGE_KEYS.DAILY_REPORT, mockDailyReport)
  );
  const [inspecting, setInspecting] = useState(false);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.API_CONFIGS, apiConfigs);
  }, [apiConfigs]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.INSPECTION_RESULTS, inspectionResults);
  }, [inspectionResults]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ALERT_RECORDS, alertRecords);
  }, [alertRecords]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DAILY_REPORT, dailyReport);
  }, [dailyReport]);

  const simulateInspection = useCallback((api: ApiConfig): InspectionResult => {
    const random = Math.random();
    let status: ApiStatus;
    let actualStatusCode: number;
    let errorMessage: string | undefined;
    let duration: number;

    if (api.consecutiveFailures >= 3) {
      status = 'failed';
      actualStatusCode = 500;
      errorMessage = '服务异常：连接超时或内部错误';
      duration = 3000 + Math.floor(Math.random() * 2000);
    } else if (random < 0.85) {
      status = 'success';
      actualStatusCode = api.expectedStatusCode;
      duration = 80 + Math.floor(Math.random() * 300);
    } else if (random < 0.95) {
      status = 'warning';
      actualStatusCode = api.expectedStatusCode;
      duration = 2000 + Math.floor(Math.random() * 1500);
    } else {
      status = 'failed';
      actualStatusCode = Math.random() > 0.5 ? 500 : 404;
      errorMessage = actualStatusCode === 500 ? 'Internal Server Error' : 'Resource Not Found';
      duration = 1500 + Math.floor(Math.random() * 2000);
    }

    return {
      id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      apiId: api.id,
      apiName: api.name,
      apiUrl: api.url,
      statusCode: api.expectedStatusCode,
      actualStatusCode,
      duration,
      status,
      errorMessage,
      checkedAt: new Date().toISOString(),
      fieldValidations: status === 'success' || status === 'warning' ? [
        { field: 'code', passed: true, expected: '0', actual: '0' }
      ] : undefined
    };
  }, []);

  const runInspection = useCallback(async (apiId?: string): Promise<InspectionResult[]> => {
    setInspecting(true);
    console.log('[Inspection] Starting inspection', apiId ? `for API: ${apiId}` : 'for all APIs');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const targetApis = apiId ? apiConfigs.filter(a => a.id === apiId) : apiConfigs;
    const newResults: InspectionResult[] = [];
    const newAlerts: AlertRecord[] = [];
    const updatedConfigs: ApiConfig[] = [...apiConfigs];

    targetApis.forEach(api => {
      const result = simulateInspection(api);
      newResults.push(result);

      const apiIndex = updatedConfigs.findIndex(a => a.id === api.id);
      if (apiIndex !== -1) {
        const newConsecutiveFailures = result.status === 'failed'
          ? api.consecutiveFailures + 1
          : (result.status === 'success' ? 0 : api.consecutiveFailures);

        updatedConfigs[apiIndex] = {
          ...updatedConfigs[apiIndex],
          lastStatus: result.status,
          lastDuration: result.duration,
          lastCheckedAt: result.checkedAt,
          consecutiveFailures: newConsecutiveFailures
        };
      }

      if (result.status === 'failed' || result.status === 'warning') {
        const apiConfig = updatedConfigs.find(a => a.id === api.id);
        newAlerts.push({
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          apiId: api.id,
          apiName: api.name,
          apiUrl: api.url,
          groupName: api.groupName,
          status: result.status,
          errorMessage: result.errorMessage || '响应时间超过阈值',
          duration: result.duration,
          checkedAt: result.checkedAt,
          consecutiveFailures: apiConfig?.consecutiveFailures || 0
        });
      }
    });

    setApiConfigs(updatedConfigs);
    setInspectionResults(prev => [...newResults, ...prev].slice(0, 50));
    setAlertRecords(prev => [...newAlerts, ...prev].slice(0, 30));

    if (!apiId) {
      const successCount = newResults.filter(r => r.status === 'success').length;
      const failedCount = newResults.filter(r => r.status === 'failed').length;
      const warningCount = newResults.filter(r => r.status === 'warning').length;
      const avgDuration = Math.round(newResults.reduce((s, r) => s + r.duration, 0) / newResults.length);

      setDailyReport({
        id: `report-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        totalApis: newResults.length,
        successCount,
        failedCount,
        warningCount,
        successRate: Number(((successCount / newResults.length) * 100).toFixed(1)),
        avgDuration,
        businessLine: '全部业务线',
        results: newResults,
        generatedAt: new Date().toISOString()
      });
    }

    console.log('[Inspection] Completed', newResults.length, 'results');
    setInspecting(false);
    return newResults;
  }, [apiConfigs, simulateInspection]);

  const retryAlert = useCallback(async (alertId: string) => {
    console.log('[Inspection] Retrying alert:', alertId);
    setAlertRecords(prev => prev.map(a =>
      a.id === alertId ? { ...a, isRetrying: true } : a
    ));

    await new Promise(resolve => setTimeout(resolve, 1500));

    const alert = alertRecords.find(a => a.id === alertId);
    if (alert) {
      const api = apiConfigs.find(a => a.id === alert.apiId);
      if (api) {
        const result = simulateInspection({ ...api, consecutiveFailures: 0 });
        setInspectionResults(prev => [result, ...prev]);

        const apiIndex = apiConfigs.findIndex(a => a.id === api.id);
        if (apiIndex !== -1) {
          const newConsecutiveFailures = result.status === 'failed'
            ? api.consecutiveFailures + 1
            : (result.status === 'success' ? 0 : api.consecutiveFailures);

          setApiConfigs(prev => {
            const next = [...prev];
            next[apiIndex] = {
              ...next[apiIndex],
              lastStatus: result.status,
              lastDuration: result.duration,
              lastCheckedAt: result.checkedAt,
              consecutiveFailures: newConsecutiveFailures
            };
            return next;
          });
        }

        if (result.status === 'success') {
          setAlertRecords(prev => prev.filter(a => a.id !== alertId));
        } else {
          setAlertRecords(prev => prev.map(a =>
            a.id === alertId ? { ...a, isRetrying: false, status: result.status } : a
          ));
        }
      }
    }
  }, [alertRecords, apiConfigs, simulateInspection]);

  const updateAlertRemark = useCallback((alertId: string, remark: string) => {
    console.log('[Inspection] Updating remark for alert:', alertId);
    setAlertRecords(prev => prev.map(a =>
      a.id === alertId ? { ...a, remark } : a
    ));
  }, []);

  const updateApiConfig = useCallback((config: ApiConfig) => {
    console.log('[Inspection] Updating API config:', config.id);
    setApiConfigs(prev => prev.map(a => a.id === config.id ? config : a));
  }, []);

  const addApiConfig = useCallback((config: Omit<ApiConfig, 'id' | 'createdAt' | 'consecutiveFailures'>) => {
    const newConfig: ApiConfig = {
      ...config,
      id: `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      consecutiveFailures: 0
    };
    console.log('[Inspection] Adding new API config:', newConfig.id);
    setApiConfigs(prev => [...prev, newConfig]);
  }, []);

  const deleteApiConfig = useCallback((apiId: string) => {
    console.log('[Inspection] Deleting API config:', apiId);
    setApiConfigs(prev => prev.filter(a => a.id !== apiId));
    setInspectionResults(prev => prev.filter(r => r.apiId !== apiId));
    setAlertRecords(prev => prev.filter(a => a.apiId !== apiId));
  }, []);

  const getApiById = useCallback((id: string) => {
    return apiConfigs.find(a => a.id === id);
  }, [apiConfigs]);

  return (
    <InspectionContext.Provider
      value={{
        apiGroups,
        apiConfigs,
        inspectionResults,
        alertRecords,
        dailyReport,
        inspecting,
        runInspection,
        retryAlert,
        updateAlertRemark,
        updateApiConfig,
        addApiConfig,
        deleteApiConfig,
        getApiById
      }}
    >
      {children}
    </InspectionContext.Provider>
  );
};

export const useInspection = (): InspectionContextValue => {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error('useInspection must be used within InspectionProvider');
  }
  return context;
};
