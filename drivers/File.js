import fs, { existsSync, mkdirSync, constants } from "fs";
import path from "path";
import md5 from "md5";

import CryptoJS from "crypto-js";
export default class FileDriver {
  data = {
    basepath: this.storage,
    name: "test",
    models: {},
    options: {},
  };

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
    this.data.options = Object.assign(this.#options, property.options);
    this.finalPath = path.join(this.storage, this.hashcode);
    this.intelPath = path.join(this.storage, this.hashcode + ".chasi");
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
    if (decryptAs === "readable") {
      return JSON.parse(data);
    }
    if (decryptAs === "hash") {
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
            .then((content) => {
              try {
                content = this.decrypter(content);
              } catch (e) {
                if (e.message.includes("Malformed")) {
                  console.log(e);
                  throw new Error(
                    "Bad Decryption Key, Malformed data parsing error",
                  );
                } else {
                  let decAs =
                    this.data.options.writeAs == "hash" ? "readable" : "hash";
                  content = this.decrypter(content, decAs);
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
    if (!raw.exists) {
      this.proxy.models[md5(model.name) + ".chasi"] = model;
      this.proxy._models[model.name] = {
        path: model.finalPath,
      };
      this.proxy.models = this.proxy.models;
    }
  }

  async validate() {
    if (existsSync(this.storage) === false) {
      mkdirSync(this.storage);
    }

    if (existsSync(this.finalPath) === false) {
      mkdirSync(this.finalPath);
    }

    this.proxy = (
      await this.writeIfNotExist(this.intelPath, this.proxy, true)
    ).content;
  }
}
