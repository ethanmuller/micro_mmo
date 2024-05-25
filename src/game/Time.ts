export type Time = {
    /**
     * Time in seconds between current and last frame
     */
    deltaTime : number;
    deltaTimeMs : number;
    /**
     * Local time in seconds since app startup
     */
    time : number;
    timeMs : number;
    /**
     * Synchronized server time (same in all clients)
     * TODO
     */
    serverTime : number;
}