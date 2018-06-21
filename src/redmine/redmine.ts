import * as https from 'https';
import * as http from 'http';

export class Redmine {
    readonly pathIssuesAssignedToMe: () => string = () => { return "/issues.json?status_id=open&assigned_to_id=me" };
    readonly pathIssue: (id: string) => string = (id) => { return `/issues/${id}.json`; };
    readonly pathIssueStatuses: () => string = () => { return "/issue_statuses.json"; };
    readonly pathTimeEntryActivities: () => string = () => { return "/enumerations/time_entry_activities.json"; };
    readonly pathTimeEntries: () => string = () => { return "/time_entries.json"; };
    readonly pathProjects: () => string = () => { return "/projects.json"; };

    /**
     * URL that will be used to open link in a browser
     */
    url: string;

    /**
     * Host name
     */
    host: string;

    /**
     * Prefix of redmine server
     */
    prefix: string;

    /**
     * Base request options
     */
    options: https.RequestOptions;

    private request: typeof https.request;

    constructor(public address: string,
        public port: number,
        public isSsl: boolean,
        public apiKey: string,
        public rejectUnauthorized = true) {

        let firstSlash = address.indexOf('/');

        this.host = firstSlash > -1 ? address.substring(0, firstSlash) : address;
        this.prefix = firstSlash > -1 ? address.substring(firstSlash) : "";

        // http[s]://address[:port][/rest/of/address]
        this.url = `http${isSsl ? 's' : ''}://${this.host}${port == 80 || port == 443 ? '' : (':' + port)}${this.prefix}`;

        this.request = isSsl ? https.request : http.request;

        this.options = {
            hostname: this.host,
            port: this.port,
            headers: {
                "X-Redmine-API-Key": this.apiKey
            },
            rejectUnauthorized: rejectUnauthorized
        };
    }

    /**
     * This method creates and runs request to redmine server.
     * It handles 401 and 403 errors for you.
     * 
     * @param path Relative path
     * @param method HTTP method
     * @returns Promise of provided type; resolves, if no errors where found, rejects otherwise
     */
    private doRequest<T>(path, method, reqData?: Buffer): Promise<T> {
        let options: https.RequestOptions = JSON.parse(JSON.stringify(this.options));

        options.path = this.prefix + path;
        options.method = method;

        if (reqData) {
            options.headers["Content-Length"] = reqData.length;
            options.headers["Content-Type"] = "application/json";
        }

        return new Promise((resolve, reject) => {
            let req = this.request(options, (res) => {
                let data = new Buffer("");

                res.on('data', (d: Buffer) => {
                    data = Buffer.concat([data, d]);
                });

                res.on('end', () => {
                    if (res.statusCode == 401) {
                        reject("Server returned 401 (perhaps your API Key is not valid?)");
                        return;
                    }
                    if (res.statusCode == 403) {
                        reject("Server returned 403 (perhaps you haven't got permissions?)");
                        return;
                    }
                    if (res.statusCode == 404) {
                        reject("Resource doesn't exsist");
                        return;
                    }
                    // TODO: Other errors handle
                    if (data.length > 0) {
                        let object = JSON.parse(data.toString('utf8'));

                        resolve(object);
                    } else {
                        resolve(null);
                    }
                });
            });

            req.on("error", (e) => {
                console.error(e);

                reject(`NodeJS request error (${e.name}): ${e.message}`);
            });

            req.end(reqData);
        });
    }

    /**
     * Returns promise, that resolves to an issue
     * @param issueId ID of issue
     */
    getIssueById(issueId: string): Promise<{ issue: any }> {
        return this.doRequest(
            this.pathIssue(issueId),
            "GET"
        );
    }

    /**
     * Returns promise, that resolves to list of issues assigned to api key owner
     */
    getIssuesAssignedToMe(): Promise<{ issues: any[] }> {
        return this.doRequest<{ issues: any[] }>(this.pathIssuesAssignedToMe(), "GET");
    }

    issueStatuses: { issue_statuses: any[] } = null;

    /**
     * Returns promise, that resolves to list of issue statuses in provided redmine server
     */
    getIssueStatuses(): Promise<{ issue_statuses: any[] }> {
        if (this.issueStatuses == null) {
            return this.doRequest<{ issue_statuses: any[] }>(this.pathIssueStatuses(), "GET").then((obj) => {
                if (obj) {
                    // Shouldn't change much; cache it.
                    this.issueStatuses = obj;
                }

                return obj;
            });
        } else {
            return Promise.resolve(this.issueStatuses);
        }
    }

    timeEntryActivities: { time_entry_activities: any[] } = null;

    /**
     * Returns promise, that resolves to list of issue statuses in provided redmine server
     */
    getTimeEntryActivities(): Promise<{ time_entry_activities: any[] }> {
        if (this.timeEntryActivities == null) {
            return this.doRequest<{ time_entry_activities: any[] }>(this.pathTimeEntryActivities(), "GET").then((obj) => {
                if (obj) {
                    // Shouldn't change much; cache it.
                    this.timeEntryActivities = obj;
                }

                return obj;
            });
        } else {
            return Promise.resolve(this.timeEntryActivities);
        }
    }

    /**
     * Returns promise, that resolves, when issue status is set
     */
    setIssueStatus(issue: any, statusId: number): Promise<any> {
        return this.doRequest<{ issue: any }>(
            this.pathIssue(issue.id),
            "PUT",
            new Buffer(
                JSON.stringify({
                    issue: {
                        status_id: statusId
                    }
                })
            )
        );
    }

    addTimeEntry(issue_id: any, activity_id: any, hours: string, message: string): Promise<any> {
        return this.doRequest<{ time_entry: any }>(
            this.pathTimeEntries(),
            "POST",
            new Buffer(
                JSON.stringify({
                    time_entry: {
                        issue_id: issue_id,
                        activity_id: activity_id,
                        hours: hours,
                        comments: message
                    }
                })
            )
        );
    }

    /**
     * Returns list of projects
     */
    getProjects() {
        return this.doRequest<{ projects: any[] }>(
            this.pathProjects(),
            "GET"
        );
    }
}