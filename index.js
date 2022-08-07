import { existsSync, mkdirSync, constants } from "fs";
import Model from "./Model.js";
import md5 from "md5";
import FileDriver from "./drivers/File.js";
export { Model };

export default class Intel {
  static drivers = {
    file: FileDriver,
  };

  static instance = null;

  models = {};

  constructor(property) {
    this.storage = property.storage;
    this.hashcode = md5(`${property.hashfrom}-intel`);
    this.options = property.options;
    this.driver = new Intel.drivers[property.driver](property, this.hashcode);
  }

  static async init(property) {
    let intel = new Intel(property);
    Intel.instance = intel;
    await intel.driver.validate();
    return intel;
  }
}
