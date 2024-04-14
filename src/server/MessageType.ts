export enum MessageType {
  /**
   * Callback for the number of players
   */
  clientList = "clientList",
  serverInfo = "serverInfo",
  onPlayerConnected = "playerConnected",
  onPlayerDisconnected = "playerDisconnected",
  playerSentFrameData = "playerSentFrameData",
  serverSentPlayerFrameData = "serverSentPlayerFrameData",
}