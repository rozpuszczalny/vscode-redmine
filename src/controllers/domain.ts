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

export class BulkUpdateResult {
    public readonly differences: string[] = [];

    public isSuccessful() {
        return this.differences.length == 0;
    }

    public addDifference(difference: string) {
        this.differences.push(difference);
    }
}