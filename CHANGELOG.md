# Change Log

All notable changes to the "vscode-redmine" extension will be documented in this file.

## [Unreleased]

### Added

- [Issue #49](https://github.com/rozpuszczalny/vscode-redmine/issues/49) - filter and sort properties were added into config
- Grabbing description and journals of issue feature was added

## 1.1.1 - 17.08.2022

### Fixed

- [Issue #53](https://github.com/rozpuszczalny/vscode-redmine/issues/53)

## 1.1.0 - 19.01.2022

### Added

- [Issue #34](https://github.com/rozpuszczalny/vscode-redmine/issues/34) - display subprojects as a tree and toggle back to flat view (thanks to [doganOz](https://github.com/doganOz)!)
- Code of conduct, contributing guide and issue template

### Changed

- eslint rules to be more restrictive
- small refactor

## 1.0.4 - 13.10.2021

### Fixed

- [Issue #37](https://github.com/rozpuszczalny/vscode-redmine/issues/37)

## 1.0.3 - 21.09.2020

### Fixed

- [Issue #30](https://github.com/rozpuszczalny/vscode-redmine/issues/30)

## 1.0.2 - 25.08.2020

### Added

- Updated link 😇

## 1.0.1 - 25.08.2020

### Added

- Link to my website

## 1.0.0 - 25.08.2020

### Fixed

- [Issue #23](https://github.com/rozpuszczalny/vscode-redmine/issues/23)

### Added

- [Issue #18](https://github.com/rozpuszczalny/vscode-redmine/issues/18) Showcase of features in README.md
- [Issue #16](https://github.com/rozpuszczalny/vscode-redmine/issues/16) Mulitroot support - configuration can be set in `settings.json` file, under `.vscode` folder of workspace folder.
- ESLint and Prettier
- [Issue #11](https://github.com/rozpuszczalny/vscode-redmine/issues/11) Sidebar panel with issues assigned to user and list of projects

### Removed

- 💥 `serverUrl`, `serverPort`, `serverIsSsl` and `authorization` settings; use `url` and `additionalHeaders` instead.

### Changed

- Bumped to TypeScript 3
- Align code to ESLint suggestions
- Format codebase with Prettier

## 0.5.1 - 30.01.2019

### Changed

- Updated README.md with new features description

## 0.5.0 - 30.01.2019

### Added

Thanks to **[MarkusAmshove](https://github.com/MarkusAmshove)**:

- Quick update action for issue
  - You can quickly change issue status, assigned and add note
- Open issue actions from number selected in document

## 0.4.0 - 16.09.2018

### Added

- Custom `Authorization` header
  - You can configure `Authorization` header by setting `redmine.authorization`.

## 0.3.1 - 20.08.2018

### Fixed

- [Issue #7](https://github.com/rozpuszczalny/vscode-redmine/issues/7) (thanks to **[hanyuzhou2006](https://github.com/hanyuzhou2006)** for discovering and fixing an issue!)

## 0.3.0 - 21.06.2018

### Added

- Create issue command
  - You can configure project name under `redmine.projectName` setting
  - You can choose project from the list, if `redmine.projectName` isn't configured
- 0.2.2 `CHANGELOG.md` entry

### Changed

- 0.2.1 correct year in `CHANGELOG.md`

## 0.2.2 - 07.06.2018

### Added

- Attribution of Redmine Logo

## 0.2.1 - 07.06.2018

### Added

- Extension icon

### Changed

- Display name

## 0.2.0 - 02.06.2018

### Added

- `rejectUnauthorized` parameter, which is passed to https request options
- Missing open by issue id in feature list in `README.md`
- Information about future features in `README.md`

## 0.1.1 - 14.03.2018

### Fixed

- messy issue description in quick pick

## 0.1.0 - 04.02.2018

Added more basic functionalities to this extensions.

### Added

- possibility to change issue status
- possibility to add time entries to issue
- getting issue actions by typing in an issue id

### Changed

- splitted changelog entries into separate sections

### Removed

- `Release notes` section in `README.md` - it can be viewed here, so there is no reason to copy that across multiple files

## 0.0.2 - 28.01.2018

### Added

- repository URL to `package.json`, so VSCode Marketplace see `README.md` and other files

## 0.0.1 - 28.01.2018

Initial release of `vscode-redmine`

### Added

- list of issues assigned to API key owner
- possibility to open issue in browser
- configuration for server and API key
