import { Vector3 } from 'three'

export interface Haulable {
  parent?: string, // socket id of the player who is hauling
  location?: Vector3, // vector representing the locaiton of the item, if there is no parent
}
