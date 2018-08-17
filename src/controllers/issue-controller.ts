import { Redmine } from './../redmine/redmine';
import * as vscode from 'vscode';
import { PickItem } from '../extension';

export class IssueController {
    constructor(private issue: any, private redmine: Redmine) { }

    chooseTimeEntryType(activities: any[]) {
        vscode.window.showQuickPick<PickItem>(activities.map((activity) => {
            return {
                "label": activity.name,
                "description": "",
                "detail": "",
                "fullIssue": activity,
            }
        }), {
                placeHolder: "Pick an activity type"
            }).then((act) => {
                if (!act) return;

                this.setTimeEntryMessage(act);
            });
    }

    setTimeEntryMessage(activity: any) {
        vscode.window.showInputBox({
            placeHolder: `"hours spent|additional message" or "hours spent|"`
        }).then((input) => {
            let indexOf = input.indexOf("|");
            if (indexOf === -1) {
                vscode.window.showWarningMessage(`Provide message in the following pattern: "hours spent|additional message" or "hours spent|", if you don't want to provide a message`).then(() => this.setTimeEntryMessage(activity), () => this.setTimeEntryMessage(activity));
                return;
            }
            let hours = input.substring(0, indexOf);
            let message = input.substring(indexOf + 1);

            this.redmine.addTimeEntry(this.issue.id, activity.fullIssue.id, hours, message).then(() => {
                vscode.window.showInformationMessage(`Time entry for issue #${this.issue.id} has been added.`);
            }, (reason) => {
                vscode.window.showErrorMessage(reason);
            });
        });
    }

    changeIssueStatus(statuses: any[]) {
        vscode.window.showQuickPick<PickItem>(statuses.map((status) => {
            return {
                "label": status.name,
                "description": "",
                "detail": "",
                "fullIssue": status
            }
        }), {
                placeHolder: "Pick a new status"
            }).then((stat) => {
                if (!stat) return;

                this.redmine.setIssueStatus(this.issue, stat.fullIssue.id).then(() => {
                    vscode.window.showInformationMessage(`Issue #${this.issue.id} status changed to ${stat.fullIssue.name}`);
                }, (reason) => {
                    vscode.window.showErrorMessage(reason);
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

    private addTimeEntry() {
        this.redmine.getTimeEntryActivities().then((activities) => {
            this.chooseTimeEntryType(activities.time_entry_activities);
        });
    }

    listActions() {
        let issueDetails = `Issue #${this.issue.id} assigned to ${this.issue.assigned_to ? this.issue.assigned_to.name : "no one"}`;
        vscode.window.showQuickPick<{
            action: string,
            label: string,
            description: string,
            detail?: string
        }>([{
            action: "changeStatus",
            label: "Change status",
            description: "Changes issue status",
            detail: issueDetails
        }, {
            action: "addTimeEntry",
            label: "Add time entry",
            description: "Adds new time entry to this issue",
            detail: issueDetails
        }, {
            action: "openInBrowser",
            label: "Open in browser",
            description: "Opens an issue in a browser (might need additional login)",
            detail: issueDetails
        }], {
                placeHolder: "Pick an action to do"
            }).then((option) => {
                if (!option) return;
                if (option.action === "openInBrowser") {
                    this.openInBrowser();
                }
                if (option.action === "changeStatus") {
                    this.changeStatus();
                }
                if (option.action === "addTimeEntry") {
                    this.addTimeEntry();
                }
            }, (error) => { /* ? */ })
    }
}