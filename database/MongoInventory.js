const { Schema, model: createModel, Types } = require("mongoose");

const model = createModel("inventory", new Schema({
	userId: String,
	card: { type: Schema.Types.ObjectId, ref: "card" },
	quantity: Number
}));

module.exports = class MongoInventory {
	/**
	 * @param {string} userId 
	 */
	constructor(userId) {
		this.userId = userId;
		this.model = model;
	}

	/**
	 * @typedef {Object} InventoryFilterOptions
	 * @property {string} id
	 */

	/**
	 * @typedef {Object} InventoryOptions
	 * @property {InventoryFilterOptions} filter
	 * @property {any} sort
	 */

	/**
	 * @param {InventoryOptions} options
	 */
	async getAll(options) {
		let cards = await model.find({ userId: this.userId }).populate({ path: "card" });
		if (options?.filter?.id) cards = cards.filter(i => i.card.id.startsWith(options.filter.id.toUpperCase()));
		return cards;
	}

	/**
	 * @param {Types.ObjectId} _id 
	 */
	async get(_id) {
		return model.findOne({ userId: this.userId, card: _id }).populate("card");
	}

	/**
	 * @param {Types.ObjectId} _id 
	 */
	async add(_id) {
		return model.findOneAndUpdate({ userId: this.userId, card: _id }, { $inc: { quantity: 1 } }, { new: true, upsert: true });
	}

}