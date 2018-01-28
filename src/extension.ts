'use strict';

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { CancellationToken } from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log(`Context storage path for my extension is: ${context.storagePath}`);
    console.log(`Context extension path for my extension is: ${context.extensionPath}`);

    let previewUri = vscode.Uri.parse('redmine-issue-preview://authority/redmine-issue-preview');

    let settings = {
        "serverUrl": null,
        "serverPort": null,
        "serverIsSsl": null,
        "apiKey": null
    };

    let hadErrors = false;

    // TODO: Change this poor settings management system
    let wsSettings = vscode.workspace.getConfiguration('redmine');
    for (let key in settings) {
        if (!wsSettings.has(key) || (wsSettings.get(key) === "")) {
            vscode.window.showErrorMessage(`Redmine integration: ${key} is required`);
            hadErrors = true;
        } else {
            settings[key] = wsSettings.get(key);
        }
    }

    console.log(settings);
    vscode.workspace.onDidChangeConfiguration(function () {
        hadErrors = false;
        let wsSettings = vscode.workspace.getConfiguration('redmine');
        for (let key in settings) {
            if (!wsSettings.has(key) || (wsSettings.get(key) === "")) {
                vscode.window.showErrorMessage(`Redmine integration: ${key} is required`);
                hadErrors = true;
            } else {
                settings[key] = wsSettings.get(key);
            }
        }
    }, null, context.subscriptions);

    let disposable = vscode.commands.registerCommand('redmine.listOpenIssuesAssignedToMe', () => {
        if (hadErrors) {
            vscode.window.showErrorMessage(`Redmine integration: Configuration file is not complete!`);
            return;
        }

        // TODO: Move request-specific code to another class
        const options: http.RequestOptions = {
            hostname: settings.serverUrl,
            port: settings.serverPort,
            path: '/issues.json?status_id=open&assigned_to_id=me',
            method: 'GET',
            headers: {
                "X-Redmine-API-Key": settings.apiKey
            }
        };

        let promise = new Promise((resolve, rej) => {
            let requester = settings.serverIsSsl ? https.request : http.request;

            let req = requester(options, (res) => {
                let data = new Buffer("");

                res.on('data', (d: Buffer) => {
                    data = Buffer.concat([data, d]);
                });

                res.on('end', () => {
                    if (res.statusCode == 401) {
                        vscode.window.showErrorMessage("Server returned 401 (perhaps your API Key is not valid?)");
                        rej();
                        return;
                    }
                    if (res.statusCode == 403) {
                        vscode.window.showErrorMessage("Server returned 403 (perhaps you haven't got permissions?)");
                        rej();
                        return;
                    }
                    let object = JSON.parse(data.toString('utf8'));

                    // TODO: Change QuickPick logic
                    resolve();
                    vscode.window.showQuickPick<{
                        label: string,
                        description: string,
                        detail: string,
                        fullIssue: any
                    }>(object.issues.map((issue) => {
                        return {
                            "label": `[${issue.tracker.name}] ${issue.subject} by ${issue.author.name}`,
                            "description": issue.description,
                            "detail": `Issue #${issue.id} assigned to ${issue.assigned_to ? issue.assigned_to.name : "no one"}`,
                            "fullIssue": issue
                        }
                    })).then((issue) => {
                        if (issue === undefined) return;
                        
                        // TODO: Better action management
                        vscode.window.showQuickPick<{
                            action: string,
                            label: string,
                            description: string,
                            detail?: string
                        }>([{
                            action: "openInBrowser",
                            label: "Open in browser",
                            description: "Opens an issue in a browser (might need additional login)",
                            detail: `Issue #${issue.fullIssue.id} assigned to ${issue.fullIssue.assigned_to ? issue.fullIssue.assigned_to.name : "no one"}`
                        }]).then((option) => {
                            if (option.action === "openInBrowser") {
                                vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(`http${settings.serverIsSsl?'s':''}://${settings.serverUrl}${settings.serverPort == 80 || settings.serverPort == 443 ? '' : (':'+settings.serverPort)}/issues/${issue.fullIssue.id}`)).then((success) => {
                                }, (reason) => {
                                    vscode.window.showErrorMessage(reason);
                                });
                            }
                        })
                    })
                })
            });

            req.on('error', (e) => {
                // TODO: Better error management
                console.error(e);
                rej();
            });
            req.end();
        })



        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window
        }, (progress) => {
            progress.report({ "message": `Waiting for response from ${settings.serverUrl}...` });
            return promise;
        });
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}