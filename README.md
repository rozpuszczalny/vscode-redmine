# `vscode-redmine`

Redmine extension for Visual Studio Code.

## Features

* List of issues assigned to you
* Open issue in browser

## Requirements

It's required to enable REST web services in `/settings?tab=api` of your redmine (you have to be administator of redmine server).

## Extension Settings

This extension contributes the following settings:

* `redmine.serverUrl`: URL of redmine server (eg. `redmine.example.com`, `example.com/redmine` _etc._)
* `redmine.serverPort`: Port of redmine server (default: `443`)
* `redmine.serverIsSsl`: Should be connected through SSL or not (default: `true`)
* `redmine.apiKey`: API Key of your redmine account (see `/my/account` page, on right-hand pane)

## Known Issues

No known issues yet. If you found one, feel free to open an issue!

## Release Notes

### 0.0.1

Initial release of `vscode-redmine`
* Added list of issues assigned to API key owner
* Added possibility to open issue in browser
* Added configuration for server and API key

**Enjoy!**