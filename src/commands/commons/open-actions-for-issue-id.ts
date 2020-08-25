import { RedmineServer } from "../../redmine/redmine-server";
import * as vscode from "vscode";
import { IssueController } from "../../controllers/issue-controller";

export default async (server: RedmineServer, issueId: string) => {
  if (!issueId || !issueId.trim()) {
    return;
  }

  const promise = server.getIssueById(issueId);

  promise.then(
    (issue) => {
      if (!issue) return;

      const controller = new IssueController(issue.issue, server);

      controller.listActions();
    },
    (error) => {
      vscode.window.showErrorMessage(error);
    }
  );

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
    },
    (progress) => {
      progress.report({
        message: `Waiting for response from ${server.options.url.host}...`,
      });
      return promise;
    }
  );
};
