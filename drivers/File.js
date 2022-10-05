import fs, { existsSync, mkdirSync, constants, readFileSync } from "fs";
import Intel from "../index.js";
import path from "path";
import md5 from "md5";
import Model from "../Model.js";
import CryptoJS from "crypto-js";
export default class FileDriver {
  data = {
    basepath: this.storage,
    name: "reader",
    models: {},
    _models: {},
    options: {},
  };

  ext = Intel.ext;
  proxy = new Proxy(this.data, {
    set: async (obj, prop, v) => {
      obj[prop] = v;
      await this.save();
      return true;
    },
  });

  #options = {
    writeAs: "readable",
    alg: "AES",
    passphrase: "intel",
    reset: false,
  };

  constructor(property, hashcode) {
    this.hashcode = hashcode;
    this.storage = property.storage;
    this.data.name = property.name;
    this.data.options = Object.assign(this.#options, property.options);
    this.finalPath = path.join(this.storage, this.hashcode);
    this.intelPath = path.join(this.storage, this.hashcode + this.ext);
  }

  parser(data) {
    if (this.data.options.writeAs === "readable") {
      return JSON.stringify(data, null, 2);
    }
    if (this.data.options.writeAs === "hash") {
      return CryptoJS[this.data.options.alg]
        .encrypt(JSON.stringify(data), this.data.options.passphrase)
        .toString();
    }
  }

  decrypter(data, decryptAs = null) {
    if (decryptAs === null) decryptAs = this.data.options.writeAs;
    try {
      return JSON.parse(data);
    } catch (e) {
      data = CryptoJS.AES.decrypt(data, this.data.options.passphrase);
      return JSON.parse(data.toString(CryptoJS.enc.Utf8));
    }
  }

  async writeIfNotExist(filepath, data, rewrite = false) {
    return new Promise((resolve, reject) => {
      let exists = true;
      fs.promises
        .access(filepath, constants.R_OK)
        .then(() => {
          if (this.data.options.reset === "invoke" || rewrite) {
            fs.writeFileSync(filepath, this.parser(data));
          }
        })
        .catch((err) => {
          if (err) fs.writeFileSync(filepath, this.parser(data));
        })
        .finally(async () => {
          let content = await fs.promises
            .readFile(filepath, { encoding: "utf8" })
            .then(async (content) => {
              try {
                content = this.decrypter(content);
              } catch (e) {
                if (e.message.includes("Malformed")) {
                  throw new Error(
                    "Bad Decryption Key, Malformed data parsing error",
                  );
                } else {
                  content = this.decrypter(content, this.data.options.writeAs);
                }
              }
              resolve({
                content,
                exists,
              });
            });
        });
    });
  }

  async save() {
    return new Promise((resolve, reject) => {
      let { basepath, name, _models, options } = this.proxy;
      fs.writeFile(
        this.intelPath,
        this.parser({ basepath, name, _models, options }),
        (err) => {
          if (err) reject(err);
          resolve(1);
        },
      );
    });
  }

  async registerModel(model) {
    let raw = await this.writeIfNotExist(model.finalPath, model);
    model.preload(raw.content);
    this.proxy.models[md5(model.name) + this.ext] = model;
    this.proxy._models[model.name] = {
      path: model.finalPath,
      name: model.name,
      property: model.property,
      options: model.options,
    };
    let rawIntel = { ...this.proxy };
    delete rawIntel.models;
    Intel.instance.models[model.name] = model;
    await this.writeIfNotExist(this.intelPath, rawIntel, true);
  }

  async getFileSync(dir) {
    return await new Promise((res, rej) => {
      fs.readFile(dir, function (err, data) {
        if (err) return console.error(err);
        res(data.toString());
      });
    });
  }

  async getBaseConf() {
    if (existsSync(this.intelPath)) {
      return JSON.parse(await this.getFileSync(this.intelPath));
    } else {
      return this.data;
    }
  }

  async compareModels() {
    let prox = (await this.writeIfNotExist(this.intelPath, this.proxy)).content;
    let models = Object.keys(prox._models);
    for (let m = 0; m < models.length; m++) {
      let prop = prox._models[models[m]];
      let model = await Model.set(prop.name, prop.property, prop?.options);
      await model.save();
    }
  }

  async destroyModel(model) {
    delete this.proxy.models[md5(model.name) + this.ext];
    delete this.proxy._models[model.name];
    this.proxy.models = this.proxy.models;
  }

  async validate() {
    if (!existsSync(this.storage)) {
      mkdirSync(this.storage);
    }

    if (!existsSync(this.finalPath)) {
      mkdirSync(this.finalPath);
    }
    if (existsSync(this.intelPath)) {
      await this.compareModels();
    }

    this.proxy = (
      await this.writeIfNotExist(this.intelPath, this.proxy, true)
    ).content;
  }
}
