
export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  GENERATING_STORY = 'GENERATING_STORY',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface Universe {
  id: string;
  name: string;
  description: string;
  promptModifier: string;
  icon: string;
  maleVoice: string;
  femaleVoice: string;
}

export interface ExplorerData {
  imageUrl: string;
  name: string;
  backstory: string;
  stats: {
    strength: number;
    intelligence: number;
    luck: number;
    dimension: string;
  };
  gender: 'male' | 'female';
  audioUrl?: string;
}
