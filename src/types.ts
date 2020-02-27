
export interface Authenticator {
    authenticate(params: any): Promise<any>
}

export interface Authoriser {
    authorise(params: any): Promise<any>
}

export interface Initialiser {
    init(): Promise<any>
}


