import { RedmineServer } from "../../redmine/redmine-server";
import * as vscode from "vscode";
import { IssueController } from "../../controllers/issue-controller";
import { errorToString } from "../../utilities/error-to-string";

export default async (
  server: RedmineServer,
  issueId: string | null | undefined
) => {
  if (!issueId || !issueId.trim() || !parseInt(issueId, 10)) {
    return;
  }

  const promise = server.getIssueById(parseInt(issueId, 10));

  vscode.window.withProgress(
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

  try {
    const issue = await promise;

    if (!issue) return;

    const controller = new IssueController(issue.issue, server);

    controller.listActions();
  } catch (error) {
    vscode.window.showErrorMessage(errorToString(error));
  }
};
