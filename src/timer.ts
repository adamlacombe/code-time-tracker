import * as vscode from 'vscode';
import { TimerState } from './interfaces';

export class TimerOperations {
  private timer: NodeJS.Timeout | null = null;
  private inactivityTimeout: NodeJS.Timeout | null = null;
  private inactivityTimeoutSeconds: number = 60;
  private elapsedSeconds: number;
  private timerState: TimerState[];

  constructor(inactivityTimeoutSeconds: number, initialElapsedSeconds: number, initialTimerState: TimerState[]) {
    this.inactivityTimeoutSeconds = inactivityTimeoutSeconds;
    this.elapsedSeconds = initialElapsedSeconds;
    this.timerState = initialTimerState;
  }

  setInactivityTimeoutSeconds(inactivityTimeoutSeconds: number) {
    this.inactivityTimeoutSeconds = inactivityTimeoutSeconds;
  }

  resetTimer(context: vscode.ExtensionContext, statusBarItem: vscode.StatusBarItem) {
    this.elapsedSeconds = 0;
    this.startTimer(context, statusBarItem);
  }

  startTimer(context: vscode.ExtensionContext, statusBarItem: vscode.StatusBarItem) {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this.elapsedSeconds++;
      this.timerState[0].seconds = this.elapsedSeconds;

      statusBarItem.text = `Elapsed Time: ${this.elapsedSeconds}s`;
    }, 1000);
  }

  resetInactivityTimeout(context: vscode.ExtensionContext, statusBarItem: vscode.StatusBarItem) {
    if (!this.timer) {
      this.startTimer(context, statusBarItem);
    }

    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }

    this.inactivityTimeout = setTimeout(() => {
      vscode.window.showInformationMessage(`No activity for ${this.inactivityTimeoutSeconds} seconds, pausing timer.`);
      this.pauseTimer();
    }, this.inactivityTimeoutSeconds * 1000);
  }

  pauseTimer() {
    clearInterval(this.timer || undefined);
    this.timer = null;
  }

  updateFileSeconds(filePath: string) {
    if (!this.timerState[0]?.files) return;

    const existingFile = this.timerState[0].files.find(file => file.path === filePath);

    if (existingFile) {
      existingFile.seconds++;
    } else {
      this.timerState[0].files.push({
        path: filePath,
        seconds: 1
      });
    }
  }

  clearHistory() {
    this.timerState = [this.timerState[0]];
    return this.timerState;
  }
}

