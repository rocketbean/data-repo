import { v4 as uuidv4, validate } from "uuid";
import Schema from "./Schema.js";
export default class ModelOperations {
  async validate(data, onUpdate = false) {
    let errors = [];
    let p = this.property;
    await Promise.all(
      Object.keys(p).map(async (k) => {
        // check required props
        if ((p[k].required || p[k].unique) && !data[k]) {
          errors.push(new Error("Missing required/unique field: " + k));
        }
        // check type matching
        if (data[k] != undefined && typeof data[k] != typeof p[k].type) {
          errors.push(
            new Error(
              `Invalid type for field: ${k} [${typeof data[
                k
              ]}] - expected: ${typeof p[k].type}`,
            ),
          );
        }
        // check unqiue props
        if (p[k]?.unique) {
          let _r = await this.get({ [k]: data[k] });
          if (onUpdate) {
            if (_r instanceof Schema && _r.data._id != data._id) {
              errors.push(new Error(`Unique field: ${k} already exists`));
            }
          } else {
            if (_r != null) {
              errors.push(new Error(`Field: ${k} is already taken`));
            }
          }
        }
      }),
    );
    if (this.opts.strict) {
      await Promise.all(
        Object.keys(data).map(async (k) => {
          if (!p[k]) {
            errors.push(new Error(`Field: ${k} is not allowed`));
          }
        }),
      );
    }
    if (errors.length >= 1) throw errors;
    return true;
  }

  async create(data = {}) {
    if (Array.isArray(data)) {
      for (let d = 0; d < data.length; d++) {
        await this.pushRecord(data[d]);
      }
    } else {
      return await this.pushRecord(data);
    }
  }

  async pushRecord(data = {}) {
    data._id = uuidv4();
    data.__created = Date.now();
    data.__updated = Date.now();
    let validate = await this.validate(data);
    if (validate) {
      this.records[data._id] = data;
      await this.save();
      return new Schema(data, this);
    }
  }

  async get(index = "*") {
    var that = this;
    if (typeof index == "string") {
      if (index === "*") return this.records;
      else
        return this.records[index]
          ? new Schema(this.records[index], that)
          : null;
    } else if (typeof index == "object") {
      let keys = Object.keys(index);
      let results = Object.keys(this.records)
        .filter((record) => {
          if (keys.every((key) => this.records[record][key] === index[key])) {
            return this.records[record];
          }
        })
        .map((record) => new Schema(this.records[record], this));
      if (results.length > 0) return results.length == 1 ? results[0] : results;
      return null;
    }
  }

  async update(identifier, data) {
    let _d = await this.get(identifier);

    if (Array.isArray(_d) && _d.length > 0) {
      for (let i = 0; i < _d.length; i++) {
        await _d[i].update(data);
      }
    } else if (_d instanceof Schema) {
      return await _d.update(data);
    } else {
      return null;
    }
  }

  async delete(identifier) {
    let _d = await this.get(identifier);
    if (Array.isArray(_d) && _d.length > 0) {
      for (let i = 0; i < _d.length; i++) {
        await _d[i].delete(true);
      }
    } else if (_d instanceof Schema) {
      await _d.delete(true);
    }
    await this.save();
  }
}
