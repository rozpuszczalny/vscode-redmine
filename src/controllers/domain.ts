export class Membership {
    constructor(public readonly userId: string,
                public readonly userName: string) { }
}

export class IssueStatus {
    constructor(public readonly statusId: string,
                public readonly name: string) { }
}

export class BulkUpdate {
    constructor(public readonly issueId: string,
                public readonly message: string,
                public readonly assignee: Membership,
                public readonly status: IssueStatus) { }
}