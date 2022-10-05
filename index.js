import { existsSync, mkdirSync, constants } from "fs";
import Model from "./Model.js";
import md5 from "md5";
import FileDriver from "./drivers/File.js";
export { Model };

export default class Intel {
  static drivers = {
    file: FileDriver,
  };
  static ext = ".rig";
  static instance = null;

  models = {};

  constructor(property) {
    this.storage = property.storage;
    this.hashcode = md5(`${property.hashfrom}-intel`);
    this.options = property.options;
    this.driver = new Intel.drivers[property.driver](property, this.hashcode);
  }

  model(m) {
    if (!this.models[m]) throw new Error(`cannot find ModelInstance ${m}`);
    return this.models[m];
  }

  async createModel(name, property, options = {}) {
    return await Model.set(name, property, options);
  }

  static async init(property) {
    let intel = new Intel(property);
    Intel.instance = intel;
    await intel.driver.validate();
    return intel;
  }
}
