export interface IKeepAlive {
    sessionId: string;
    getLastKeepAliveMs: () => number;
    keepAliveReceived: () => void;
}
