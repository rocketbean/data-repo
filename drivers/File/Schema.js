export default class Schema {
  #model;
  #data;
  constructor(data, model) {
    this.#data = data;
    this.#model = model;
    Object.assign(this, data);
  }

  get _model() {
    return this.#model;
  }

  get data() {
    return this.#data;
  }

  set data(v) {
    this.#data = v;
  }

  async update(data) {
    let _udata = Object.assign({ ...this.data }, data);
    let _v = await this.#model.validate(_udata, true);
    if (_v) {
      this.data = _udata;
      this.#model.records[this.data._id] = this.data;
      Object.assign(this, data);
      await this.#model.save();
      return this;
    }
  }

  async delete(fromModel = false) {
    delete this.#model.records[this.data._id];
    if (!fromModel) await this.#model.save();
  }
}
