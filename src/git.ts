import * as child_process from 'child_process';
import { TimerState } from './interfaces';

export class GitOperations {
  private gitPath: string;

  constructor(gitPath: string) {
    this.gitPath = gitPath;
  }

  getLatestCommitSha(): string {
    try {
      return child_process.execSync('git rev-parse HEAD', { cwd: this.gitPath }).toString().trim();
    } catch (e) {
      return '';
    }
  }

  getCommitInfo(commitSha: string): {
    commit?: string,
    author?: string,
    date?: string,
    message?: string
  } {
    const command = `git log --pretty=format:'{"commit": "%H", "author": "%aN <%aE>", "date": "%ad", "message": "%s"}' ${commitSha} -n 1`;

    try {
      const result = child_process.execSync(command, { cwd: this.gitPath });
      return JSON.parse(result.toString().trim());
    } catch (e) {
      return {};
    }
  }

  getChangedFiles(commitSha: string, timerState: TimerState) {
    const command = `git diff-tree --no-commit-id --name-status -r ${commitSha}`;
    try {
      const result = child_process.execSync(command, { cwd: this.gitPath }).toString().trim();
      const lines = result.split('\n');
      return lines.map(line => {
        const [typeChar, ...filePathParts] = line.split(/\s+/);
        const filePath = filePathParts.join(' ');

        return {
          path: filePath,
          type: this.convertGitStatusToType(typeChar)
        };
      });
    } catch (e) {
      return [];
    }
  }

  private convertGitStatusToType(typeChar: string): 'edit' | 'create' | 'delete' | 'untracked' {
    switch (typeChar) {
      case 'A':
        return 'create';
      case 'M':
        return 'edit';
      case 'D':
        return 'delete';
      default:
        return 'untracked';
    }
  }
}






