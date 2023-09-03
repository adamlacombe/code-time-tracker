import * as path from 'path';
import * as vscode from 'vscode';
import { GitOperations } from './git';
import { TimerState } from './interfaces';
import { StateOperations } from './state-manager';
import { TimerOperations } from './timer';

export function activate(context: vscode.ExtensionContext) {
  const workspacePath = vscode.workspace.workspaceFolders![0].uri.path;
  const gitPath = path.join(workspacePath, ".git");

  if (!gitPath) {
    vscode.window.showErrorMessage("No workspace is opened.");
    return;
  }

  const outputChannel = vscode.window.createOutputChannel(
    "code-time-tracker",
    "code-time-tracker-output",
  );
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine("Extension activated.");

  let timerState: TimerState[] = context.workspaceState.get<TimerState[]>('timerState', []);
  let elapsedSeconds = timerState.length ? timerState[0].seconds : 0;

  const inactivityTimeoutSeconds = vscode.workspace.getConfiguration('timer').get<number>('inactivityTimeoutSeconds');
  outputChannel.appendLine(`Setting inactivityTimeoutSeconds: ${inactivityTimeoutSeconds}`);

  const gitOps = new GitOperations(gitPath);
  const timerOps = new TimerOperations(inactivityTimeoutSeconds || 60, elapsedSeconds, timerState);
  const stateOps = new StateOperations(context, timerState);

  const timerStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  timerStatusBarItem.text = `Elapsed Time: ${elapsedSeconds}s`;
  timerStatusBarItem.show();
  context.subscriptions.push(timerStatusBarItem);

  timerOps.startTimer(context, timerStatusBarItem);

  context.subscriptions.push(vscode.commands.registerCommand("code-time-tracker.pauseTimer", () => {
    outputChannel.appendLine(`Pausing timer.`);
    vscode.window.showInformationMessage('Pausing timer.');
    timerOps.pauseTimer();
  }));

  context.subscriptions.push(vscode.commands.registerCommand("code-time-tracker.clearHistory", () => {
    outputChannel.appendLine(`Clearing history.`);
    const state = timerOps.clearHistory();
    stateOps.setTimerState(state);
    vscode.commands.executeCommand('code-time-tracker.showData');
  }));

  // Register the showData command
  registerShowDataCommand(context);

  // File watchers and event handlers
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.uri.scheme !== 'file') {
      return;
    }

    outputChannel.appendLine(`File changed: ${event.document.fileName}`);
    outputChannel.appendLine(`Uri scheme: ${event.document.uri.scheme}`);
    outputChannel.appendLine(`Time: ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, second: 'numeric' }).format(new Date())}`);

    timerOps.resetInactivityTimeout(context, timerStatusBarItem);
    timerOps.updateFileSeconds(event.document.fileName);
    stateOps.updateWorkspaceState();
  });

  vscode.window.onDidChangeActiveTextEditor(() => {
    timerOps.resetInactivityTimeout(context, timerStatusBarItem);
  });

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('timer')) {
      const inactivityTimeoutSeconds = vscode.workspace.getConfiguration('timer').get<number>('inactivityTimeoutSeconds');
      outputChannel.appendLine(`Updated inactivityTimeoutSeconds: ${inactivityTimeoutSeconds}`);
      timerOps.setInactivityTimeoutSeconds(inactivityTimeoutSeconds || 60);
    }
  });

  setInterval(() => {
    const currentCommitSha = gitOps.getLatestCommitSha();

    let lastKnownCommitSha = timerState.find((state) => state.commit)?.commit?.sha || null;

    if (lastKnownCommitSha !== currentCommitSha) {
      lastKnownCommitSha = currentCommitSha;
      const commitInfo = gitOps.getCommitInfo(currentCommitSha);
      const changedFiles = gitOps.getChangedFiles(currentCommitSha, timerState[0]);

      if (timerState[0] && !timerState[0].commit) {
        timerState[0].commit = {
          ...commitInfo,
          sha: lastKnownCommitSha,
          files: changedFiles
        };
      }

      stateOps.updateAndSaveTimerState({ seconds: 0, files: [] });
      timerOps.resetTimer(context, timerStatusBarItem);  // Resetting the timer
    }
  }, 30 * 1000);
}


function registerShowDataCommand(context: vscode.ExtensionContext) {
  class TimerDataProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    constructor(private context: vscode.ExtensionContext) { }

    get onDidChange(): vscode.Event<vscode.Uri> {
      return this._onDidChange.event;
    }

    provideTextDocumentContent(uri: vscode.Uri): string {
      return JSON.stringify(context.workspaceState.get<TimerState[]>('timerState', []), null, 2);
    }

    update(uri: vscode.Uri) {
      this._onDidChange.fire(uri);
    }
  }

  const timerDataProvider = new TimerDataProvider(context);
  const providerRegistration = vscode.workspace.registerTextDocumentContentProvider(
    'code-time-tracker',
    timerDataProvider
  );
  const disposable = vscode.commands.registerCommand('code-time-tracker.showData', async () => {
    const uri = vscode.Uri.parse('code-time-tracker://authority/timer-data');

    const doc = await vscode.workspace.openTextDocument(uri);
    vscode.languages.setTextDocumentLanguage(doc, 'json');
    vscode.window.showTextDocument(doc, { preview: false });

    timerDataProvider.update(uri);
  });

  context.subscriptions.push(disposable, providerRegistration);
}
