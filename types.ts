
export interface AnalysisFile {
  file: File;
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  base64?: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum AnalysisMode {
  DIAGNOSTIC = 'DIAGNOSTIC',
  OBSERVATION = 'OBSERVATION'
}
