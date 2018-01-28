import * as https from 'https';
import * as http from 'http';
import * as request from 'request';

export class Redmine {
    readonly issuesAssignedToMe: string = "/issues.json?status_id=open&assigned_to_id=me";
    readonly issueStatuses: string = "/issue_statuses.json";
    readonly updateIssue: { prefix: string, suffix: string } = {
        prefix: "/issues/",
        suffix: ".json"
    };

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
        public apiKey: string) {

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
            }
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
                    // TODO: Other errors handle
                    if (data.length > 0) {
                        let object = JSON.parse(data.toString('utf8'));

                        resolve(object);
                    } else {
                        resolve(null);
                    }
                });
            });

            // if (reqData) {
            //     console.log(reqData);
            //     req.write(reqData);
            // }

            req.on("error", (e) => {
                console.error(e);

                reject(`NodeJS request error (${e.name}): ${e.message}`);
            });

            req.end(reqData);
        });
    }

    /**
     * Returns promise, that resolves to list of issues assigned to api key owner
     */
    getIssuesAssignedToMe(): Promise<{ issues: any[] }> {
        return this.doRequest<{ issues: any[] }>(this.issuesAssignedToMe, "GET");
    }

    getIssueStatuses(): Promise<{ issue_statuses: any[] }> {
        return this.doRequest<{ issue_statuses: any[] }>(this.issueStatuses, "GET");
    }

    setIssueStatus(issue: any, statusId: number): Promise<any> {
        return this.doRequest<{ issue: any }>(
            `${this.updateIssue.prefix}${issue.id}${this.updateIssue.suffix}`,
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
}