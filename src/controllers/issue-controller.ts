import { Redmine } from './../redmine/redmine';
import * as vscode from 'vscode';
import { PickItem } from '../extension';

export class IssueController {
    constructor(private issue: any, private redmine: Redmine) { }

    changeIssueStatus(statuses: any[]) {
        vscode.window.showQuickPick<PickItem>(statuses.map((status) => {
            return {
                "label": status.name,
                "description": "",
                "detail": "",
                "fullIssue": status
            }
        })).then((stat) => {
            if (!stat) return;

            this.redmine.setIssueStatus(this.issue, stat.fullIssue.id).then(() => {
                vscode.window.showInformationMessage(`Issue #${this.issue.id} status changed to ${stat.fullIssue.name}`);
            });
        });
    }

    private openInBrowser() {
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(`${this.redmine.url}/issues/${this.issue.id}`)).then((success) => {
        }, (reason) => {
            vscode.window.showErrorMessage(reason);
        });
    }

    private changeStatus() {
        this.redmine.getIssueStatuses().then((statuses) => {
            this.changeIssueStatus(statuses.issue_statuses);
        });
    }

    listActions() {
        vscode.window.showQuickPick<{
            action: string,
            label: string,
            description: string,
            detail?: string
        }>([{
            action: "changeStatus",
            label: "Change status",
            description: "Changes issue status",
            detail: `Issue #${this.issue.id} assigned to ${this.issue.assigned_to ? this.issue.assigned_to.name : "no one"}`
        }, {
            action: "openInBrowser",
            label: "Open in browser",
            description: "Opens an issue in a browser (might need additional login)",
            detail: `Issue #${this.issue.id} assigned to ${this.issue.assigned_to ? this.issue.assigned_to.name : "no one"}`
        }]).then((option) => {
            if (!option) return;
            if (option.action === "openInBrowser") {
                this.openInBrowser();
            }
            if (option.action === "changeStatus") {
                this.changeStatus();
            }
        }, (error) => { /* ? */ })
    }
}