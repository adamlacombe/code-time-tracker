import * as vscode from 'vscode';
import { TimerState } from './interfaces';

export class StateOperations {
  private context: vscode.ExtensionContext;
  private timerState: TimerState[];

  constructor(context: vscode.ExtensionContext, initialTimerState: TimerState[]) {
    this.context = context;
    this.timerState = initialTimerState;
  }

  updateAndSaveTimerState(newState: TimerState) {
    this.timerState.unshift(newState);
    this.updateWorkspaceState();
  }

  updateWorkspaceState() {
    this.context.workspaceState.update('timerState', this.timerState);
  }

  setTimerState(state: TimerState[]) {
    this.timerState = state;
    this.updateWorkspaceState();
  }
}
