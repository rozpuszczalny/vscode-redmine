import * as vscode from "vscode";
import { IssueController } from "../controllers/issue-controller";
import { ActionProperties } from "./action-properties";

export default async ({ server }: ActionProperties, issueId?: string) => {
  if (!issueId) {
    issueId = await vscode.window.showInputBox({
      placeHolder: `Type in issue id`,
    });
  }

  if (!issueId || !issueId.trim()) {
    return;
  }

  const promise = server.getIssueById(issueId);

  console.log(issueId);

  promise.then(
    (issue) => {
      console.log(issue);
      if (!issue) return;

      const controller = new IssueController(issue.issue, server);

      controller.listActions();
    },
    (error) => {
      console.log(error);
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
