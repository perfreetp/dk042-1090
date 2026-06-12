import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ApiConfig, ApiGroup, InspectionResult, AlertRecord, InspectionReport, ApiStatus } from '@/types';
import {
  mockApiConfigs,
  mockApiGroups,
  mockInspectionResults,
  mockAlertRecords,
  mockDailyReport
} from '@/data/mock';

interface InspectionContextValue {
  apiGroups: ApiGroup[];
  apiConfigs: ApiConfig[];
  inspectionResults: InspectionResult[];
  alertRecords: AlertRecord[];
  dailyReport: InspectionReport;
  inspecting: boolean;
  runInspection: (apiId?: string) => Promise<void>;
  retryAlert: (alertId: string) => Promise<void>;
  updateAlertRemark: (alertId: string, remark: string) => void;
  updateApiConfig: (config: ApiConfig) => void;
  getApiById: (id: string) => ApiConfig | undefined;
}

const InspectionContext = createContext<InspectionContextValue | null>(null);

export const InspectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiGroups] = useState<ApiGroup[]>(mockApiGroups);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>(mockApiConfigs);
  const [inspectionResults, setInspectionResults] = useState<InspectionResult[]>(mockInspectionResults);
  const [alertRecords, setAlertRecords] = useState<AlertRecord[]>(mockAlertRecords);
  const [dailyReport, setDailyReport] = useState<InspectionReport>(mockDailyReport);
  const [inspecting, setInspecting] = useState(false);

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

  const runInspection = useCallback(async (apiId?: string) => {
    setInspecting(true);
    console.log('[Inspection] Starting inspection', apiId ? `for API: ${apiId}` : 'for all APIs');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const targetApis = apiId ? apiConfigs.filter(a => a.id === apiId) : apiConfigs;
    const newResults: InspectionResult[] = [];
    const newAlerts: AlertRecord[] = [];

    targetApis.forEach(api => {
      const result = simulateInspection(api);
      newResults.push(result);

      if (result.status === 'failed' || result.status === 'warning') {
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
          consecutiveFailures: result.status === 'failed' ? api.consecutiveFailures + 1 : api.consecutiveFailures
        });
      }
    });

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
