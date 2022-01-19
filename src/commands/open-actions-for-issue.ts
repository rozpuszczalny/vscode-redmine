import * as vscode from "vscode";
import { IssueController } from "../controllers/issue-controller";
import { ActionProperties } from "./action-properties";

export default async ({ server }: ActionProperties, issueId?: string) => {
  if (!issueId) {
    issueId = await vscode.window.showInputBox({
      placeHolder: `Type in issue id`,
    });
  }

  if (!issueId || !issueId.trim() || isNaN(parseInt(issueId, 10))) {
    return;
  }

  const promise = server.getIssueById(parseInt(issueId, 10));

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
