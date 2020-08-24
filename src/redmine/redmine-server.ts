import { Url, parse } from "url";
import * as http from "http";
import * as https from "https";
import { RedmineProject } from "./redmine-project";
import {
  IssueStatus,
  Membership,
  QuickUpdate,
  QuickUpdateResult,
} from "../controllers/domain";
import { TimeEntryActivity } from "./models/time-entry-activity";
import { Project } from "./models/project";
import { TimeEntry } from "./models/time-entry";
import { Issue } from "./models/issue";
import { IssueStatus as RedmineIssueStatus } from "./models/issue-status";
import { Membership as RedmineMembership } from "./models/membership";

type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const REDMINE_API_KEY_HEADER_NAME = "X-Redmine-API-Key";

export interface RedmineServerConnectionOptions {
  /**
   * @example https://example.com
   * @example http://example.com:8080
   * @example https://example.com:8443/redmine
   * @example http://example.com/redmine
   */
  address: string;
  /**
   * @example 7215ee9c7d9dc229d2921a40e899ec5f
   */
  key: string;
  /**
   * @default false
   */
  rejectUnauthorized?: boolean;
  /**
   * @example { "Authorization": "Basic YTph" }
   */
  additionalHeaders?: { [key: string]: string };
}

interface RedmineServerOptions extends RedmineServerConnectionOptions {
  url: Url;
}

export class RedmineOptionsError extends Error {
  name = "RedmineOptionsError";
}

export class RedmineServer {
  options: RedmineServerOptions;

  private timeEntryActivities: TimeEntryActivity[] = null;

  get request() {
    return this.options.url.protocol === "https:"
      ? https.request
      : http.request;
  }

  private validateOptions(options: RedmineServerConnectionOptions): void {
    if (!options.address) {
      throw new RedmineOptionsError("Address cannot be empty!");
    }
    if (!options.key) {
      throw new RedmineOptionsError("Key cannot be empty!");
    }
    const url = parse(options.address);
    if (["https:", "http:"].indexOf(url.protocol) === -1) {
      throw new RedmineOptionsError(
        "Address must have supported protocol (http/https)"
      );
    }
  }

  private setOptions(options: RedmineServerConnectionOptions) {
    this.options = {
      ...options,
      url: parse(options.address),
    };
    if (this.options.additionalHeaders == null) {
      this.options.additionalHeaders = {};
    }
  }

  constructor(options: RedmineServerConnectionOptions) {
    this.validateOptions(options);
    this.setOptions(options);
  }

  doRequest<T>(path: string, method: HttpMethods, data?: Buffer): Promise<T> {
    const { url, key, additionalHeaders, rejectUnauthorized } = this.options;
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      headers: {
        [REDMINE_API_KEY_HEADER_NAME]: key,
        ...additionalHeaders,
      },
      rejectUnauthorized: rejectUnauthorized,
      path: `${url.pathname}${path}`,
      method,
    };
    if (data) {
      options.headers["Content-Length"] = data.length;
      options.headers["Content-Type"] = "application/json";
    }

