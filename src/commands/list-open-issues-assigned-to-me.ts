import * as vscode from "vscode";
import { IssueController } from "../controllers/issue-controller";
import { ActionProperties } from "./action-properties";
import { Issue } from "../redmine/models/issue";
import { errorToString } from "../utilities/error-to-string";

export interface PickItem extends vscode.QuickPickItem {
  label: string;
  description: string;
  detail: string;
  fullIssue: Issue;
}

const mapIssueToPickItem = (issue: Issue): PickItem => ({
  label: `[${issue.tracker.name}] (${issue.status.name}) ${issue.subject} by ${issue.author.name}`,
  description: (issue.description || "")
    .split("\n")
    .join(" ")
    .split("\r")
    .join(""),
  detail: `Issue #${issue.id} assigned to ${
    issue.assigned_to ? issue.assigned_to.name : "no one"
  }`,
  fullIssue: issue,
});

export default async ({ server }: ActionProperties) => {
  const promise = server.getIssuesAssignedToMe();

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
    const issues = await promise;

    const issue = await vscode.window.showQuickPick(
      issues.issues.map(mapIssueToPickItem)
    );

    if (issue === undefined) return;

    const controller = new IssueController(issue.fullIssue, server);

    controller.listActions();
  } catch (error) {
    vscode.window.showErrorMessage(errorToString(error));
  }
};
