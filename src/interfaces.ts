export interface TimerState {
  seconds: number;
  commit?: {
    sha?: string;
    message?: string;
    author?: string;
    date?: string;
    files: {
      path: string;
      type: 'edit' | 'create' | 'delete' | 'untracked';
    }[];
  };
  files: {
    path: string;
    seconds: number;
  }[];
}
