import Intel from "./index.js";
import { v4 as uuidv4 } from "uuid";
import md5 from "md5";
import ModelOperations from "./drivers/File/ModelOperations.js";
import path from "path";
import fs from "fs";
import CryptoJS from "crypto-js";

export default class Model extends ModelOperations {
  preloading = false;
  #options;
  #property = {
    _id: {
      type: "",
    },
    __created: {
      type: 0,
    },
    __updated: {
      type: 0,
    },
  };
  constructor(name, property, options = {}) {
    super();
    this.finalPath = path.join(
      Intel.instance.driver.finalPath,
      md5(name) + Intel.ext,
    );

    this.name = name;
    this.#options = options;
    this.property = Object.assign(property, this.#property);
    this.property.id = uuidv4();
    this.records = {};
    this.contains = Object.keys(this.records).length;
  }

  get opts() {
    return this.#options;
  }

  parser(data) {
    if (this.#options.writeAs === "readable") {
      return JSON.stringify(data, null, 2);
    }
    if (this.#options.writeAs === "hash") {
      return CryptoJS[this.#options.alg]
        .encrypt(JSON.stringify(data), this.#options.passphrase)
        .toString();
    }
  }

  decrypter(data) {
    if (this.#options.writeAs === "readable") {
      return JSON.parse(data);
    }
    if (this.#options.writeAs === "hash") {
      data = CryptoJS[this.#options.alg].decrypt(
        data,
        this.#options.passphrase,
      );
      return JSON.parse(data.toString(CryptoJS.enc.Utf8));
    }
  }

  cycleRecords() {
    let recs = Object.keys(this.records).length - this.#options.max;
    let clone = {};
    let c = Object.entries(this.records)
      .sort(([, a], [, b]) => a.__updated - b.__updated)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

    Object.keys(c)
      .filter((v, i) => {
        return recs <= i;
      })
      .forEach((v) => {
        clone[v] = this.records[v];
      });
    this.records = clone;
    this.contains = Object.keys(this.records).length;
  }

  async save() {
    if (this.preloading) {
      this.preloading = false;
      return;
    }
    this.contains = Object.keys(this.records).length;
    if (this.#options?.max) this.cycleRecords();
    return new Promise((res, rej) => {
      fs.writeFile(this.finalPath, this.parser({ ...this }), (err) => {
        if (err) rej(err);
        res(1);
      });
    });
  }

  static async set(name, property, options = {}) {
    let _options = Object.assign(options, Intel.instance.driver.data.options);
    let _m = new Model(name, property, _options);
    await Intel.instance.driver.registerModel(_m);
    return _m;
  }

  async destroy() {
    Intel.instance.driver.destroyModel(this);
    fs.unlink(this.finalPath, (err) => {
      if (err) throw new Error(err);
    });
  }

  preload(properties) {
    this.records = properties.records;
  }
}
