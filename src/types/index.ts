export type ApiStatus = 'success' | 'failed' | 'warning' | 'pending' | 'unknown';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiParam {
  key: string;
  value: string;
  type: 'query' | 'body' | 'header';
}

export interface ApiExpectedField {
  field: string;
  expectedValue: string;
  operator: 'equals' | 'contains' | 'notEmpty' | 'greaterThan' | 'lessThan';
}

export interface ApiConfig {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  groupId: string;
  groupName: string;
  description?: string;
  params?: ApiParam[];
  expectedStatusCode: number;
  expectedFields?: ApiExpectedField[];
  timeout?: number;
  createdAt: string;
  lastCheckedAt?: string;
  lastStatus?: ApiStatus;
  lastDuration?: number;
  consecutiveFailures: number;
}

export interface ApiGroup {
  id: string;
  name: string;
  description?: string;
  businessLine: string;
  apiCount: number;
  successRate?: number;
}

export interface InspectionResult {
  id: string;
  apiId: string;
  apiName: string;
  apiUrl: string;
  statusCode: number;
  actualStatusCode: number;
  duration: number;
  status: ApiStatus;
  responseData?: string;
  errorMessage?: string;
  fieldValidations?: {
    field: string;
    passed: boolean;
    expected: string;
    actual: string;
  }[];
  checkedAt: string;
  remark?: string;
}

export interface InspectionReport {
  id: string;
  date: string;
  totalApis: number;
  successCount: number;
  failedCount: number;
  warningCount: number;
  successRate: number;
  avgDuration: number;
  businessLine: string;
  results: InspectionResult[];
  generatedAt: string;
}

export interface AlertRecord {
  id: string;
  apiId: string;
  apiName: string;
  apiUrl: string;
  groupName: string;
  status: ApiStatus;
  errorMessage: string;
  duration: number;
  checkedAt: string;
  remark?: string;
  consecutiveFailures: number;
  isRetrying?: boolean;
}
