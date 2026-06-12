import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { ApiConfig, ApiGroup, InspectionResult, AlertRecord, InspectionReport, ApiStatus, ApiExpectedField, AlertType } from '@/types';
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
  runInspection: (target?: { apiId?: string; groupId?: string }) => Promise<InspectionResult[]>;
  retryAlert: (alertId: string) => Promise<void>;
  updateAlertRemark: (alertId: string, remark: string) => void;
  markAlertHandled: (alertId: string) => void;
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

  const runFieldValidations = useCallback((
    expectedFields: ApiExpectedField[] | undefined,
    isRequestFailed: boolean
  ): { fieldValidations: InspectionResult['fieldValidations']; allPassed: boolean } => {
    if (!expectedFields || expectedFields.length === 0) {
      return { fieldValidations: undefined, allPassed: true };
    }

    const fieldValidations: InspectionResult['fieldValidations'] = [];
    let allPassed = true;

    expectedFields.forEach(fieldRule => {
      if (!fieldRule.field) return;

      let passed: boolean;
      let actualValue: string;

      if (isRequestFailed) {
        passed = false;
        actualValue = 'N/A (request failed)';
      } else {
        const random = Math.random();
        if (fieldRule.operator === 'notEmpty') {
          passed = random < 0.9;
          actualValue = passed ? `mock_${Math.random().toString(36).slice(2, 8)}` : '';
        } else if (fieldRule.operator === 'equals') {
          passed = random < 0.85;
          actualValue = passed ? fieldRule.expectedValue : `wrong_${Math.floor(Math.random() * 100)}`;
        } else if (fieldRule.operator === 'contains') {
          passed = random < 0.85;
          actualValue = passed
            ? `prefix_${fieldRule.expectedValue}_suffix`
            : `value_without_expected_${Math.floor(Math.random() * 100)}`;
        } else if (fieldRule.operator === 'greaterThan') {
          const expectedNum = parseFloat(fieldRule.expectedValue) || 0;
          passed = random < 0.85;
          actualValue = passed
            ? (expectedNum + Math.random() * 100).toFixed(2)
            : (expectedNum - Math.random() * 10 - 1).toFixed(2);
        } else if (fieldRule.operator === 'lessThan') {
          const expectedNum = parseFloat(fieldRule.expectedValue) || 100;
          passed = random < 0.85;
          actualValue = passed
            ? (expectedNum - Math.random() * 10 - 1).toFixed(2)
            : (expectedNum + Math.random() * 100).toFixed(2);
        } else {
          passed = true;
          actualValue = fieldRule.expectedValue;
        }
      }

      if (!passed) allPassed = false;

      const expectedDisplay = fieldRule.operator === 'notEmpty'
        ? 'not empty'
        : fieldRule.operator === 'equals'
          ? fieldRule.expectedValue
          : fieldRule.operator === 'contains'
            ? `contains "${fieldRule.expectedValue}"`
            : fieldRule.operator === 'greaterThan'
              ? `> ${fieldRule.expectedValue}`
              : `< ${fieldRule.expectedValue}`;

      fieldValidations.push({
        field: fieldRule.field,
        passed,
        expected: expectedDisplay,
        actual: actualValue
      });
    });

    return { fieldValidations, allPassed };
  }, []);

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

    const isRequestFailed = status === 'failed' || actualStatusCode !== api.expectedStatusCode;
    const { fieldValidations, allPassed } = runFieldValidations(api.expectedFields, isRequestFailed);

    if (!isRequestFailed && fieldValidations && !allPassed) {
      status = 'warning';
      errorMessage = '部分字段校验未通过';
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
      fieldValidations
    };
  }, [runFieldValidations]);

  const runInspection = useCallback(async (
    target?: { apiId?: string; groupId?: string }
  ): Promise<InspectionResult[]> => {
    const { apiId, groupId } = target || {};
    setInspecting(true);

    let scopeLog = 'for all APIs';
    if (apiId) scopeLog = `for API: ${apiId}`;
    else if (groupId) scopeLog = `for group: ${groupId}`;
    console.log('[Inspection] Starting inspection', scopeLog);

    await new Promise(resolve => setTimeout(resolve, 1000));

    let targetApis: ApiConfig[];
    if (apiId) {
      targetApis = apiConfigs.filter(a => a.id === apiId);
    } else if (groupId) {
      targetApis = apiConfigs.filter(a => a.groupId === groupId);
    } else {
      targetApis = apiConfigs;
    }

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
        let alertType: AlertType = 'timeout';
        if (result.actualStatusCode !== result.statusCode) {
          alertType = 'status_code';
        } else if (result.fieldValidations && result.fieldValidations.some(f => !f.passed)) {
          alertType = 'field_mismatch';
        } else if (result.duration > 2000) {
          alertType = 'timeout';
        }
        if ((apiConfig?.consecutiveFailures || 0) >= 3) {
          alertType = 'consecutive_failures';
        }
        const errorMsg = result.errorMessage || '响应时间超过阈值';
        newAlerts.push({
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          apiId: api.id,
          apiName: api.name,
          apiUrl: api.url,
          groupName: api.groupName,
          type: alertType,
          message: errorMsg,
          status: result.status,
          errorMessage: errorMsg,
          duration: result.duration,
          checkedAt: result.checkedAt,
          triggeredAt: result.checkedAt,
          consecutiveFailures: apiConfig?.consecutiveFailures || 0,
          handled: false
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

      const allResults = !groupId
        ? newResults
        : [...newResults, ...dailyReport.results.filter(r => !newResults.find(nr => nr.apiId === r.apiId))];

      const totalCount = allResults.length || 1;
      const totalSuccess = allResults.filter(r => r.status === 'success').length;

      setDailyReport(prev => ({
        id: `report-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        totalApis: totalCount,
        successCount: totalSuccess,
        failedCount: allResults.filter(r => r.status === 'failed').length,
        warningCount: allResults.filter(r => r.status === 'warning').length,
        successRate: Number(((totalSuccess / totalCount) * 100).toFixed(1)),
        avgDuration: Math.round(allResults.reduce((s, r) => s + r.duration, 0) / totalCount),
        businessLine: '全部业务线',
        results: allResults,
        generatedAt: new Date().toISOString()
      }));
    }

    console.log('[Inspection] Completed', newResults.length, 'results');
    setInspecting(false);
    return newResults;
  }, [apiConfigs, simulateInspection, dailyReport.results]);

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

  const markAlertHandled = useCallback((alertId: string) => {
    console.log('[Inspection] Marking alert as handled:', alertId);
    setAlertRecords(prev => prev.map(a =>
      a.id === alertId ? { ...a, handled: true, handledAt: new Date().toISOString() } : a
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
        markAlertHandled,
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