    return new Promise((resolve, reject) => {
      let incomingBuffer = Buffer.from("");
      const handleData = (_: http.IncomingMessage) => (incoming: Buffer) => {
        incomingBuffer = Buffer.concat([incomingBuffer, incoming]);
      };

      const handleEnd = (clientResponse: http.IncomingMessage) => () => {
        const { statusCode, statusMessage } = clientResponse;
        console.log("end", statusCode);
        if (statusCode == 401) {
          reject(
            "Server returned 401 (perhaps your API Key is not valid, or your server has additional authentication methods?)"
          );
          return;
        }
        if (statusCode == 403) {
          reject("Server returned 403 (perhaps you haven't got permissions?)");
          return;
        }
        if (statusCode == 404) {
          reject("Resource doesn't exsist");
          return;
        }

        // TODO: Other errors handle
        if (statusCode >= 400) {
          reject(statusMessage);
          return;
        }

        console.log(incomingBuffer);

        if (incomingBuffer.length > 0) {
          try {
            const object = JSON.parse(incomingBuffer.toString("utf8"));
            console.log(incomingBuffer, object);

            resolve(object);
          } catch (e) {
            console.warn("Couldn't parse response as JSON...");

            resolve(null);
          }
          return;
        }

        resolve(null);
      };

      const clientRequest = this.request(options, (incoming) => {
        incoming.on("data", handleData(incoming));
        incoming.on("end", handleEnd(incoming));
      });

      const handleError = (error: Error) => {
        console.error(error);

        reject(`NodeJS Request Error (${error.name}): ${error.message}`);
      };

      clientRequest.on("error", handleError);

      clientRequest.end(data);
    });
  }

  getProjects() {
    return this.doRequest<{ projects: Project[] }>(
      `/projects.json`,
      "GET"
    ).then(({ projects }) =>
      projects.map(
        (proj) =>
          new RedmineProject(this, {
            ...proj,
            id: `${proj.id}`,
          })
      )
    );
  }

  getTimeEntryActivities(): Promise<{
    time_entry_activities: TimeEntryActivity[];
  }> {
    if (this.timeEntryActivities) {
      return Promise.resolve({
        time_entry_activities: this.timeEntryActivities,
      });
    }
    return this.doRequest<{
      time_entry_activities: TimeEntryActivity[];
    }>(`/enumerations/time_entry_activities.json`, "GET").then((response) => {
      if (response) {
        this.timeEntryActivities = response.time_entry_activities;
      }

      return response;
    });
  }

  addTimeEntry(
    issueId: number,
    activityId: number,
    hours: string,
    message: string
  ): Promise<unknown> {
    return this.doRequest<{ time_entry: TimeEntry }>(
      `/time_entries.json`,
      "POST",
      Buffer.from(
        JSON.stringify({
          time_entry: <TimeEntry>{
            issue_id: issueId,
            activity_id: activityId,
            hours,
            comments: message,
          },
        })
      )
    );
  }

  /**
   * Returns promise, that resolves to an issue
   * @param issueId ID of issue
   */
  getIssueById(issueId: string): Promise<{ issue: Issue }> {
    return this.doRequest(`/issues/${issueId}.json`, "GET");
  }

  /**
   * Returns promise, that resolves, when issue status is set
   */
  setIssueStatus(issue: Issue, statusId: number): Promise<unknown> {
    return this.doRequest<{ issue: Issue }>(
      `/issues/${issue.id}.json`,
      "PUT",
      new Buffer(
        JSON.stringify({
          issue: {
            status_id: statusId,
          },
        })
      )
    );
  }

  issueStatuses: { issue_statuses: RedmineIssueStatus[] } = null;

  /**
   * Returns promise, that resolves to list of issue statuses in provided redmine server
   */
  getIssueStatuses(): Promise<{ issue_statuses: RedmineIssueStatus[] }> {
    if (this.issueStatuses == null) {
      return this.doRequest<{ issue_statuses: RedmineIssueStatus[] }>(
        "/issue_statuses.json",
        "GET"
      ).then((obj) => {
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

  async getIssueStatusesTyped(): Promise<IssueStatus[]> {
    const statuses = await this.getIssueStatuses();
    return statuses.issue_statuses.map((s) => new IssueStatus(s.id, s.name));
  }
  async getMemberships(projectId: string): Promise<Membership[]> {
    const membershipsResponse = await this.doRequest<{
      memberships: RedmineMembership[];
    }>(`/projects/${projectId}/memberships.json`, "GET");

    return membershipsResponse.memberships
      .filter((m) => m.user)
      .map((m) => new Membership(m.user.id, m.user.name));
  }
  async applyQuickUpdate(quickUpdate: QuickUpdate): Promise<QuickUpdateResult> {
    await this.doRequest<{ issue: Issue }>(
      `/issues/${quickUpdate.issueId}.json`,
      "PUT",
      new Buffer(
        JSON.stringify({
          issue: {
            status_id: quickUpdate.status.statusId,
            assigned_to_id: quickUpdate.assignee.userId,
            notes: quickUpdate.message,
          },
        })
      )
    );
    const issueRequest = await this.getIssueById(quickUpdate.issueId);
    const issue = issueRequest.issue;
    const updateResult = new QuickUpdateResult();
    if (issue.assigned_to.id != quickUpdate.assignee.userId) {
      updateResult.addDifference("Couldn't assign user");
    }
    if (issue.status.id != quickUpdate.status.statusId) {
      updateResult.addDifference("Couldn't update status");
    }
    return updateResult;
  }

  /**
   * Returns promise, that resolves to list of issues assigned to api key owner
   */
  getIssuesAssignedToMe(): Promise<{ issues: Issue[] }> {
    return this.doRequest<{ issues: Issue[] }>(
      "/issues.json?status_id=open&assigned_to_id=me",
      "GET"
    );
  }

  /**
   * Returns promise, that resolves to list of open issues for project
   */
  getOpenIssuesForProject(
    project_id: number | string
  ): Promise<{ issues: Issue[] }> {
    return this.doRequest<{ issues: Issue[] }>(
      `/issues.json?status_id=open&project_id=${project_id}`,
      "GET"
    );
  }

  compare(other: RedmineServer) {
    return (
      this.options.address === other.options.address &&
      this.options.key === other.options.key
    );
  }
}
